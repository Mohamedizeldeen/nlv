<?php

namespace App\Models;

use App\Models\Concerns\HasArabic;
use App\Models\Concerns\HasMedia;
use App\Models\Concerns\Publishable;
use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Models\Concerns\Sortable;
use Carbon\CarbonImmutable;
use Database\Factories\LookFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A Lookbook entry: the try-on result (`after_image`) and, optionally, the
 * shopper's original photo (`before_image`). Both are media refs. The
 * `*_ar` columns hold the Arabic (HasArabic); empty ones show the English.
 *
 * @property int $id
 * @property int $look_category_id
 * @property string $title
 * @property string $city
 * @property float $render_seconds
 * @property string $after_image
 * @property string|null $before_image
 * @property string $alt
 * @property string|null $title_ar
 * @property string|null $city_ar
 * @property string|null $alt_ar
 * @property float $aspect
 * @property float $focus_x
 * @property float $focus_y
 * @property int $sort_order
 * @property bool $is_published
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read LookCategory $category
 */
#[Fillable([
    'look_category_id', 'title', 'city', 'render_seconds', 'after_image', 'before_image', 'alt', 'aspect',
    'focus_x', 'focus_y', 'sort_order', 'is_published', 'title_ar', 'city_ar', 'alt_ar',
])]
class Look extends Model
{
    /** @use HasFactory<LookFactory> */
    use HasArabic, HasFactory, HasMedia, Publishable, RecordsActivity, RefreshesLandingContent, Sortable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'look_category_id' => 'integer',
            'render_seconds' => 'float',
            'aspect' => 'float',
            'focus_x' => 'float',
            'focus_y' => 'float',
            'sort_order' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    /**
     * The Lookbook filter this look belongs to.
     *
     * @return BelongsTo<LookCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(LookCategory::class, 'look_category_id');
    }

    /**
     * The attributes with an Arabic column.
     *
     * @return list<string>
     */
    public function translatableAttributes(): array
    {
        return ['title', 'city', 'alt'];
    }

    /**
     * The columns that hold media refs.
     *
     * @return list<string>
     */
    public function mediaAttributes(): array
    {
        return ['after_image', 'before_image'];
    }
}
