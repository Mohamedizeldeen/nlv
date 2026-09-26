<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Activity;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

#[Signature('admin:create
    {email? : Email address of the admin}
    {--name= : Display name (used when the account is new)}
    {--password= : Password, at least 12 characters (required when the account is new)}')]
#[Description('Create a verified admin account, or promote an existing user to admin')]
class CreateAdminCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->emailInput();

        if ($email === null) {
            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();

        return $user === null
            ? $this->createAdmin($email)
            : $this->promote($user);
    }

    /**
     * Create a brand new, verified admin account.
     */
    private function createAdmin(string $email): int
    {
        $name = $this->stringOption('name');
        $password = $this->stringOption('password');

        if (($name === null || $password === null) && ! $this->input->isInteractive()) {
            $this->components->error('The --name and --password options are required to create an admin non-interactively.');

            return self::FAILURE;
        }

        $name ??= text(
            label: 'Name',
            placeholder: 'Jane Doe',
            required: true,
            validate: ['name' => $this->rules()['name']],
        );

        $password ??= $this->askForPassword();

        if (! $this->passes(['email' => $email, 'name' => $name, 'password' => $password])) {
            return self::FAILURE;
        }

        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'is_admin' => true,
            'email_verified_at' => now(),
        ])->save();

        Activity::record('user.admin_granted', $user, "{$user->name} was made an admin (admin:create)", ['via' => 'console']);

        $this->components->info("Admin [{$user->email}] created.");

        return self::SUCCESS;
    }

    /**
     * Promote (and verify) an existing account, optionally updating its name and password.
     */
    private function promote(User $user): int
    {
        $name = $this->stringOption('name');
        $password = $this->stringOption('password');

        $data = array_filter(['name' => $name, 'password' => $password], fn (?string $value) => $value !== null);

        if (! $this->passes($data, array_intersect_key($this->rules(), $data))) {
            return self::FAILURE;
        }

        $wasAdmin = $user->isAdmin();

        $user->forceFill([
            ...$data,
            'is_admin' => true,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        if (! $wasAdmin) {
            Activity::record('user.admin_granted', $user, "{$user->name} was made an admin (admin:create)", ['via' => 'console']);
        }

        $this->components->info($wasAdmin
            ? "[{$user->email}] is already an admin; account updated."
            : "[{$user->email}] promoted to admin.");

        return self::SUCCESS;
    }

    /**
     * Resolve the email from the argument or an interactive prompt.
     */
    private function emailInput(): ?string
    {
        $email = $this->argument('email');

        if (! is_string($email) || trim($email) === '') {
            if (! $this->input->isInteractive()) {
                $this->components->error('The email argument is required when running non-interactively.');

                return null;
            }

            $email = text(
                label: 'Email address',
                placeholder: 'admin@example.com',
                required: true,
                validate: ['email' => $this->rules()['email']],
            );
        }

        $email = Str::lower(trim($email));

        return $this->passes(['email' => $email], ['email' => $this->rules()['email']]) ? $email : null;
    }

    /**
     * Prompt for a password twice.
     */
    private function askForPassword(): string
    {
        $password = password(
            label: 'Password',
            required: true,
            validate: ['password' => $this->rules()['password']],
            hint: 'At least 12 characters.',
        );

        password(
            label: 'Confirm password',
            required: true,
            validate: fn (string $value): ?string => $value === $password ? null : 'The passwords do not match.',
        );

        return $password;
    }

    /**
     * Read a non-empty string option.
     */
    private function stringOption(string $key): ?string
    {
        $value = $this->option($key);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * Validate the given data, printing every error.
     *
     * @param  array<string, string>  $data
     * @param  array<string, mixed>|null  $rules
     */
    private function passes(array $data, ?array $rules = null): bool
    {
        $validator = Validator::make($data, $rules ?? $this->rules());

        if ($validator->passes()) {
            return true;
        }

        foreach ($validator->errors()->all() as $message) {
            $this->components->error($message);
        }

        return false;
    }

    /**
     * The validation rules for admin accounts.
     *
     * @return array<string, array<int, mixed>>
     */
    private function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', Password::min(12), 'max:255'],
        ];
    }
}
