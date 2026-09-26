<?php

namespace Database\Factories;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faq>
 */
class FaqFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'question' => rtrim(fake()->sentence(), '.').'?',
            'answer' => fake()->paragraph(),
            'is_published' => true,
        ];
    }

    /**
     * A question with its Arabic filled in.
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => [
            'question_ar' => 'كم يستغرق التركيب؟',
            'answer_ar' => 'زيارة واحدة. يركّب فريقنا الجهاز ويعايره، فيصبح جاهزًا للمتسوّقين في اليوم نفسه.',
        ]);
    }

    /**
     * A question hidden from the landing page.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => ['is_published' => false]);
    }
}
