<?php

namespace App\Http\Requests\Admin\Pricing;

use App\Enums\PriceMode;
use App\Models\Plan;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The currencies the pricing section offers (setting `pricing.currencies`):
 * the enabled codes, in display order. At least one, and every one must
 * have a price on every plan that shows a figure, so the landing page's
 * currency switch never lands on an empty card.
 */
class UpdateCurrenciesRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'currencies' => ['required', 'array', 'list', 'min:1'],
            'currencies.*' => ['required', 'string', 'distinct', Rule::in(array_keys((array) config('landing.currencies', [])))],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'currencies.required' => 'Show at least one currency.',
            'currencies.min' => 'Show at least one currency.',
            'currencies.*.in' => 'That currency is not one the site knows.',
            'currencies.*.distinct' => 'Each currency can only be listed once.',
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
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $plans = Plan::query()->ordered()->get();
                $names = (array) config('landing.currencies', []);

                foreach ($this->codes() as $code) {
                    $missing = self::plansMissing($plans, $code);

                    if ($missing !== []) {
                        $validator->errors()->add('currencies', sprintf(
                            '%s %s no price in %s yet. Add %s on the plan before showing %s.',
                            implode(' and ', $missing),
                            count($missing) === 1 ? 'has' : 'have',
                            $names[$code] ?? $code,
                            count($missing) === 1 ? 'it' : 'them',
                            $code,
                        ));
                    }
                }
            },
        ];
    }

    /**
     * The enabled codes, in order.
     *
     * @return list<string>
     */
    public function codes(): array
    {
        return array_values(array_map(strval(...), (array) $this->validated('currencies', [])));
    }

    /**
     * The names of the plans that show a figure but have no amount in the
     * currency: the headline price (unless priced by quote), and the ledger
     * line when it is a price.
     *
     * @param  iterable<Plan>  $plans
     * @return list<string>
     */
    public static function plansMissing(iterable $plans, string $code): array
    {
        $missing = [];

        foreach ($plans as $plan) {
            $needsPrice = $plan->price_mode !== PriceMode::Custom && ! isset($plan->prices[$code]);
            $needsDetail = $plan->detail_prices !== null && ! isset($plan->detail_prices[$code]);

            if ($needsPrice || $needsDetail) {
                $missing[] = $plan->name;
            }
        }

        return $missing;
    }
}
