<?php

namespace Database\Factories;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Prefer App\Support\Settings::set() in tests: it validates the key against
 * the schema and clears the caches.
 *
 * @extends Factory<Setting>
 */
class SettingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'key' => 'hero.kicker',
            'value' => fake()->words(3, true),
        ];
    }
}
