<?php

namespace App\Notifications;

use App\Support\Locales;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * The link an admin emails from /admin/users: to a new account ("choose your
 * password") or to an existing one ("choose a new password"). It opens the
 * app's own reset page (Fortify's password.reset route), so the token is a
 * normal password reset token and expires like one. Sent right away, not
 * queued, so the admin learns at once if the email could not be sent.
 */
class SetPasswordLink extends ResetPassword
{
    /**
     * @param  string  $token  the password reset token
     * @param  bool  $newAccount  true when the account was just created
     * @param  string  $sentBy  the admin's name
     */
    public function __construct(
        #[\SensitiveParameter] string $token,
        public bool $newAccount,
        public string $sentBy,
    ) {
        parent::__construct($token);

        // Staff email: English, like the admin panel.
        $this->locale(Locales::ENGLISH);
    }

    /**
     * How long the link works, in minutes (the password broker's setting).
     */
    public static function expiresInMinutes(): int
    {
        $broker = config('auth.defaults.passwords');
        $minutes = config('auth.passwords.'.(is_string($broker) ? $broker : 'users').'.expire');

        return is_numeric($minutes) ? (int) $minutes : 60;
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        $app = config('app.name');
        $app = is_string($app) && $app !== '' ? $app : 'NLV';
        $minutes = self::expiresInMinutes();
        $url = $this->resetUrl($notifiable);

        if ($this->newAccount) {
            return (new MailMessage)
                ->subject("Your {$app} admin account")
                ->greeting('Welcome aboard')
                ->line("{$this->sentBy} added you to the {$app} admin panel. Choose a password to sign in.")
                ->action('Choose your password', $url)
                ->line("The link works for {$minutes} minutes. If it runs out, use “Forgot your password?” on the sign-in page with this email address, or ask {$this->sentBy} for a new link.");
        }

        return (new MailMessage)
            ->subject("Choose a new password for {$app}")
            ->line("{$this->sentBy} sent you a link to choose a new password for your {$app} account.")
            ->action('Choose a new password', $url)
            ->line("The link works for {$minutes} minutes. Until you use it, your current password keeps working. If you weren’t expecting this, you can ignore this email.");
    }
}
