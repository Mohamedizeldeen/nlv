<?php

namespace App\Http\Requests\Admin\Users;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * POST /admin/users/{user}/password-link: email someone a link to choose a
 * new password on the app's reset page. Nothing to fill in; errors are
 * reported under the `password_link` key.
 */
class SendPasswordLinkRequest extends FormRequest
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
     * The account the link is for.
     */
    public function target(): User
    {
        $user = $this->route('user');

        abort_unless($user instanceof User, 404);

        return $user;
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
                    $validator->errors()->add('password_link', SetUserPasswordRequest::ownAccountMessage());
                }
            },
        ];
    }
}
