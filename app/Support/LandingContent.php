<?php

namespace App\Support;

use App\Enums\PriceMode;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Everything the landing page shows that the admin panel controls: the
 * `landing` prop of the `welcome` page, shaped exactly like the TypeScript
 * type LandingData (resources/js/types/landing.ts). Published records only,
 * in their sort order.
 *
 * Built per language: on the Arabic page every text is the Arabic
 * (`*_ar` columns, translatable settings), falling back to the English where
 * no Arabic is filled in, and links point to the Arabic pages. Each
 * language is cached forever; every content model clears both on save and
 * delete (RefreshesLandingContent), as does Settings::setMany().
 *
 * @phpstan-type Accent array{before: string, accent: string, after: string}
 * @phpstan-type Media array{kind: 'unsplash', id: string}|array{kind: 'upload', url: string, width: int|null, height: int|null}
 * @phpstan-type PageLink array{title: string, slug: string, group: string, url: string}
 * @phpstan-type Payload array{
 *     locale: string,
 *     content: array<string, string>,
 *     stats: array{stores: int, countries: int, tryOnsYear: string, tryOnsToday: int},
 *     stories: list<array<string, mixed>>,
 *     lookbook: array{categories: list<array<string, mixed>>, looks: list<array<string, mixed>>},
 *     pricing: array{currencies: list<array{code: string, name: string}>, plans: list<array<string, mixed>>, faqs: list<array{id: int, question: string, answer: string}>},
 *     pages: list<PageLink>
 * }
 */
class LandingContent
{
    /**
     * The cache key prefix of the payload: "landing.content.en", "landing.content.ar".
     */
    public const CACHE_KEY = 'landing.content';

    /**
     * Compass points in coordinates ("24.71° N"), as the Arabic page writes them.
     */
    private const ARABIC_COMPASS = ['N' => 'شمالًا', 'S' => 'جنوبًا', 'E' => 'شرقًا', 'W' => 'غربًا'];

    /**
     * The payload in a language (default: the current request's), cached.
     *
     * @return Payload
     */
    public static function build(?string $locale = null): array
    {
        $locale = Locales::normalize($locale ?? Locales::current());

        return Cache::rememberForever(self::cacheKey($locale), fn (): array => self::fresh($locale));
    }

    /**
     * Clear the cached payload in every language (the next build() recomputes it).
     */
    public static function forget(): void
    {
        // The single payload cached before the page had an Arabic version.
        Cache::forget(self::CACHE_KEY);

        foreach (Locales::SUPPORTED as $locale) {
            Cache::forget(self::cacheKey($locale));
        }
    }

    /**
     * The cache key of one language's payload.
     */
    public static function cacheKey(string $locale): string
    {
        return self::CACHE_KEY.'.'.Locales::normalize($locale);
    }

    /**
     * The payload in a language (default: the current request's), computed
     * now (uncached).
     *
     * @return Payload
     */
    public static function fresh(?string $locale = null): array
    {
        $locale = Locales::normalize($locale ?? Locales::current());
        $currencies = Settings::currencies($locale);

        return [
            'locale' => $locale,
            'content' => self::content($locale),
            'stats' => [
                'stores' => Settings::integer('stats.stores'),
                'countries' => Settings::integer('stats.countries'),
                'tryOnsYear' => Settings::string('stats.tryons_year', $locale),
                'tryOnsToday' => Settings::integer('stats.tryons_today'),
            ],
            'stories' => self::stories($locale),
            'lookbook' => self::lookbook($locale),
            'pricing' => [
                'currencies' => $currencies,
                'plans' => self::plans(array_column($currencies, 'code'), $locale),
                'faqs' => array_values(Faq::query()->published()->ordered()->get()
                    ->map(fn (Faq $faq): array => [
                        'id' => $faq->id,
                        'question' => self::text($faq, 'question', $locale),
                        'answer' => self::text($faq, 'answer', $locale),
                    ])
                    ->all()),
            ],
            'pages' => self::pages($locale),
        ];
    }

