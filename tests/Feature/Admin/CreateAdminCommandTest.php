<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_verified_admin_from_options(): void
    {
        $this->artisan('admin:create', [
            'email' => 'Owner@Example.com',
            '--name' => 'Store Owner',
            '--password' => 'a-long-enough-secret',
        ])
            ->expectsOutputToContain('Admin [owner@example.com] created.')
            ->assertSuccessful();

        $admin = User::query()->where('email', 'owner@example.com')->firstOrFail();

        $this->assertTrue($admin->isAdmin());
        $this->assertSame('Store Owner', $admin->name);
        $this->assertNotNull($admin->email_verified_at);
        $this->assertTrue(Hash::check('a-long-enough-secret', $admin->password));
    }

    public function test_creating_and_promoting_admins_is_logged(): void
    {
        $this->artisan('admin:create', ['email' => 'owner@example.com', '--name' => 'Store Owner', '--password' => 'a-long-enough-secret'])
            ->assertSuccessful();

        $member = User::factory()->create(['email' => 'member@example.com', 'name' => 'Member']);

        $this->artisan('admin:create', ['email' => 'member@example.com'])->assertSuccessful();
        $this->artisan('admin:create', ['email' => 'member@example.com'])->assertSuccessful();

        $grants = ActivityLog::query()->where('event', 'user.admin_granted')->orderBy('id')->get();

        $this->assertCount(2, $grants);
        $this->assertSame('Store Owner was made an admin (admin:create)', $grants[0]->description);
        $this->assertTrue($grants[1]->subject?->is($member));

        $created = ActivityLog::query()->where('event', 'user.created')->where('subject_id', $grants[0]->subject_id)->sole();
        $this->assertSame([null, '[redacted]'], $created->properties['changes']['password']);
    }

    public function test_it_prompts_for_missing_input(): void
    {
        $this->artisan('admin:create')
            ->expectsQuestion('Email address', 'prompted@example.com')
            ->expectsQuestion('Name', 'Prompted Admin')
            ->expectsQuestion('Password', 'prompted-password-123')
            ->expectsQuestion('Confirm password', 'prompted-password-123')
            ->assertSuccessful();

        $admin = User::query()->where('email', 'prompted@example.com')->firstOrFail();

        $this->assertTrue($admin->isAdmin());
        $this->assertSame('Prompted Admin', $admin->name);
        $this->assertTrue(Hash::check('prompted-password-123', $admin->password));
    }

    public function test_it_refuses_passwords_shorter_than_twelve_characters(): void
    {
        $this->artisan('admin:create', [
            'email' => 'weak@example.com',
            '--name' => 'Weak',
            '--password' => 'short-pass1',
        ])
            ->expectsOutputToContain('at least 12 characters')
            ->assertFailed();

        $this->assertDatabaseMissing('users', ['email' => 'weak@example.com']);
    }

    public function test_it_refuses_an_invalid_email(): void
    {
        $this->artisan('admin:create', [
            'email' => 'not-an-email',
            '--name' => 'Nobody',
            '--password' => 'a-long-enough-secret',
        ])->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_requires_every_option_when_not_interactive(): void
    {
        $this->artisan('admin:create', ['email' => 'quiet@example.com', '--no-interaction' => true])
            ->expectsOutputToContain('--name and --password options are required')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_promotes_and_verifies_an_existing_user(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'member@example.com', 'name' => 'Member']);

        $this->artisan('admin:create', ['email' => 'member@example.com'])
            ->expectsOutputToContain('promoted to admin')
            ->assertSuccessful();

        $user->refresh();

        $this->assertTrue($user->isAdmin());
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('Member', $user->name);
        $this->assertTrue(Hash::check('password', $user->password));
        $this->assertDatabaseCount('users', 1);
    }

    public function test_rerunning_it_updates_the_password_of_an_existing_admin(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'dev@example.com']);

        $this->artisan('admin:create', [
            'email' => 'dev@example.com',
            '--password' => 'a-brand-new-secret',
        ])
            ->expectsOutputToContain('already an admin')
            ->assertSuccessful();

        $this->assertTrue(Hash::check('a-brand-new-secret', $admin->refresh()->password));
    }

    public function test_it_refuses_a_weak_new_password_for_an_existing_user(): void
    {
        $user = User::factory()->create(['email' => 'member@example.com']);

        $this->artisan('admin:create', ['email' => 'member@example.com', '--password' => 'short'])
            ->assertFailed();

        $user->refresh();

        $this->assertFalse($user->isAdmin());
        $this->assertTrue(Hash::check('password', $user->password));
    }
}
