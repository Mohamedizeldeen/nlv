<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Activity;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

#[Signature('admin:grant {email : Email address of an existing user}')]
#[Description('Give an existing user access to the admin panel')]
class GrantAdminCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->components->error("No user found with the email [{$email}].");

            return self::FAILURE;
        }

        if ($user->isAdmin()) {
            $this->components->info("[{$user->email}] is already an admin.");

            return self::SUCCESS;
        }

        // One `user.admin_granted` entry rather than a generic `user.updated` as well.
        Activity::withoutModelLogging(fn () => $user->forceFill(['is_admin' => true])->save());

        Activity::record('user.admin_granted', $user, "{$user->name} was made an admin (admin:grant)", ['via' => 'console']);

        $this->components->info("[{$user->email}] promoted to admin.");

        if ($user->email_verified_at === null) {
            $this->components->warn('This email address is not verified yet: the admin panel opens after verification.');
        }

        return self::SUCCESS;
    }
}
