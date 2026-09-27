<?php

namespace App\Http\Requests\Admin\Users;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * PUT /admin/users/{user}: an account's name and email address. There is no
 * role here: admin access has its own endpoints (GrantAdminRequest,
 * RevokeAdminRequest), and the password its own (SetUserPasswordRequest,
 * SendPasswordLinkRequest).
 */
class UpdateUserRequest extends FormRequest
{
    use AccountRules;

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->normalizeEmail();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->accountRules($this->target());
    }

    /**
     * The account being edited.
     */
    public function target(): User
    {
        $user = $this->route('user');

        abort_unless($user instanceof User, 404);

        return $user;
    }

    /**
     * The validated name and email.
     *
     * @return array{name: string, email: string}
     */
    public function accountAttributes(): array
    {
        return [
            'name' => (string) $this->validated('name'),
            'email' => (string) $this->validated('email'),
        ];
    }
}
