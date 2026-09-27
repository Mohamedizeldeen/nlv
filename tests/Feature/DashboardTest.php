<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * The starter kit's /dashboard is gone: everyone works in the admin panel,
 * and old links to /dashboard land there for good (301).
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_starter_dashboard_route_is_gone(): void
    {
        $this->assertFalse(Route::has('dashboard'));
    }

    public function test_guests_are_sent_to_the_admin_panel_and_then_to_log_in(): void
    {
        $this->get('/dashboard')
            ->assertStatus(301)
            ->assertRedirect('/admin');

        $this->get('/admin')->assertRedirect(route('login'));
    }

    public function test_admins_are_sent_to_the_admin_panel(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get('/dashboard')
            ->assertStatus(301)
            ->assertRedirect(route('admin.dashboard'));
    }

    public function test_accounts_without_admin_access_are_sent_there_too(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertStatus(301)
            ->assertRedirect('/admin');

        // …where the panel's 403 page offers to log out.
        $this->actingAs($user)->get('/admin')->assertForbidden();
    }
}
