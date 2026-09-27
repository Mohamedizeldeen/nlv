<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * DELETE /settings/profile: delete your own account, confirmed with your
 * password. As on /admin/users, the last admin is never deleted, so the
 * panel can't be left without one; that refusal is reported under `account`.
 */
class ProfileDeleteRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }

    /**
     * The message when the account is the only admin left.
     */
    public static function lastAdminMessage(): string
    {
        return __('You’re the only admin, so your account can’t be deleted. Make someone else an admin first.');
    }

    /**
     * Whether this account is the only admin.
     */
    public static function isLastAdmin(User $user): bool
    {
        return $user->isAdmin()
            && ! User::query()->where('is_admin', true)->whereKeyNot($user->getKey())->exists();
    }

    /**
     * The last-admin check, once the password is right.
     *
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user();

                if ($validator->errors()->isEmpty() && $user instanceof User && self::isLastAdmin($user)) {
                    $validator->errors()->add('account', self::lastAdminMessage());
                }
            },
        ];
    }
}
