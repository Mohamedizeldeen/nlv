<?php

namespace Tests\Feature\Landing;

use App\Enums\FooterGroup;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use App\Support\LandingContent;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LandingContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_payload_has_the_landing_data_shape(): void
    {
        $category = LookCategory::factory()->create([
            'name' => 'Abayas', 'slug' => 'abayas', 'note' => 'Sizes run 52 to 60.', 'stat_figure' => '54', 'stat_unit' => 'most tried size',
        ]);
        Look::factory()->for($category, 'category')->create();
        Story::factory()->create();
        Plan::factory()->buy()->create();
        Faq::factory()->create();
        Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Privacy', 'slug' => 'privacy']);

        $landing = LandingContent::fresh();

        $this->assertSame(['locale', 'content', 'stats', 'stories', 'lookbook', 'pricing', 'pages'], array_keys($landing));
        $this->assertSame('en', $landing['locale']);
        $this->assertSame(['stores' => 140, 'countries' => 14, 'tryOnsYear' => '2.1M', 'tryOnsToday' => 10284], $landing['stats']);

        $this->assertSame(
            ['id', 'name', 'role', 'store', 'city', 'coordinates', 'quote', 'metric', 'portrait', 'portraitAlt', 'focus', 'zoom'],
            array_keys($landing['stories'][0]),
        );
        $this->assertSame(['before', 'accent', 'after'], array_keys($landing['stories'][0]['quote']));
        $this->assertSame(['figure', 'label', 'note', 'short'], array_keys($landing['stories'][0]['metric']));
        $this->assertSame(['kind' => 'unsplash', 'id' => 'photo-1567532939604-b6b5b0db2604'], $landing['stories'][0]['portrait']);
        $this->assertSame([0.5, 0.35], $landing['stories'][0]['focus']);
        $this->assertSame(1.0, $landing['stories'][0]['zoom']);

        $this->assertSame([[
            'id' => $category->id,
            'slug' => 'abayas',
            'name' => 'Abayas',
            'note' => 'Sizes run 52 to 60.',
            'stat' => ['figure' => '54', 'unit' => 'most tried size'],
        ]], $landing['lookbook']['categories']);
        $this->assertSame(
            ['id', 'category', 'title', 'city', 'seconds', 'after', 'before', 'alt', 'aspect', 'focus'],
            array_keys($landing['lookbook']['looks'][0]),
        );
        $this->assertSame('abayas', $landing['lookbook']['looks'][0]['category']);
        $this->assertNull($landing['lookbook']['looks'][0]['before']);

        $this->assertSame(['currencies', 'plans', 'faqs'], array_keys($landing['pricing']));
        $this->assertSame(
            ['key', 'name', 'blurb', 'priceMode', 'prices', 'priceCaption', 'detail', 'featuresHeading', 'features', 'ctaLabel', 'featured', 'badge', 'badgeNote'],
            array_keys($landing['pricing']['plans'][0]),
        );
        $this->assertSame(['label', 'prices', 'value', 'caption'], array_keys($landing['pricing']['plans'][0]['detail']));
        $this->assertSame(['id', 'question', 'answer'], array_keys($landing['pricing']['faqs'][0]));

        $this->assertSame([['title' => 'Privacy', 'slug' => 'privacy', 'group' => 'legal', 'url' => '/pages/privacy']], $landing['pages']);
    }

    public function test_content_holds_the_public_copy_as_strings(): void
    {
        Settings::set('contact.lead_notify_email', 'private@nlv.test');

        $content = LandingContent::fresh()['content'];

        $this->assertSame('Every screen is a *fitting room.*', $content['hero.title']);
        $this->assertSame('hello@tryon.app', $content['contact.email']);
        $this->assertSame('', $content['social.instagram']);
        $this->assertArrayNotHasKey('contact.lead_notify_email', $content);
        $this->assertArrayNotHasKey('stats.stores', $content);
        $this->assertArrayNotHasKey('pricing.currencies', $content);
        $this->assertContainsOnly('string', $content);
    }

    public function test_only_published_stories_are_listed_in_order(): void
    {
        Story::factory()->create(['name' => 'Third', 'sort_order' => 3]);
        Story::factory()->create(['name' => 'First', 'sort_order' => 1]);
        Story::factory()->unpublished()->create(['name' => 'Hidden', 'sort_order' => 2]);
        Story::factory()->create(['name' => 'Second', 'sort_order' => 2]);

        $this->assertSame(['First', 'Second', 'Third'], array_column(LandingContent::fresh()['stories'], 'name'));
    }

    public function test_a_story_without_a_short_metric_label_uses_the_full_label(): void
    {
        Story::factory()->create(['name' => 'Short', 'metric_label' => 'Abaya sales', 'metric_short' => 'sales']);
        Story::factory()->create(['name' => 'Long', 'metric_label' => 'Fitting-room time', 'metric_short' => null]);
        Story::factory()->create(['name' => 'Blank', 'metric_label' => 'Conversion', 'metric_short' => '']);

        $this->assertSame(
            ['sales', 'Fitting-room time', 'Conversion'],
            array_column(array_column(LandingContent::fresh()['stories'], 'metric'), 'short'),
        );
    }

    public function test_a_category_stat_is_null_without_a_figure(): void
    {
        $withStat = LookCategory::factory()->create(['slug' => 'with', 'stat_figure' => '38%', 'stat_unit' => 'went into the bag', 'sort_order' => 0]);
        $figureOnly = LookCategory::factory()->create(['slug' => 'figure', 'stat_figure' => 'Sat', 'stat_unit' => '', 'sort_order' => 1]);
        $none = LookCategory::factory()->create(['slug' => 'none', 'stat_figure' => null, 'stat_unit' => 'ignored', 'sort_order' => 2]);

        foreach ([$withStat, $figureOnly, $none] as $category) {
            Look::factory()->for($category, 'category')->create();
        }

        $this->assertSame(
            [['figure' => '38%', 'unit' => 'went into the bag'], ['figure' => 'Sat', 'unit' => null], null],
            array_column(LandingContent::fresh()['lookbook']['categories'], 'stat'),
        );
    }

    public function test_the_lookbook_lists_published_looks_and_the_categories_that_have_them(): void
    {
        $evening = LookCategory::factory()->create(['slug' => 'evening', 'sort_order' => 2]);
        $abayas = LookCategory::factory()->create(['slug' => 'abayas', 'sort_order' => 1]);
        $empty = LookCategory::factory()->create(['slug' => 'empty', 'sort_order' => 0]);

        Look::factory()->for($evening, 'category')->create(['title' => 'Gown', 'sort_order' => 2]);
        Look::factory()->for($abayas, 'category')->create(['title' => 'Quilted', 'sort_order' => 1]);
        Look::factory()->for($empty, 'category')->unpublished()->create(['title' => 'Draft', 'sort_order' => 0]);

        $lookbook = LandingContent::fresh()['lookbook'];

        $this->assertSame(['abayas', 'evening'], array_column($lookbook['categories'], 'slug'));
        $this->assertSame(['Quilted', 'Gown'], array_column($lookbook['looks'], 'title'));
        $this->assertSame(['abayas', 'evening'], array_column($lookbook['looks'], 'category'));
    }

    public function test_uploaded_images_are_described_with_their_url_and_size(): void
    {
        Storage::fake('public');

        $image = imagecreatetruecolor(600, 900);
        ob_start();
        imagewebp($image);
        Storage::disk('public')->put('landing/looks/after.webp', (string) ob_get_clean());

        Look::factory()->create(['after_image' => 'landing/looks/after.webp', 'before_image' => 'unsplash:photo-9']);

        $look = LandingContent::fresh()['lookbook']['looks'][0];

        $this->assertSame(['kind' => 'upload', 'url' => '/storage/landing/looks/after.webp', 'width' => 600, 'height' => 900], $look['after']);
        $this->assertSame(['kind' => 'unsplash', 'id' => 'photo-9'], $look['before']);
    }

    public function test_plans_are_ordered_and_priced_in_the_enabled_currencies(): void
    {
        Plan::factory()->chain()->create();
        Plan::factory()->lease()->create();
        Plan::factory()->buy()->create();

        Settings::set('pricing.currencies', ['GBP', 'USD']);

        $plans = LandingContent::fresh()['pricing']['plans'];

        $this->assertSame(['buy', 'lease', 'chain'], array_column($plans, 'key'));
        $this->assertSame(['GBP' => 3090, 'USD' => 3900], $plans[0]['prices']);
        $this->assertSame(['GBP' => 65, 'USD' => 79], $plans[0]['detail']['prices']);
        $this->assertSame('one_off', $plans[0]['priceMode']);
        $this->assertTrue($plans[1]['featured']);
        $this->assertSame('Most chosen', $plans[1]['badge']);
        $this->assertNull($plans[2]['prices']);
        $this->assertSame('custom', $plans[2]['priceMode']);
        $this->assertSame(['*12-month* warranty', '*Unlimited* try-ons', 'Catalogue sync through the cloud app', 'Email support'], $plans[0]['features']);
        $this->assertSame([['code' => 'GBP', 'name' => 'pounds sterling'], ['code' => 'USD', 'name' => 'US dollars']], LandingContent::fresh()['pricing']['currencies']);
    }

    public function test_only_published_faqs_and_footer_pages_are_listed_in_order(): void
    {
        Faq::factory()->create(['question' => 'Second?', 'sort_order' => 2]);
        Faq::factory()->create(['question' => 'First?', 'sort_order' => 1]);
        Faq::factory()->unpublished()->create(['question' => 'Hidden?', 'sort_order' => 0]);

        Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Terms', 'sort_order' => 2]);
        Page::factory()->inFooter(FooterGroup::Company)->create(['title' => 'About', 'sort_order' => 1]);
        Page::factory()->inFooter()->unpublished()->create(['title' => 'Draft', 'sort_order' => 0]);
        Page::factory()->create(['title' => 'Not in footer', 'sort_order' => 0]);

        $landing = LandingContent::fresh();

        $this->assertSame(['First?', 'Second?'], array_column($landing['pricing']['faqs'], 'question'));
        $this->assertSame(['About', 'Terms'], array_column($landing['pages'], 'title'));
        $this->assertSame(['company', 'legal'], array_column($landing['pages'], 'group'));
    }

    public function test_accent_markup_is_split_into_three_parts(): void
    {
        $this->assertSame(
            ['before' => 'Abaya sales ', 'accent' => 'rose by a third', 'after' => ' in one season.'],
            LandingContent::splitAccent('Abaya sales *rose by a third* in one season.'),
        );
        $this->assertSame(
            ['before' => 'By the weekend it was ', 'accent' => 'the busiest corner', 'after' => '.'],
            LandingContent::splitAccent('By the weekend it was *the busiest corner*.'),
        );
        $this->assertSame(
            ['before' => '', 'accent' => 'All accent', 'after' => ''],
            LandingContent::splitAccent('*All accent*'),
        );
        $this->assertSame(
            ['before' => 'No accent here.', 'accent' => '', 'after' => ''],
            LandingContent::splitAccent('No accent here.'),
        );
        $this->assertSame(
            ['before' => 'One ', 'accent' => 'two', 'after' => ' three four'],
            LandingContent::splitAccent('One *two* three *four*'),
        );
        $this->assertSame(
            ['before' => 'A stray star', 'accent' => '', 'after' => ''],
            LandingContent::splitAccent('A stray *star'),
        );
    }

    public function test_the_payload_is_cached_until_content_changes(): void
    {
        Story::factory()->create(['name' => 'First']);
        $this->assertCount(1, LandingContent::build()['stories']);

        Story::withoutEvents(fn () => Story::factory()->create(['name' => 'Quiet']));
        $this->assertCount(1, LandingContent::build()['stories']);

        Story::factory()->create(['name' => 'Loud']);
        $this->assertCount(3, LandingContent::build()['stories']);

        Settings::set('hero.kicker', 'Changed');
        $this->assertSame('Changed', LandingContent::build()['content']['hero.kicker']);

        Story::query()->where('name', 'Loud')->firstOrFail()->delete();
        $this->assertCount(2, LandingContent::build()['stories']);
    }

    public function test_the_home_page_receives_the_landing_prop(): void
    {
        Story::factory()->count(2)->create();
        Story::factory()->unpublished()->create();

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->has('landing.stories', 2)
                ->where('landing.content', fn ($content): bool => $content['hero.title'] === 'Every screen is a *fitting room.*')
                ->where('landing.stats.stores', 140)
                ->has('landing.pricing.currencies', 5),
            );
    }
}
