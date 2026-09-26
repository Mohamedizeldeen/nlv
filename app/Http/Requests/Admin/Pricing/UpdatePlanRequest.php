<?php

namespace App\Http\Requests\Admin\Pricing;

use App\Enums\PriceMode;
use App\Models\Plan;
use App\Support\Settings;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Saves one plan from the Plans & prices editor.
 *
 * Prices are asked for in the enabled currencies only; amounts stored for
 * hidden currencies are kept, so switching a currency back on restores them.
 * A plan priced by quote keeps its stored amounts untouched. The ledger line
 * under the price (`detail_kind`) is either nothing, a price per currency
 * (Buy's cloud app) or a figure (Lease's 24-month term).
 *
 * Every text on the card comes in English and Arabic (`name` + `name_ar`,
 * `features` + `features_ar`, one Arabic line per English line). Arabic is
 * required wherever the English is, with the same limits; an optional text
 * (list heading, line caption, badge, badge note) is filled in both
 * languages or in neither, so the two pages always show the same card.
 */
class UpdatePlanRequest extends FormRequest
{
    /**
     * What the line under the price shows.
     */
    public const DETAIL_KINDS = ['none', 'prices', 'value'];

    /**
     * Most feature lines a card can carry before it gets too long.
     */
    public const MAX_FEATURES = 8;

    /**
     * Longest feature line, in either language.
     */
    public const MAX_FEATURE = 120;

    /**
     * Largest amount the price fields accept (nine digits).
     */
    public const MAX_AMOUNT = 999_999_999;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $codes = $this->enabledCodes();

        $rules = [
            'name' => ['required', 'string', 'max:40'],
            'blurb' => ['required', 'string', 'max:200'],
            'price_mode' => ['required', Rule::enum(PriceMode::class)],
            'prices' => ['exclude_if:price_mode,custom', 'required', 'array:'.implode(',', $codes)],
            'price_caption' => ['required', 'string', 'max:120'],
            'detail_kind' => ['required', Rule::in(self::DETAIL_KINDS)],
            'detail_label' => ['exclude_if:detail_kind,none', 'required', 'string', 'max:40'],
            'detail_prices' => ['exclude_unless:detail_kind,prices', 'required', 'array:'.implode(',', $codes)],
            'detail_value' => ['exclude_unless:detail_kind,value', 'required', 'string', 'max:20'],
            'detail_caption' => ['exclude_if:detail_kind,none', 'nullable', 'required_with:detail_caption_ar', 'string', 'max:60'],
            'features_heading' => ['nullable', 'required_with:features_heading_ar', 'string', 'max:80'],
            'features' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_FEATURES],
            'features.*' => ['required', 'string', 'max:'.self::MAX_FEATURE],
            'cta_label' => ['required', 'string', 'max:40'],
            'is_featured' => ['required', 'boolean'],
            'badge' => ['nullable', 'required_with:badge_ar', 'string', 'max:40'],
            'badge_note' => ['nullable', 'required_with:badge_note_ar', 'string', 'max:80'],

