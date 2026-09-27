<?php

use App\Http\Controllers\LandingController;
use App\Http\Controllers\OrderRequestController;
use App\Http\Controllers\PageController;
use App\Http\Middleware\SetLocale;
use Illuminate\Support\Facades\Route;

// The public pages, in English at / and in Arabic under /ar (route names
// "ar.home", "ar.pages.show"). See App\Support\Locales.
Route::get('/', LandingController::class)->name('home');

Route::get('pages/{page:slug}', [PageController::class, 'show'])->name('pages.show');

Route::prefix('ar')
    ->name('ar.')
    ->middleware(SetLocale::class.':ar')
    ->group(function () {
        Route::get('/', LandingController::class)->name('home');

        Route::get('pages/{page:slug}', [PageController::class, 'show'])->name('pages.show');
    });

// The "Order a device" pop-up posts here from either language (it sends `locale`).
Route::post('order-requests', [OrderRequestController::class, 'store'])
    ->middleware('throttle:order-requests')
    ->name('order-requests.store');

// The starter kit's /dashboard is gone: every account works in the admin
// panel. Old links and bookmarks land there (the 403 page for accounts
// without admin access). There is no public sign-up (config/fortify.php):
// admins add people from /admin/users.
Route::permanentRedirect('dashboard', '/admin');

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
