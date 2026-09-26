<?php

namespace Tests\Feature\Admin;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Look;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotFoundPageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->admin()->create());
    }

    /**
     * The id of a look that existed and was deleted.
     */
    private function deletedLookId(): int
    {
        return Activity::withoutModelLogging(function (): int {
            $look = Look::factory()->create();
            $look->delete();

            return $look->id;
        });
    }

    public function test_admins_get_the_admin_not_found_page_for_a_deleted_record(): void
    {
        $admin = $this->admin();
        $id = $this->deletedLookId();

        // The binding fails before HandleInertiaRequests runs: the admin
        // layout's shared props must still be there.
        $this->actingAs($admin)
            ->get("/admin/looks/{$id}/edit")
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/not-found')
                ->where('path', "/admin/looks/{$id}/edit")
                ->where('auth.user.id', $admin->id)
                ->where('admin.newLeads', 0),
            );
    }

    public function test_an_admin_action_that_aborts_with_404_gets_the_page_too(): void
    {
        Route::middleware(['web', 'auth', 'verified', 'can:access-admin'])
            ->get('/admin/__test/missing', fn () => abort(404));

        $this->actingAs($this->admin())
            ->get('/admin/__test/missing')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/not-found')
                ->where('path', '/admin/__test/missing'),
            );
    }

    public function test_inertia_visits_get_the_page_as_an_inertia_response(): void
    {
        $id = $this->deletedLookId();

        $this->actingAs($this->admin())
            ->get("/admin/looks/{$id}/edit", [
                'X-Inertia' => 'true',
                'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->assertNotFound()
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'admin/not-found');
    }

    public function test_json_requests_keep_a_json_404(): void
    {
        $id = $this->deletedLookId();

        $this->actingAs($this->admin())
            ->getJson("/admin/looks/{$id}/edit")
            ->assertNotFound()
            ->assertHeaderMissing('X-Inertia');
    }

    public function test_guests_and_other_accounts_never_get_the_admin_page(): void
    {
        $id = $this->deletedLookId();

        $this->get("/admin/looks/{$id}/edit")->assertRedirect(route('login'));

        $member = Activity::withoutModelLogging(fn () => User::factory()->create());
        $response = $this->actingAs($member)->get("/admin/looks/{$id}/edit");

        $this->assertContains($response->getStatusCode(), [403, 404]);
        $this->assertStringNotContainsString('admin/not-found', (string) $response->getContent());
    }

    public function test_404s_outside_the_admin_are_left_alone(): void
    {
        Route::middleware('web')->get('/__test/missing', fn () => abort(404));

        $response = $this->actingAs($this->admin())->get('/__test/missing');

        $response->assertNotFound();
        $this->assertStringNotContainsString('admin/not-found', (string) $response->getContent());
    }
}
