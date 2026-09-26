<?php

namespace Database\Factories;

use App\Models\LookCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<LookCategory>
 */
class LookCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->word());

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'note' => fake()->sentence(),
            'stat_figure' => fake()->numberBetween(12, 64).'%',
            'stat_unit' => fake()->randomElement(['went into the bag', 'most tried', 'of all try-ons']),
        ];
    }

    /**
     * A category with its Arabic filled in.
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => [
            'name_ar' => 'عباءات',
            'note_ar' => 'المقاسات من 52 إلى 60.',
            'stat_figure_ar' => 'السبت',
            'stat_unit_ar' => 'يوم الذروة',
        ]);
    }
}
