<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function user(array $attributes = [], bool $admin = false): User
    {
        $factory = $admin ? User::factory()->admin() : User::factory();

        return Activity::withoutModelLogging(fn () => $factory->create($attributes));
    }

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $member = $this->user();

        $this->get(route('admin.users.index'))->assertRedirect(route('login'));
        $this->post(route('admin.users.admin.grant', $member))->assertRedirect(route('login'));
        $this->delete(route('admin.users.admin.revoke', $member))->assertRedirect(route('login'));
    }

    public function test_non_admins_are_forbidden_and_cannot_promote_anyone(): void
    {
        $member = $this->user();
        $other = $this->user();

        $this->actingAs($member)->get(route('admin.users.index'))->assertForbidden();
        $this->actingAs($member)->post(route('admin.users.admin.grant', $member))->assertForbidden();
        $this->actingAs($member)->post(route('admin.users.admin.grant', $other))->assertForbidden();

        $this->assertFalse($member->fresh()?->is_admin);
        $this->assertFalse($other->fresh()?->is_admin);
    }

    public function test_admins_see_every_account_admins_first_with_the_last_sign_in(): void
    {
        $admin = $this->user(['name' => 'Zoe Admin', 'email' => 'zoe@nlv.test'], admin: true);
        $member = $this->user(['name' => 'Adam Member', 'email_verified_at' => null]);

        ActivityLog::factory()->create(['user_id' => $member->id, 'event' => 'auth.login', 'ip_address' => '198.51.100.4', 'created_at' => '2026-09-20 08:00:00']);
        ActivityLog::factory()->create(['user_id' => $member->id, 'event' => 'auth.login', 'ip_address' => '198.51.100.7', 'created_at' => '2026-09-24 09:30:00']);
        ActivityLog::factory()->create(['user_id' => $member->id, 'event' => 'auth.logout', 'created_at' => '2026-09-25 09:30:00']);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/users/index')
                ->where('users.total', 2)
                ->where('adminCount', 1)
                ->where('totalCount', 2)
                ->where('sort', null)
                ->where('users.data.0.name', 'Zoe Admin')
                ->where('users.data.0.isAdmin', true)
                ->where('users.data.0.isYou', true)
                ->where('users.data.0.lastLoginAt', null)
                ->where('users.data.1.name', 'Adam Member')
                ->where('users.data.1.isAdmin', false)
                ->where('users.data.1.isYou', false)
                ->where('users.data.1.verified', false)
                ->where('users.data.1.twoFactor', false)
                ->where('users.data.1.lastLoginAt', '2026-09-24T09:30:00+00:00')
                ->where('users.data.1.lastLoginIp', '198.51.100.7')
                ->missing('users.data.0.password')
                ->missing('users.data.0.two_factor_secret'),
            );
    }

    public function test_accounts_can_be_searched_filtered_and_sorted(): void
    {
        $admin = $this->user(['name' => 'Dev Admin', 'email' => 'dev@nlv.test'], admin: true);
        $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test']);
        $this->user(['name' => 'Omar Said', 'email' => 'omar@shop.test', 'email_verified_at' => null]);

        $names = fn (array $query) => collect(
            $this->actingAs($admin)->get(route('admin.users.index', $query))->inertiaProps('users.data'),
        )->pluck('name')->all();

        $this->assertSame(['Jane Doe'], $names(['search' => 'jane']));
        $this->assertSame(['Jane Doe', 'Omar Said'], $names(['search' => 'shop.test']));
        $this->assertSame(['Dev Admin'], $names(['role' => 'admin']));
        $this->assertSame(['Jane Doe', 'Omar Said'], $names(['role' => 'member']));
        $this->assertSame(['Omar Said'], $names(['status' => 'unverified']));
        $this->assertSame(['Omar Said', 'Jane Doe', 'Dev Admin'], $names(['sort' => 'name', 'direction' => 'desc']));
        $this->assertSame(['dev@nlv.test', 'jane@shop.test', 'omar@shop.test'], collect(
            $this->actingAs($admin)->get(route('admin.users.index', ['sort' => 'email']))->inertiaProps('users.data'),
        )->pluck('email')->all());

        // Unknown values fall back to the defaults.
        $this->actingAs($admin)
            ->get(route('admin.users.index', ['role' => 'owner', 'status' => 'x', 'sort' => 'password']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', ['search' => null, 'role' => null, 'status' => null])
                ->where('sort', null)
                ->has('users.data', 3),
            );
    }

    public function test_an_admin_can_make_someone_an_admin_and_it_is_logged_once(): void
    {
        $admin = $this->user(['name' => 'Dev Admin'], admin: true);
        $member = $this->user(['name' => 'Jane Doe']);

        $this->actingAs($admin)
            ->from(route('admin.users.index'))
            ->post(route('admin.users.admin.grant', $member))
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Jane Doe is now an admin.']);

        $this->assertTrue($member->fresh()?->is_admin);

        $log = ActivityLog::query()->where('event', 'user.admin_granted')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertTrue($log->subject?->is($member));
        $this->assertSame('Dev Admin made Jane Doe an admin', $log->description);
        $this->assertSame(['is_admin' => [false, true]], $log->properties['changes'] ?? null);
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.updated')->count());
    }

    public function test_promoting_an_unverified_account_says_when_the_panel_opens(): void
    {
        $admin = $this->user(admin: true);
        $member = $this->user(['name' => 'Omar Said', 'email_verified_at' => null]);

        $this->actingAs($admin)
            ->post(route('admin.users.admin.grant', $member))
            ->assertInertiaFlash('toast.message', 'Omar Said is now an admin, and can open the panel once their email address is verified.');
    }

    public function test_granting_an_admin_again_is_refused(): void
    {
        $admin = $this->user(admin: true);
        $other = $this->user(['name' => 'Other Admin'], admin: true);

        $this->actingAs($admin)
            ->post(route('admin.users.admin.grant', $other))
            ->assertSessionHasErrors(['admin' => 'Other Admin is already an admin.']);

        $this->assertSame(0, ActivityLog::query()->where('event', 'user.admin_granted')->count());
    }

    public function test_an_admin_can_remove_another_admins_access(): void
    {
        $admin = $this->user(['name' => 'Dev Admin'], admin: true);
        $other = $this->user(['name' => 'Jane Doe'], admin: true);

        $this->actingAs($admin)
            ->from(route('admin.users.index'))
            ->delete(route('admin.users.admin.revoke', $other))
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Jane Doe is no longer an admin.');

        $this->assertFalse($other->fresh()?->is_admin);

        $log = ActivityLog::query()->where('event', 'user.admin_revoked')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertTrue($log->subject?->is($other));
        $this->assertSame('Dev Admin removed Jane Doe’s admin access', $log->description);
        $this->assertSame(['is_admin' => [true, false]], $log->properties['changes'] ?? null);
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.updated')->count());

        // Their next visit to the panel is refused.
        $this->actingAs($other->fresh() ?? $other)->get(route('admin.dashboard'))->assertForbidden();
    }

    public function test_nobody_can_remove_their_own_admin_access(): void
    {
        $admin = $this->user(admin: true);
        $this->user(admin: true);

        $this->actingAs($admin)
            ->delete(route('admin.users.admin.revoke', $admin))
            ->assertSessionHasErrors(['admin' => 'You can’t remove your own admin access. Ask another admin to do it.']);

        $this->assertTrue($admin->fresh()?->is_admin);
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.admin_revoked')->count());
    }

    public function test_the_last_admin_always_stays_an_admin(): void
    {
        // Only reachable if the gate ever lets a non-admin in; the guard still holds.
        Gate::define('access-admin', fn (): bool => true);

        $actor = $this->user();
        $onlyAdmin = $this->user(['name' => 'Sole Admin'], admin: true);

        $this->actingAs($actor)
            ->delete(route('admin.users.admin.revoke', $onlyAdmin))
            ->assertSessionHasErrors(['admin' => 'Sole Admin is the only admin. Make someone else an admin first.']);

        $this->assertTrue($onlyAdmin->fresh()?->is_admin);
    }

    public function test_removing_access_from_a_member_is_refused(): void
    {
        $admin = $this->user(admin: true);
        $member = $this->user(['name' => 'Jane Doe']);

        $this->actingAs($admin)
            ->delete(route('admin.users.admin.revoke', $member))
            ->assertSessionHasErrors(['admin' => 'Jane Doe is not an admin.']);
    }

    public function test_unknown_accounts_are_not_found_and_accounts_cannot_be_deleted(): void
    {
        $admin = $this->user(admin: true);
        $member = $this->user();

        $this->actingAs($admin)->post('/admin/users/999999/admin')->assertNotFound();
        $this->actingAs($admin)->delete("/admin/users/{$member->id}")->assertNotFound();

        $this->assertModelExists($member);
    }
}