    /**
     * Split copy marked up with *asterisks* around its accent phrase:
     * "Abaya sales *rose by a third* in one season." becomes
     * {before: "Abaya sales ", accent: "rose by a third", after: " in one season."}.
     * Without a starred phrase everything is in `before`.
     *
     * @return Accent
     */
    public static function splitAccent(string $text): array
    {
        if (preg_match('/^(.*?)\*([^*]+)\*(.*)$/su', $text, $matches) === 1) {
            return [
                'before' => $matches[1],
                'accent' => $matches[2],
                'after' => str_replace('*', '', $matches[3]),
            ];
        }

        return ['before' => str_replace('*', '', $text), 'accent' => '', 'after' => ''];
    }

    /**
     * Coordinates as the page writes them: "24.71° N · 46.68° E" in English,
     * "24.71° شمالًا · 46.68° شرقًا" in Arabic. Any other format is left as is.
     */
    public static function coordinates(?string $coordinates, string $locale): ?string
    {
        if ($coordinates === null || ! Locales::isArabic($locale)) {
            return $coordinates;
        }

        return preg_replace_callback(
            '/°\s*([NSEW])(?!\p{L})/u',
            fn (array $match): string => '° '.self::ARABIC_COMPASS[$match[1]],
            $coordinates,
        ) ?? $coordinates;
    }

    /**
     * The public copy, contact and social settings as strings.
     *
     * @return array<string, string>
     */
    private static function content(string $locale): array
    {
        $content = [];
        $values = Settings::all($locale);

        foreach (Settings::schema() as $key => $definition) {
            if (! $definition['public'] || $definition['group'] === 'stats' || $definition['type'] === 'currencies') {
                continue;
            }

            $value = $values[$key] ?? null;
            $content[$key] = is_scalar($value) ? (string) $value : '';
        }

        return $content;
    }

    /**
     * Published pages listed in the footer, in order, linking to the page in
     * the same language (/pages/about, /ar/pages/about).
     *
     * @return list<PageLink>
     */
    private static function pages(string $locale): array
    {
        $pages = [];

        foreach (Page::query()->published()->whereNotNull('footer_group')->ordered()->get() as $page) {
            if ($page->footer_group !== null) {
                $pages[] = [
                    'title' => self::text($page, 'title', $locale),
                    'slug' => $page->slug,
                    'group' => $page->footer_group->value,
                    'url' => Locales::route('pages.show', $page->slug, $locale, absolute: false),
                ];
            }
        }

        return $pages;
    }

    /**
     * Published stories with a usable portrait, in order. `metric.short` is the
     * compact label in the story list, falling back to the full label.
     *
     * @return list<array<string, mixed>>
     */
    private static function stories(string $locale): array
    {
        $stories = [];

        foreach (Story::query()->published()->ordered()->get() as $story) {
            $portrait = MediaRef::toArray($story->portrait);

            if ($portrait === null) {
                continue;
            }

            $name = self::text($story, 'name', $locale);
            $role = self::text($story, 'role', $locale);
            $store = self::text($story, 'store', $locale);
            $label = self::text($story, 'metric_label', $locale);
            $short = self::optionalText($story, 'metric_short', $locale);

            $stories[] = [
                'id' => $story->id,
                'name' => $name,
                'role' => $role,
                'store' => $store,
                'city' => self::text($story, 'city', $locale),
                'coordinates' => self::coordinates($story->coordinates, $locale),
                'quote' => self::splitAccent(self::text($story, 'quote', $locale)),
                'metric' => [
                    'figure' => $story->metric_figure,
                    'label' => $label,
                    'note' => self::optionalText($story, 'metric_note', $locale),
                    'short' => $short ?? $label,
                ],
                'portrait' => $portrait,
                'portraitAlt' => __('Portrait of :name, :role at :store', ['name' => $name, 'role' => $role, 'store' => $store], $locale),
                'focus' => [(float) $story->portrait_focus_x, (float) $story->portrait_focus_y],
                'zoom' => (float) $story->portrait_zoom,
            ];
        }

        return $stories;
    }

