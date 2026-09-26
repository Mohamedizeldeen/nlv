<?php

use App\Http\Controllers\Admin\LookCategoryController;
use Illuminate\Support\Facades\Route;

// Before the resource, so "reorder" is never read as a category id.
Route::post('look-categories/reorder', [LookCategoryController::class, 'reorder'])->name('look-categories.reorder');
Route::resource('look-categories', LookCategoryController::class)->except(['show']);
