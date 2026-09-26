<?php

namespace Database\Factories;

use App\Models\Look;
use App\Models\LookCategory;
use App\Support\MediaRef;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Look>
 */
class LookFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'look_category_id' => LookCategory::factory(),
            'title' => fake()->randomElement(['Quilted abaya, navy', 'Silk gown, black', 'Camel coat, olive knit', 'Round acetate, tortoise']),
            'city' => fake()->city(),
            'render_seconds' => fake()->randomFloat(1, 1.4, 2.0),
            'after_image' => MediaRef::unsplash('photo-1762605135318-f34a993cbcf0'),
            'before_image' => null,
            'alt' => fake()->sentence(),
            'aspect' => 0.667,
            'focus_x' => 0.5,
            'focus_y' => 0.5,
            'is_published' => true,
        ];
    }

    /**
     * A look with its Arabic filled in.
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => [
            'title_ar' => 'عباءة مبطّنة، كحلي',
            'city_ar' => 'الرياض',
            'alt_ar' => 'امرأة ترتدي عباءة كحلية مبطّنة فوق فستان بلون البيج',
        ]);
    }

    /**
     * A look hidden from the landing page.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => ['is_published' => false]);
    }
}
