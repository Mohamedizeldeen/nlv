<?php

use App\Enums\PlanKey;
use App\Http\Controllers\Admin\CurrencyController;
use App\Http\Controllers\Admin\PlanController;
use Illuminate\Support\Facades\Route;

/*
| Plans & prices: the three seeded plans are edited, never created or
| deleted, and addressed by key (/admin/plans/lease/edit). The currencies
| panel on the index saves the `pricing.currencies` setting.
*/

Route::put('plans/currencies', [CurrencyController::class, 'update'])->name('plans.currencies.update');

Route::controller(PlanController::class)->group(function () {
    Route::get('plans', 'index')->name('plans.index');
    Route::get('plans/{plan:key}/edit', 'edit')->whereIn('plan', PlanKey::values())->name('plans.edit');
    Route::put('plans/{plan:key}', 'update')->whereIn('plan', PlanKey::values())->name('plans.update');
});
