<?php

namespace Tests\Feature\Landing;

use App\Enums\FooterGroup;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use App\Models\User;
use App\Support\LandingContent;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ArabicPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_english_landing_page_is_at_the_root_left_to_right(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<html lang="en" dir="ltr"', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('locale', 'en')
                ->where('dir', 'ltr')
                ->where('alternates', ['en' => url('/'), 'ar' => url('/ar')])
                ->where('landing.locale', 'en'),
            );
    }

    public function test_the_arabic_landing_page_is_at_ar_right_to_left(): void
    {
        $this->assertSame('/ar', route('ar.home', absolute: false));

        $this->get('/ar')
            ->assertOk()
            ->assertSee('<html lang="ar" dir="rtl"', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('locale', 'ar')
                ->where('dir', 'rtl')
                ->where('alternates', ['en' => url('/'), 'ar' => url('/ar')])
                ->where('landing.locale', 'ar'),
            );
    }

    public function test_both_languages_link_each_other_with_hreflang(): void
    {
        foreach (['/', '/ar'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('<link rel="alternate" hreflang="en" href="'.url('/').'">', false)
                ->assertSee('<link rel="alternate" hreflang="ar" href="'.url('/ar').'">', false)
                ->assertSee('<link rel="alternate" hreflang="x-default" href="'.url('/').'">', false);
        }
    }

    public function test_the_arabic_page_shows_the_arabic_and_falls_back_to_the_english(): void
    {
        $category = LookCategory::factory()->arabic()->create(['name' => 'Abayas', 'slug' => 'abayas', 'stat_figure' => 'Sat']);
        Look::factory()->for($category, 'category')->arabic()->create(['title' => 'Quilted abaya, navy']);
        Look::factory()->for($category, 'category')->create(['title' => 'Untranslated look', 'city' => 'Paris', 'alt' => 'A look']);
        Story::factory()->arabic()->create(['name' => 'Noura Al-Harbi', 'coordinates' => '24.71° N · 46.68° E']);
        Story::factory()->create(['name' => 'Elena Marchetti', 'role' => 'Store Manager', 'store' => 'Casa Lino', 'metric_note' => 'per visit']);
        Plan::factory()->buy()->arabic()->create();
        Plan::factory()->lease()->create();
        Faq::factory()->arabic()->create(['question' => 'How long does installation take?']);
        Page::factory()->inFooter(FooterGroup::Legal)->arabic()->create(['title' => 'Privacy', 'slug' => 'privacy']);
        Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Terms', 'slug' => 'terms']);

        $this->get('/ar')->assertOk()->assertInertia(fn (Assert $page) => $page
            // Stories: the Arabic, and the English where nothing is translated.
            ->where('landing.stories.0.name', 'نورة الحربي')
            ->where('landing.stories.0.role', 'مؤسِّسة')
            ->where('landing.stories.0.city', 'الرياض')
            ->where('landing.stories.0.quote.accent', 'ارتفعت المبيعات بمقدار الثلث')
            ->where('landing.stories.0.metric', ['figure' => $this->storyFigure('Noura Al-Harbi'), 'label' => 'المبيعات', 'note' => 'في موسم واحد', 'short' => 'المبيعات'])
            ->where('landing.stories.0.portraitAlt', 'صورة نورة الحربي، مؤسِّسة، رمال للعبايات')
            ->where('landing.stories.0.coordinates', '24.71° شمالًا · 46.68° شرقًا')
            ->where('landing.stories.1.name', 'Elena Marchetti')
            ->where('landing.stories.1.metric.note', 'per visit')
            ->where('landing.stories.1.portraitAlt', 'صورة Elena Marchetti، Store Manager، Casa Lino')
            // Lookbook.
            ->where('landing.lookbook.categories.0.name', 'عباءات')
            ->where('landing.lookbook.categories.0.note', 'المقاسات من 52 إلى 60.')
            ->where('landing.lookbook.categories.0.stat', ['figure' => 'السبت', 'unit' => 'يوم الذروة'])
            ->where('landing.lookbook.looks.0.title', 'عباءة مبطّنة، كحلي')
            ->where('landing.lookbook.looks.0.alt', 'امرأة ترتدي عباءة كحلية مبطّنة فوق فستان بلون البيج')
            ->where('landing.lookbook.looks.1.title', 'Untranslated look')
            ->where('landing.lookbook.looks.1.city', 'Paris')
            // Pricing.
            ->where('landing.pricing.plans.0.name', 'شراء')
            ->where('landing.pricing.plans.0.priceCaption', 'دفعة واحدة، لكل جهاز')
            ->where('landing.pricing.plans.0.features', ['ضمان *12 شهرًا*', 'تجارب *غير محدودة*'])
            ->where('landing.pricing.plans.0.detail.label', 'التطبيق السحابي')
            ->where('landing.pricing.plans.0.ctaLabel', 'اطلب جهازك')
            ->where('landing.pricing.plans.1.name', 'Lease')
            ->where('landing.pricing.plans.1.features', ['Servicing for the whole term', 'Free replacement if a device fails', 'Priority support'])
            ->where('landing.pricing.currencies.0', ['code' => 'USD', 'name' => 'دولار أمريكي'])
            ->where('landing.pricing.faqs.0.question', 'كم يستغرق التركيب؟')
            // Footer pages link to the Arabic pages.
            ->where('landing.pages', [
                ['title' => 'الخصوصية', 'slug' => 'privacy', 'group' => 'legal', 'url' => '/ar/pages/privacy'],
                ['title' => 'Terms', 'slug' => 'terms', 'group' => 'legal', 'url' => '/ar/pages/terms'],
            ]),
        );

        // The English page is untouched by the Arabic.
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.stories.0.name', 'Noura Al-Harbi')
            ->where('landing.stories.0.coordinates', '24.71° N · 46.68° E')
            ->where('landing.lookbook.categories.0.stat.figure', 'Sat')
            ->where('landing.pricing.plans.0.name', 'Buy')
            ->where('landing.pricing.currencies.0', ['code' => 'USD', 'name' => 'US dollars'])
            ->where('landing.pages.0', ['title' => 'Privacy', 'slug' => 'privacy', 'group' => 'legal', 'url' => '/pages/privacy']),
        );
    }

    public function test_the_arabic_page_reads_the_arabic_copy_settings(): void
    {
        $this->setArabicDefault('hero.kicker', 'التجربة الافتراضية في المتجر');
        $this->setArabicDefault('hero.lede', '');
        Settings::set('hero.title', 'كل شاشة *غرفة قياس.*', 'ar');

        $this->get('/ar')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.content', function ($content): bool {
                $this->assertSame('كل شاشة *غرفة قياس.*', $content['hero.title']);
                $this->assertSame('التجربة الافتراضية في المتجر', $content['hero.kicker']);
                // No Arabic yet: the English.
                $this->assertStringStartsWith('TryOn is a touchscreen mirror', $content['hero.lede']);
                // Not translatable: the same in both languages.
                $this->assertSame('hello@tryon.app', $content['contact.email']);

                return true;
            }),
        );

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.content', fn ($content): bool => $content['hero.title'] === 'Every screen is a *fitting room.*'
                && $content['hero.kicker'] === 'In-store AI try-on'),
        );
    }

    public function test_a_content_page_is_served_in_arabic_at_ar_pages(): void
    {
        Page::factory()->arabic()->create(['title' => 'Privacy', 'slug' => 'privacy', 'summary' => 'How NLV handles your data.']);

        $this->assertSame('/ar/pages/privacy', route('ar.pages.show', 'privacy', absolute: false));

        $this->get('/ar/pages/privacy')
            ->assertOk()
            ->assertSee('<html lang="ar" dir="rtl"', false)
            ->assertSee('<link rel="alternate" hreflang="en" href="'.url('/pages/privacy').'">', false)
            ->assertSee('<link rel="alternate" hreflang="ar" href="'.url('/ar/pages/privacy').'">', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('page', false)
                ->where('locale', 'ar')
                ->where('dir', 'rtl')
                ->where('alternates', ['en' => url('/pages/privacy'), 'ar' => url('/ar/pages/privacy')])
                ->where('page.title', 'الخصوصية')
                ->where('page.summary', 'كيف تتعامل NLV مع بياناتك.')
                ->where('page.html', "<h2>الصور</h2>\n<p>تُحذف الصور عند انتهاء الجلسة.</p>\n")
                ->where('landing.locale', 'ar'),
            );

        $this->get('/pages/privacy')
            ->assertOk()
            ->assertSee('<html lang="en" dir="ltr"', false)
            ->assertInertia(fn (Assert $page) => $page
                ->where('locale', 'en')
                ->where('page.title', 'Privacy')
                ->where('page.summary', 'How NLV handles your data.')
                ->where('alternates.ar', url('/ar/pages/privacy')),
            );
    }

    public function test_an_untranslated_content_page_shows_its_english_on_the_arabic_site(): void
    {
        Page::factory()->create(['title' => 'Terms', 'slug' => 'terms', 'summary' => null, 'body' => '## Ordering']);

        $this->get('/ar/pages/terms')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('locale', 'ar')
                ->where('page.title', 'Terms')
                ->where('page.summary', null)
                ->where('page.html', "<h2>Ordering</h2>\n"),
            );
    }

    public function test_unknown_and_unpublished_arabic_pages_are_not_found(): void
    {
        Page::factory()->unpublished()->create(['slug' => 'draft']);

        $this->get('/ar/pages/nope')->assertNotFound();
        $this->get('/ar/pages/draft')->assertNotFound();
        $this->actingAs(User::factory()->admin()->create())->get('/ar/pages/draft')->assertOk();
    }

    public function test_the_admin_and_the_account_pages_stay_english_without_alternates(): void
    {
        $admin = User::factory()->admin()->create();

        // Even straight after an Arabic page in the same app instance.
        $this->get('/ar')->assertOk();

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertSee('<html lang="en" dir="ltr"', false)
            ->assertDontSee('hreflang', false)
            ->assertInertia(fn (Assert $page) => $page
                ->where('locale', 'en')
                ->where('dir', 'ltr')
                ->where('alternates', null),
            );

        $this->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('locale', 'en')->where('alternates', null));
    }

    public function test_each_language_is_cached_separately_and_cleared_together(): void
    {
        $story = Story::factory()->create(['name' => 'Noura Al-Harbi']);

        $this->assertSame('Noura Al-Harbi', LandingContent::build('en')['stories'][0]['name']);
        $this->assertSame('Noura Al-Harbi', LandingContent::build('ar')['stories'][0]['name']);
        $this->assertSame('ar', LandingContent::build('ar')['locale']);

        // A change behind the model's back is not seen until the cache is cleared...
        Story::withoutEvents(fn () => $story->update(['name_ar' => 'نورة الحربي']));
        $this->assertSame('Noura Al-Harbi', LandingContent::build('ar')['stories'][0]['name']);

        // ...and saving a record clears both languages.
        $story->update(['role_ar' => 'مؤسِّسة']);
        $this->assertSame('نورة الحربي', LandingContent::build('ar')['stories'][0]['name']);
        $this->assertSame('Noura Al-Harbi', LandingContent::build('en')['stories'][0]['name']);

        // So does a settings change, in either language.
        LandingContent::build('en');
        Settings::set('hero.kicker', 'تجربة في المتجر', 'ar');
        $this->assertSame('تجربة في المتجر', LandingContent::build('ar')['content']['hero.kicker']);
        $this->assertSame('In-store AI try-on', LandingContent::build('en')['content']['hero.kicker']);

        LandingContent::forget();
        $this->assertFalse(cache()->has(LandingContent::cacheKey('en')));
        $this->assertFalse(cache()->has(LandingContent::cacheKey('ar')));
    }

    public function test_build_uses_the_current_language_and_reads_unknown_ones_as_english(): void
    {
        $this->assertSame('en', LandingContent::build()['locale']);
        $this->assertSame('en', LandingContent::build('fr')['locale']);

        app()->setLocale('ar');

        $this->assertSame('ar', LandingContent::build()['locale']);
    }

    public function test_the_arabic_pages_preload_the_arabic_fonts_and_the_english_pages_do_not(): void
    {
        $this->fakeFontsManifest(hot: true);
        Page::factory()->create(['slug' => 'privacy']);

        $latin = $this->fontPreload('http://vite.test/fonts/instrument-400.woff2');
        $amiri = $this->fontPreload('http://vite.test/fonts/amiri-400.woff2');
        $amiriBold = $this->fontPreload('http://vite.test/fonts/amiri-700.woff2');
        $plex = $this->fontPreload('http://vite.test/fonts/plex-400.woff2');

        foreach (['/ar', '/ar/pages/privacy'] as $path) {
            // Vite remembers what it preloaded for the rest of the request (and,
            // in a test, of the app instance): each request starts afresh.
            Vite::flush();

            $response = $this->get($path)
                ->assertOk()
                ->assertSee($amiri, false)
                // The bold too: the hero's accent words are set in it.
                ->assertSee($amiriBold, false)
                ->assertSee($plex, false)
                ->assertSee($latin, false)
                // Only the weights on screen first, and only their woff2.
                ->assertDontSee('href="http://vite.test/fonts/plex-500.woff2" type', false)
                ->assertDontSee('href="http://vite.test/fonts/amiri-400.woff" type', false);

            // Listed in the Link header too, like the Latin preloads.
            $this->assertStringContainsString(
                '<http://vite.test/fonts/amiri-400.woff2>; rel="preload"; as="font"; type="font/woff2"; crossorigin="anonymous"',
                (string) $response->headers->get('Link'),
            );
        }

        foreach (['/', '/pages/privacy'] as $path) {
            Vite::flush();

            $response = $this->get($path)
                ->assertOk()
                ->assertSee($latin, false)
                ->assertDontSee($amiri, false)
                ->assertDontSee($plex, false);

            $this->assertStringNotContainsString('amiri', (string) $response->headers->get('Link'));
        }

        Vite::flush();

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertSee($latin, false)
            ->assertDontSee($amiri, false);
    }

    public function test_font_preloads_are_read_from_the_built_fonts_manifest(): void
    {
        // No manifest (nothing built, no dev server): no tags.
        $this->app->usePublicPath(sys_get_temp_dir().'/nlv-no-build-'.Str::random(8));
        $this->assertSame('', Vite::preloadFonts(['amiri' => [400]])->toHtml());

        $this->fakeFontsManifest(hot: false);

        $this->assertSame(
            $this->fontPreload(asset('build/assets/amiri-400.woff2'))."\n".$this->fontPreload(asset('build/assets/plex-400.woff2')),
            Vite::preloadFonts(['amiri' => [400], 'ibm-plex-sans-arabic' => [400]])->toHtml(),
        );

        // Each file once per page, like @fonts; nothing for a family or a
        // weight the build lacks (a stale build).
        $this->assertSame('', Vite::preloadFonts(['amiri' => [400, 300], 'el-messiri' => [400]])->toHtml());
    }

    public function test_the_preloaded_arabic_fonts_are_built_by_vite(): void
    {
        // app.blade.php preloads these aliases on the Arabic pages; the Vite
        // plugin names each family by the slug of its name.
        preg_match_all("/bunny\\('([^']+)'/", (string) file_get_contents(base_path('vite.config.ts')), $families);
        $aliases = array_map(Str::slug(...), $families[1]);

        $this->assertContains('amiri', $aliases);
        $this->assertContains('ibm-plex-sans-arabic', $aliases);
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

    /**
     * A story's figure (not translated: the same on both pages).
     */
    private function storyFigure(string $name): string
    {
        return Story::query()->where('name', $name)->value('metric_figure');
    }

    /**
     * A fonts manifest as the Vite plugin writes it: Instrument Sans preloaded
     * on every page (by @fonts), Amiri and IBM Plex Sans Arabic not (preload:
     * false in vite.config.ts), each weight as a woff2 and a woff file. Hot:
     * the dev server's manifest (file URLs); otherwise the build's (paths).
     */
    private function fakeFontsManifest(bool $hot): void
    {
        $directory = sys_get_temp_dir().'/nlv-fonts-'.Str::random(8);
        File::ensureDirectoryExists($directory.'/build');
        $this->beforeApplicationDestroyed(fn () => File::deleteDirectory($directory));

        $file = fn (string $name, string $format): array => $hot
            ? ['url' => "http://vite.test/fonts/{$name}.{$format}", 'format' => $format]
            : ['file' => "assets/{$name}.{$format}", 'format' => $format];
        $variant = fn (string $name): array => ['files' => [$file($name, 'woff2'), $file($name, 'woff')]];

        $manifest = [
            'version' => 1,
            'families' => [
                'instrument-sans' => ['family' => 'Instrument Sans', 'variants' => ['400:normal' => $variant('instrument-400')]],
                'amiri' => ['family' => 'Amiri', 'variants' => ['400:normal' => $variant('amiri-400'), '700:normal' => $variant('amiri-700')]],
                'ibm-plex-sans-arabic' => ['family' => 'IBM Plex Sans Arabic', 'variants' => ['400:normal' => $variant('plex-400'), '500:normal' => $variant('plex-500')]],
            ],
            'preloads' => [
                ['alias' => 'instrument-sans', ...$file('instrument-400', 'woff2'), 'as' => 'font', 'type' => 'font/woff2', 'crossorigin' => 'anonymous'],
            ],
            'style' => ['inline' => '/* the @font-face rules */'],
        ];

        if ($hot) {
            File::put($directory.'/hot', 'http://vite.test');
            File::put($directory.'/fonts-manifest.dev.json', (string) json_encode($manifest));
            Vite::useHotFile($directory.'/hot');
        } else {
            File::put($directory.'/build/fonts-manifest.json', (string) json_encode($manifest));
            $this->app->usePublicPath($directory);
        }
    }

    /**
     * The tag @fonts (and Vite::preloadFonts) renders for a woff2 file.
     */
    private function fontPreload(string $url): string
    {
        return '<link rel="preload" as="font" href="'.$url.'" type="font/woff2" crossorigin="anonymous" />';
    }
}
