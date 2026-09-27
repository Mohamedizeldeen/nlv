<?php

namespace App\Http\Requests\Admin\Users;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * The rules the users module shares: the app's name rules
 * (ProfileValidationRules) and its password rules (PasswordValidationRules,
 * stricter in production), with at least 12 characters, as `admin:create`
 * asks. Emails are trimmed and lowercased before they are checked.
 *
 * @mixin FormRequest
 */
trait AccountRules
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Shortest password an admin can set for someone (as `admin:create`).
     */
    public static function minPasswordLength(): int
    {
        return 12;
    }

    /**
     * The password and its confirmation. "min" runs before the app's own
     * rule, so a short password reads "at least 12 characters" (not the
     * development default of 8).
     *
     * @return array<int, Password|ValidationRule|array<mixed>|string>
     */
    protected function newPasswordRules(): array
    {
        return ['min:'.self::minPasswordLength(), 'max:255', ...$this->passwordRules()];
    }

    /**
     * Name and email (the app's profile rules), the email unused by any
     * other account in any letter case.
     *
     * @return array<string, array<int, ValidationRule|Closure|array<mixed>|string>>
     */
    protected function accountRules(?User $ignore = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => ['required', 'string', 'email', 'max:255', $this->unusedEmail($ignore)],
        ];
    }

    /**
     * No other account has this email address, whatever its letter case
     * (an address saved before emails were lowercased keeps its case).
     *
     * @return Closure(string, mixed, Closure(string): mixed): void
     */
    private function unusedEmail(?User $ignore): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($ignore): void {
            if (! is_string($value)) {
                return;
            }

            $taken = User::query()
                ->whereRaw('lower(email) = ?', [Str::lower($value)])
                ->when($ignore !== null, fn (Builder $query) => $query->whereKeyNot($ignore?->getKey()))
                ->exists();

            if ($taken) {
                $fail('Someone already has an account with this email address.');
            }
        };
    }

    /**
     * Lowercase the email before validation, so "Jane@Shop.com" and
     * "jane@shop.com" are the same account (as Fortify's sign-in treats them).
     */
    protected function normalizeEmail(): void
    {
        $email = $this->input('email');

        if (is_string($email)) {
            $this->merge(['email' => Str::lower(trim($email))]);
        }
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Write their name.',
            'email.required' => 'Write their email address.',
            'email.email' => 'This doesn’t look like an email address.',
            'password.required' => 'Choose a password.',
            'password.min' => 'Use at least '.self::minPasswordLength().' characters.',
            'password.confirmed' => 'The two passwords don’t match.',
        ];
    }
}
