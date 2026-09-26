<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Pricing\UpdateCurrenciesRequest;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * The currencies the pricing section offers, and their order (the
 * `pricing.currencies` setting), from the panel on /admin/plans.
 */
class CurrencyController extends Controller
{
    /**
     * Save the enabled currencies, logged as one `pricing.updated` entry.
     */
    public function update(UpdateCurrenciesRequest $request): RedirectResponse
    {
        $codes = $request->codes();

        $changes = Settings::setMany(
            ['pricing.currencies' => $codes],
            'pricing.updated',
            'Updated the pricing currencies: '.implode(', ', $codes),
        );

        Inertia::flash('toast', $changes === []
            ? ['type' => 'info', 'message' => 'The currencies were already set that way.']
            : ['type' => 'success', 'message' => 'Currencies saved: '.implode(' · ', $codes).'.']);

        return to_route('admin.plans.index');
    }
}
