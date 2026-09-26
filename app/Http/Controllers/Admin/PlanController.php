<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Pricing\UpdateCurrenciesRequest;
use App\Http\Requests\Admin\Pricing\UpdatePlanRequest;
use App\Models\Faq;
use App\Models\Plan;
use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Plans & prices (/admin/plans): the three seeded plans (Buy, Lease,
 * Chain), edited in place, never created or deleted. The currencies panel
 * on the index saves through CurrencyController.
 *
 * Every text on a plan has an Arabic twin (`name_ar`, `features_ar`, …),
 * edited beside the English and shown on /ar.
 *
 * @phpstan-type AdminPlan array{
 *     id: int, key: string, name: string, blurb: string, price_mode: string,
 *     prices: array<string, int>|null, price_caption: string,
 *     detail_label: string|null, detail_prices: array<string, int>|null,
 *     detail_value: string|null, detail_caption: string|null,
 *     features_heading: string|null, features: list<string>, cta_label: string,
 *     is_featured: bool, badge: string|null, badge_note: string|null,
 *     name_ar: string|null, blurb_ar: string|null, price_caption_ar: string|null,
 *     detail_label_ar: string|null, detail_caption_ar: string|null,
 *     features_heading_ar: string|null, features_ar: list<string>|null,
 *     cta_label_ar: string|null, badge_ar: string|null, badge_note_ar: string|null,
 *     missing_arabic: list<string>, sort_order: int, updated_at: string|null
 * }
 * @phpstan-type PricingCopy array{title: string, lede: string, note: string, customPrice: string, faqTitle: string}
 */
class PlanController extends Controller
{
    /**
     * The three plans as cards, and the currencies panel.
     */
    public function index(): Response
    {
        $plans = Plan::query()->ordered()->get();

        return Inertia::render('admin/plans/index', [
            'plans' => array_values($plans->map(fn (Plan $plan): array => $this->present($plan))->all()),
            'currencies' => Settings::currencies(),
            'currencyOptions' => $this->currencyOptions($plans),
            'copy' => $this->copy(),
            'faqs' => ['total' => Faq::query()->count(), 'live' => Faq::query()->published()->count()],
        ]);
    }

    /**
     * The editor for one plan, with a live preview of its card.
     */
    public function edit(Plan $plan): Response
    {
        $currencies = Settings::currencies();
        $enabled = array_column($currencies, 'code');
        $stored = array_keys([...($plan->prices ?? []), ...($plan->detail_prices ?? [])]);
        $hidden = array_values(array_diff(array_keys((array) config('landing.currencies', [])), $enabled));

        return Inertia::render('admin/plans/edit', [
            'plan' => $this->present($plan),
            'currencies' => $currencies,
            'hiddenCurrencies' => $hidden,
            'storedHidden' => array_values(array_intersect($hidden, $stored)),
            'featuredPlan' => Plan::query()->where('is_featured', true)->whereKeyNot($plan->id)->value('name'),
            'copy' => $this->copy(),
        ]);
    }

    /**
     * Save a plan. Featuring it takes the feature off every other plan.
     */
    public function update(UpdatePlanRequest $request, Plan $plan): RedirectResponse
    {
        $attributes = $request->planAttributes();

        $unfeatured = DB::transaction(function () use ($plan, $attributes): int {
            $unfeatured = 0;

            if ($attributes['is_featured'] === true) {
                Plan::query()
                    ->whereKeyNot($plan->id)
                    ->where('is_featured', true)
                    ->get()
                    ->each(function (Plan $other) use (&$unfeatured): void {
                        $other->update(['is_featured' => false]);
                        $unfeatured++;
                    });
            }

            $plan->update($attributes);

            return $unfeatured;
        });

        $message = match (true) {
            $plan->wasChanged('is_featured') && $plan->is_featured => "{$plan->name} saved, and now the featured plan.",
            $plan->wasChanged() || $unfeatured > 0 => "{$plan->name} saved.",
            default => null,
        };

        Inertia::flash('toast', $message === null
            ? ['type' => 'info', 'message' => "No changes to {$plan->name}."]
            : ['type' => 'success', 'message' => $message]);

        return to_route('admin.plans.index');
    }

