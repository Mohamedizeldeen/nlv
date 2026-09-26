<?php

namespace Tests\Feature\Landing;

use App\Models\ActivityLog;
use App\Models\Setting;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_setting_in_the_schema_is_well_formed(): void
    {
        $groups = array_keys(Settings::groups());

        $this->assertNotEmpty(Settings::schema());

        foreach (Settings::schema() as $key => $definition) {
            $this->assertMatchesRegularExpression('/^[a-z_]+(\.[a-z0-9_]+)+$/', $key);
            $this->assertContains($definition['group'], $groups, "[{$key}] has an unknown group.");
            $this->assertSame($definition['group'], explode('.', $key)[0], "[{$key}] is not in its group's namespace.");
            $this->assertNotSame('', $definition['label']);
        }
    }

    public function test_unset_settings_read_their_defaults(): void
    {
        $this->assertSame('In-store AI try-on', Settings::get('hero.kicker'));
        $this->assertSame('Every screen is a *fitting room.*', Settings::string('hero.title'));
        $this->assertSame(140, Settings::integer('stats.stores'));
        $this->assertSame(['USD', 'EUR', 'GBP', 'AED', 'SAR'], Settings::list('pricing.currencies'));
        $this->assertSame('', Settings::string('contact.phone'));
        $this->assertSame('fallback', Settings::get('not.a.setting', default: 'fallback'));
    }

    public function test_settings_can_be_stored_and_read_back(): void
    {
        Settings::set('contact.email', ' sales@nlv.test ');
        Settings::set('stats.stores', '152');

        $this->assertSame('sales@nlv.test', Settings::get('contact.email'));
        $this->assertSame(152, Settings::get('stats.stores'));
        $this->assertDatabaseHas('settings', ['key' => 'contact.email']);
    }

    public function test_storing_null_goes_back_to_the_default(): void
    {
        Settings::set('hero.kicker', 'Custom kicker');
        Settings::set('hero.kicker', null);

        $this->assertSame('In-store AI try-on', Settings::get('hero.kicker'));
    }

    public function test_reads_are_cached_until_a_setting_changes(): void
    {
        Settings::set('hero.kicker', 'First');
        $this->assertSame('First', Settings::get('hero.kicker'));

        // A change behind the model's back is not seen until the cache is cleared.
        DB::table('settings')->where('key', 'hero.kicker')->update(['value' => json_encode('Sneaky')]);
        $this->assertSame('First', Settings::get('hero.kicker'));

        Settings::forget();
        $this->assertSame('Sneaky', Settings::get('hero.kicker'));

        Setting::query()->where('key', 'hero.kicker')->firstOrFail()->update(['value' => 'Saved']);
        $this->assertSame('Saved', Settings::get('hero.kicker'));
    }

    public function test_saving_several_settings_logs_one_grouped_entry(): void
    {
        $changes = Settings::setMany([
            'contact.email' => 'sales@nlv.test',
            'hero.kicker' => 'In-store AI try-on',
            'hero.title' => 'A new *headline.*',
        ]);

        $this->assertSame([
            'contact.email' => ['hello@tryon.app', 'sales@nlv.test'],
            'hero.title' => ['Every screen is a *fitting room.*', 'A new *headline.*'],
        ], $changes);

        $logs = ActivityLog::query()->get();

        $this->assertCount(1, $logs);
        $this->assertSame('settings.updated', $logs[0]->event);
        $this->assertSame('Updated site settings: Contact details, Hero', $logs[0]->description);
        $this->assertSame(['contact', 'hero'], $logs[0]->properties['groups']);
        $this->assertSame($changes, $logs[0]->properties['changes']);
    }

    public function test_nothing_is_logged_when_nothing_changed(): void
    {
        $this->assertSame([], Settings::setMany(['hero.kicker' => 'In-store AI try-on', 'stats.stores' => 140]));
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_a_custom_event_can_be_logged(): void
    {
        Settings::setMany(['pricing.currencies' => ['eur', 'USD', 'XYZ']], 'pricing.updated', 'Updated pricing currencies');

        $log = ActivityLog::query()->sole();

        $this->assertSame('pricing.updated', $log->event);
        $this->assertSame(['EUR', 'USD'], Settings::list('pricing.currencies'));
        $this->assertSame([['code' => 'EUR', 'name' => 'euros'], ['code' => 'USD', 'name' => 'US dollars']], Settings::currencies());
    }

    public function test_unknown_keys_are_refused(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Settings::set('hero.nope', 'x');
    }

    public function test_rules_validate_nested_input_and_from_input_flattens_it(): void
    {
        $input = [
            'contact' => ['email' => 'sales@nlv.test', 'phone' => '+971 4 123 4567', 'whatsapp' => 'call me'],
            'stats' => ['stores' => 'many'],
            'social' => ['instagram' => 'javascript:alert(1)'],
        ];

        $validator = Validator::make($input, Settings::rules());

        $this->assertEqualsCanonicalizing(
            ['contact.whatsapp', 'stats.stores', 'social.instagram'],
            array_keys($validator->errors()->messages()),
        );

        $valid = Validator::make(['contact' => ['email' => 'sales@nlv.test']], Settings::rules('contact'))->validate();

        $this->assertSame(['contact.email' => 'sales@nlv.test'], Settings::fromInput($valid, 'contact'));
    }

    public function test_copy_settings_are_translatable_and_the_rest_are_not(): void
    {
        foreach (Settings::schema() as $key => $definition) {
            $isCopy = in_array($definition['type'], Settings::COPY_TYPES, true);

            $this->assertSame($isCopy, $definition['translatable'], "[{$key}] should ".($isCopy ? '' : 'not ').'be translatable.');

            if ($isCopy) {
                $this->assertArrayHasKey('default_ar', (array) config('landing.settings')[$key], "[{$key}] has no default_ar.");
            }
        }

        $this->assertTrue(Settings::translatable('hero.title'));
        $this->assertFalse(Settings::translatable('contact.email'));
        $this->assertFalse(Settings::translatable('stats.stores'));
        $this->assertFalse(Settings::translatable('not.a.setting'));
    }

    public function test_arabic_reads_the_stored_arabic_then_its_default_then_the_english(): void
    {
        $this->setArabicDefault('hero.kicker', 'التجربة الافتراضية في المتجر');
        $this->setArabicDefault('hero.title', '');

        // Nothing stored: the Arabic default, else the English default.
        $this->assertSame('التجربة الافتراضية في المتجر', Settings::get('hero.kicker', 'ar'));
        $this->assertSame('Every screen is a *fitting room.*', Settings::get('hero.title', 'ar'));

        // An English edit shows in Arabic until there is Arabic.
        Settings::set('hero.title', 'Try it *on.*');
        $this->assertSame('Try it *on.*', Settings::get('hero.title', 'ar'));

        Settings::set('hero.title', 'جرّبها *عليك.*', 'ar');
        $this->assertSame('جرّبها *عليك.*', Settings::get('hero.title', 'ar'));
        $this->assertSame('Try it *on.*', Settings::get('hero.title', 'en'));
        $this->assertSame('Try it *on.*', Settings::get('hero.title'));

        // Non-translatable settings are the same in both languages.
        Settings::set('contact.email', 'sales@nlv.test');
        $this->assertSame('sales@nlv.test', Settings::get('contact.email', 'ar'));
        $this->assertSame(140, Settings::get('stats.stores', 'ar'));
    }

    public function test_reads_without_a_locale_use_the_current_language(): void
    {
        Settings::set('hero.kicker', 'تجربة في المتجر', 'ar');

        $this->assertSame('In-store AI try-on', Settings::string('hero.kicker'));

        app()->setLocale('ar');

        $this->assertSame('تجربة في المتجر', Settings::string('hero.kicker'));
        $this->assertSame('تجربة في المتجر', Settings::all()['hero.kicker']);
        $this->assertSame('In-store AI try-on', Settings::string('hero.kicker', 'en'));
    }

    public function test_translations_are_stored_as_en_and_ar_and_plain_values_are_english(): void
    {
        // Without an Arabic default, so a missing Arabic reads as the English.
        $this->setArabicDefault('hero.title', '');

        Settings::set('hero.kicker', 'Try before you buy');
        $this->assertSame('Try before you buy', Setting::query()->where('key', 'hero.kicker')->value('value'));

        Settings::set('hero.kicker', 'جرّب قبل أن تشتري', 'ar');
        $this->assertSame(['en' => 'Try before you buy', 'ar' => 'جرّب قبل أن تشتري'], Setting::query()->where('key', 'hero.kicker')->value('value'));

        // Setting the English keeps the Arabic, and the other way round.
        Settings::set('hero.kicker', 'Try it first');
        Settings::set('hero.title', 'عنوان *جديد.*', 'ar');
        $this->assertSame(['en' => 'Try it first', 'ar' => 'جرّب قبل أن تشتري'], Setting::query()->where('key', 'hero.kicker')->value('value'));
        $this->assertSame(['en' => null, 'ar' => 'عنوان *جديد.*'], Setting::query()->where('key', 'hero.title')->value('value'));
        $this->assertSame('Every screen is a *fitting room.*', Settings::get('hero.title', 'en'));

        // Both at once; null puts a language back to its default.
        Settings::setMany(['hero.kicker' => ['en' => null, 'ar' => 'تجربة في المتجر']]);
        $this->assertSame('In-store AI try-on', Settings::get('hero.kicker', 'en'));
        $this->assertSame('تجربة في المتجر', Settings::get('hero.kicker', 'ar'));

        // Without Arabic the English is stored plain again.
        Settings::set('hero.kicker', null, 'ar');
        $this->assertNull(Setting::query()->where('key', 'hero.kicker')->value('value'));

        // A value stored before translations existed reads as the English.
        DB::table('settings')->where('key', 'hero.title')->update(['value' => json_encode('Old *plain* value')]);
        Settings::forget();
        $this->assertSame('Old *plain* value', Settings::get('hero.title', 'en'));
        $this->assertSame('Old *plain* value', Settings::get('hero.title', 'ar'));
    }

    public function test_arabic_changes_are_logged_as_key_ar(): void
    {
        // Without Arabic defaults, so each Arabic change starts from nothing.
        $this->setArabicDefault('hero.title', '');
        $this->setArabicDefault('hero.kicker', '');

        $changes = Settings::setMany([
            'hero.title' => ['en' => 'A new *headline.*', 'ar' => 'عنوان *جديد.*'],
            'hero.kicker' => ['ar' => 'تجربة في المتجر'],
        ]);

        $this->assertSame([
            'hero.title' => ['Every screen is a *fitting room.*', 'A new *headline.*'],
            'hero.title_ar' => [null, 'عنوان *جديد.*'],
            'hero.kicker_ar' => [null, 'تجربة في المتجر'],
        ], $changes);

        $log = ActivityLog::query()->sole();
        $this->assertSame(['hero'], $log->properties['groups']);
        $this->assertSame($changes, $log->properties['changes']);

        // The same Arabic again is no change.
        $this->assertSame([], Settings::setMany(['hero.kicker' => ['ar' => 'تجربة في المتجر']]));
        $this->assertSame(1, ActivityLog::query()->count());
    }

    public function test_a_change_after_the_first_300_characters_is_saved(): void
    {
        $long = str_repeat('a', 320);

        Settings::set('hero.lede', $long.' one');
        Settings::set('hero.lede', $long.' two');

        $this->assertSame($long.' two', Settings::get('hero.lede'));
    }

    public function test_defaults_and_stored_values_per_language(): void
    {
        $this->setArabicDefault('hero.kicker', 'التجربة الافتراضية في المتجر');
        $this->setArabicDefault('hero.title', '');

        $this->assertSame('In-store AI try-on', Settings::defaultFor('hero.kicker'));
        $this->assertSame('التجربة الافتراضية في المتجر', Settings::defaultFor('hero.kicker', 'ar'));
        $this->assertSame('Every screen is a *fitting room.*', Settings::defaultFor('hero.title', 'ar'), 'No Arabic default: the English one.');
        $this->assertSame('hello@tryon.app', Settings::defaultFor('contact.email', 'ar'));
        $this->assertNull(Settings::defaultFor('not.a.setting'));

        Settings::setMany([
            'hero.kicker' => ['en' => 'Try it first', 'ar' => 'جرّبها أولًا'],
            'hero.title' => 'Try it *on.*',
            'contact.email' => 'sales@nlv.test',
        ]);

        $this->assertSame(
            ['contact.email' => 'sales@nlv.test', 'hero.kicker' => 'Try it first', 'hero.title' => 'Try it *on.*'],
            collect(Settings::storedValues())->sortKeys()->all(),
        );
        $this->assertSame(
            ['hero.kicker' => 'جرّبها أولًا', 'hero.title' => null],
            collect(Settings::storedValues('ar'))->sortKeys()->all(),
        );
    }

    public function test_arabic_inputs_are_validated_and_picked_up_with_an_ar_suffix(): void
    {
        $rules = Settings::rules('hero');

        $this->assertSame($rules['hero.title'], $rules['hero.title_ar']);
        $this->assertArrayNotHasKey('contact.email_ar', Settings::rules('contact'));

        $input = ['hero' => ['title' => 'Try it *on.*', 'title_ar' => 'جرّبها *عليك.*', 'kicker_ar' => 'تجربة', 'lede' => str_repeat('x', 2001)]];

        $this->assertSame(['hero.lede'], array_keys(Validator::make($input, $rules)->errors()->messages()));

        $valid = Validator::make(['hero' => ['title' => 'Try it *on.*', 'title_ar' => 'جرّبها *عليك.*', 'kicker_ar' => 'تجربة', 'lede' => null]], $rules)->validate();

        $this->assertSame([
            'hero.kicker' => ['ar' => 'تجربة'],
            'hero.title' => ['en' => 'Try it *on.*', 'ar' => 'جرّبها *عليك.*'],
            'hero.lede' => null,
        ], Settings::fromInput($valid, 'hero'));
    }

    public function test_currency_names_are_read_in_the_page_language(): void
    {
        $this->assertSame(['code' => 'SAR', 'name' => 'Saudi riyals'], Settings::currencies('en')[4]);
        $this->assertSame(['code' => 'SAR', 'name' => 'ريال سعودي'], Settings::currencies('ar')[4]);
    }

    /**
     * Give a setting an Arabic default (setting keys contain dots, so the
     * schema is changed as a whole).
     */
    private function setArabicDefault(string $key, string $value): void
    {
        $settings = (array) config('landing.settings');
        $settings[$key]['default_ar'] = $value;

        config()->set('landing.settings', $settings);
    }
}
