<?php

use App\Http\Controllers\Admin\SiteContentController;
use Illuminate\Support\Facades\Route;

// Site content (the settings in config/landing.php), one group per tab: /admin/content?group=contact.
Route::get('content', [SiteContentController::class, 'edit'])->name('content.edit');
Route::put('content/{group}', [SiteContentController::class, 'update'])
    ->whereIn('group', SiteContentController::groupKeys())
    ->name('content.update');
