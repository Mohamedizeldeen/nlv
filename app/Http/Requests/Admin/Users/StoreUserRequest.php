<?php

namespace App\Http\Requests\Admin\Users;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /admin/users: add an account. Every account added here is a verified
 * admin, so there is no role to choose. The password is either set now
 * (`password_method=set`: password + password_confirmation) or chosen by the
 * person through an emailed link (`password_method=link`).
 */
class StoreUserRequest extends FormRequest
{
    use AccountRules;

    /**
     * The admin types the password now.
     */
    public const METHOD_SET = 'set';

    /**
     * The person is emailed a link to choose their own.
     */
    public const METHOD_LINK = 'link';

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
        return [
            ...$this->accountRules(),
            'password_method' => ['required', 'string', Rule::in([self::METHOD_SET, self::METHOD_LINK])],
            'password' => ['exclude_unless:password_method,'.self::METHOD_SET, ...$this->newPasswordRules()],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['password_method' => 'password option'];
    }

    /**
     * Whether the person chooses their own password through an emailed link.
     */
    public function sendsLink(): bool
    {
        return $this->validated('password_method') === self::METHOD_LINK;
    }

    /**
     * The password typed now, or null when a link is emailed instead.
     */
    public function password(): ?string
    {
        $password = $this->validated('password');

        return ! $this->sendsLink() && is_string($password) ? $password : null;
    }
}
