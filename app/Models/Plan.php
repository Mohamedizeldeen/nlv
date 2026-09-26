<?php

namespace App\Models;

use App\Enums\PlanKey;
use App\Enums\PriceMode;
use App\Models\Concerns\HasArabic;
use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Models\Concerns\Sortable;
use Carbon\CarbonImmutable;
use Database\Factories\PlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A pricing plan: Buy, Lease or Chain (seeded; edited, never created or deleted
 * from the admin). Prices are whole amounts per currency code, e.g.
 * {"USD": 3900, "EUR": 3590}. The `*_ar` columns hold the Arabic
 * (HasArabic); empty ones show the English. `features_ar` is a list like
 * `features`, one Arabic line per English line.
 *
 * @property int $id
 * @property PlanKey $key
 * @property string $name
 * @property string $blurb
 * @property PriceMode $price_mode
 * @property array<string, int>|null $prices
 * @property string $price_caption
 * @property string|null $detail_label
 * @property array<string, int>|null $detail_prices
 * @property string|null $detail_value
 * @property string|null $detail_caption
 * @property string|null $features_heading
 * @property list<string> $features
 * @property string $cta_label
 * @property bool $is_featured
 * @property string|null $badge
 * @property string|null $badge_note
 * @property string|null $name_ar
 * @property string|null $blurb_ar
 * @property string|null $price_caption_ar
 * @property string|null $detail_label_ar
 * @property string|null $detail_caption_ar
 * @property string|null $features_heading_ar
 * @property list<string>|null $features_ar
 * @property string|null $cta_label_ar
 * @property string|null $badge_ar
 * @property string|null $badge_note_ar
 * @property int $sort_order
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'key', 'name', 'blurb', 'price_mode', 'prices', 'price_caption', 'detail_label', 'detail_prices',
    'detail_value', 'detail_caption', 'features_heading', 'features', 'cta_label', 'is_featured', 'badge',
    'badge_note', 'sort_order', 'name_ar', 'blurb_ar', 'price_caption_ar', 'detail_label_ar', 'detail_caption_ar',
    'features_heading_ar', 'features_ar', 'cta_label_ar', 'badge_ar', 'badge_note_ar',
])]
class Plan extends Model
{
    /** @use HasFactory<PlanFactory> */
    use HasArabic, HasFactory, RecordsActivity, RefreshesLandingContent, Sortable;

    /**
     * Price maps are saved with their currency codes sorted. MySQL returns JSON
     * object keys sorted, so an unsorted map would read as a change (and be
     * logged) on every save even when no price changed.
     */
    protected static function booted(): void
    {
        static::saving(function (Plan $plan): void {
            foreach (['prices', 'detail_prices'] as $column) {
                $value = $plan->getAttribute($column);

                if (is_array($value)) {
                    ksort($value, SORT_STRING);
                    $plan->setAttribute($column, $value);
                }
            }
        });
    }

    /**
     * The attributes with an Arabic column.
     *
     * @return list<string>
     */
    public function translatableAttributes(): array
    {
        return [
            'name', 'blurb', 'price_caption', 'detail_label', 'detail_caption', 'features_heading', 'features',
            'cta_label', 'badge', 'badge_note',
        ];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'key' => PlanKey::class,
            'price_mode' => PriceMode::class,
            'prices' => 'json:unicode',
            'detail_prices' => 'json:unicode',
            'features' => 'json:unicode',
            'features_ar' => 'json:unicode',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
