<?php

use App\Http\Controllers\Admin\LookController;
use Illuminate\Support\Facades\Route;

// Before the resource, so "reorder" is never read as a look id.
Route::post('looks/reorder', [LookController::class, 'reorder'])->name('looks.reorder');
Route::patch('looks/{look}/publish', [LookController::class, 'publish'])->name('looks.publish');
Route::resource('looks', LookController::class)->except(['show']);
