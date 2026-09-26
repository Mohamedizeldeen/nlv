<?php

namespace Tests\Feature;

use App\Enums\LeadPlan;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Http\Requests\StoreOrderRequest;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Notifications\NewOrderRequest;
use App\Support\Settings;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OrderRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_order_request_is_stored_with_a_reference(): void
    {
        Notification::fake();

        $response = $this->from(route('home'))
            ->withServerVariables(['REMOTE_ADDR' => '198.51.100.7'])
            ->withHeader('User-Agent', 'Mozilla/5.0 (NLV test)')
            ->post(route('order-requests.store'), $this->payload());

        $response->assertRedirect(route('home'))->assertSessionHasNoErrors();

        $lead = Lead::query()->sole();

        $this->assertSame('NLV-'.str_pad((string) $lead->id, 6, '0', STR_PAD_LEFT), $lead->reference);
        $this->assertSame('Amira Haddad', $lead->name);
        $this->assertSame('Maison Rimal', $lead->company);
        $this->assertSame('amira@maisonrimal.test', $lead->email);
        $this->assertSame('+966 12 345 6789', $lead->phone);
        $this->assertSame(3, $lead->devices);
        $this->assertSame(LeadPlan::Lease, $lead->plan);
        $this->assertSame(LeadStatus::New, $lead->status);
        $this->assertSame(LeadSource::PricingLease, $lead->source);
        $this->assertNotNull($lead->consent_at);
        $this->assertSame('198.51.100.7', $lead->ip_address);
        $this->assertSame('Mozilla/5.0 (NLV test)', $lead->user_agent);

        $response->assertInertiaFlash('orderRequest.reference', $lead->reference);
    }

    public function test_the_submission_is_logged_once_as_lead_submitted(): void
    {
        Notification::fake();

        $this->post(route('order-requests.store'), $this->payload());

        $lead = Lead::query()->sole();
        $log = ActivityLog::query()->sole();

        $this->assertSame('lead.submitted', $log->event);
        $this->assertNull($log->user_id);
        $this->assertTrue($log->subject?->is($lead));
        $this->assertSame("Order request {$lead->reference} from Amira Haddad, Maison Rimal (3 devices)", $log->description);
        $this->assertSame(['source' => 'pricing-lease', 'plan' => 'lease', 'devices' => 3, 'locale' => 'en'], $log->properties);
    }

    public function test_the_sales_inbox_is_notified_by_a_queued_email(): void
    {
        Notification::fake();
        Settings::set('contact.lead_notify_email', 'sales@nlv.test');

        $this->post(route('order-requests.store'), $this->payload());

        $lead = Lead::query()->sole();

        Notification::assertSentOnDemand(
            NewOrderRequest::class,
            fn (NewOrderRequest $notification, array $channels, AnonymousNotifiable $notifiable): bool => $notification->lead->is($lead)
                && $channels === ['mail']
                && $notifiable->routes['mail'] === 'sales@nlv.test',
        );
        $this->assertInstanceOf(ShouldQueue::class, new NewOrderRequest($lead));
    }

    public function test_no_email_is_sent_without_a_notification_address(): void
    {
        Notification::fake();

        $this->post(route('order-requests.store'), $this->payload());

        $this->assertSame(1, Lead::query()->count());
        Notification::assertNothingSent();
    }

    public function test_the_email_describes_the_request(): void
    {
        $lead = Lead::factory()->create(['company' => 'Casa Lino', 'devices' => 2, 'plan' => LeadPlan::Buy]);

        $mail = (new NewOrderRequest($lead))->toMail(new AnonymousNotifiable);

        $this->assertSame("New order request {$lead->reference}: Casa Lino", $mail->subject);
        $this->assertStringContainsString('2 devices, plan: Buy', implode(' ', $mail->introLines));
        $this->assertSame([[$lead->email, $lead->name]], $mail->replyTo);
    }

    public function test_every_field_is_required(): void
    {
        $this->post(route('order-requests.store'), [])
            ->assertSessionHasErrors(['name', 'company', 'email', 'phone', 'country', 'city', 'devices', 'plan', 'message', 'consent']);

        $this->assertSame(0, Lead::query()->count());
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_each_field_is_validated(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);

        $invalid = [
            'email' => 'not-an-email',
            'phone' => '12-34',
            'devices' => 0,
            'plan' => 'free-trial',
            'message' => 'Too short',
            'consent' => '0',
            'name' => str_repeat('n', 121),
        ];

        foreach ($invalid as $field => $value) {
            $this->post(route('order-requests.store'), [...$this->payload(), $field => $value])
                ->assertSessionHasErrors($field);
        }

        $this->post(route('order-requests.store'), [...$this->payload(), 'devices' => 1000])->assertSessionHasErrors('devices');
        $this->post(route('order-requests.store'), [...$this->payload(), 'phone' => 'call me maybe'])->assertSessionHasErrors('phone');
        $this->post(route('order-requests.store'), [...$this->payload(), 'phone' => '+1 (555) 123-4567-8901-2345-678'])->assertSessionHasErrors('phone');

        $this->assertSame(0, Lead::query()->count());
    }

    public function test_every_landing_cta_is_a_known_source(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);

        $sources = ['hero', 'navbar', 'mobile-menu', 'pricing-buy', 'pricing-lease', 'pricing-chain', 'lookbook', 'order-section', 'footer'];

        foreach ($sources as $source) {
            $this->post(route('order-requests.store'), [...$this->payload(), 'source' => $source])
                ->assertSessionHasNoErrors();
        }

        $this->assertSame($sources, Lead::query()->orderBy('id')->get()->map(fn (Lead $lead): ?string => $lead->source?->value)->all());
    }

    public function test_missing_fields_get_plain_messages(): void
    {
        $this->post(route('order-requests.store'), [])->assertSessionHasErrors([
            'name' => 'Enter your full name.',
            'company' => 'Enter your company or store name.',
            'email' => 'Enter your work email.',
            'phone' => 'Enter a phone number our team can call.',
            'devices' => 'Enter how many devices you need.',
            'plan' => 'Choose how you would like to own the device.',
            'consent' => 'Please agree to be contacted about this order.',
        ]);
    }

    public function test_an_unknown_source_is_dropped_rather_than_refused(): void
    {
        $this->post(route('order-requests.store'), [...$this->payload(), 'source' => 'somewhere-else'])
            ->assertSessionHasNoErrors();

        $this->assertNull(Lead::query()->sole()->source);
    }

    public function test_the_source_is_optional(): void
    {
        $payload = $this->payload();
        unset($payload['source']);

        $this->post(route('order-requests.store'), $payload)->assertSessionHasNoErrors();

        $this->assertNull(Lead::query()->sole()->source);
    }

    public function test_a_filled_honeypot_is_accepted_silently_and_discarded(): void
    {
        Notification::fake();
        Settings::set('contact.lead_notify_email', 'sales@nlv.test');
        $logged = ActivityLog::query()->count();

        $this->from(route('home'))
            ->post(route('order-requests.store'), ['website' => 'https://spam.example', 'name' => 'Bot'])
            ->assertRedirect(route('home'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('orderRequest.reference', null);

        $this->assertSame(0, Lead::query()->count());
        $this->assertSame($logged, ActivityLog::query()->count());
        Notification::assertNothingSent();
    }

    public function test_requests_are_throttled_per_minute(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('order-requests.store'), $this->payload())->assertRedirect();
        }

        $this->from(route('home'))
            ->post(route('order-requests.store'), $this->payload())
            ->assertRedirect(route('home'))
            ->assertSessionHasErrors(['form' => 'Too many requests from your connection. Please wait a minute and try again.']);
        $this->assertSame(5, Lead::query()->count());

        $this->travel(61)->seconds();

        $this->post(route('order-requests.store'), $this->payload())->assertRedirect();
        $this->assertSame(6, Lead::query()->count());
    }

    public function test_requests_are_throttled_per_day(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            $this->post(route('order-requests.store'), $this->payload())->assertRedirect();

            if ($i % 5 === 0) {
                $this->travel(61)->seconds();
            }
        }

        $this->post(route('order-requests.store'), $this->payload())
            ->assertSessionHasErrors(['form' => 'Too many requests from your connection today. Please email us at hello@tryon.app instead.']);
        $this->assertSame(20, Lead::query()->count());
    }

    public function test_the_throttle_answers_in_the_language_of_the_page(): void
    {
        // The throttle runs before the form request sets the language: it
        // reads the pop-up's `locale` itself. Invalid requests count too.
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('order-requests.store'), ['locale' => 'ar'])->assertRedirect();
        }

        $this->from(route('ar.home'))
            ->post(route('order-requests.store'), [...$this->payload(), 'locale' => 'ar'])
            ->assertRedirect(route('ar.home'))
            ->assertSessionHasErrors(['form' => 'وصلتنا طلبات كثيرة من اتصالك. يُرجى الانتظار دقيقة ثم المحاولة مرة أخرى.']);

        // An unknown or missing language is English, as in the form's own messages.
        foreach (['fr', null] as $locale) {
            $this->post(route('order-requests.store'), [...$this->payload(), 'locale' => $locale])
                ->assertSessionHasErrors(['form' => 'Too many requests from your connection. Please wait a minute and try again.']);
        }

        $this->assertSame(0, Lead::query()->count());
    }

    public function test_the_daily_throttle_answers_in_arabic_with_the_contact_email(): void
    {
        Settings::set('contact.email', 'sales@nlv.test');

        for ($i = 1; $i <= 20; $i++) {
            $this->post(route('order-requests.store'), ['locale' => 'ar'])->assertRedirect();

            if ($i % 5 === 0) {
                $this->travel(61)->seconds();
            }
        }

        $this->post(route('order-requests.store'), [...$this->payload(), 'locale' => 'ar'])
            ->assertSessionHasErrors(['form' => 'وصلتنا طلبات كثيرة من اتصالك اليوم. يُرجى مراسلتنا على sales@nlv.test بدلًا من ذلك.']);
        $this->assertSame(0, Lead::query()->count());
    }

    public function test_the_language_of_the_page_is_stored_on_the_lead(): void
    {
        Notification::fake();
        $this->withoutMiddleware(ThrottleRequests::class);

        $this->post(route('order-requests.store'), [...$this->payload(), 'locale' => 'ar'])->assertSessionHasNoErrors();
        $this->post(route('order-requests.store'), $this->payload())->assertSessionHasNoErrors();
        $this->post(route('order-requests.store'), [...$this->payload(), 'locale' => 'fr'])->assertSessionHasNoErrors();

        $this->assertSame(['ar', 'en', 'en'], Lead::query()->orderBy('id')->pluck('locale')->all());
        $this->assertTrue(Lead::query()->orderBy('id')->firstOrFail()->isArabic());
        $this->assertSame('ar', ActivityLog::query()->where('event', 'lead.submitted')->orderBy('id')->firstOrFail()->properties['locale'] ?? null);
    }

    public function test_arabic_names_are_isolated_in_the_log_description(): void
    {
        Notification::fake();

        $this->post(route('order-requests.store'), [
            ...$this->payload(),
            'name' => 'نورة الحربي',
            'company' => 'رمال للعبايات',
            'devices' => '1',
            'locale' => 'ar',
        ])->assertSessionHasNoErrors();

        $lead = Lead::query()->sole();

        // Each Arabic value sits in its own isolate, so the English line keeps
        // "name, company" in that order; the stored lead itself is untouched.
        $this->assertSame(
            "Order request {$lead->reference} from \u{2068}نورة الحربي\u{2069}, \u{2068}رمال للعبايات\u{2069} (1 device)",
            ActivityLog::query()->sole()->description,
        );
        $this->assertSame('نورة الحربي', $lead->name);
    }

    public function test_the_messages_are_in_arabic_for_the_arabic_page(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);

        $this->post(route('order-requests.store'), ['locale' => 'ar'])->assertSessionHasErrors([
            'name' => 'أدخل اسمك الكامل.',
            'company' => 'أدخل اسم شركتك أو متجرك.',
            'email' => 'أدخل بريد العمل الإلكتروني.',
            'phone' => 'أدخل رقم هاتف يستطيع فريقنا الاتصال بك عليه.',
            'country' => 'أدخل البلد الذي يقع فيه متجرك.',
            'city' => 'أدخل المدينة التي يقع فيها متجرك.',
            'devices' => 'أدخل عدد الأجهزة التي تحتاج إليها.',
            'plan' => 'اختر الطريقة التي تفضّلها لامتلاك الجهاز.',
            'message' => 'حدّثنا قليلًا عن متجرك وعمّا تحتاج إليه.',
            'consent' => 'يُرجى الموافقة على تواصلنا معك بشأن هذا الطلب.',
        ]);

        $this->post(route('order-requests.store'), [
            ...$this->payload(),
            'locale' => 'ar',
            'name' => str_repeat('n', 121),
            'email' => 'not-an-email',
            'devices' => 1000,
            'plan' => 'free-trial',
            'message' => 'قصيرة',
        ])->assertSessionHasErrors([
            'name' => 'الحد الأقصى لعدد الأحرف هنا 120.',
            'email' => 'أدخل عنوان بريد إلكتروني كاملًا، مثل name@yourstore.com.',
            'devices' => 'لأكثر من 999 جهازًا، راسلنا وسنضع معك خطة التركيب في متاجرك.',
            'plan' => 'اختر إحدى طرق امتلاك الجهاز.',
            'message' => 'حدّثنا أكثر قليلًا (10 أحرف على الأقل).',
        ]);

        $this->assertSame(0, Lead::query()->count());
    }

    public function test_every_arabic_message_is_translated(): void
    {
        $arabic = json_decode((string) file_get_contents(lang_path('ar.json')), true);
        $request = new StoreOrderRequest;

        app()->setLocale('en');

        foreach ([...$request->messages(), ...$request->attributes()] as $english) {
            $this->assertArrayHasKey($english, $arabic, "No Arabic for “{$english}”.");
        }
    }

    public function test_the_english_page_keeps_its_english_messages(): void
    {
        $this->post(route('order-requests.store'), [...$this->payload(), 'name' => str_repeat('n', 121), 'locale' => 'en'])
            ->assertSessionHasErrors(['name' => 'Keep this to 120 characters or fewer.']);
    }

    public function test_the_email_asks_for_an_arabic_reply_for_the_arabic_page(): void
    {
        $lead = Lead::factory()->arabic()->create(['company' => 'Casa Lino']);

        $mail = (new NewOrderRequest($lead))->toMail(new AnonymousNotifiable);

        $this->assertSame("New order request {$lead->reference}: Casa Lino (Arabic)", $mail->subject);
        $this->assertSame('**Reply in Arabic.** This request was sent from the Arabic page.', $mail->introLines[0]);

        $english = Lead::factory()->create();
        $this->assertStringNotContainsString('Arabic', implode(' ', (new NewOrderRequest($english))->toMail(new AnonymousNotifiable)->introLines));
    }

    public function test_the_email_is_sent_in_english_from_an_arabic_request(): void
    {
        Notification::fake();
        Settings::set('contact.lead_notify_email', 'sales@nlv.test');

        $this->post(route('order-requests.store'), [...$this->payload(), 'locale' => 'ar'])->assertSessionHasNoErrors();

        Notification::assertSentOnDemand(
            NewOrderRequest::class,
            fn (NewOrderRequest $notification): bool => $notification->locale === 'en' && $notification->lead->isArabic(),
        );
    }

    /**
     * A complete, valid order request.
     *
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'name' => 'Amira Haddad',
            'company' => 'Maison Rimal',
            'email' => 'amira@maisonrimal.test',
            'phone' => '+966 12 345 6789',
            'country' => 'Saudi Arabia',
            'city' => 'Jeddah',
            'devices' => '3',
            'plan' => 'lease',
            'message' => 'We would like two devices for the Tahlia Street store and one for the mall.',
            'consent' => '1',
            'source' => 'pricing-lease',
            'website' => '',
        ];
    }
}
