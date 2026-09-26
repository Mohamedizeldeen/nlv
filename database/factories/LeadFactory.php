<?php

namespace Database\Factories;

use App\Enums\LeadPlan;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'company' => fake()->company(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => '+44 20 7946 '.fake()->numerify('####'),
            'country' => fake()->country(),
            'city' => fake()->city(),
            'devices' => fake()->numberBetween(1, 12),
            'plan' => fake()->randomElement(LeadPlan::cases()),
            'message' => fake()->paragraph(),
            'status' => LeadStatus::New,
            'source' => fake()->randomElement(LeadSource::cases()),
            'locale' => 'en',
            'consent_at' => now(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'admin_notes' => null,
            'assigned_to' => null,
            'contacted_at' => null,
        ];
    }

    /**
     * A lead sent from the Arabic page.
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => ['locale' => 'ar']);
    }

    /**
     * A lead in the given pipeline status.
     */
    public function status(LeadStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
            'contacted_at' => $status === LeadStatus::New ? null : now(),
        ]);
    }
}
