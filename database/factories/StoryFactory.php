<?php

namespace Database\Factories;

use App\Models\Story;
use App\Support\MediaRef;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Story>
 */
class StoryFactory extends Factory
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
            'role' => fake()->randomElement(['Founder', 'Owner', 'Store Manager', 'Retail Director']),
            'store' => fake()->company(),
            'city' => fake()->city(),
            'coordinates' => sprintf('%.2f° N · %.2f° E', fake()->latitude(0, 60), fake()->longitude(0, 60)),
            'quote' => 'Shoppers try it on at the mirror first. Sales *rose by a third* in one season.',
            'metric_figure' => '+'.fake()->numberBetween(10, 45).'%',
            'metric_label' => 'Sales',
            'metric_note' => 'in one season',
            'metric_short' => 'sales',
            'portrait' => MediaRef::unsplash('photo-1567532939604-b6b5b0db2604'),
            'portrait_focus_x' => 0.5,
            'portrait_focus_y' => 0.35,
            'portrait_zoom' => 1,
            'is_published' => true,
        ];
    }

    /**
     * A story with its Arabic filled in.
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => [
            'name_ar' => 'نورة الحربي',
            'role_ar' => 'مؤسِّسة',
            'store_ar' => 'رمال للعبايات',
            'city_ar' => 'الرياض',
            'quote_ar' => 'صارت المتسوّقات يجرّبن القطعة أمام المرآة أولًا. *ارتفعت المبيعات بمقدار الثلث* في موسم واحد.',
            'metric_label_ar' => 'المبيعات',
            'metric_short_ar' => 'المبيعات',
            'metric_note_ar' => 'في موسم واحد',
        ]);
    }

    /**
     * A story hidden from the landing page.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => ['is_published' => false]);
    }
}
