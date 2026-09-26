<?php

namespace Tests\Feature\Admin;

use App\Enums\PriceMode;
use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\Plan;
use App\Models\User;
use App\Support\Activity;
use App\Support\LandingContent;
use App\Support\Settings;
use Database\Seeders\LandingContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PlansTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Plan $buy;

    private Plan $lease;

    private Plan $chain;

    protected function setUp(): void
    {
        parent::setUp();

        // Created without logging, so each test's activity starts empty; the
        // plans carry the seeded Arabic, as on the site.
        [$this->admin, $this->buy, $this->lease, $this->chain] = Activity::withoutModelLogging(fn () => [
            User::factory()->admin()->create(['name' => 'Dev Admin']),
            Plan::factory()->buy()->create(self::seededArabic('buy')),
            Plan::factory()->lease()->create(self::seededArabic('lease')),
            Plan::factory()->chain()->create(self::seededArabic('chain')),
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function routes(): array
    {
        return [
            'index' => ['get', '/admin/plans'],
            'edit' => ['get', '/admin/plans/buy/edit'],
            'update' => ['put', '/admin/plans/buy'],
            'currencies' => ['put', '/admin/plans/currencies'],
        ];
    }

    #[DataProvider('routes')]
    public function test_guests_are_redirected_to_the_login_page(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
        $this->call($method, $uri)->assertRedirect(route('login'));
    }

    #[DataProvider('routes')]
    public function test_non_admins_are_forbidden(string $method, string $uri): void
    {
        $this->actingAs(User::factory()->create())
            ->call($method, $uri)
            ->assertForbidden();
    }

    public function test_the_index_shows_the_plans_in_order_with_the_currencies(): void
    {
        Faq::factory()->count(2)->create();
        Faq::factory()->unpublished()->create();

        $this->actingAs($this->admin)
            ->get(route('admin.plans.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/plans/index')
                ->has('plans', 3)
                ->where('plans.0.key', 'buy')
                ->where('plans.1.key', 'lease')
                ->where('plans.2.key', 'chain')
                ->has('plans.0', fn (Assert $plan) => $plan
                    ->where('id', $this->buy->id)
                    ->where('name', 'Buy')
                    ->where('price_mode', 'one_off')
                    ->where('prices.USD', 3900)
                    ->where('prices.SAR', 14600)
                    ->where('detail_label', 'Cloud app')
                    ->where('detail_prices.EUR', 75)
                    ->where('detail_value', null)
                    ->where('features', ['*12-month* warranty', '*Unlimited* try-ons', 'Catalogue sync through the cloud app', 'Email support'])
                    ->where('is_featured', false)
                    ->etc(),
                )
                ->where('plans.1.is_featured', true)
                ->where('plans.2.prices', null)
                ->where('currencies', Settings::currencies())
                ->has('currencyOptions', 5)
                ->where('currencyOptions.0', ['code' => 'USD', 'name' => 'US dollars', 'enabled' => true, 'position' => 0, 'missing' => []])
                ->where('copy.en.customPrice', 'Let’s talk')
                ->where('copy.en.title', 'One device. *Your way to own it.*')
                ->where('copy.ar.customPrice', Settings::defaultFor('sections.pricing.custom_price', 'ar'))
                ->where('faqs', ['total' => 3, 'live' => 2]),
            );
    }

    public function test_the_currencies_panel_lists_hidden_currencies_last_with_the_plans_missing_a_price(): void
    {
        Settings::set('pricing.currencies', ['EUR', 'USD']);
        $this->withoutLogging(fn () => $this->lease->update(['prices' => ['USD' => 249, 'EUR' => 229]]));

        $this->actingAs($this->admin)
            ->get(route('admin.plans.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('currencies', [['code' => 'EUR', 'name' => 'euros'], ['code' => 'USD', 'name' => 'US dollars']])
                ->where('currencyOptions', [
                    ['code' => 'EUR', 'name' => 'euros', 'enabled' => true, 'position' => 1, 'missing' => []],
                    ['code' => 'USD', 'name' => 'US dollars', 'enabled' => true, 'position' => 0, 'missing' => []],
                    ['code' => 'GBP', 'name' => 'pounds sterling', 'enabled' => false, 'position' => 2, 'missing' => ['Lease']],
                    ['code' => 'AED', 'name' => 'UAE dirhams', 'enabled' => false, 'position' => 3, 'missing' => ['Lease']],
                    ['code' => 'SAR', 'name' => 'Saudi riyals', 'enabled' => false, 'position' => 4, 'missing' => ['Lease']],
                ]),
            );
    }

    public function test_the_edit_page_shows_one_plan_by_its_key(): void
    {
        Settings::set('pricing.currencies', ['USD', 'EUR']);

        $this->actingAs($this->admin)
            ->get(route('admin.plans.edit', 'buy'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/plans/edit')
                ->where('plan.key', 'buy')
                ->where('plan.name', 'Buy')
                ->where('currencies', [['code' => 'USD', 'name' => 'US dollars'], ['code' => 'EUR', 'name' => 'euros']])
                ->where('hiddenCurrencies', ['GBP', 'AED', 'SAR'])
                ->where('storedHidden', ['GBP', 'AED', 'SAR'])
                ->where('featuredPlan', 'Lease')
                ->where('copy.en.note', Settings::string('sections.pricing.note'))
                ->where('copy.ar.note', Settings::string('sections.pricing.note', 'ar')),
            );

        $this->actingAs($this->admin)
            ->get(route('admin.plans.edit', 'lease'))
            ->assertInertia(fn (Assert $page) => $page->where('featuredPlan', null));
    }

    public function test_unknown_plans_are_not_found(): void
    {
        $this->actingAs($this->admin)->get('/admin/plans/gold/edit')->assertNotFound();
        $this->actingAs($this->admin)->put('/admin/plans/gold', $this->payload($this->buy))->assertNotFound();
    }

    public function test_a_plan_is_saved_and_logged(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'name' => 'Own',
                'blurb' => 'Buy the device once; the app is billed monthly.',
                'prices' => ['USD' => '4100', 'EUR' => '3790', 'GBP' => '3250', 'AED' => '15000', 'SAR' => '15400'],
                'price_caption' => 'once, per device',
                'detail_caption' => 'per month',
                'features_heading' => 'Included',
                'features' => ['Email support', '*24-month* warranty'],
                'cta_label' => 'Order yours',
                'features_heading_ar' => 'يشمل',
                'features_ar' => ['دعم عبر البريد الإلكتروني', 'ضمان *24 شهرًا*'],
            ]))
            ->assertRedirect(route('admin.plans.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Own saved.']);

        $buy = $this->buy->fresh();
        $this->assertNotNull($buy);
        $this->assertSame('Own', $buy->name);
        $this->assertSame('Buy the device once; the app is billed monthly.', $buy->blurb);
        $this->assertSame(['AED' => 15000, 'EUR' => 3790, 'GBP' => 3250, 'SAR' => 15400, 'USD' => 4100], $buy->prices);
        $this->assertSame('once, per device', $buy->price_caption);
        $this->assertSame('per month', $buy->detail_caption);
        $this->assertSame('Included', $buy->features_heading);
        $this->assertSame(['Email support', '*24-month* warranty'], $buy->features);
        $this->assertSame('Order yours', $buy->cta_label);

        $log = ActivityLog::query()->where('event', 'plan.updated')->sole();
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertSame($buy->id, $log->subject_id);
        $this->assertSame(['Buy', 'Own'], $log->properties['changes']['name'] ?? null);
        $this->assertArrayHasKey('prices', $log->properties['changes'] ?? []);
        $this->assertArrayNotHasKey('detail_prices', $log->properties['changes'] ?? []);

        $landing = LandingContent::build()['pricing']['plans'][0];
        $this->assertSame('Own', $landing['name']);
        $this->assertSame(['USD' => 4100, 'EUR' => 3790, 'GBP' => 3250, 'AED' => 15000, 'SAR' => 15400], $landing['prices']);
        $this->assertSame(['Email support', '*24-month* warranty'], $landing['features']);
    }

    public function test_saving_an_unchanged_plan_logs_nothing(): void
    {
        // Same amounts, keys in another order (as MySQL returns them).
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'prices' => ['SAR' => 14600, 'AED' => 14300, 'USD' => 3900, 'GBP' => 3090, 'EUR' => 3590],
            ]))
            ->assertRedirect(route('admin.plans.index'))
            ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'No changes to Buy.']);

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_prices_in_hidden_currencies_are_kept(): void
    {
        Settings::set('pricing.currencies', ['USD', 'EUR']);
        ActivityLog::query()->delete();

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'prices' => ['USD' => '3950', 'EUR' => '3640'],
                'detail_prices' => ['USD' => '79', 'EUR' => '75'],
            ]))
            ->assertSessionHasNoErrors();

        $buy = $this->buy->fresh();
        $this->assertNotNull($buy);
        $this->assertSame(['AED' => 14300, 'EUR' => 3640, 'GBP' => 3090, 'SAR' => 14600, 'USD' => 3950], $buy->prices);
        $this->assertSame(['AED' => 289, 'EUR' => 75, 'GBP' => 65, 'SAR' => 299, 'USD' => 79], $buy->detail_prices);
        $this->assertSame(['prices'], array_keys(ActivityLog::query()->sole()->properties['changes'] ?? []));
    }

    public function test_every_shown_currency_needs_a_whole_price_above_zero(): void
    {
        $this->actingAs($this->admin)
            ->from(route('admin.plans.edit', 'buy'))
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'prices' => ['USD' => '3900', 'EUR' => '', 'GBP' => '0', 'AED' => '14.5', 'SAR' => '1000000000'],
                'detail_prices' => ['USD' => '79', 'EUR' => '75', 'GBP' => '65', 'AED' => '289'],
            ]))
            ->assertRedirect(route('admin.plans.edit', 'buy'))
            ->assertSessionHasErrors([
                'prices.EUR' => 'Enter the price in euros.',
                'prices.GBP' => 'Price in pounds sterling: enter an amount above zero.',
                'prices.AED' => 'Price in UAE dirhams: whole amounts only.',
                'prices.SAR' => 'Price in Saudi riyals: that amount is too large.',
                'detail_prices.SAR' => 'Enter the price in Saudi riyals.',
            ]);

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_prices_in_currencies_the_page_does_not_show_are_rejected(): void
    {
        Settings::set('pricing.currencies', ['USD']);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'prices' => ['USD' => '3900', 'SAR' => '14600'],
                'detail_prices' => ['USD' => '79'],
            ]))
            ->assertSessionHasErrors(['prices']);
    }

    public function test_a_plan_priced_by_quote_keeps_its_stored_prices(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'price_mode' => 'custom',
                'prices' => null,
                'price_caption' => 'priced per rollout',
            ]))
            ->assertSessionHasNoErrors();

        $buy = $this->buy->fresh();
        $this->assertNotNull($buy);
        $this->assertSame(PriceMode::Custom, $buy->price_mode);
        $this->assertSame(3900, $buy->prices['USD'] ?? null);
        $this->assertNull(LandingContent::build()['pricing']['plans'][0]['prices']);

        // And back: a figure again, prices required once more.
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'chain'), $this->payload($this->chain, [
                'price_mode' => 'one_off',
            ]))
            ->assertSessionHasErrors(['prices']);
    }

    public function test_the_line_under_the_price_is_a_price_a_figure_or_nothing(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'detail_kind' => 'value',
                'detail_label' => 'Warranty',
                'detail_value' => '12',
                'detail_caption' => 'months',
            ]))
            ->assertSessionHasNoErrors();

        $buy = $this->buy->fresh();
        $this->assertNotNull($buy);
        $this->assertNull($buy->detail_prices);
        $this->assertSame(['Warranty', '12', 'months'], [$buy->detail_label, $buy->detail_value, $buy->detail_caption]);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, ['detail_kind' => 'none']))
            ->assertSessionHasNoErrors();

        $lease = $this->lease->fresh();
        $this->assertNotNull($lease);
        $this->assertSame([null, null, null, null], [$lease->detail_label, $lease->detail_prices, $lease->detail_value, $lease->detail_caption]);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'chain'), $this->payload($this->chain, [
                'detail_kind' => 'value',
                'detail_label' => '',
                'detail_value' => '',
            ]))
            ->assertSessionHasErrors([
                'detail_label' => 'Name the line, e.g. “Cloud app” or “Term”.',
                'detail_value' => 'Enter the figure, e.g. “24”.',
            ]);
    }

    public function test_featuring_a_plan_takes_the_feature_off_the_others(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'is_featured' => '1',
                'badge' => 'New',
                'badge_ar' => 'جديد',
            ]))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Buy saved, and now the featured plan.');

        $this->assertTrue($this->buy->fresh()?->is_featured);
        $this->assertFalse($this->lease->fresh()?->is_featured);
        $this->assertSame(1, Plan::query()->where('is_featured', true)->count());

        $logs = ActivityLog::query()->where('event', 'plan.updated')->orderBy('id')->get();
        $this->assertSame([$this->lease->id, $this->buy->id], $logs->pluck('subject_id')->all());
        $this->assertSame([true, false], $logs[0]->properties['changes']['is_featured'] ?? null);

        $plans = LandingContent::build()['pricing']['plans'];
        $this->assertSame([true, false, false], array_column($plans, 'featured'));
    }

    public function test_the_featured_plan_cannot_be_unfeatured(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, ['is_featured' => '0']))
            ->assertSessionHasErrors([
                'is_featured' => 'Lease is the featured plan. To move the arch, feature another plan instead.',
            ]);

        $this->assertTrue($this->lease->fresh()?->is_featured);
    }

    public function test_the_feature_list_is_validated(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, ['features' => []]))
            ->assertSessionHasErrors(['features' => 'List at least one feature.']);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, ['features' => ['Email support', '  ', str_repeat('x', 121)]]))
            ->assertSessionHasErrors([
                'features.1' => 'Write this feature or remove the row.',
                'features.2' => 'Keep each feature under 120 characters.',
            ]);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, ['features' => array_fill(0, 9, 'Support')]))
            ->assertSessionHasErrors(['features']);
    }

    public function test_the_copy_fields_are_required_and_limited(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'name' => '',
                'blurb' => str_repeat('a', 201),
                'price_mode' => 'yearly',
                'price_caption' => '',
                'cta_label' => str_repeat('b', 41),
                'badge' => str_repeat('c', 41),
            ]))
            ->assertSessionHasErrors(['name', 'blurb', 'price_mode', 'price_caption', 'cta_label', 'badge']);
    }

    public function test_the_plans_carry_their_arabic_and_what_still_needs_translating(): void
    {
        $this->withoutLogging(fn () => $this->lease->update(['badge_note_ar' => null, 'features_ar' => null]));

        $this->actingAs($this->admin)
            ->get(route('admin.plans.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('plans.0.name_ar', 'شراء')
                ->where('plans.0.features_ar', LandingContentSeeder::arabic()['plans']['buy']['features_ar'])
                ->where('plans.0.features_heading_ar', null)
                ->where('plans.0.missing_arabic', [])
                ->where('plans.1.missing_arabic', ['features', 'badge_note']),
            );

        $this->actingAs($this->admin)
            ->get(route('admin.plans.edit', 'lease'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('plan.name_ar', 'إيجار')
                ->where('plan.badge_ar', 'الأكثر اختيارًا')
                ->where('plan.detail_caption_ar', 'شهرًا')
                ->where('plan.features_ar', null)
                ->where('plan.missing_arabic', ['features', 'badge_note']),
            );
    }

    public function test_the_arabic_is_saved_logged_and_shown_on_the_arabic_page(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, [
                'name_ar' => 'اشتراك',
                'badge_note_ar' => 'يختاره 6 من كل 10 متاجر جديدة',
                'features_ar' => ['الصيانة طوال مدة العقد', 'جهاز بديل مجانًا عند أي عطل', 'أولوية في الدعم'],
            ]))
            ->assertRedirect(route('admin.plans.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Lease saved.']);

        $lease = $this->lease->fresh();
        $this->assertNotNull($lease);
        $this->assertSame('اشتراك', $lease->name_ar);
        $this->assertSame('Lease', $lease->name);
        $this->assertSame(['الصيانة طوال مدة العقد', 'جهاز بديل مجانًا عند أي عطل', 'أولوية في الدعم'], $lease->features_ar);

        // Logged like any other change, the Arabic columns by their own names.
        $changes = ActivityLog::query()->where('event', 'plan.updated')->sole()->properties['changes'] ?? [];
        $this->assertSame(['name_ar', 'features_ar', 'badge_note_ar'], array_keys($changes));
        $this->assertSame(['إيجار', 'اشتراك'], $changes['name_ar']);

        $this->get('/ar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.locale', 'ar')
                ->where('landing.pricing.plans.1.name', 'اشتراك')
                ->where('landing.pricing.plans.1.badgeNote', 'يختاره 6 من كل 10 متاجر جديدة')
                ->where('landing.pricing.plans.1.features.1', 'جهاز بديل مجانًا عند أي عطل')
                ->where('landing.pricing.plans.1.badge', 'الأكثر اختيارًا'),
            );

        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.pricing.plans.1.name', 'Lease')
                ->where('landing.pricing.plans.1.features.1', 'Free replacement if a device fails'),
            );
    }

    public function test_every_arabic_text_on_the_card_is_required_with_a_readable_name(): void
    {
        $this->actingAs($this->admin)
            ->from(route('admin.plans.edit', 'buy'))
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'name_ar' => '',
                'blurb_ar' => '',
                'price_caption_ar' => '',
                'detail_label_ar' => '',
                'cta_label_ar' => '',
                'features_ar' => ['ضمان *12 شهرًا*', '', 'مزامنة الكتالوج عبر التطبيق السحابي', 'دعم عبر البريد الإلكتروني'],
            ]))
            ->assertRedirect(route('admin.plans.edit', 'buy'))
            ->assertSessionHasErrors([
                'name_ar' => 'The Arabic name field is required.',
                'blurb_ar' => 'The Arabic one-line description field is required.',
                'price_caption_ar' => 'The Arabic price caption field is required.',
                'detail_label_ar' => 'The Arabic line label field is required.',
                'cta_label_ar' => 'The Arabic button label field is required.',
                'features_ar.1' => 'Write this feature in Arabic too, or remove the row.',
            ]);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, ['features_ar' => null]))
            ->assertSessionHasErrors(['features_ar' => 'Write the features in Arabic too.']);

        $this->assertSame('شراء', $this->buy->fresh()?->name_ar);
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_the_arabic_texts_have_the_english_limits(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, [
                'name_ar' => str_repeat('ا', 41),
                'blurb_ar' => str_repeat('ا', 201),
                'price_caption_ar' => str_repeat('ا', 121),
                'detail_label_ar' => str_repeat('ا', 41),
                'detail_caption_ar' => str_repeat('ا', 61),
                'features_heading_ar' => str_repeat('ا', 81),
                'features_ar' => ['الصيانة طوال مدة العقد', str_repeat('ا', 121), 'أولوية في الدعم'],
                'cta_label_ar' => str_repeat('ا', 41),
                'badge_ar' => str_repeat('ا', 41),
                'badge_note_ar' => str_repeat('ا', 81),
            ]))
            ->assertSessionHasErrors([
                'name_ar' => 'The Arabic name field must not be greater than 40 characters.',
                'blurb_ar', 'price_caption_ar', 'detail_label_ar', 'detail_caption_ar', 'features_heading_ar', 'cta_label_ar', 'badge_ar',
                'badge_note_ar' => 'The Arabic badge note field must not be greater than 80 characters.',
                'features_ar.1' => 'Keep each Arabic feature under 120 characters.',
            ]);

        // Exactly at the limits is fine (counted in characters, not bytes).
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, [
                'name_ar' => str_repeat('ا', 40),
                'features_ar' => ['الصيانة طوال مدة العقد', str_repeat('ا', 120), 'أولوية في الدعم'],
            ]))
            ->assertSessionHasNoErrors();
    }

    public function test_the_arabic_features_pair_with_the_english_ones(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'features_ar' => ['ضمان *12 شهرًا*', 'تجارب *غير محدودة*'],
            ]))
            ->assertSessionHasErrors([
                'features_ar' => 'Write each feature in Arabic too: one Arabic line for every English line.',
            ]);

        // No second error while the English list itself is missing.
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, ['features' => [], 'features_ar' => []]))
            ->assertSessionHasErrors(['features'])
            ->assertSessionDoesntHaveErrors(['features_ar']);
    }

    public function test_optional_texts_are_written_in_both_languages_or_in_neither(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'buy'), $this->payload($this->buy, [
                'features_heading' => 'Included',
                'badge_ar' => 'جديد',
                'badge_note' => 'our newest plan',
                'detail_caption_ar' => null,
            ]))
            ->assertSessionHasErrors([
                'features_heading_ar' => 'Add the heading in Arabic too, or clear the English one.',
                'badge' => 'Add the badge in English too, or clear the Arabic one.',
                'badge_note_ar' => 'Add the note in Arabic too, or clear the English one.',
                'detail_caption_ar' => 'Add the caption in Arabic too, or clear the English one.',
            ]);

        // Neither language: fine.
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, [
                'features_heading' => null,
                'features_heading_ar' => null,
                'badge_note' => '',
                'badge_note_ar' => '',
            ]))
            ->assertSessionHasNoErrors();

        $lease = $this->lease->fresh();
        $this->assertNotNull($lease);
        $this->assertSame([null, null, null, null], [$lease->features_heading, $lease->features_heading_ar, $lease->badge_note, $lease->badge_note_ar]);
    }

    public function test_switching_the_line_off_clears_its_arabic_too(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.update', 'lease'), $this->payload($this->lease, [
                'detail_kind' => 'none',
                // Sent anyway (an old tab): ignored with the English.
                'detail_label_ar' => str_repeat('ا', 90),
            ]))
            ->assertSessionHasNoErrors();

        $lease = $this->lease->fresh();
        $this->assertNotNull($lease);
        $this->assertSame([null, null], [$lease->detail_label_ar, $lease->detail_caption_ar]);
        $this->assertNull(LandingContent::build('ar')['pricing']['plans'][1]['detail']['label']);
    }

    public function test_the_currencies_can_be_reordered_and_hidden(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => ['EUR', 'USD', 'GBP']])
            ->assertRedirect(route('admin.plans.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Currencies saved: EUR · USD · GBP.']);

        $this->assertSame(['EUR', 'USD', 'GBP'], Settings::list('pricing.currencies'));

        $log = ActivityLog::query()->sole();
        $this->assertSame('pricing.updated', $log->event);
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertSame('Updated the pricing currencies: EUR, USD, GBP', $log->description);
        $this->assertSame([['USD', 'EUR', 'GBP', 'AED', 'SAR'], ['EUR', 'USD', 'GBP']], $log->properties['changes']['pricing.currencies'] ?? null);

        $pricing = LandingContent::build()['pricing'];
        $this->assertSame(['EUR', 'USD', 'GBP'], array_column($pricing['currencies'], 'code'));
        $this->assertSame(['EUR' => 3590, 'USD' => 3900, 'GBP' => 3090], $pricing['plans'][0]['prices']);
    }

    public function test_saving_the_same_currencies_logs_nothing(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => ['USD', 'EUR', 'GBP', 'AED', 'SAR']])
            ->assertInertiaFlash('toast.type', 'info');

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_at_least_one_known_currency_is_shown_once(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => []])
            ->assertSessionHasErrors(['currencies' => 'Show at least one currency.']);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => ['USD', 'JPY']])
            ->assertSessionHasErrors(['currencies.1' => 'That currency is not one the site knows.']);

        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => ['USD', 'USD']])
            ->assertSessionHasErrors(['currencies.0', 'currencies.1']);

        $this->assertSame(['USD', 'EUR', 'GBP', 'AED', 'SAR'], Settings::list('pricing.currencies'));
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_a_currency_is_only_shown_when_every_plan_with_a_figure_has_a_price_in_it(): void
    {
        $this->withoutLogging(function (): void {
            $this->buy->update(['prices' => ['USD' => 3900], 'detail_prices' => ['USD' => 79, 'SAR' => 299]]);
            $this->lease->update(['prices' => ['USD' => 249, 'EUR' => 229]]);
        });

        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => ['USD', 'EUR', 'SAR']])
            ->assertSessionHasErrors(['currencies']);

        $errors = session('errors')->get('currencies');
        $this->assertSame([
            'Buy has no price in euros yet. Add it on the plan before showing EUR.',
            'Buy and Lease have no price in Saudi riyals yet. Add them on the plan before showing SAR.',
        ], $errors);

        // Chain is priced by quote, so it never blocks a currency.
        $this->actingAs($this->admin)
            ->put(route('admin.plans.currencies.update'), ['currencies' => ['USD']])
            ->assertSessionHasNoErrors();

        $this->assertSame(['USD'], Settings::list('pricing.currencies'));
    }

    /**
     * The form fields for a plan as the editor submits them.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Plan $plan, array $overrides = []): array
    {
        $kind = $plan->detail_prices ? 'prices' : ($plan->detail_value !== null ? 'value' : 'none');

        return array_merge([
            'name' => $plan->name,
            'blurb' => $plan->blurb,
            'price_mode' => $plan->price_mode->value,
            'prices' => $plan->prices,
            'price_caption' => $plan->price_caption,
            'detail_kind' => $kind,
            'detail_label' => $plan->detail_label,
            'detail_prices' => $plan->detail_prices,
            'detail_value' => $plan->detail_value,
            'detail_caption' => $plan->detail_caption,
            'features_heading' => $plan->features_heading,
            'features' => $plan->features,
            'cta_label' => $plan->cta_label,
            'is_featured' => $plan->is_featured ? '1' : '0',
            'badge' => $plan->badge,
            'badge_note' => $plan->badge_note,
            ...self::arabic($plan),
        ], $overrides);
    }

    /**
     * The plan's Arabic fields as the editor submits them.
     *
     * @return array<string, mixed>
     */
    private static function arabic(Plan $plan): array
    {
        return $plan->only($plan->arabicAttributes());
    }

    /**
     * The seeded Arabic of a plan (blank texts as null, like the column).
     *
     * @return array<string, string|list<string>|null>
     */
    private static function seededArabic(string $key): array
    {
        return array_map(
            fn (string|array $value): string|array|null => $value === '' ? null : $value,
            LandingContentSeeder::arabic()['plans'][$key],
        );
    }

    /**
     * Change fixtures without writing activity entries.
     */
    private function withoutLogging(callable $callback): void
    {
        Activity::withoutModelLogging($callback);
    }
}
