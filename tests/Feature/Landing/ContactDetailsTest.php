<?php

namespace Tests\Feature\Landing;

use App\Models\LookCategory;
use App\Models\Plan;
use App\Support\Settings;
use Database\Seeders\LandingContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The phone, WhatsApp and office address from Site content reach the
 * public pages (the footer, the order section and the order pop-up read
 * them from `landing.content`), in the page's language, and are empty
 * strings while unset, which hides them.
 */
class ContactDetailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_they_are_empty_until_the_admin_fills_them_in(): void
    {
        foreach (['/', '/ar'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('welcome')
                    ->where('landing.content', fn ($content): bool => $content['contact.phone'] === ''
                        && $content['contact.whatsapp'] === ''
                        && $content['contact.address'] === ''),
                );
        }
    }

    public function test_the_landing_page_carries_them_in_both_languages(): void
    {
        Settings::setMany([
            'contact.phone' => '+971 4 123 4567',
            'contact.whatsapp' => '+971 50 123 4567',
            'contact.address' => [
                'en' => "Office 1204, Boulevard Plaza Tower 1\nDowntown Dubai",
                'ar' => "المكتب 1204، برج بوليفارد بلازا 1\nوسط مدينة دبي",
            ],
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.content', fn ($content): bool => $content['contact.phone'] === '+971 4 123 4567'
                    && $content['contact.whatsapp'] === '+971 50 123 4567'
                    && $content['contact.address'] === "Office 1204, Boulevard Plaza Tower 1\nDowntown Dubai"),
            );

        // The numbers are the same on the Arabic page; the address is its Arabic.
        $this->get('/ar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.content', fn ($content): bool => $content['contact.phone'] === '+971 4 123 4567'
                    && $content['contact.whatsapp'] === '+971 50 123 4567'
                    && $content['contact.address'] === "المكتب 1204، برج بوليفارد بلازا 1\nوسط مدينة دبي"),
            );
    }

    public function test_an_address_without_arabic_shows_the_english_on_the_arabic_page(): void
    {
        Settings::set('contact.address', 'Office 1204, Boulevard Plaza Tower 1');

        $this->get('/ar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.content', fn ($content): bool => $content['contact.address'] === 'Office 1204, Boulevard Plaza Tower 1'),
            );
    }

    public function test_the_not_found_page_footer_gets_them_too(): void
    {
        Settings::setMany(['contact.phone' => '+971 4 123 4567', 'contact.whatsapp' => '+971 50 123 4567']);

        $this->get('/ar/no/such/page')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('not-found')
                ->where('landing.content', fn ($content): bool => $content['contact.phone'] === '+971 4 123 4567'
                    && $content['contact.whatsapp'] === '+971 50 123 4567'),
            );
    }

    public function test_the_help_texts_say_how_to_write_them_and_where_they_show(): void
    {
        $schema = Settings::schema();

        $this->assertStringStartsWith('In international format, e.g. +971 4 123 4567.', (string) $schema['contact.phone']['help']);
        $this->assertStringStartsWith('In international format, e.g. +971 4 123 4567.', (string) $schema['contact.whatsapp']['help']);
        $this->assertStringContainsString('WhatsApp chat', (string) $schema['contact.whatsapp']['help']);
        $this->assertStringStartsWith('Shown in the footer.', (string) $schema['contact.address']['help']);
    }

    public function test_the_seeded_arabic_uses_the_revised_wording(): void
    {
        $this->seed(LandingContentSeeder::class);

        $this->assertSame('تختاره 6 من كل 10 متاجر جديدة', Plan::query()->where('key', 'lease')->value('badge_note_ar'));
        $this->assertSame('انتهت إلى الشراء', LookCategory::query()->where('slug', 'everyday')->value('stat_unit_ar'));

        $this->get('/ar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.pricing.plans.1.badgeNote', 'تختاره 6 من كل 10 متاجر جديدة')
                ->where('landing.lookbook.categories.1.stat', ['figure' => '38%', 'unit' => 'انتهت إلى الشراء']),
            );
    }
}
