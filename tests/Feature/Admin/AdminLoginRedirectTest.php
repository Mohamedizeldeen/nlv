<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class AdminLoginRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_admins_land_on_the_admin_panel_after_login(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($admin);
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_non_admins_still_land_on_the_dashboard_after_login(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_the_intended_url_wins_over_the_admin_panel(): void
    {
        $admin = User::factory()->admin()->create();

        $this->get(route('profile.edit'))->assertRedirect(route('login'));

        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('profile.edit'));
    }

    public function test_json_logins_keep_fortifys_payload(): void
    {
        $admin = User::factory()->admin()->create();

        $this->postJson(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk()->assertExactJson(['two_factor' => false]);
    }

    public function test_admins_land_on_the_admin_panel_after_the_two_factor_challenge(): void
    {
        $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

        $admin = User::factory()->admin()->withTwoFactor()->create();

        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('two-factor.login'));

        $response = $this->post(route('two-factor.login.store'), [
            'recovery_code' => 'recovery-code-1',
        ]);

        $this->assertAuthenticatedAs($admin);
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }
}
