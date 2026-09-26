<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin panel routes
|--------------------------------------------------------------------------
|
| Every file in routes/admin/*.php is one admin module (dashboard, leads,
| stories, ...). They are loaded in name order inside this group, so each
| module only declares paths relative to /admin and names relative to
| "admin." and inherits the admin-only middleware.
|
*/

Route::middleware(['auth', 'verified', 'can:access-admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        $modules = glob(__DIR__.'/admin/*.php') ?: [];

        sort($modules);

        foreach ($modules as $module) {
            require $module;
        }
    });
