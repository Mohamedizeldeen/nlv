<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * The log gets one auth.password_reset entry (the PasswordReset event,
     * credited to the user), not the model's own user.updated as well: that
     * one would list a hidden password change done by a "Visitor", since
     * nobody is signed in yet.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        Activity::withoutModelLogging(fn (): bool => $user->forceFill([
            'password' => $input['password'],
        ])->save());
    }
}
