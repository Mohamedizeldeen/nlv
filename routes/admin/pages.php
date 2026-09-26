<?php

use App\Http\Controllers\Admin\PageController;
use Illuminate\Support\Facades\Route;

// Content pages (About, Privacy, Terms...): /admin/pages. The public page is /pages/{slug}.
Route::post('pages/preview', [PageController::class, 'preview'])->name('pages.preview');
Route::post('pages/reorder', [PageController::class, 'reorder'])->name('pages.reorder');
Route::patch('pages/{page}/publish', [PageController::class, 'publish'])->name('pages.publish');
Route::resource('pages', PageController::class)->except('show');
