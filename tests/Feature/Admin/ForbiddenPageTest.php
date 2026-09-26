<?php

namespace Tests\Feature\Admin;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ForbiddenPageTest extends TestCase
{
    use RefreshDatabase;

    private function member(): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->create([
            'name' => 'Jane Doe',
            'email' => 'jane@shop.test',
        ]));
    }

    private function admin(): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->admin()->create());
    }

    /**
     * Routes that refuse admins, registered like an admin module's.
     */
    private function registerAdminRoutesThatRefuse(): void
    {
        Route::middleware(['web', 'auth', 'verified', 'can:access-admin'])
            ->prefix('admin')
            ->group(function (): void {
                Route::get('__test/abort', fn () => abort(403, 'Plans can’t be deleted, only hidden.'));
                Route::get('__test/gate', function (): void {
                    Gate::authorize('some-ability-nobody-has');
                });
            });
    }

    public function test_non_admins_get_the_staff_only_page_on_every_admin_path(): void
    {
        $member = $this->member();

        foreach (['/admin', '/admin/activity', '/admin/users'] as $path) {
            $this->actingAs($member)
                ->get($path)
                ->assertForbidden()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('admin/forbidden')
                    ->where('status', 403)
                    ->where('reason', 'not-admin')
                    ->where('message', null)
                    ->where('user', ['name' => 'Jane Doe', 'email' => 'jane@shop.test']),
                );
        }
    }

    public function test_inertia_visits_get_the_page_as_an_inertia_response(): void
    {
        $member = $this->member();

        $this->actingAs($member)
            ->get('/admin', [
                'X-Inertia' => 'true',
                'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->assertForbidden()
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'admin/forbidden')
            ->assertJsonPath('props.reason', 'not-admin');
    }

    public function test_json_requests_keep_a_json_403(): void
    {
        $member = $this->member();

        $this->actingAs($member)
            ->getJson('/admin/users')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.'])
            ->assertHeaderMissing('X-Inertia');
    }

    public function test_guests_are_still_sent_to_sign_in(): void
    {
        $this->get('/admin/users')->assertRedirect(route('login'));
    }

    public function test_admins_refused_an_action_see_the_reason(): void
    {
        $this->registerAdminRoutesThatRefuse();

        $this->actingAs($this->admin())
            ->get('/admin/__test/abort')
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/forbidden')
                ->where('reason', 'denied')
                ->where('message', 'Plans can’t be deleted, only hidden.'),
            );

        // The framework's generic wording is not worth repeating.
        $this->actingAs($this->admin())
            ->get('/admin/__test/gate')
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/forbidden')
                ->where('reason', 'denied')
                ->where('message', null),
            );
    }

    public function test_403s_outside_the_admin_are_left_alone(): void
    {
        Route::middleware('web')->get('/__test/forbidden', fn () => abort(403));

        $response = $this->actingAs($this->member())->get('/__test/forbidden');

        $response->assertForbidden();
        $this->assertStringNotContainsString('admin/forbidden', (string) $response->getContent());
    }
}