    /**
     * A plan as the admin pages use it (form field names).
     *
     * @return AdminPlan
     */
    private function present(Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'key' => $plan->key->value,
            'name' => $plan->name,
            'blurb' => $plan->blurb,
            'price_mode' => $plan->price_mode->value,
            'prices' => $this->amounts($plan->prices),
            'price_caption' => $plan->price_caption,
            'detail_label' => $plan->detail_label,
            'detail_prices' => $this->amounts($plan->detail_prices),
            'detail_value' => $plan->detail_value,
            'detail_caption' => $plan->detail_caption,
            'features_heading' => $plan->features_heading,
            'features' => array_map(strval(...), $plan->features),
            'cta_label' => $plan->cta_label,
            'is_featured' => $plan->is_featured,
            'badge' => $plan->badge,
            'badge_note' => $plan->badge_note,
            'name_ar' => $plan->name_ar,
            'blurb_ar' => $plan->blurb_ar,
            'price_caption_ar' => $plan->price_caption_ar,
            'detail_label_ar' => $plan->detail_label_ar,
            'detail_caption_ar' => $plan->detail_caption_ar,
            'features_heading_ar' => $plan->features_heading_ar,
            'features_ar' => $plan->features_ar === null ? null : array_map(strval(...), $plan->features_ar),
            'cta_label_ar' => $plan->cta_label_ar,
            'badge_ar' => $plan->badge_ar,
            'badge_note_ar' => $plan->badge_note_ar,
            // English texts with no Arabic yet (the /ar page shows the English there).
            'missing_arabic' => $plan->missingArabic(),
            'sort_order' => $plan->sort_order,
            'updated_at' => $plan->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Whole amounts by code (null when there are none, so the browser gets
     * an object or null, never an empty array).
     *
     * @param  array<array-key, mixed>|null  $prices
     * @return array<string, int>|null
     */
    private function amounts(?array $prices): ?array
    {
        $amounts = [];

        foreach ($prices ?? [] as $code => $amount) {
            if (is_numeric($amount)) {
                $amounts[(string) $code] = (int) $amount;
            }
        }

        return $amounts === [] ? null : $amounts;
    }

    /**
     * Every configured currency for the currencies panel: the enabled ones
     * first in their order, then the rest in config order, each with its
     * place in the config (where the panel puts it back when it is switched
     * on again) and the plans that still lack a price in it.
     *
     * @param  Collection<int, Plan>  $plans
     * @return list<array{code: string, name: string, enabled: bool, position: int, missing: list<string>}>
     */
    private function currencyOptions(Collection $plans): array
    {
        $names = array_map(strval(...), (array) config('landing.currencies', []));
        $positions = array_flip(array_keys($names));
        $enabled = array_column(Settings::currencies(), 'code');
        $codes = [...$enabled, ...array_diff(array_keys($names), $enabled)];

        return array_map(fn (string $code): array => [
            'code' => $code,
            'name' => $names[$code],
            'enabled' => in_array($code, $enabled, true),
            'position' => $positions[$code],
            'missing' => UpdateCurrenciesRequest::plansMissing($plans, $code),
        ], $codes);
    }

    /**
     * Section copy the plan cards are shown with on each landing page.
     *
     * @return array{en: PricingCopy, ar: PricingCopy}
     */
    private function copy(): array
    {
        $copy = fn (string $locale): array => [
            'title' => Settings::string('sections.pricing.title', $locale),
            'lede' => Settings::string('sections.pricing.lede', $locale),
            'note' => Settings::string('sections.pricing.note', $locale),
            'customPrice' => Settings::string('sections.pricing.custom_price', $locale),
            'faqTitle' => Settings::string('sections.pricing.faq_title', $locale),
        ];

        return [Locales::ENGLISH => $copy(Locales::ENGLISH), Locales::ARABIC => $copy(Locales::ARABIC)];
    }
}