            // The Arabic card: the same texts and limits.
            'name_ar' => ['required', 'string', 'max:40'],
            'blurb_ar' => ['required', 'string', 'max:200'],
            'price_caption_ar' => ['required', 'string', 'max:120'],
            'detail_label_ar' => ['exclude_if:detail_kind,none', 'required', 'string', 'max:40'],
            'detail_caption_ar' => ['exclude_if:detail_kind,none', 'nullable', 'required_with:detail_caption', 'string', 'max:60'],
            'features_heading_ar' => ['nullable', 'required_with:features_heading', 'string', 'max:80'],
            // One Arabic line for each English line, in the same order (no
            // second error while the English list itself is missing).
            'features_ar' => $this->featureCount() > 0
                ? ['required', 'array', 'list', 'size:'.$this->featureCount()]
                : ['nullable', 'array'],
            'features_ar.*' => ['required', 'string', 'max:'.self::MAX_FEATURE],
            'cta_label_ar' => ['required', 'string', 'max:40'],
            'badge_ar' => ['nullable', 'required_with:badge', 'string', 'max:40'],
            'badge_note_ar' => ['nullable', 'required_with:badge_note', 'string', 'max:80'],
        ];

        foreach ($codes as $code) {
            $amount = ['required', 'integer', 'min:1', 'max:'.self::MAX_AMOUNT];

            $rules["prices.{$code}"] = ['exclude_if:price_mode,custom', ...$amount];
            $rules["detail_prices.{$code}"] = ['exclude_unless:detail_kind,prices', ...$amount];
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $messages = [
            'prices.required' => 'Enter the price in every currency.',
            'prices.array' => 'Enter the price in every currency shown on the page.',
            'detail_prices.required' => 'Enter this line’s price in every currency.',
            'detail_prices.array' => 'Enter this line’s price in every currency shown on the page.',
            'detail_label.required' => 'Name the line, e.g. “Cloud app” or “Term”.',
            'detail_value.required' => 'Enter the figure, e.g. “24”.',
            'features.required' => 'List at least one feature.',
            'features.min' => 'List at least one feature.',
            'features.max' => 'Keep it to '.self::MAX_FEATURES.' features: longer lists crowd the card.',
            'features.*.required' => 'Write this feature or remove the row.',
            'features.*.max' => 'Keep each feature under '.self::MAX_FEATURE.' characters.',
            'features_ar.required' => 'Write the features in Arabic too.',
            'features_ar.size' => 'Write each feature in Arabic too: one Arabic line for every English line.',
            'features_ar.*.required' => 'Write this feature in Arabic too, or remove the row.',
            'features_ar.*.max' => 'Keep each Arabic feature under '.self::MAX_FEATURE.' characters.',
            'detail_caption.required_with' => 'Add the caption in English too, or clear the Arabic one.',
            'detail_caption_ar.required_with' => 'Add the caption in Arabic too, or clear the English one.',
            'features_heading.required_with' => 'Add the heading in English too, or clear the Arabic one.',
            'features_heading_ar.required_with' => 'Add the heading in Arabic too, or clear the English one.',
            'badge.required_with' => 'Add the badge in English too, or clear the Arabic one.',
            'badge_ar.required_with' => 'Add the badge in Arabic too, or clear the English one.',
            'badge_note.required_with' => 'Add the note in English too, or clear the Arabic one.',
            'badge_note_ar.required_with' => 'Add the note in Arabic too, or clear the English one.',
        ];

        foreach ((array) config('landing.currencies', []) as $code => $name) {
            foreach (['prices', 'detail_prices'] as $field) {
                $messages["{$field}.{$code}.required"] = "Enter the price in {$name}.";
                $messages["{$field}.{$code}.integer"] = "Price in {$name}: whole amounts only.";
                $messages["{$field}.{$code}.min"] = "Price in {$name}: enter an amount above zero.";
                $messages["{$field}.{$code}.max"] = "Price in {$name}: that amount is too large.";
            }
        }

        return $messages;
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'blurb' => 'one-line description',
            'price_mode' => 'price type',
            'price_caption' => 'price caption',
            'detail_label' => 'line label',
            'detail_value' => 'figure',
            'detail_caption' => 'line caption',
            'features_heading' => 'list heading',
            'cta_label' => 'button label',
            'badge_note' => 'badge note',
            'name_ar' => 'Arabic name',
            'blurb_ar' => 'Arabic one-line description',
            'price_caption_ar' => 'Arabic price caption',
            'detail_label_ar' => 'Arabic line label',
            'detail_caption_ar' => 'Arabic line caption',
            'features_heading_ar' => 'Arabic list heading',
            'features_ar' => 'Arabic features',
            'features_ar.*' => 'Arabic feature',
            'cta_label_ar' => 'Arabic button label',
            'badge_ar' => 'Arabic badge',
            'badge_note_ar' => 'Arabic badge note',
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $plan = $this->plan();

                // Exactly one plan is featured: it can only move to another plan.
                if ($plan->is_featured && ! $this->boolean('is_featured')) {
                    $validator->errors()->add(
                        'is_featured',
                        "{$plan->name} is the featured plan. To move the arch, feature another plan instead.",
                    );
                }
            },
        ];
    }

    /**
     * The plan's new attributes, from the validated input.
     *
     * @return array<string, mixed>
     */
    public function planAttributes(): array
    {
        $plan = $this->plan();
        $data = $this->validated();
        $mode = PriceMode::from((string) $data['price_mode']);
        $kind = (string) $data['detail_kind'];

        $attributes = [
            'name' => $data['name'],
            'blurb' => $data['blurb'],
            'price_mode' => $mode,
            'price_caption' => $data['price_caption'],
            'detail_label' => $kind === 'none' ? null : $data['detail_label'],
            'detail_prices' => $kind === 'prices'
                ? self::mergePrices($plan->detail_prices, (array) $data['detail_prices'])
                : null,
            'detail_value' => $kind === 'value' ? $data['detail_value'] : null,
            'detail_caption' => $kind === 'none' ? null : ($data['detail_caption'] ?? null),
            'features_heading' => $data['features_heading'] ?? null,
            'features' => self::lines($data['features']),
            'cta_label' => $data['cta_label'],
            'is_featured' => (bool) $data['is_featured'],
            'badge' => $data['badge'] ?? null,
            'badge_note' => $data['badge_note'] ?? null,
            'name_ar' => $data['name_ar'],
            'blurb_ar' => $data['blurb_ar'],
            'price_caption_ar' => $data['price_caption_ar'],
            'detail_label_ar' => $kind === 'none' ? null : $data['detail_label_ar'],
            'detail_caption_ar' => $kind === 'none' ? null : ($data['detail_caption_ar'] ?? null),
            'features_heading_ar' => $data['features_heading_ar'] ?? null,
            'features_ar' => self::lines($data['features_ar']),
            'cta_label_ar' => $data['cta_label_ar'],
            'badge_ar' => $data['badge_ar'] ?? null,
            'badge_note_ar' => $data['badge_note_ar'] ?? null,
        ];

        // A plan priced by quote keeps its amounts, ready for when it gets a figure again.
        if ($mode !== PriceMode::Custom) {
            $attributes['prices'] = self::mergePrices($plan->prices, (array) $data['prices']);
        }

        return $attributes;
    }

    /**
     * The stored amounts with the submitted ones laid over them, sorted by
     * currency code (the order MySQL keeps JSON keys in). When nothing
     * changed, the stored array is returned as-is so a save that only
     * reorders keys is not logged as a change.
     *
     * @param  array<array-key, mixed>|null  $stored
     * @param  array<array-key, mixed>  $submitted
     * @return array<string, int>
     */
    public static function mergePrices(?array $stored, array $submitted): array
    {
        $known = array_keys((array) config('landing.currencies', []));
        $merged = [];

        foreach ([...($stored ?? []), ...$submitted] as $code => $amount) {
            if (in_array($code, $known, true) && is_numeric($amount)) {
                $merged[(string) $code] = (int) $amount;
            }
        }

        ksort($merged);

        $current = [];

        foreach ($stored ?? [] as $code => $amount) {
            $current[(string) $code] = is_numeric($amount) ? (int) $amount : $amount;
        }

        ksort($current);

        if ($stored !== null && $current === $merged) {
            /** @var array<string, int> $stored */
            return $stored;
        }

        return $merged;
    }

    /**
     * A validated list of lines as strings.
     *
     * @return list<string>
     */
    private static function lines(mixed $lines): array
    {
        return array_values(array_map(strval(...), (array) $lines));
    }

    /**
     * How many English feature lines were sent (the Arabic list must match).
     */
    private function featureCount(): int
    {
        $features = $this->input('features');

        return is_array($features) ? count($features) : 0;
    }

    /**
     * The plan being edited (bound from the route).
     */
    public function plan(): Plan
    {
        $plan = $this->route('plan');

        abort_unless($plan instanceof Plan, 404);

        return $plan;
    }

    /**
     * The currency codes the pricing section shows, in order.
     *
     * @return list<string>
     */
    private function enabledCodes(): array
    {
        return array_column(Settings::currencies(), 'code');
    }
}
