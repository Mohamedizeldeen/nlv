<?php

use App\Http\Controllers\Admin\ActivityController;
use Illuminate\Support\Facades\Route;

// The activity log is read-only: entries are never edited or deleted.
Route::get('activity', [ActivityController::class, 'index'])->name('activity.index');
Route::get('activity/{activity}', [ActivityController::class, 'show'])
    ->whereNumber('activity')
    ->name('activity.show');
