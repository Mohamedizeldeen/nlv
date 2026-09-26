<?php

namespace App\Http\Requests\Admin\Users;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * POST /admin/users/{user}/admin: give an account access to the admin panel.
 * There is nothing to fill in; the checks run on the account itself and
 * report under the `admin` key.
 */
class GrantAdminRequest extends FormRequest
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
     * The account being promoted.
     */
    public function target(): User
    {
        $user = $this->route('user');

        abort_unless($user instanceof User, 404);

        return $user;
    }

    /**
     * The checks that need the account.
     *
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->target();

                if ($user->isAdmin()) {
                    $validator->errors()->add('admin', "{$user->name} is already an admin.");
                }
            },
        ];
    }
}
