<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GrantAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_promotes_an_existing_user(): void
    {
        $user = User::factory()->create(['email' => 'member@example.com']);

        $this->artisan('admin:grant', ['email' => 'Member@Example.com'])
            ->expectsOutputToContain('[member@example.com] promoted to admin.')
            ->assertSuccessful();

        $this->assertTrue($user->refresh()->isAdmin());
    }

    public function test_the_promotion_is_logged_once(): void
    {
        $user = User::factory()->create(['email' => 'member@example.com', 'name' => 'Member']);

        $this->artisan('admin:grant', ['email' => 'member@example.com'])->assertSuccessful();

        $log = ActivityLog::query()->where('event', 'user.admin_granted')->sole();

        $this->assertTrue($log->subject?->is($user));
        $this->assertSame('Member was made an admin (admin:grant)', $log->description);
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.updated')->count());
    }

    public function test_it_is_idempotent_for_admins(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        $this->artisan('admin:grant', ['email' => 'admin@example.com'])
            ->expectsOutputToContain('already an admin')
            ->assertSuccessful();

        $this->assertTrue($admin->refresh()->isAdmin());
    }

    public function test_it_fails_for_an_unknown_email(): void
    {
        $this->artisan('admin:grant', ['email' => 'ghost@example.com'])
            ->expectsOutputToContain('No user found')
            ->assertFailed();
    }

    public function test_it_warns_when_the_user_is_not_verified(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'new@example.com']);

        $this->artisan('admin:grant', ['email' => 'new@example.com'])
            ->expectsOutputToContain('not verified')
            ->assertSuccessful();

        $this->assertTrue($user->refresh()->isAdmin());
        $this->assertNull($user->email_verified_at);
    }
}
