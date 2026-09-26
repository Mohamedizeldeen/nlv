<?php

namespace Tests\Feature\Admin;

use App\Http\Requests\Admin\Content\SiteContentRequest;
use App\Models\ActivityLog;
use App\Models\Setting;
use App\Models\User;
use App\Support\Activity;
use App\Support\LandingContent;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $this->get(route('admin.content.edit'))->assertRedirect(route('login'));
        $this->put(route('admin.content.update', 'contact'), ['contact' => ['email' => 'x@example.com']])
            ->assertRedirect(route('login'));

        $this->assertDatabaseCount('settings', 0);
    }

    public function test_non_admins_are_forbidden(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('admin.content.edit'))->assertForbidden();
        $this->put(route('admin.content.update', 'contact'), ['contact' => ['email' => 'x@example.com']])
            ->assertForbidden();

        $this->assertDatabaseCount('settings', 0);
    }

    public function test_the_page_opens_on_the_first_group_with_every_field_and_its_default(): void
    {
        $this->actingAs($this->admin())
            ->get(route('admin.content.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/content/edit')
                ->where('group', 'contact')
                ->where('groups', fn ($groups): bool => collect($groups)->pluck('key')->all()
                    === ['contact', 'social', 'stats', 'hero', 'sections', 'partners', 'order', 'footer', 'seo'])
                ->has('groups.0', fn (Assert $group) => $group
                    ->where('key', 'contact')
                    ->where('label', 'Contact details')
                    ->whereType('help', 'string')
                    ->where('total', 5)
                    ->where('customised', 0),
                )
                ->has('fields', 5)
                ->where('fields.0', [
                    'key' => 'contact.email',
                    'label' => 'Email',
                    'type' => 'email',
                    'help' => 'Shown in the order section ("Prefer email?") and used for the footer Contact link.',
                    'translatable' => false,
                    'default' => 'hello@tryon.app',
                    'value' => null,
                    'default_ar' => null,
                    'value_ar' => null,
                ])
                ->where('fields.1.default', null)
                ->where('fields.3.key', 'contact.address')
                ->where('fields.3.translatable', true)
                ->where('fields.3.value_ar', null)
                ->where('lastSaved', null),
            );
    }

    public function test_a_group_is_picked_with_the_query_string(): void
    {
        Settings::set('hero.title', 'Try it *on.*');
        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('admin.content.edit', ['group' => 'hero']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('group', 'hero')
                ->where('groups.3.customised', 1)
                ->where('fields', fn ($fields): bool => collect($fields)->every(fn (array $field): bool => str_starts_with($field['key'], 'hero.')))
                ->where('fields.1.key', 'hero.title')
                ->where('fields.1.type', 'accent')
                ->where('fields.1.translatable', true)
                ->where('fields.1.value', 'Try it *on.*')
                ->where('fields.1.default', 'Every screen is a *fitting room.*')
                ->where('fields.1.value_ar', null)
                ->where('fields.1.default_ar', 'كل شاشة *غرفة قياس.*'),
            );

        $this->get(route('admin.content.edit', ['group' => 'stats']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('fields.0.key', 'stats.stores')
                ->where('fields.0.translatable', false)
                ->where('fields.0.default', 140)
                ->where('fields.0.default_ar', null)
                ->where('fields.2.key', 'stats.tryons_year')
                ->where('fields.2.translatable', true)
                ->where('fields.2.default', '2.1M')
                ->where('fields.2.default_ar', '2.1 مليون'),
            );

        // The pricing group is edited on the plans page; unknown groups fall back to the first.
        foreach (['pricing', 'nope'] as $group) {
            $this->get(route('admin.content.edit', ['group' => $group]))
                ->assertInertia(fn (Assert $page) => $page->where('group', 'contact'));
        }
    }

    public function test_saving_a_group_stores_it_logs_one_entry_and_updates_the_landing_page(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->put(route('admin.content.update', 'contact'), [
                'contact' => [
                    'email' => 'sales@nlv.example',
                    'phone' => '+971 4 123 4567',
                    'whatsapp' => '',
                    'address' => "Office 12\nDubai Design District",
                    'lead_notify_email' => 'leads@nlv.example',
                ],
            ])
            ->assertRedirect(route('admin.content.edit', ['group' => 'contact']))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Contact details saved.']);

        $this->assertSame('sales@nlv.example', Settings::get('contact.email'));
        $this->assertSame('+971 4 123 4567', Settings::get('contact.phone'));
        $this->assertSame("Office 12\nDubai Design District", Settings::get('contact.address'));

        $content = LandingContent::build()['content'];
        $this->assertSame('sales@nlv.example', $content['contact.email']);
        $this->assertArrayNotHasKey('contact.lead_notify_email', $content);

        $log = ActivityLog::query()->sole();
        $this->assertSame('settings.updated', $log->event);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('Updated site content: Contact details', $log->description);
        $this->assertSame(['contact'], $log->properties['groups'] ?? null);
        $this->assertSame([
            'contact.email' => ['hello@tryon.app', 'sales@nlv.example'],
            'contact.phone' => ['', '+971 4 123 4567'],
            'contact.address' => ['', "Office 12\nDubai Design District"],
            'contact.lead_notify_email' => ['', 'leads@nlv.example'],
        ], $log->properties['changes'] ?? null);

        $this->get(route('admin.content.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('groups.0.customised', 4)
                ->where('fields.0.value', 'sales@nlv.example')
                ->where('fields.2.value', null)
                ->where('lastSaved.user', $admin->name)
                ->whereType('lastSaved.at', 'string'),
            );
    }

    public function test_an_empty_field_goes_back_to_its_default(): void
    {
        Settings::setMany(['hero.kicker' => 'Try before you buy', 'hero.title' => 'Try it *on.*']);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->put(route('admin.content.update', 'hero'), [
                'hero' => ['kicker' => '', 'title' => 'Try it *on.*'],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('In-store AI try-on', Settings::get('hero.kicker'));
        $this->assertSame('Try it *on.*', Settings::get('hero.title'));
        $this->assertNull(Setting::query()->where('key', 'hero.kicker')->value('value'));
        $this->assertSame('In-store AI try-on', LandingContent::build()['content']['hero.kicker']);

        $log = ActivityLog::query()->where('user_id', $admin->id)->sole();
        $this->assertSame(['hero.kicker' => ['Try before you buy', 'In-store AI try-on']], $log->properties['changes'] ?? null);
    }

    public function test_numbers_and_nested_section_keys_are_saved(): void
    {
        $this->actingAs($this->admin());

        $this->put(route('admin.content.update', 'stats'), ['stats' => ['stores' => '152', 'countries' => '']])
            ->assertSessionHasNoErrors();

        $this->assertSame(152, Settings::get('stats.stores'));
        $this->assertSame(14, Settings::get('stats.countries'));
        $this->assertSame(152, LandingContent::build()['stats']['stores']);

        $this->put(route('admin.content.update', 'sections'), [
            'sections' => ['kiosk' => ['title' => 'The mirror that *listens.*']],
        ])->assertSessionHasNoErrors();

        $this->assertSame('The mirror that *listens.*', Settings::get('sections.kiosk.title'));
    }

    public function test_saving_without_changes_logs_nothing(): void
    {
        $this->actingAs($this->admin())
            ->put(route('admin.content.update', 'footer'), [
                'footer' => ['statement' => '', 'company_line' => 'A product of NLV.', 'tagline' => null, 'fine_print' => ''],
            ])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'Nothing changed.']);

        $this->assertDatabaseCount('activity_logs', 0);
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_only_the_saved_groups_settings_change(): void
    {
        $this->actingAs($this->admin())
            ->put(route('admin.content.update', 'social'), [
                'social' => ['instagram' => 'https://www.instagram.com/nlv'],
                'hero' => ['title' => 'Sneaked *in.*'],
                'pricing' => ['currencies' => ['USD']],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('https://www.instagram.com/nlv', Settings::get('social.instagram'));
        $this->assertSame('Every screen is a *fitting room.*', Settings::get('hero.title'));
        $this->assertSame(['USD', 'EUR', 'GBP', 'AED', 'SAR'], Settings::get('pricing.currencies'));
        $this->assertSame(['social'], ActivityLog::query()->sole()->properties['groups'] ?? null);
    }

    public function test_each_field_type_is_validated(): void
    {
        $this->actingAs($this->admin());

        $this->put(route('admin.content.update', 'contact'), [
            'contact' => ['email' => 'not-an-email', 'phone' => '12ab', 'whatsapp' => '+1 (555) 010-7788'],
        ])->assertSessionHasErrors([
            'contact.email' => 'Enter an email address, like hello@example.com.',
            'contact.phone' => 'Use digits, spaces and + ( ) - only, with 7 to 20 digits.',
        ])->assertSessionDoesntHaveErrors('contact.whatsapp');

        $this->put(route('admin.content.update', 'social'), ['social' => ['x' => 'x.com/nlv']])
            ->assertSessionHasErrors(['social.x' => 'Enter a full web address starting with https://.']);

        $this->put(route('admin.content.update', 'stats'), ['stats' => ['stores' => '1,200', 'countries' => '-3']])
            ->assertSessionHasErrors([
                'stats.stores' => 'Enter a whole number, without commas.',
                'stats.countries' => 'Enter 0 or more.',
            ]);

        $this->put(route('admin.content.update', 'hero'), ['hero' => ['kicker' => str_repeat('a', 256)]])
            ->assertSessionHasErrors(['hero.kicker' => 'The Kicker field must not be greater than 255 characters.']);

        $this->assertDatabaseCount('settings', 0);
        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_each_language_shows_its_own_stored_copy(): void
    {
        // Stored as {"en": ..., "ar": ...}: the English input must still show the English.
        Settings::setMany([
            'hero.title' => ['en' => 'Try it *on.*', 'ar' => 'جرّبها *عليك.*'],
            'hero.kicker' => ['ar' => 'جرّب قبل أن تشتري'],
            'hero.lede' => 'A mirror for your shop floor.',
        ]);

        $this->actingAs($this->admin())
            ->get(route('admin.content.edit', ['group' => 'hero']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('groups.3.customised', 3)
                ->where('fields.0.key', 'hero.kicker')
                ->where('fields.0.value', null)
                ->where('fields.0.value_ar', 'جرّب قبل أن تشتري')
                ->where('fields.0.default', 'In-store AI try-on')
                ->where('fields.0.default_ar', 'التجربة الافتراضية داخل المتجر')
                ->where('fields.1.value', 'Try it *on.*')
                ->where('fields.1.value_ar', 'جرّبها *عليك.*')
                ->where('fields.2.key', 'hero.lede')
                ->where('fields.2.value', 'A mirror for your shop floor.')
                ->where('fields.2.value_ar', null),
            );
    }

    public function test_saving_the_arabic_stores_it_logs_it_and_updates_the_arabic_page(): void
    {
        $admin = $this->admin();

        // Warm both cached payloads: the save must refresh them.
        LandingContent::build('en');
        LandingContent::build('ar');

        $this->actingAs($admin)
            ->put(route('admin.content.update', 'hero'), [
                'hero' => [
                    'kicker' => 'Try before you buy',
                    'kicker_ar' => 'جرّب قبل أن تشتري',
                    'title' => '',
                    'title_ar' => 'كل مرآة *غرفة قياس.*',
                    'lede' => '',
                    'lede_ar' => '',
                ],
            ])
            ->assertRedirect(route('admin.content.edit', ['group' => 'hero']))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Hero saved.']);

        $this->assertSame(['en' => 'Try before you buy', 'ar' => 'جرّب قبل أن تشتري'], Setting::query()->where('key', 'hero.kicker')->value('value'));
        $this->assertSame(['en' => null, 'ar' => 'كل مرآة *غرفة قياس.*'], Setting::query()->where('key', 'hero.title')->value('value'));
        $this->assertDatabaseMissing('settings', ['key' => 'hero.lede']);

        $log = ActivityLog::query()->sole();
        $this->assertSame('settings.updated', $log->event);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame(['hero'], $log->properties['groups'] ?? null);
        $this->assertSame([
            'hero.kicker' => ['In-store AI try-on', 'Try before you buy'],
            'hero.kicker_ar' => ['التجربة الافتراضية داخل المتجر', 'جرّب قبل أن تشتري'],
            'hero.title_ar' => ['كل شاشة *غرفة قياس.*', 'كل مرآة *غرفة قياس.*'],
        ], $log->properties['changes'] ?? null);

        $this->assertSame('Every screen is a *fitting room.*', LandingContent::build('en')['content']['hero.title']);
        $this->assertSame('كل مرآة *غرفة قياس.*', LandingContent::build('ar')['content']['hero.title']);

        $this->get('/ar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.locale', 'ar')
                ->where('landing.content', fn ($content): bool => $content['hero.kicker'] === 'جرّب قبل أن تشتري'
                    && $content['hero.title'] === 'كل مرآة *غرفة قياس.*'
                    && $content['hero.lede'] === Settings::defaultFor('hero.lede', 'ar')),
            );

        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.content', fn ($content): bool => $content['hero.kicker'] === 'Try before you buy'
                    && $content['hero.title'] === 'Every screen is a *fitting room.*'),
            );
    }

    public function test_each_language_goes_back_to_its_own_default(): void
    {
        Settings::setMany([
            'hero.kicker' => ['en' => 'Try before you buy', 'ar' => 'جرّب قبل أن تشتري'],
            'partners.title' => ['en' => 'Around *the world.*', 'ar' => 'حول *العالم.*'],
        ]);
        $admin = $this->admin();

        // Reset the Arabic kicker only: the English stays.
        $this->actingAs($admin)
            ->put(route('admin.content.update', 'hero'), ['hero' => ['kicker' => 'Try before you buy', 'kicker_ar' => '']])
            ->assertSessionHasNoErrors();

        $this->assertSame('Try before you buy', Setting::query()->where('key', 'hero.kicker')->value('value'));
        $this->assertSame('Try before you buy', Settings::get('hero.kicker', 'en'));
        $this->assertSame('التجربة الافتراضية داخل المتجر', Settings::get('hero.kicker', 'ar'));
        $this->assertSame(
            ['hero.kicker_ar' => ['جرّب قبل أن تشتري', 'التجربة الافتراضية داخل المتجر']],
            ActivityLog::query()->where('user_id', $admin->id)->sole()->properties['changes'] ?? null,
        );

        // Reset the English title only: the Arabic stays.
        $this->put(route('admin.content.update', 'partners'), ['partners' => ['title' => '', 'title_ar' => 'حول *العالم.*']])
            ->assertSessionHasNoErrors();

        $this->assertSame('From NLV to *the world.*', Settings::get('partners.title', 'en'));
        $this->assertSame('حول *العالم.*', Settings::get('partners.title', 'ar'));

        $this->get(route('admin.content.edit', ['group' => 'partners']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('fields.1.key', 'partners.title')
                ->where('fields.1.value', null)
                ->where('fields.1.value_ar', 'حول *العالم.*'),
            );
    }

    public function test_the_arabic_inputs_are_validated_with_readable_names(): void
    {
        $this->actingAs($this->admin());

        $this->put(route('admin.content.update', 'hero'), [
            'hero' => ['kicker' => 'Fine', 'kicker_ar' => str_repeat('ع', 256), 'lede_ar' => str_repeat('ع', 2001)],
        ])->assertSessionHasErrors([
            'hero.kicker_ar' => 'The Arabic kicker field must not be greater than 255 characters.',
            'hero.lede_ar' => 'The Arabic introduction field must not be greater than 2000 characters.',
        ])->assertSessionDoesntHaveErrors('hero.kicker');

        $this->put(route('admin.content.update', 'sections'), [
            'sections' => ['how_it_works' => ['title_ar' => str_repeat('ع', 256)]],
        ])->assertSessionHasErrors([
            'sections.how_it_works.title_ar' => 'The How it works: Arabic title field must not be greater than 255 characters.',
        ]);

        $this->assertDatabaseCount('settings', 0);
        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_addresses_links_and_figures_have_no_arabic_version(): void
    {
        $this->actingAs($this->admin())
            ->put(route('admin.content.update', 'contact'), [
                'contact' => ['email' => 'sales@nlv.example', 'email_ar' => 'not-an-email'],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('sales@nlv.example', Setting::query()->where('key', 'contact.email')->value('value'));
        $this->assertSame('sales@nlv.example', Settings::get('contact.email', 'ar'));
        $this->assertSame(['contact.email'], array_keys(ActivityLog::query()->sole()->properties['changes'] ?? []));
    }

    public function test_arabic_labels_name_the_section_first(): void
    {
        $this->assertSame('Arabic kicker', SiteContentRequest::arabicLabel('Kicker'));
        $this->assertSame('Arabic try-ons this year', SiteContentRequest::arabicLabel('Try-ons this year'));
        $this->assertSame('Lookbook: Arabic "All" note', SiteContentRequest::arabicLabel('Lookbook: "All" note'));
    }

    public function test_groups_edited_elsewhere_and_unknown_groups_are_not_found(): void
    {
        $this->actingAs($this->admin());

        $this->put('/admin/content/pricing', ['pricing' => ['currencies' => ['USD']]])->assertNotFound();
        $this->put('/admin/content/nope', [])->assertNotFound();

        $this->assertDatabaseCount('settings', 0);
    }

    /**
     * A verified admin, created without an activity entry.
     */
    private function admin(): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->admin()->create());
    }
}
