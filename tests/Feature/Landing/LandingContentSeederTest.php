<?php

namespace Tests\Feature\Landing;

use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use App\Models\User;
use App\Support\LandingContent;
use App\Support\Settings;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\LandingContentSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LandingContentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_everything_the_landing_page_shows(): void
    {
        $this->seed(LandingContentSeeder::class);

        $this->assertSame(4, Story::query()->count());
        $this->assertSame(4, LookCategory::query()->count());
        $this->assertSame(12, Look::query()->count());
        $this->assertSame(3, Plan::query()->count());
        $this->assertSame(3, Faq::query()->count());
        $this->assertSame(6, Page::query()->count());
    }

    public function test_the_payload_holds_the_seeded_content_in_page_order(): void
    {
        $this->seed(LandingContentSeeder::class);

        $landing = LandingContent::build();

        // Stories.
        $this->assertSame(
            ['Noura Al-Harbi', 'Khalid Mansour', 'Elena Marchetti', 'James Okafor'],
            array_column($landing['stories'], 'name'),
        );
        $noura = $landing['stories'][0];
        $this->assertSame([
            'before' => 'On Thursday evenings the fitting-room queue ran out of the door, and women left without trying anything. Now they try it on at the mirror first. Abaya sales ',
            'accent' => 'rose by a third',
            'after' => ' in one season.',
        ], $noura['quote']);
        $this->assertSame(['figure' => '+33%', 'label' => 'Abaya sales', 'note' => 'in one season', 'short' => 'sales'], $noura['metric']);
        $this->assertSame(['kind' => 'unsplash', 'id' => 'photo-1753486986377-1395ccfb4a8a'], $noura['portrait']);
        $this->assertSame('24.71° N · 46.68° E', $noura['coordinates']);
        $this->assertSame([0.53, 0.3], $noura['focus']);
        $this->assertSame(1.35, $noura['zoom']);
        $this->assertSame(['sales', 'frames tried', 'fitting time', 'conversion'], array_column(array_column($landing['stories'], 'metric'), 'short'));
        $this->assertSame('.', $landing['stories'][3]['quote']['after']);

        // Lookbook.
        $this->assertSame(['abayas', 'everyday', 'evening', 'eyewear'], array_column($landing['lookbook']['categories'], 'slug'));
        $this->assertSame(['Abayas', 'Everyday', 'Evening', 'Eyewear'], array_column($landing['lookbook']['categories'], 'name'));
        $this->assertSame([
            ['figure' => '54', 'unit' => 'most tried size'],
            ['figure' => '38%', 'unit' => 'went into the bag'],
            ['figure' => 'Sat', 'unit' => 'peak try-on day'],
            ['figure' => '41%', 'unit' => 'tortoiseshell'],
        ], array_column($landing['lookbook']['categories'], 'stat'));
        $this->assertSame(
            'Sizes run 52 to 60. Navy and black satin led the week in Riyadh and Jeddah.',
            $landing['lookbook']['categories'][0]['note'],
        );

        $looks = $landing['lookbook']['looks'];
        $this->assertCount(12, $looks);
        $this->assertSame(
            ['Riyadh', 'Dubai', 'London', 'New York', 'Istanbul', 'Jeddah', 'Milan', 'Singapore', 'Abu Dhabi', 'Tokyo', 'Doha', 'Paris'],
            array_column($looks, 'city'),
        );
        $this->assertSame([1.7, 1.9, 1.6, 1.5, 1.8, 1.7, 1.8, 1.9, 1.6, 1.8, 1.7, 1.6], array_column($looks, 'seconds'));
        $this->assertSame(
            ['abayas', 'evening', 'eyewear', 'everyday', 'evening', 'abayas', 'everyday', 'evening', 'everyday', 'eyewear', 'evening', 'eyewear'],
            array_column($looks, 'category'),
        );
        $this->assertSame('Quilted abaya, navy', $looks[0]['title']);
        $this->assertSame(['kind' => 'unsplash', 'id' => 'photo-1762605135318-f34a993cbcf0'], $looks[0]['after']);
        $this->assertNull($looks[0]['before']);
        $this->assertSame(0.67, $looks[0]['aspect']);
        $this->assertSame([0.42, 0.55], $looks[0]['focus']);
        $this->assertSame(1.5, $looks[11]['aspect']);
        $this->assertSame(array_fill(0, 12, null), array_column($looks, 'before'));

        // Pricing.
        $plans = $landing['pricing']['plans'];
        $this->assertSame(['buy', 'lease', 'chain'], array_column($plans, 'key'));
        $this->assertSame(['USD' => 3900, 'EUR' => 3590, 'GBP' => 3090, 'AED' => 14300, 'SAR' => 14600], $plans[0]['prices']);
        $this->assertSame(['USD' => 79, 'EUR' => 75, 'GBP' => 65, 'AED' => 289, 'SAR' => 299], $plans[0]['detail']['prices']);
        $this->assertTrue($plans[1]['featured']);
        $this->assertSame('by 6 in 10 new stores', $plans[1]['badgeNote']);
        $this->assertNull($plans[2]['prices']);
        $this->assertSame('Talk to sales', $plans[2]['ctaLabel']);
        $this->assertSame(
            ['What does the cloud app do?', 'Do you keep customer photos?', 'How long does installation take?'],
            array_column($landing['pricing']['faqs'], 'question'),
        );
        $this->assertCount(5, $landing['pricing']['currencies']);

        // Footer pages.
        $this->assertSame([
            ['title' => 'About', 'slug' => 'about', 'group' => 'company', 'url' => '/pages/about'],
            ['title' => 'Careers', 'slug' => 'careers', 'group' => 'company', 'url' => '/pages/careers'],
            ['title' => 'Press', 'slug' => 'press', 'group' => 'company', 'url' => '/pages/press'],
            ['title' => 'Privacy', 'slug' => 'privacy', 'group' => 'legal', 'url' => '/pages/privacy'],
            ['title' => 'Terms', 'slug' => 'terms', 'group' => 'legal', 'url' => '/pages/terms'],
            ['title' => 'Data processing', 'slug' => 'data-processing', 'group' => 'legal', 'url' => '/pages/data-processing'],
        ], $landing['pages']);

        // Copy comes from the settings defaults.
        $this->assertSame('From NLV to *the world.*', $landing['content']['partners.title']);
        $this->assertSame(
            'Sold or leased, installed and calibrated by our team, for one store or a hundred.',
            $landing['content']['sections.kiosk.install_line'],
        );
    }

    public function test_running_it_again_creates_no_duplicates_and_changes_nothing(): void
    {
        $this->seed(LandingContentSeeder::class);

        $before = $this->snapshot();
        $logged = ActivityLog::query()->count();

        $this->seed(LandingContentSeeder::class);
        $this->seed(LandingContentSeeder::class);

        $this->assertSame($before, $this->snapshot());
        $this->assertSame($logged, ActivityLog::query()->count(), 'An unchanged re-run logs nothing.');

        // Stored in the key order a MySQL JSON column keeps, so MySQL re-runs are no-ops too.
        $buy = Plan::query()->where('key', 'buy')->firstOrFail();
        $this->assertSame(['AED', 'EUR', 'GBP', 'SAR', 'USD'], array_keys($buy->prices ?? []));
        $this->assertSame(['AED', 'EUR', 'GBP', 'SAR', 'USD'], array_keys($buy->detail_prices ?? []));
    }

    public function test_it_never_overwrites_a_seeded_record_an_admin_has_edited(): void
    {
        $this->seed(LandingContentSeeder::class);

        $story = Story::query()->where('name', 'James Okafor')->firstOrFail();
        $story->update(['quote' => 'Edited.', 'sort_order' => 9]);
        Story::factory()->create(['name' => 'Added in the admin']);
        $logged = ActivityLog::query()->count();

        $this->seed(LandingContentSeeder::class);

        $story->refresh();
        $this->assertSame('Edited.', $story->quote);
        $this->assertSame(9, $story->sort_order);
        $this->assertSame(5, Story::query()->count(), 'Records the seeder does not know are left alone.');
        $this->assertSame($logged, ActivityLog::query()->count(), 'A re-run changes and logs nothing.');
    }

    public function test_it_recreates_a_seeded_record_that_was_deleted(): void
    {
        $this->seed(LandingContentSeeder::class);

        Story::query()->where('name', 'James Okafor')->firstOrFail()->delete();

        $this->seed(LandingContentSeeder::class);

        $this->assertTrue(Story::query()->where('name', 'James Okafor')->exists());
    }

    public function test_it_clears_the_cached_payload_even_without_model_events(): void
    {
        $this->assertSame([], LandingContent::build()['stories']);

        Model::withoutEvents(fn () => $this->seed(LandingContentSeeder::class));

        $landing = LandingContent::build();
        $this->assertCount(4, $landing['stories']);
        $this->assertCount(12, $landing['lookbook']['looks']);
        $this->assertSame([0, 1, 2, 3], Story::query()->ordered()->pluck('sort_order')->all());
    }

    public function test_it_leaves_the_settings_to_their_defaults(): void
    {
        Settings::set('hero.kicker', 'Edited kicker');

        $this->seed(LandingContentSeeder::class);

        $this->assertSame('Edited kicker', LandingContent::build()['content']['hero.kicker']);
    }

    public function test_the_database_seeder_can_run_twice(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $admins = User::query()->where('email', 'eng.mohamed.izeldeen@gmail.com')->get();
        $this->assertCount(1, $admins);
        $this->assertTrue($admins->first()?->isAdmin());
        $this->assertNotNull($admins->first()?->email_verified_at);
        $this->assertSame(4, Story::query()->count());
        $this->assertSame(12, Look::query()->count());
        $this->assertSame(3, Plan::query()->count());
        $this->assertSame(6, Page::query()->count());
    }

    public function test_the_home_page_and_content_pages_render_the_seeded_content(): void
    {
        $this->seed(LandingContentSeeder::class);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->has('landing.stories', 4)
                ->where('landing.stories.1.metric.short', 'frames tried')
                ->has('landing.lookbook.categories', 4)
                ->where('landing.lookbook.categories.2.stat', ['figure' => 'Sat', 'unit' => 'peak try-on day'])
                ->has('landing.lookbook.looks', 12)
                ->has('landing.pricing.plans', 3)
                ->has('landing.pricing.faqs', 3)
                ->has('landing.pages', 6),
            );

        $this->get('/pages/privacy')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                // The page component is built by the landing phase: don't require its file yet.
                ->component('page', false)
                ->where('page.title', 'Privacy')
                ->where('page.html', fn (string $html): bool => str_contains($html, '<strong>Placeholder page.</strong>')),
            );
    }

    public function test_the_arabic_data_covers_every_seeded_record_and_arabic_column(): void
    {
        $arabic = LandingContentSeeder::arabic();

        $expected = [
            'stories' => [array_column(LandingContentSeeder::stories(), 'name'), new Story],
            'categories' => [array_column(LandingContentSeeder::categories(), 'slug'), new LookCategory],
            'looks' => [array_column(LandingContentSeeder::looks(), 'title'), new Look],
            'plans' => [['buy', 'lease', 'chain'], new Plan],
            'faqs' => [array_column(LandingContentSeeder::faqs(), 0), new Faq],
            'pages' => [array_column(LandingContentSeeder::pages(), 'slug'), new Page],
        ];

        $this->assertSame(array_keys($expected), array_keys($arabic));

        foreach ($expected as $group => [$keys, $model]) {
            $this->assertSame($keys, array_keys($arabic[$group]), "Arabic {$group} are not the seeded ones.");

            foreach ($arabic[$group] as $key => $columns) {
                $this->assertSame($model->arabicAttributes(), array_keys($columns), "Arabic columns of {$group} “{$key}”.");
            }
        }
    }

    public function test_the_arabic_is_written_only_where_it_is_empty(): void
    {
        $this->seederWithArabic([])->run();

        $khalid = Story::query()->where('name', 'Khalid Mansour')->firstOrFail();
        $khalid->update(['name_ar' => 'Edited in the admin']);

        $arabic = [
            'stories' => [
                'Noura Al-Harbi' => ['name_ar' => 'نورة الحربي', 'role_ar' => '', 'city_ar' => 'الرياض'],
                'Khalid Mansour' => ['name_ar' => 'خالد منصور'],
            ],
            'plans' => [
                'buy' => ['features_ar' => ['ضمان *12 شهرًا*', 'تجارب *غير محدودة*', 'مزامنة الكتالوج عبر التطبيق السحابي', 'دعم عبر البريد الإلكتروني']],
                'lease' => ['features_ar' => ['الصيانة طوال مدة العقد', '']],
            ],
            'pages' => ['about' => ['title_ar' => 'عن NLV']],
        ];

        $this->seederWithArabic($arabic)->run();

        $noura = Story::query()->where('name', 'Noura Al-Harbi')->firstOrFail();
        $this->assertSame('نورة الحربي', $noura->name_ar);
        $this->assertSame('الرياض', $noura->city_ar);
        $this->assertNull($noura->role_ar, 'An empty translation is skipped.');
        $this->assertSame('Edited in the admin', $khalid->fresh()?->name_ar, 'An admin edit is kept.');
        $this->assertSame($arabic['plans']['buy']['features_ar'], Plan::query()->where('key', 'buy')->firstOrFail()->features_ar);
        $this->assertNull(Plan::query()->where('key', 'lease')->firstOrFail()->features_ar, 'A list with an empty line is skipped.');
        $this->assertSame('عن NLV', Page::query()->where('slug', 'about')->firstOrFail()->title_ar);

        $log = ActivityLog::query()->where('event', 'story.updated')->where('subject_id', $noura->id)->sole();
        $this->assertSame([null, 'نورة الحربي'], $log->properties['changes']['name_ar'] ?? null);

        // A re-run changes and logs nothing.
        $before = $this->snapshot();
        $logged = ActivityLog::query()->count();

        $this->seederWithArabic($arabic)->run();

        $this->assertSame($before, $this->snapshot());
        $this->assertSame($logged, ActivityLog::query()->count());
    }

    /**
     * The content seeder with the given Arabic instead of arabic() (whose
     * placeholders the translation fills in over time).
     *
     * @param  array<string, array<string, array<string, string|list<string>>>>  $arabic
     */
    private function seederWithArabic(array $arabic): LandingContentSeeder
    {
        $seeder = new class extends LandingContentSeeder
        {
            /** @var array<string, array<string, array<string, string|list<string>>>> */
            public static array $translations = [];

            public static function arabic(): array
            {
                return self::$translations + ['stories' => [], 'categories' => [], 'looks' => [], 'plans' => [], 'faqs' => [], 'pages' => []];
            }
        };

        $seeder::$translations = $arabic;

        return $seeder;
    }

    /**
     * Every seeded row, keyed by table, without timestamps.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    private function snapshot(): array
    {
        $rows = [];

        foreach ([Story::class, LookCategory::class, Look::class, Plan::class, Faq::class, Page::class] as $model) {
            $rows[$model] = $model::query()->orderBy('id')->get()
                ->map(fn (Model $record): array => collect($record->getAttributes())->except(['created_at', 'updated_at'])->all())
                ->values()
                ->all();
        }

        return $rows;
    }
}
