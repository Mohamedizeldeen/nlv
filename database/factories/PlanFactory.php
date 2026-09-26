<?php

namespace Database\Factories;

use App\Enums\PlanKey;
use App\Enums\PriceMode;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * The three plans as the landing page first showed them. Use buy(), lease()
 * and chain(); the default picks a key that is not taken yet.
 *
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        /** @var PlanKey $key */
        $key = fake()->unique()->randomElement(PlanKey::cases());

        return self::defaults($key);
    }

    /**
     * The Buy plan.
     */
    public function buy(): static
    {
        return $this->state(fn (array $attributes) => self::defaults(PlanKey::Buy));
    }

    /**
     * The Lease plan.
     */
    public function lease(): static
    {
        return $this->state(fn (array $attributes) => self::defaults(PlanKey::Lease));
    }

    /**
     * The Chain plan.
     */
    public function chain(): static
    {
        return $this->state(fn (array $attributes) => self::defaults(PlanKey::Chain));
    }

    /**
     * A plan with its Arabic filled in (the Buy plan's wording).
     */
    public function arabic(): static
    {
        return $this->state(fn (array $attributes) => [
            'name_ar' => 'شراء',
            'blurb_ar' => 'امتلك الجهاز بالكامل وادفع اشتراك التطبيق شهرًا بشهر.',
            'price_caption_ar' => 'دفعة واحدة، لكل جهاز',
            'detail_label_ar' => 'التطبيق السحابي',
            'detail_caption_ar' => 'شهريًا',
            'features_heading_ar' => 'كل ما في خطة الشراء، إضافةً إلى',
            'features_ar' => ['ضمان *12 شهرًا*', 'تجارب *غير محدودة*'],
            'cta_label_ar' => 'اطلب جهازك',
            'badge_ar' => 'الأكثر اختيارًا',
            'badge_note_ar' => 'من 6 من كل 10 متاجر جديدة',
        ]);
    }

    /**
     * The attributes of one plan.
     *
     * @return array<string, mixed>
     */
    public static function defaults(PlanKey $key): array
    {
        return match ($key) {
            PlanKey::Buy => [
                'key' => PlanKey::Buy,
                'name' => 'Buy',
                'blurb' => 'Own the device outright and pay for the app month by month.',
                'price_mode' => PriceMode::OneOff,
                'prices' => ['USD' => 3900, 'EUR' => 3590, 'GBP' => 3090, 'AED' => 14300, 'SAR' => 14600],
                'price_caption' => 'one-off, per device',
                'detail_label' => 'Cloud app',
                'detail_prices' => ['USD' => 79, 'EUR' => 75, 'GBP' => 65, 'AED' => 289, 'SAR' => 299],
                'detail_value' => null,
                'detail_caption' => 'a month',
                'features_heading' => null,
                'features' => ['*12-month* warranty', '*Unlimited* try-ons', 'Catalogue sync through the cloud app', 'Email support'],
                'cta_label' => 'Order a device',
                'is_featured' => false,
                'badge' => null,
                'badge_note' => null,
                'sort_order' => 0,
            ],
            PlanKey::Lease => [
                'key' => PlanKey::Lease,
                'name' => 'Lease',
                'blurb' => 'Device, cloud app and servicing in one monthly fee.',
                'price_mode' => PriceMode::Monthly,
                'prices' => ['USD' => 249, 'EUR' => 229, 'GBP' => 199, 'AED' => 919, 'SAR' => 939],
                'price_caption' => 'a month, per device, all-in',
                'detail_label' => 'Term',
                'detail_prices' => null,
                'detail_value' => '24',
                'detail_caption' => 'months',
                'features_heading' => 'Everything in Buy, plus',
                'features' => ['Servicing for the whole term', 'Free replacement if a device fails', 'Priority support'],
                'cta_label' => 'Order a device',
                'is_featured' => true,
                'badge' => 'Most chosen',
                'badge_note' => 'by 6 in 10 new stores',
                'sort_order' => 1,
            ],
            PlanKey::Chain => [
                'key' => PlanKey::Chain,
                'name' => 'Chain',
                'blurb' => 'For groups fitting out several stores at once.',
                'price_mode' => PriceMode::Custom,
                'prices' => null,
                'price_caption' => 'custom pricing for your rollout',
                'detail_label' => 'Devices',
                'detail_prices' => null,
                'detail_value' => '5',
                'detail_caption' => 'or more',
                'features_heading' => null,
                'features' => ['Multi-store view in the cloud app', 'On-site staff training', 'A dedicated success manager', '*99.9%* uptime SLA'],
                'cta_label' => 'Talk to sales',
                'is_featured' => false,
                'badge' => null,
                'badge_note' => null,
                'sort_order' => 2,
            ],
        };
    }
}
