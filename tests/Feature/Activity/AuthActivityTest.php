<?php

namespace Tests\Feature\Activity;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;
use Laravel\Fortify\Events\TwoFactorAuthenticationDisabled;
use Laravel\Fortify\Features;
use Tests\TestCase;

class AuthActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_sign_in_is_logged_with_the_user_ip_and_agent(): void
    {
        $user = User::factory()->create(['name' => 'Dev Admin']);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])
            ->withHeader('User-Agent', 'NLV-Test/1.0')
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

        $log = $this->latestLog('auth.login');

        $this->assertSame($user->id, $log->user_id);
        $this->assertTrue($log->subject?->is($user));
        $this->assertSame('Dev Admin signed in', $log->description);
        $this->assertSame('203.0.113.9', $log->ip_address);
        $this->assertSame('NLV-Test/1.0', $log->user_agent);
    }

    public function test_a_failed_sign_in_logs_the_email_but_never_the_password(): void
    {
        $user = User::factory()->create(['email' => 'owner@example.com']);

        $this->post(route('login.store'), ['email' => 'owner@example.com', 'password' => 'wrong-password-123']);

        $log = $this->latestLog('auth.login_failed');
        $raw = (string) ActivityLog::query()->whereKey($log->id)->toBase()->value('properties');

        $this->assertNull($log->user_id);
        $this->assertTrue($log->subject?->is($user));
        $this->assertSame('owner@example.com', $log->properties['email']);
        $this->assertTrue($log->properties['known_user']);
        $this->assertArrayNotHasKey('password', $log->properties);
        $this->assertStringNotContainsString('wrong-password-123', $raw);
    }

    public function test_a_failed_sign_in_for_an_unknown_email_is_logged(): void
    {
        $this->post(route('login.store'), ['email' => 'ghost@example.com', 'password' => 'whatever']);

        $log = $this->latestLog('auth.login_failed');

        $this->assertNull($log->subject_id);
        $this->assertFalse($log->properties['known_user']);
        $this->assertSame('Failed sign-in for ghost@example.com', $log->description);
    }

    public function test_a_sign_out_is_logged(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('logout'));

        $this->assertSame($user->id, $this->latestLog('auth.logout')->user_id);
    }

    public function test_a_password_reset_is_logged(): void
    {
        $this->skipUnlessFortifyHas(Features::resetPasswords());

        Notification::fake();

        $user = User::factory()->create(['name' => 'Dev Admin']);

        $this->post(route('password.email'), ['email' => $user->email]);

        $before = (int) ActivityLog::query()->max('id');

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            $this->post(route('password.update'), [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])->assertSessionHasNoErrors();

            return true;
        });

        // One entry, credited to the user: no automatic user.updated with a
        // hidden password change done by a "Visitor" as well.
        $entries = ActivityLog::query()->where('id', '>', $before)->get();

        $this->assertSame(['auth.password_reset'], $entries->pluck('event')->all());

        $log = $entries->sole();

        $this->assertTrue($log->subject?->is($user));
        $this->assertSame($user->id, $log->user_id);
        $this->assertSame('Dev Admin', $log->causer_name);
        $this->assertSame('Dev Admin reset their password', $log->description);
        $this->assertTrue(password_verify('new-password-123', (string) $user->fresh()?->password));
    }

    public function test_two_factor_changes_are_logged(): void
    {
        $user = User::factory()->create();

        TwoFactorAuthenticationConfirmed::dispatch($user);
        TwoFactorAuthenticationDisabled::dispatch($user);

        $this->assertSame($user->id, $this->latestLog('auth.two_factor_confirmed')->user_id);
        $this->assertSame($user->id, $this->latestLog('auth.two_factor_disabled')->user_id);
    }

    public function test_a_lockout_is_logged(): void
    {
        // Fortify's throttle middleware answers 429 before its own Lockout event;
        // the event still fires when the login limiter is not configured.
        event(new Lockout(Request::create('/login', 'POST', ['email' => 'owner@example.com', 'password' => 'secret-guess'])));

        $log = $this->latestLog('auth.lockout');

        $this->assertSame(['email' => 'owner@example.com'], $log->properties);
        $this->assertStringNotContainsString('secret-guess', (string) json_encode($log->properties));
    }

    private function latestLog(string $event): ActivityLog
    {
        $log = ActivityLog::query()->where('event', $event)->latest('id')->first();

        $this->assertNotNull($log, "No [{$event}] entry was logged.");

        return $log;
    }
}
