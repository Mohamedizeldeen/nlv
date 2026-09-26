<?php

namespace Database\Factories;

use App\Enums\FooterGroup;
use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Page>
 */
class PageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = Str::title(fake()->unique()->word().' '.fake()->word());

        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'summary' => fake()->sentence(),
            'body' => "## About\n\n".fake()->paragraph()."\n\n- One\n- Two",
            'footer_group' => null,
            'is_published' => true,
        ];
    }

    /**
     * A page listed in the given footer column.
     */
    public function inFooter(FooterGroup $group = FooterGroup::Company): static
    {
        return $this->state(fn (array $attributes) => ['footer_group' => $group]);
    }

    /**
     * A page with its Arabic filled in.
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => [
            'title_ar' => 'الخصوصية',
            'summary_ar' => 'كيف تتعامل NLV مع بياناتك.',
            'body_ar' => "## الصور\n\nتُحذف الصور عند انتهاء الجلسة.",
        ]);
    }

    /**
     * A draft page.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => ['is_published' => false]);
    }
}
