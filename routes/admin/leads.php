<?php

use App\Http\Controllers\Admin\LeadController;
use Illuminate\Support\Facades\Route;

// Order requests from the landing page pop-up: /admin/leads (list, dossier,
// status / assignee / notes, soft delete + restore, CSV export of a filter).
Route::get('leads/export', [LeadController::class, 'export'])->name('leads.export');

Route::post('leads/{lead}/restore', [LeadController::class, 'restore'])
    ->whereNumber('lead')
    ->withTrashed()
    ->name('leads.restore');

Route::resource('leads', LeadController::class)
    ->only(['index', 'show', 'update', 'destroy'])
    ->where(['lead' => '[0-9]+'])
    ->withTrashed(['show']);
