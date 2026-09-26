<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Support\Locales;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails a new order request to the address in setting `contact.lead_notify_email`.
 * The email is for the NLV team, so it is always in English; a request sent
 * from the Arabic page says so, in the subject and first line, so the team
 * answers in Arabic.
 *
 * Everything the visitor typed is shown literally: the mail body is Markdown,
 * so their text is escaped first (Blade already encodes < > & " '), and the
 * message's web addresses are defused so neither Markdown nor the mail app
 * turns them into links.
 */
class NewOrderRequest extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Invisible, zero-width: breaks a web address up so mail apps don't link it.
     */
    private const LINK_BREAK = "\u{200B}";

    /**
     * Create a new notification instance.
     */
    public function __construct(public Lead $lead)
    {
        $this->afterCommit();

        // Not the visitor's language: the pop-up on the Arabic page switches
        // the request to Arabic, and a sync queue would send it from there.
        $this->locale(Locales::ENGLISH);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $lead = $this->lead;
        $devices = $lead->devices === 1 ? 'device' : 'devices';

        $mail = (new MailMessage)
            ->subject("New order request {$lead->reference}: {$lead->company}".($lead->isArabic() ? ' (Arabic)' : ''))
            ->replyTo($lead->email, $lead->name)
            ->greeting("New order request {$lead->reference}");

        if ($lead->isArabic()) {
            $mail->line('**Reply in Arabic.** This request was sent from the Arabic page.');
        }

        $mail
            ->line(self::literal("{$lead->name} from {$lead->company} ({$lead->city}, {$lead->country}) asked about {$lead->devices} {$devices}, plan: {$lead->plan->label()}.", defuseLinks: true))
            // The address stays linkable: it's who to answer (Reply goes there too).
            ->line(self::literal("Email: {$lead->email}"))
            ->line(self::literal("Phone: {$lead->phone}", defuseLinks: true))
            ->line('Message:');

        // One paragraph per line of the message (a mail line collapses line breaks).
        foreach (preg_split('/\R/u', $lead->message) ?: [] as $line) {
            if (trim($line) !== '') {
                $mail->line(self::literal($line, defuseLinks: true));
            }
        }

        return $mail
            ->action('Open in the admin panel', route('admin.leads.show', $lead))
            ->line('Reply to this email to answer them directly.');
    }

    /**
     * One line of visitor text as Markdown that renders exactly as typed:
     * inline markup (emphasis, code, links, images) and block markers at
     * the start (headings, lists, rules, fences) are backslash-escaped.
     * With $defuseLinks, "://", "www." and dots inside words get a
     * zero-width space, so no web address is auto-linked by mail apps.
     */
    public static function literal(string $text, bool $defuseLinks = false): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

        // Inline markup anywhere: \ ` * _ [ ] (and so links, images, emphasis, code spans).
        $text = preg_replace('/([\\\\`*_\[\]])/', '\\\\$1', $text) ?? '';

        // Block markers at the start: # heading, - + list or rule, = setext, ~~~ fence, "1." / "1)" list.
        $text = preg_replace(['/^([#+\-=~])/', '/^(\d+)([.)])/'], ['\\\\$1', '$1\\\\$2'], $text) ?? '';

        if ($defuseLinks) {
            $text = str_ireplace(['://', 'www.'], [':'.self::LINK_BREAK.'//', 'www'.self::LINK_BREAK.'.'], $text);
            $text = preg_replace('/(?<=[\p{L}\p{N}])\.(?=[\p{L}\p{N}])/u', self::LINK_BREAK.'.', $text) ?? '';
        }

        return $text;
    }
}
