<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

/*
| Accounts: /admin/users. Admins add accounts here (always verified admins,
| with a password set now or an emailed link to the app's reset page), edit
| a name or email, set a new password or email a link, and delete an account
| (typing its email to confirm; never their own or the last admin's). Admin
| access is removed or given back on its own endpoints, with the same
| self / last-admin protections.
*/

Route::resource('users', UserController::class)
    ->except('show')
    ->where(['user' => '[0-9]+']);

Route::put('users/{user}/password', [UserController::class, 'setPassword'])
    ->whereNumber('user')
    ->name('users.password.update');
Route::post('users/{user}/password-link', [UserController::class, 'sendPasswordLink'])
    ->whereNumber('user')
    ->middleware('throttle:6,1')
    ->name('users.password.link');

Route::post('users/{user}/admin', [UserController::class, 'grantAdmin'])
    ->whereNumber('user')
    ->name('users.admin.grant');
Route::delete('users/{user}/admin', [UserController::class, 'revokeAdmin'])
    ->whereNumber('user')
    ->name('users.admin.revoke');