    /**
     * Categories that have at least one published look, and the published looks.
     * A category's `stat` is the figure in its "this week" note (null: none).
     *
     * @return array{categories: list<array<string, mixed>>, looks: list<array<string, mixed>>}
     */
    private static function lookbook(string $locale): array
    {
        $categories = LookCategory::query()->ordered()->get()->keyBy('id');
        $looks = [];
        $used = [];

        foreach (Look::query()->published()->ordered()->get() as $look) {
            $category = $categories->get($look->look_category_id);
            $after = MediaRef::toArray($look->after_image);

            if ($category === null || $after === null) {
                continue;
            }

            $used[$category->id] = true;

            $looks[] = [
                'id' => $look->id,
                'category' => $category->slug,
                'title' => self::text($look, 'title', $locale),
                'city' => self::text($look, 'city', $locale),
                'seconds' => (float) $look->render_seconds,
                'after' => $after,
                'before' => MediaRef::toArray($look->before_image),
                'alt' => self::text($look, 'alt', $locale),
                'aspect' => (float) $look->aspect,
                'focus' => [(float) $look->focus_x, (float) $look->focus_y],
            ];
        }

        $listed = [];

        foreach ($categories as $category) {
            if (isset($used[$category->id])) {
                $figure = self::optionalText($category, 'stat_figure', $locale);

                $listed[] = [
                    'id' => $category->id,
                    'slug' => $category->slug,
                    'name' => self::text($category, 'name', $locale),
                    'note' => self::optionalText($category, 'note', $locale),
                    'stat' => $figure !== null
                        ? ['figure' => $figure, 'unit' => self::optionalText($category, 'stat_unit', $locale)]
                        : null,
                ];
            }
        }

        return ['categories' => $listed, 'looks' => $looks];
    }

    /**
     * Every plan, with prices limited to the enabled currencies.
     *
     * @param  list<string>  $codes
     * @return list<array<string, mixed>>
     */
    private static function plans(array $codes, string $locale): array
    {
        $plans = Plan::query()->ordered()->get()
            ->map(fn (Plan $plan): array => [
                'key' => $plan->key->value,
                'name' => self::text($plan, 'name', $locale),
                'blurb' => self::text($plan, 'blurb', $locale),
                'priceMode' => $plan->price_mode->value,
                'prices' => $plan->price_mode === PriceMode::Custom ? null : self::amounts($plan->prices, $codes),
                'priceCaption' => self::text($plan, 'price_caption', $locale),
                'detail' => [
                    'label' => self::optionalText($plan, 'detail_label', $locale),
                    'prices' => self::amounts($plan->detail_prices, $codes),
                    'value' => $plan->detail_value,
                    'caption' => self::optionalText($plan, 'detail_caption', $locale),
                ],
                'featuresHeading' => self::optionalText($plan, 'features_heading', $locale),
                'features' => self::lines($plan->localized('features', $locale)),
                'ctaLabel' => self::text($plan, 'cta_label', $locale),
                'featured' => $plan->is_featured,
                'badge' => self::optionalText($plan, 'badge', $locale),
                'badgeNote' => self::optionalText($plan, 'badge_note', $locale),
            ]);

        return array_values($plans->all());
    }

    /**
     * Whole amounts for the enabled currencies, in their order (null when none).
     *
     * @param  array<array-key, mixed>|null  $prices
     * @param  list<string>  $codes
     * @return array<string, int>|null
     */
    private static function amounts(?array $prices, array $codes): ?array
    {
        if ($prices === null) {
            return null;
        }

        $amounts = [];

        foreach ($codes as $code) {
            if (isset($prices[$code]) && is_numeric($prices[$code])) {
                $amounts[$code] = (int) $prices[$code];
            }
        }

        return $amounts === [] ? null : $amounts;
    }

    /**
     * A text attribute in a language ('' when empty).
     *
     * @param  Story|Look|LookCategory|Plan|Faq|Page  $model
     */
    private static function text(Model $model, string $attribute, string $locale): string
    {
        $value = $model->localized($attribute, $locale);

        return is_scalar($value) ? (string) $value : '';
    }

    /**
     * An optional text attribute in a language (null when blank).
     *
     * @param  Story|Look|LookCategory|Plan|Faq|Page  $model
     */
    private static function optionalText(Model $model, string $attribute, string $locale): ?string
    {
        $value = self::text($model, $attribute, $locale);

        return blank($value) ? null : $value;
    }

    /**
     * A list of lines (plan features) as strings.
     *
     * @return list<string>
     */
    private static function lines(mixed $value): array
    {
        return is_array($value)
            ? array_values(array_map(fn (mixed $line): string => is_scalar($line) ? (string) $line : '', $value))
            : [];
    }
}
