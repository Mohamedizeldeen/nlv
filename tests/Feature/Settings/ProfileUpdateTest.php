<?php

namespace Tests\Feature\Settings;

use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_a_new_email_address_is_sent_a_confirmation_link_straight_away(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => 'new@example.com',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('status', 'verification-link-sent');

        $user->refresh();

        $this->assertSame('new@example.com', $user->email);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, VerifyEmail::class);
        Notification::assertCount(1);
    }

    public function test_no_confirmation_link_is_sent_when_the_email_address_is_unchanged(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Renamed User',
                'email' => $user->email,
            ])
            ->assertSessionHasNoErrors()
            ->assertSessionMissing('status');

        Notification::assertNothingSent();
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete(route('profile.destroy'), [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_the_last_admin_cannot_delete_their_account(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors(['account' => 'You’re the only admin, so your account can’t be deleted. Make someone else an admin first.'])
            ->assertRedirect(route('profile.edit'));

        $this->assertAuthenticatedAs($admin);
        $this->assertNotNull($admin->fresh());
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.deleted')->count());
    }

    public function test_a_wrong_password_is_reported_before_the_last_admin_rule(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), ['password' => 'wrong-password'])
            ->assertSessionHasErrors('password')
            ->assertSessionDoesntHaveErrors('account');

        $this->assertNotNull($admin->fresh());
    }

    public function test_an_admin_can_delete_their_account_when_another_admin_remains(): void
    {
        $admin = Activity::withoutModelLogging(fn () => User::factory()->admin()->create(['name' => 'Jane Doe', 'email' => 'jane@example.com']));
        Activity::withoutModelLogging(fn () => User::factory()->admin()->create());
        $lead = Activity::withoutModelLogging(fn () => Lead::factory()->create(['assigned_to' => $admin->id]));

        $this->actingAs($admin)
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertNull($admin->fresh());
        $this->assertNull($lead->fresh()?->assigned_to);

        // The log keeps who did it, by name, once the account is gone.
        $deleted = ActivityLog::query()->where('event', 'user.deleted')->sole();

        $this->assertNull($deleted->user_id);
        $this->assertSame('Jane Doe', $deleted->causer_name);
        $this->assertSame('Jane Doe deleted their own account (jane@example.com)', $deleted->description);
        $this->assertSame('settings', $deleted->properties['via']);
        $this->assertSame(1, $deleted->properties['unassigned_leads']);

        $unassigned = ActivityLog::query()->where('event', 'lead.unassigned')->sole();

        $this->assertTrue($unassigned->subject?->is($lead));
        $this->assertSame('Jane Doe', $unassigned->causer_name);

        $logout = ActivityLog::query()->where('event', 'auth.logout')->sole();

        $this->assertNull($logout->user_id);
        $this->assertSame('Jane Doe', $logout->causer_name);

        // Deleting the account is not also logged as a visitor's user.deleted.
        $this->assertSame(0, ActivityLog::query()->where('event', 'user.deleted')->whereNull('causer_name')->count());
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->fresh());
    }
}
