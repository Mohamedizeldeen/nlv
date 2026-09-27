<?php

namespace App\Http\Requests\Admin\Users;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

/**
 * DELETE /admin/users/{user}: delete an account for good. The admin types
 * the account's email address (`confirm_email`) to confirm. Nobody deletes
 * their own account here (their account settings do that), and the last admin
 * is never deleted, so the panel can't be locked. Errors are reported under
 * `confirm_email`.
 */
class DeleteUserRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'confirm_email' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'confirm_email.required' => 'Type their email address to confirm.',
        ];
    }

    /**
     * The account being deleted.
     */
    public function target(): User
    {
        $user = $this->route('user');

        abort_unless($user instanceof User, 404);

        return $user;
    }

    /**
     * The message when this is the only admin left.
     */
    public static function lastAdminMessage(User $user): string
    {
        return "{$user->name} is the only admin, so the account can’t be deleted.";
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
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $user = $this->target();

                if ($user->is($this->user())) {
                    $validator->errors()->add('confirm_email', 'You can’t delete your own account here. Do it from your account settings.');

                    return;
                }

                if ($user->isAdmin() && ! User::query()->where('is_admin', true)->whereKeyNot($user->getKey())->exists()) {
                    $validator->errors()->add('confirm_email', self::lastAdminMessage($user));

                    return;
                }

                $typed = Str::lower(trim((string) $this->input('confirm_email')));

                if ($typed !== Str::lower($user->email)) {
                    $validator->errors()->add('confirm_email', "Type {$user->email} exactly to confirm.");
                }
            },
        ];
    }
}
