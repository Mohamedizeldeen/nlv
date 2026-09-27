<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\User;
use App\Notifications\SetPasswordLink;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Symfony\Component\Mime\RawMessage;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Correct-Horse-42';

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function user(array $attributes = [], bool $admin = false): User
    {
        $factory = $admin ? User::factory()->admin() : User::factory();

        return Activity::withoutModelLogging(fn () => $factory->create($attributes));
    }

    private function admin(string $name = 'Dev Admin'): User
    {
        return $this->user(['name' => $name, 'email' => Str::slug($name).'@nlv.test'], admin: true);
    }

    /**
     * Every route of the module, with a method and URL (`$target` is the account acted on).
     *
     * @return array<string, array{0: string, 1: string}>
     */
    private function routes(User $target): array
    {
        return [
            'index' => ['get', route('admin.users.index')],
            'create' => ['get', route('admin.users.create')],
            'store' => ['post', route('admin.users.store')],
            'edit' => ['get', route('admin.users.edit', $target)],
            'update' => ['put', route('admin.users.update', $target)],
            'destroy' => ['delete', route('admin.users.destroy', $target)],
            'set password' => ['put', route('admin.users.password.update', $target)],
            'password link' => ['post', route('admin.users.password.link', $target)],
            'grant admin' => ['post', route('admin.users.admin.grant', $target)],
            'revoke admin' => ['delete', route('admin.users.admin.revoke', $target)],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function newAccount(array $overrides = []): array
    {
        return [
            'name' => 'Layla Haddad',
            'email' => 'layla@shop.test',
            'password_method' => 'set',
            'password' => self::PASSWORD,
            'password_confirmation' => self::PASSWORD,
            ...$overrides,
        ];
    }

    private function store(User $admin, array $overrides = []): TestResponse
    {
        return $this->actingAs($admin)
            ->from(route('admin.users.create'))
            ->post(route('admin.users.store'), $this->newAccount($overrides));
    }

    private function sessionFor(User $user): string
    {
        $id = Str::random(40);

        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Test',
            'payload' => base64_encode(serialize([])),
            'last_activity' => now()->getTimestamp(),
        ]);

        return $id;
    }

    /**
     * Every activity entry, as one string (description, properties, IP, browser).
     */
    private function everythingLogged(): string
    {
        return ActivityLog::query()->get()
            ->map(fn (ActivityLog $log): string => $log->event.' '.$log->description.' '.json_encode($log->properties))
            ->implode("\n");
    }

    // Access ------------------------------------------------------------------

    public function test_guests_are_sent_to_the_login_page_from_every_route(): void
    {
        $target = $this->user();

        foreach ($this->routes($target) as [$method, $url]) {
            $this->call($method, $url)->assertRedirect(route('login'));
        }

        $this->assertModelExists($target);
        $this->assertSame(1, User::query()->count());
    }

    public function test_a_signed_in_user_without_admin_rights_is_forbidden_everywhere(): void
    {
        $member = $this->user(['name' => 'Plain Member']);
        $target = $this->user(['name' => 'Target', 'email' => 'target@nlv.test']);
        $hash = $target->password;

        foreach ($this->routes($target) as [$method, $url]) {
            $this->actingAs($member)->call($method, $url, [
                ...$this->newAccount(['email' => 'intruder@nlv.test']),
                'confirm_email' => 'target@nlv.test',
            ])->assertForbidden();
        }

        $target->refresh();
        $this->assertSame('Target', $target->name);
        $this->assertSame($hash, $target->password);
        $this->assertFalse($target->is_admin);
        $this->assertDatabaseMissing('users', ['email' => 'intruder@nlv.test']);
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_unknown_accounts_are_not_found(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->get('/admin/users/999999/edit')->assertNotFound();
        $this->actingAs($admin)->put('/admin/users/999999', ['name' => 'X', 'email' => 'x@nlv.test'])->assertNotFound();
        $this->actingAs($admin)->delete('/admin/users/999999', ['confirm_email' => 'x@nlv.test'])->assertNotFound();
        $this->actingAs($admin)->post('/admin/users/999999/admin')->assertNotFound();
        // There is no "show" page: the edit page is the account's page.
        $this->actingAs($admin)->get("/admin/users/{$admin->id}")->assertStatus(405);
    }

    // List ----------------------------------------------------------------------

    public function test_admins_see_every_account_admins_first_with_the_last_sign_in(): void
    {
        $admin = $this->user(['name' => 'Zoe Admin', 'email' => 'zoe@nlv.test'], admin: true);
        $member = $this->user(['name' => 'Adam Member', 'email_verified_at' => null]);

        ActivityLog::factory()->create(['user_id' => $member->id, 'event' => 'auth.login', 'ip_address' => '198.51.100.4', 'created_at' => '2026-09-20 08:00:00']);
        ActivityLog::factory()->create(['user_id' => $member->id, 'event' => 'auth.login', 'ip_address' => '198.51.100.7', 'created_at' => '2026-09-24 09:30:00']);
        ActivityLog::factory()->create(['user_id' => $member->id, 'event' => 'auth.logout', 'created_at' => '2026-09-25 09:30:00']);
        Lead::factory()->count(2)->create(['assigned_to' => $member->id]);
        Lead::factory()->create(['assigned_to' => $member->id])->delete();

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
                ->where('users.data.0.assignedLeads', 0)
                ->where('users.data.1.name', 'Adam Member')
                ->where('users.data.1.isAdmin', false)
                ->where('users.data.1.isYou', false)
                ->where('users.data.1.verified', false)
                ->where('users.data.1.twoFactor', false)
                ->where('users.data.1.lastLoginAt', '2026-09-24T09:30:00+00:00')
                ->where('users.data.1.lastLoginIp', '198.51.100.7')
                ->where('users.data.1.assignedLeads', 2)
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

    // Add -----------------------------------------------------------------------

    public function test_the_add_page_knows_the_password_policy(): void
    {
        $this->actingAs($this->admin())
            ->get(route('admin.users.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/users/create')
                ->where('password.min', 12)
                ->where('password.linkMinutes', 60)
                ->where('password.rules', fn (string $rules): bool => str_contains($rules, 'minlength: 12')),
            );
    }

    public function test_an_admin_adds_a_verified_admin_with_a_password_set_now(): void
    {
        Notification::fake();
        $admin = $this->admin();

        $this->store($admin, ['name' => '  Layla Haddad ', 'email' => ' Layla@Shop.TEST '])
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Layla Haddad can sign in now with the password you set.']);

        $user = User::query()->where('email', 'layla@shop.test')->sole();

        $this->assertSame('Layla Haddad', $user->name);
        $this->assertTrue($user->isAdmin());
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        Notification::assertNothingSent();

        // One readable entry, not the model's own as well.
        $log = ActivityLog::query()->sole();
        $this->assertSame('user.created', $log->event);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertTrue($log->subject?->is($user));
        $this->assertSame('Dev Admin added Layla Haddad (layla@shop.test) as an admin', $log->description);
        $this->assertSame('set by admin', $log->properties['password_method'] ?? null);
        $this->assertSame([
            'name' => [null, 'Layla Haddad'],
            'email' => [null, 'layla@shop.test'],
            'is_admin' => [null, true],
        ], $log->properties['changes'] ?? null);
    }

    public function test_an_account_added_with_a_password_can_sign_in_and_open_the_panel(): void
    {
        $this->store($this->admin())->assertSessionHasNoErrors();
        $this->post(route('logout'));
        $this->assertGuest();

        $user = User::query()->where('email', 'layla@shop.test')->sole();

        $this->post(route('login.store'), ['email' => 'Layla@shop.test', 'password' => self::PASSWORD])
            ->assertRedirect(route('admin.dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
        $this->get(route('admin.dashboard'))->assertOk();
        $this->get(route('admin.users.index'))->assertOk();
    }

    public function test_an_admin_adds_an_account_and_emails_a_link_to_choose_a_password(): void
    {
        Notification::fake();
        $admin = $this->admin();

        $this->store($admin, ['password_method' => 'link', 'password' => '', 'password_confirmation' => ''])
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Layla Haddad was added. A link to choose a password is on its way to layla@shop.test.');

        $user = User::query()->where('email', 'layla@shop.test')->sole();

        $this->assertTrue($user->isAdmin());
        $this->assertNotNull($user->email_verified_at);

        $token = null;
        Notification::assertSentTo($user, SetPasswordLink::class, function (SetPasswordLink $notification) use ($user, &$token): bool {
            $token = $notification->token;
            $mail = $notification->toMail($user);

            return $notification->newAccount
                && $notification->sentBy === 'Dev Admin'
                && $mail->subject === 'Your '.config('app.name').' admin account'
                && $mail->actionUrl === route('password.reset', ['token' => $notification->token, 'email' => 'layla@shop.test'])
                && str_contains(implode(' ', $mail->outroLines), '60 minutes');
        });
        Notification::assertSentTimes(SetPasswordLink::class, 1);
        $this->assertIsString($token);
        $this->assertTrue(Password::tokenExists($user, $token));

        $this->assertSame(['user.created', 'user.password_link_sent'], ActivityLog::query()->orderBy('id')->pluck('event')->all());
        $this->assertSame('emailed link', ActivityLog::query()->where('event', 'user.created')->sole()->properties['password_method'] ?? null);

        $sent = ActivityLog::query()->where('event', 'user.password_link_sent')->sole();
        $this->assertSame('Dev Admin emailed Layla Haddad a link to choose a password', $sent->description);
        $this->assertSame(['via' => 'admin', 'email' => 'layla@shop.test', 'expires_in_minutes' => 60], $sent->properties);
        $this->assertStringNotContainsString($token, $this->everythingLogged());

        // The link opens the app's reset page, and the chosen password signs in.
        $this->post(route('logout'));
        $this->get(route('password.reset', ['token' => $token, 'email' => 'layla@shop.test']))->assertOk();
        $this->post(route('password.update'), [
            'token' => $token,
            'email' => 'layla@shop.test',
            'password' => 'Chosen-By-Layla-7',
            'password_confirmation' => 'Chosen-By-Layla-7',
        ])->assertSessionHasNoErrors();

        $this->post(route('login.store'), ['email' => 'layla@shop.test', 'password' => 'Chosen-By-Layla-7'])
            ->assertRedirect(route('admin.dashboard', absolute: false));
        $this->assertAuthenticatedAs($user);
    }

    public function test_an_account_is_still_added_when_the_email_cannot_be_sent(): void
    {
        Mail::extend('broken', fn () => new class implements TransportInterface
        {
            public function send(RawMessage $message, $envelope = null): ?SentMessage
            {
                throw new TransportException('Connection refused');
            }

            public function __toString(): string
            {
                return 'broken://';
            }
        });
        config([
            'mail.default' => 'broken',
            'mail.mailers.broken' => ['transport' => 'broken'],
            // The failure is reported; keep it out of storage/logs.
            'logging.default' => 'null',
        ]);

        $response = $this->store($this->admin(), ['password_method' => 'link'])
            ->assertInertiaFlash('toast', [
                'type' => 'warning',
                'message' => 'Layla Haddad was added, but the email with the link couldn’t be sent. Send it again from here.',
            ]);

        $user = User::query()->where('email', 'layla@shop.test')->sole();

        // To the account's page, where the link can be sent again.
        $response->assertRedirect(route('admin.users.edit', $user));
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.password_link_sent')->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'layla@shop.test']);
        $this->assertSame(1, ActivityLog::query()->where('event', 'user.created')->where('subject_id', $user->id)->count());
    }

    public function test_adding_an_account_is_validated(): void
    {
        $admin = $this->admin();
        $this->user(['email' => 'taken@shop.test']);

        $this->store($admin, ['name' => '', 'email' => ''])
            ->assertSessionHasErrors(['name' => 'Write their name.', 'email' => 'Write their email address.']);
        $this->store($admin, ['email' => 'not-an-email'])
            ->assertSessionHasErrors(['email' => 'This doesn’t look like an email address.']);
        $this->store($admin, ['email' => 'TAKEN@Shop.test'])
            ->assertSessionHasErrors(['email' => 'Someone already has an account with this email address.']);
        $this->store($admin, ['password_method' => 'magic'])
            ->assertSessionHasErrors('password_method');
        $this->store($admin, ['password_method' => null])
            ->assertSessionHasErrors('password_method');
        $this->store($admin, ['password' => 'short-pass1', 'password_confirmation' => 'short-pass1'])
            ->assertSessionHasErrors(['password' => 'Use at least 12 characters.']);
        $this->store($admin, ['password_confirmation' => 'Something-Else-42'])
            ->assertSessionHasErrors(['password' => 'The two passwords don’t match.']);
        $this->store($admin, ['password' => '', 'password_confirmation' => ''])
            ->assertSessionHasErrors(['password' => 'Choose a password.']);

        $this->assertDatabaseMissing('users', ['email' => 'layla@shop.test']);
        $this->assertSame(0, ActivityLog::query()->count());
    }

    // Edit ----------------------------------------------------------------------

    public function test_the_edit_page_shows_the_account(): void
    {
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test'], admin: true);
        Lead::factory()->count(3)->create(['assigned_to' => $jane->id]);
        ActivityLog::factory()->create(['user_id' => $jane->id, 'event' => 'auth.login', 'ip_address' => '198.51.100.9', 'created_at' => '2026-09-24 09:30:00']);

        $this->actingAs($admin)
            ->get(route('admin.users.edit', $jane))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/users/edit')
                ->where('user.id', $jane->id)
                ->where('user.name', 'Jane Doe')
                ->where('user.email', 'jane@shop.test')
                ->where('user.isYou', false)
                ->where('user.assignedLeads', 3)
                ->where('user.lastLoginIp', '198.51.100.9')
                ->has('user.updatedAt')
                ->where('adminCount', 2)
                ->where('password.min', 12)
                ->missing('user.password'),
            );
    }

    public function test_an_admin_changes_a_name_and_email_address_and_it_is_logged_with_a_diff(): void
    {
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test'], admin: true);
        Password::createToken($jane);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $jane), ['name' => 'Jane Smith', 'email' => 'Jane.Smith@Shop.test'])
            ->assertRedirect(route('admin.users.edit', $jane))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Saved. Jane Smith now signs in with jane.smith@shop.test.');

        $jane->refresh();
        $this->assertSame('Jane Smith', $jane->name);
        $this->assertSame('jane.smith@shop.test', $jane->email);
        $this->assertNotNull($jane->email_verified_at);
        // A link sent to the old address stops working.
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'jane@shop.test']);

        $log = ActivityLog::query()->sole();
        $this->assertSame('user.updated', $log->event);
        $this->assertTrue($log->subject?->is($jane));
        $this->assertSame('Dev Admin renamed Jane Doe to Jane Smith and changed the email address to jane.smith@shop.test', $log->description);
        $this->assertSame([
            'name' => ['Jane Doe', 'Jane Smith'],
            'email' => ['jane@shop.test', 'jane.smith@shop.test'],
        ], $log->properties['changes'] ?? null);

        $this->actingAs($admin)->put(route('admin.users.update', $jane), ['name' => 'Jane Smith', 'email' => 'jane@shop.test']);
        $this->assertSame('Dev Admin changed Jane Smith’s email address to jane@shop.test', ActivityLog::query()->latest('id')->first()?->description);
    }

    public function test_saving_without_changes_logs_nothing(): void
    {
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test']);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $jane), ['name' => 'Jane Doe', 'email' => 'JANE@shop.test'])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'No changes to save.']);

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_editing_is_validated(): void
    {
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test']);
        $this->user(['email' => 'omar@shop.test']);

        $this->actingAs($admin)->put(route('admin.users.update', $jane), ['name' => '', 'email' => 'nope'])
            ->assertSessionHasErrors(['name' => 'Write their name.', 'email' => 'This doesn’t look like an email address.']);
        $this->actingAs($admin)->put(route('admin.users.update', $jane), ['name' => 'Jane', 'email' => 'Omar@Shop.test'])
            ->assertSessionHasErrors(['email' => 'Someone already has an account with this email address.']);

        $this->assertSame('jane@shop.test', $jane->fresh()?->email);
    }

    public function test_an_admin_sets_a_new_password_for_someone_and_their_sessions_end(): void
    {
        config(['session.driver' => 'database']);
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test'], admin: true);
        $rememberToken = $jane->remember_token;
        $this->sessionFor($jane);
        $mine = $this->sessionFor($admin);
        Password::createToken($jane);

        $this->actingAs($admin)
            ->put(route('admin.users.password.update', $jane), ['password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD])
            ->assertRedirect(route('admin.users.edit', $jane))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'New password set. Jane Doe is signed out everywhere and signs in with it next time.');

        $jane->refresh();
        $this->assertTrue(Hash::check(self::PASSWORD, $jane->password));
        $this->assertNotSame($rememberToken, $jane->remember_token);
        $this->assertDatabaseMissing('sessions', ['user_id' => $jane->id]);
        $this->assertDatabaseHas('sessions', ['id' => $mine]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'jane@shop.test']);

        $log = ActivityLog::query()->sole();
        $this->assertSame('user.password_set', $log->event);
        $this->assertSame('Dev Admin set a new password for Jane Doe', $log->description);
        $this->assertSame(['via' => 'admin', 'sessions_ended' => 1], $log->properties);

        $this->post(route('logout'));
        $this->post(route('login.store'), ['email' => 'jane@shop.test', 'password' => self::PASSWORD]);
        $this->assertAuthenticatedAs($jane);
    }

    public function test_a_new_password_is_validated_and_never_set_for_yourself_here(): void
    {
        $admin = $this->admin();
        $jane = $this->user();
        $hash = $jane->password;
        $url = route('admin.users.password.update', $jane);

        $this->actingAs($admin)->put($url, ['password' => 'short-pass1', 'password_confirmation' => 'short-pass1'])
            ->assertSessionHasErrors(['password' => 'Use at least 12 characters.']);
        $this->actingAs($admin)->put($url, ['password' => self::PASSWORD, 'password_confirmation' => 'nope'])
            ->assertSessionHasErrors(['password' => 'The two passwords don’t match.']);
        $this->actingAs($admin)->put(route('admin.users.password.update', $admin), ['password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD])
            ->assertSessionHasErrors(['password' => 'Change your own password from your account settings, which ask for the current one first.']);

        $this->assertSame($hash, $jane->fresh()?->password);
        $this->assertFalse(Hash::check(self::PASSWORD, (string) $admin->fresh()?->password));
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_an_admin_emails_someone_a_link_to_choose_a_new_password(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test'], admin: true);
        $hash = $jane->password;

        $this->actingAs($admin)
            ->from(route('admin.users.edit', $jane))
            ->post(route('admin.users.password.link', $jane))
            ->assertRedirect(route('admin.users.edit', $jane))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Link sent to jane@shop.test. It works for 60 minutes.');

        Notification::assertSentTo($jane, SetPasswordLink::class, function (SetPasswordLink $notification) use ($jane): bool {
            $mail = $notification->toMail($jane);

            return ! $notification->newAccount
                && $mail->subject === 'Choose a new password for '.config('app.name')
                && Password::tokenExists($jane, $notification->token);
        });

        // Their current password keeps working until they use the link.
        $this->assertSame($hash, $jane->fresh()?->password);

        $log = ActivityLog::query()->sole();
        $this->assertSame('user.password_link_sent', $log->event);
        $this->assertSame('Dev Admin emailed Jane Doe a link to choose a new password', $log->description);

        // Another one within a minute is throttled by the password broker.
        $this->actingAs($admin)
            ->post(route('admin.users.password.link', $jane))
            ->assertSessionHasErrors(['password_link' => 'A link was sent less than a minute ago. Wait a minute before sending another.']);
        Notification::assertSentTimes(SetPasswordLink::class, 1);

        // Never to yourself: that is "Forgot your password?".
        $this->actingAs($admin)
            ->post(route('admin.users.password.link', $admin))
            ->assertSessionHasErrors('password_link');
        Notification::assertNotSentTo($admin, SetPasswordLink::class);
    }

    // Delete --------------------------------------------------------------------

    public function test_an_admin_deletes_an_account_after_typing_its_email_and_its_leads_are_unassigned(): void
    {
        config(['session.driver' => 'database']);
        $admin = $this->admin();
        $jane = $this->user(['name' => 'Jane Doe', 'email' => 'jane@shop.test'], admin: true);
        [$open, $other] = Lead::factory()->count(2)->create(['assigned_to' => $jane->id])->all();
        $trashed = Lead::factory()->create(['assigned_to' => $jane->id]);
        $trashed->delete();
        $mine = Lead::factory()->create(['assigned_to' => $admin->id]);
        $janesLogin = ActivityLog::factory()->create(['user_id' => $jane->id, 'event' => 'auth.login']);
        $this->sessionFor($jane);
        ActivityLog::query()->where('event', '!=', 'auth.login')->delete();

        $this->actingAs($admin)
            ->from(route('admin.users.edit', $jane))
            ->delete(route('admin.users.destroy', $jane), ['confirm_email' => ' JANE@shop.test '])
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Jane Doe’s account was deleted. Its 2 leads are unassigned now.');

        $this->assertModelMissing($jane);
        $this->assertNull($open->fresh()?->assigned_to);
        $this->assertNull($other->fresh()?->assigned_to);
        $this->assertNull(Lead::withTrashed()->find($trashed->id)?->assigned_to);
        $this->assertSame($admin->id, $mine->fresh()?->assigned_to);
        $this->assertDatabaseMissing('sessions', ['user_id' => $jane->id]);

        $log = ActivityLog::query()->where('event', 'user.deleted')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame($jane->id, $log->subject_id);
        $this->assertSame('Dev Admin deleted the account of Jane Doe (jane@shop.test)', $log->description);
        $this->assertSame(3, $log->properties['unassigned_leads'] ?? null);
        $this->assertSame(['Jane Doe', null], $log->properties['changes']['name'] ?? null);

        // Each lead's timeline says why it lost its assignee.
        $unassigned = ActivityLog::query()->where('event', 'lead.unassigned')->get();
        $this->assertEqualsCanonicalizing([$open->id, $other->id, $trashed->id], $unassigned->pluck('subject_id')->all());
        $this->assertSame("Unassigned {$open->reference} (was Jane Doe): the account was deleted", $unassigned->firstWhere('subject_id', $open->id)?->description);
        $this->assertSame(0, ActivityLog::query()->whereIn('event', ['lead.updated', 'user.updated'])->count());

        // Their past activity stays, without the account.
        $this->assertNull($janesLogin->fresh()?->user_id);
    }

    public function test_deleting_needs_the_exact_email_address(): void
    {
        $admin = $this->admin();
        $jane = $this->user(['email' => 'jane@shop.test'], admin: true);

        $this->actingAs($admin)->delete(route('admin.users.destroy', $jane))
            ->assertSessionHasErrors(['confirm_email' => 'Type their email address to confirm.']);
        $this->actingAs($admin)->delete(route('admin.users.destroy', $jane), ['confirm_email' => 'jane@shop'])
            ->assertSessionHasErrors(['confirm_email' => 'Type jane@shop.test exactly to confirm.']);

        $this->assertModelExists($jane);
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_nobody_deletes_their_own_account_here(): void
    {
        $admin = $this->admin();
        $this->admin('Other Admin');

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $admin), ['confirm_email' => $admin->email])
            ->assertSessionHasErrors(['confirm_email' => 'You can’t delete your own account here. Do it from your account settings.']);

        $this->assertModelExists($admin);
    }

    public function test_the_last_admin_is_never_deleted(): void
    {
        // Only reachable if the gate ever lets a non-admin in; the guard still holds.
        Gate::define('access-admin', fn (): bool => true);

        $actor = $this->user();
        $onlyAdmin = $this->user(['name' => 'Sole Admin', 'email' => 'sole@nlv.test'], admin: true);

        $this->actingAs($actor)
            ->delete(route('admin.users.destroy', $onlyAdmin), ['confirm_email' => 'sole@nlv.test'])
            ->assertSessionHasErrors(['confirm_email' => 'Sole Admin is the only admin, so the account can’t be deleted.']);

        $this->assertModelExists($onlyAdmin);

        // An account without admin rights can go even then.
        $this->actingAs($actor)
            ->delete(route('admin.users.destroy', $member = $this->user(['email' => 'member@nlv.test'])), ['confirm_email' => 'member@nlv.test'])
            ->assertSessionHasNoErrors();
        $this->assertModelMissing($member);
    }

    // Logs ----------------------------------------------------------------------

    public function test_no_password_ever_reaches_the_logs(): void
    {
        Notification::fake();
        $messages = [];
        Event::listen(MessageLogged::class, function (MessageLogged $event) use (&$messages): void {
            $messages[] = $event->message.' '.json_encode($event->context);
        });

        $admin = $this->admin();
        $this->store($admin)->assertSessionHasNoErrors();
        $layla = User::query()->where('email', 'layla@shop.test')->sole();

        $this->actingAs($admin)->put(route('admin.users.password.update', $layla), [
            'password' => 'Second-Secret-99',
            'password_confirmation' => 'Second-Secret-99',
        ])->assertSessionHasNoErrors();
        $this->actingAs($admin)->put(route('admin.users.update', $layla), ['name' => 'Layla H.', 'email' => 'layla@shop.test']);
        $this->actingAs($admin)->post(route('admin.users.password.link', $layla))->assertSessionHasNoErrors();
        $this->store($admin, ['email' => 'second@shop.test', 'password_method' => 'link']);

        $logged = $this->everythingLogged()."\n".implode("\n", $messages);
        $hashes = User::query()->pluck('password')->all();

        $this->assertSame(
            ['user.created', 'user.password_set', 'user.updated', 'user.password_link_sent', 'user.created', 'user.password_link_sent'],
            ActivityLog::query()->orderBy('id')->pluck('event')->all(),
        );

        foreach ([self::PASSWORD, 'Second-Secret-99', ...$hashes] as $secret) {
            $this->assertStringNotContainsString($secret, $logged);
        }

        foreach (ActivityLog::query()->get() as $log) {
            $this->assertArrayNotHasKey('password', $log->properties['changes'] ?? []);
            $this->assertArrayNotHasKey('password', $log->properties ?? []);
        }
    }

    // Admin access (kept for older links; the page no longer offers it) --------

    public function test_an_account_without_admin_rights_can_be_given_access_and_it_is_logged_once(): void
    {
        $admin = $this->admin();
        $member = $this->user(['name' => 'Jane Doe']);

        $this->actingAs($admin)
            ->from(route('admin.users.edit', $member))
            ->post(route('admin.users.admin.grant', $member))
            ->assertRedirect(route('admin.users.edit', $member))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Jane Doe is now an admin.']);

        $this->assertTrue($member->fresh()?->is_admin);

        $log = ActivityLog::query()->where('event', 'user.admin_granted')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertTrue($log->subject?->is($member));
        $this->assertSame('Dev Admin made Jane Doe an admin', $log->description);
        $this->assertSame(['is_admin' => [false, true]], $log->properties['changes'] ?? null);
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.updated')->count());

        $this->actingAs($admin)
            ->post(route('admin.users.admin.grant', $member))
            ->assertSessionHasErrors(['admin' => 'Jane Doe is already an admin.']);
    }

    public function test_admin_access_is_removed_with_the_same_protections(): void
    {
        $admin = $this->admin();
        $other = $this->user(['name' => 'Jane Doe'], admin: true);
        $member = $this->user(['name' => 'Omar Said']);

        $this->actingAs($admin)
            ->delete(route('admin.users.admin.revoke', $admin))
            ->assertSessionHasErrors(['admin' => 'You can’t remove your own admin access. Ask another admin to do it.']);
        $this->actingAs($admin)
            ->delete(route('admin.users.admin.revoke', $member))
            ->assertSessionHasErrors(['admin' => 'Omar Said is not an admin.']);

        $this->actingAs($admin)
            ->delete(route('admin.users.admin.revoke', $other))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Jane Doe is no longer an admin.');

        $this->assertFalse($other->fresh()?->is_admin);
        $this->assertSame('Dev Admin removed Jane Doe’s admin access', ActivityLog::query()->where('event', 'user.admin_revoked')->sole()->description);
        $this->actingAs($other->fresh() ?? $other)->get(route('admin.dashboard'))->assertForbidden();

        Gate::define('access-admin', fn (): bool => true);
        $this->actingAs($other->fresh() ?? $other)
            ->delete(route('admin.users.admin.revoke', $admin))
            ->assertSessionHasErrors(['admin' => 'Dev Admin is the only admin. Make someone else an admin first.']);
        $this->assertTrue($admin->fresh()?->is_admin);
    }
}
