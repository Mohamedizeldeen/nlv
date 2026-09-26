<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database. Safe to run more than once: nothing is
     * duplicated. Model events stay on, so the content seeder's changes are
     * written to the activity log like any other edit.
     */
    public function run(): void
    {
        // The local admin login, for development only (its password is "password").
        // Production admins are created with `php artisan admin:create`.
        if (app()->environment('local', 'testing') && ! User::query()->where('email', 'eng.mohamed.izeldeen@gmail.com')->exists()) {
            User::factory()->admin()->create([
                'name' => 'Mohamed',
                'email' => 'eng.mohamed.izeldeen@gmail.com',
            ]);
        }

        $this->call(LandingContentSeeder::class);
    }
}
