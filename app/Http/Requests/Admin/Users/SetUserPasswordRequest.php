<?php

namespace App\Http\Requests\Admin\Users;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * PUT /admin/users/{user}/password: give someone a new password now
 * (password + password_confirmation, at least 12 characters). Admins change
 * their own password in their account settings (security.edit), which ask
 * for the current one first, so the panel refuses it for their own account.
 */
class SetUserPasswordRequest extends FormRequest
{
    use AccountRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['password' => $this->newPasswordRules()];
    }

    /**
     * The account getting the new password.
     */
    public function target(): User
    {
        $user = $this->route('user');

        abort_unless($user instanceof User, 404);

        return $user;
    }

    /**
     * The message for an admin's own account (shared with the link request).
     */
    public static function ownAccountMessage(): string
    {
        return 'Change your own password from your account settings, which ask for the current one first.';
    }

    /**
     * The checks that need the account and the signed-in admin.
     *
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->target()->is($this->user())) {
                    $validator->errors()->add('password', self::ownAccountMessage());
                }
            },
        ];
    }

    /**
     * The validated new password.
     */
    public function password(): string
    {
        return (string) $this->validated('password');
    }
}
