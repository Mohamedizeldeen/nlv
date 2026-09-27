<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use Tests\TestCase;

/**
 * There is no public sign-up: admins add people from /admin/users.
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_is_turned_off(): void
    {
        $this->assertFalse(Features::enabled(Features::registration()));
        $this->assertFalse(Route::has('register'));
        $this->assertFalse(Route::has('register.store'));
    }

    public function test_the_registration_screen_is_not_found(): void
    {
        $this->get('/register')->assertNotFound();
    }

    public function test_posting_to_register_creates_nobody(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertNotFound();
        $this->assertGuest();
        $this->assertDatabaseCount(User::class, 0);
    }

    public function test_the_login_page_offers_no_sign_up(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('/register', false)
            ->assertDontSee('Sign up');
    }
}
