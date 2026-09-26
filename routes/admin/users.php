<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

// Accounts are listed and promoted or demoted here; they are never deleted.
Route::get('users', [UserController::class, 'index'])->name('users.index');
Route::post('users/{user}/admin', [UserController::class, 'grantAdmin'])
    ->whereNumber('user')
    ->name('users.admin.grant');
Route::delete('users/{user}/admin', [UserController::class, 'revokeAdmin'])
    ->whereNumber('user')
    ->name('users.admin.revoke');
