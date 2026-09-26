<?php

namespace App\Listeners;

use App\Support\Activity;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Laravel\Fortify\Events\RecoveryCodesGenerated;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;
use Laravel\Fortify\Events\TwoFactorAuthenticationDisabled;
use Laravel\Fortify\Events\TwoFactorAuthenticationEnabled;
use Laravel\Fortify\Events\TwoFactorAuthenticationFailed;
use Laravel\Passkeys\Events\PasskeyDeleted;
use Laravel\Passkeys\Events\PasskeyRegistered;

/**
 * Writes sign-ins, sign-outs, failed attempts and account security changes to
 * the activity log as `auth.*` events. Passwords and codes are never logged.
 *
 * Registered through event discovery (each handle* method listens to the
 * event it type-hints).
 */
class RecordAuthActivity
{
    public function handleLogin(Login $event): void
    {
        $this->record('auth.login', $event->user, 'signed in', [
            'guard' => $event->guard,
            'remember' => $event->remember,
        ]);
    }

    public function handleLogout(Logout $event): void
    {
        if ($event->user === null) {
            return;
        }

        $this->record('auth.logout', $event->user, 'signed out', ['guard' => $event->guard]);
    }

    public function handleFailed(Failed $event): void
    {
        $email = $event->credentials['email'] ?? null;
        $email = is_string($email) ? mb_substr($email, 0, 190) : null;

        Activity::record(
            'auth.login_failed',
            $event->user instanceof Model ? $event->user : null,
            'Failed sign-in'.($email ? " for {$email}" : ''),
            ['email' => $email, 'guard' => $event->guard, 'known_user' => $event->user !== null],
            null,
        );
    }

    public function handleLockout(Lockout $event): void
    {
        $email = $event->request->input('email');
        $email = is_string($email) ? mb_substr($email, 0, 190) : null;

        Activity::record(
            'auth.lockout',
            null,
            'Too many sign-in attempts'.($email ? " for {$email}" : '').': temporarily locked out',
            ['email' => $email],
        );
    }

    public function handlePasswordReset(PasswordReset $event): void
    {
        $this->record('auth.password_reset', $event->user, 'reset their password');
    }

    public function handleVerified(Verified $event): void
    {
        if ($event->user instanceof Authenticatable) {
            $this->record('auth.email_verified', $event->user, 'verified their email address');
        }
    }

    public function handleTwoFactorEnabled(TwoFactorAuthenticationEnabled $event): void
    {
        $this->record('auth.two_factor_enabled', $event->user, 'started setting up two-factor authentication');
    }

    public function handleTwoFactorConfirmed(TwoFactorAuthenticationConfirmed $event): void
    {
        $this->record('auth.two_factor_confirmed', $event->user, 'turned on two-factor authentication');
    }

    public function handleTwoFactorDisabled(TwoFactorAuthenticationDisabled $event): void
    {
        $this->record('auth.two_factor_disabled', $event->user, 'turned off two-factor authentication');
    }

    public function handleTwoFactorFailed(TwoFactorAuthenticationFailed $event): void
    {
        $this->record('auth.two_factor_failed', $event->user, 'entered a wrong two-factor code', [], false);
    }

    public function handleRecoveryCodesGenerated(RecoveryCodesGenerated $event): void
    {
        $this->record('auth.recovery_codes_generated', $event->user, 'generated new two-factor recovery codes');
    }

    public function handlePasskeyRegistered(PasskeyRegistered $event): void
    {
        $this->record('auth.passkey_registered', $event->user, "added a passkey ({$event->passkey->name})");
    }

    public function handlePasskeyDeleted(PasskeyDeleted $event): void
    {
        $this->record('auth.passkey_deleted', $event->user, "removed a passkey ({$event->passkey->name})");
    }

    /**
     * Record an event done by (and to) the given user: "Dev Admin signed in".
     *
     * @param  array<string, mixed>  $properties
     * @param  bool  $byUser  false when the user is only the subject (a failed code is not "done" by them)
     */
    private function record(string $event, mixed $user, string $action, array $properties = [], bool $byUser = true): void
    {
        $subject = $user instanceof Model ? $user : null;
        $name = $subject?->getAttribute('name');

        Activity::record(
            $event,
            $subject,
            (is_string($name) && $name !== '' ? $name : 'Someone').' '.$action,
            $properties,
            $byUser && $user instanceof Authenticatable ? $user : null,
        );
    }
}
