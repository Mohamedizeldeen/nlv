<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse;
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

    public function test_accounts_without_admin_access_land_on_the_panel_too_and_see_its_403_page(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('admin.dashboard', absolute: false));

        $this->get(route('admin.dashboard'))
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/forbidden')
                ->where('reason', 'not-admin'),
            );
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

    public function test_passkey_logins_land_on_the_admin_panel(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $request = Request::create('/passkeys/login', 'POST', server: ['HTTP_ACCEPT' => 'application/json']);
        $request->setLaravelSession($this->app['session.store']);

        $response = $this->app->make(PasskeyLoginResponse::class)->toResponse($request);

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertSame(['redirect' => route('admin.dashboard')], $response->getData(true));
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
