<?php

namespace App\Http\Requests\Admin\Users;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * DELETE /admin/users/{user}/admin: take an account's admin access away.
 * Nobody can demote themselves, and the last admin always stays one, so the
 * panel can never be locked. Errors are reported under the `admin` key.
 */
class RevokeAdminRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * The account being demoted.
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
        return "{$user->name} is the only admin. Make someone else an admin first.";
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
                $user = $this->target();

                if (! $user->isAdmin()) {
                    $validator->errors()->add('admin', "{$user->name} is not an admin.");

                    return;
                }

                if ($user->is($this->user())) {
                    $validator->errors()->add('admin', 'You can’t remove your own admin access. Ask another admin to do it.');

                    return;
                }

                if (! User::query()->where('is_admin', true)->whereKeyNot($user->getKey())->exists()) {
                    $validator->errors()->add('admin', self::lastAdminMessage($user));
                }
            },
        ];
    }
}
