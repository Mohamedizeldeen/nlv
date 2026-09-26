<?php

namespace App\Models;

use App\Models\Concerns\HasArabic;
use App\Models\Concerns\HasMedia;
use App\Models\Concerns\Publishable;
use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Models\Concerns\Sortable;
use Carbon\CarbonImmutable;
use Database\Factories\StoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A store owner's story (the landing page's "Stories" section).
 *
 * `quote` marks its highlighted phrase with *asterisks*; `portrait` is a media ref.
 * `metric_short` is the compact metric label in the story list (null: use
 * `metric_label`). The list's avatar reuses the portrait focus, zoomed in.
 * The `*_ar` columns hold the Arabic (HasArabic); empty ones show the English.
 *
 * @property int $id
 * @property string $name
 * @property string $role
 * @property string $store
 * @property string $city
 * @property string|null $coordinates
 * @property string $quote
 * @property string $metric_figure
 * @property string $metric_label
 * @property string|null $metric_note
 * @property string|null $metric_short
 * @property string|null $name_ar
 * @property string|null $role_ar
 * @property string|null $store_ar
 * @property string|null $city_ar
 * @property string|null $quote_ar
 * @property string|null $metric_label_ar
 * @property string|null $metric_short_ar
 * @property string|null $metric_note_ar
 * @property string $portrait
 * @property float $portrait_focus_x
 * @property float $portrait_focus_y
 * @property float $portrait_zoom
 * @property int $sort_order
 * @property bool $is_published
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'name', 'role', 'store', 'city', 'coordinates', 'quote', 'metric_figure', 'metric_label', 'metric_note',
    'metric_short', 'portrait', 'portrait_focus_x', 'portrait_focus_y', 'portrait_zoom', 'sort_order', 'is_published',
    'name_ar', 'role_ar', 'store_ar', 'city_ar', 'quote_ar', 'metric_label_ar', 'metric_short_ar', 'metric_note_ar',
])]
class Story extends Model
{
    /** @use HasFactory<StoryFactory> */
    use HasArabic, HasFactory, HasMedia, Publishable, RecordsActivity, RefreshesLandingContent, Sortable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'portrait_focus_x' => 'float',
            'portrait_focus_y' => 'float',
            'portrait_zoom' => 'float',
            'sort_order' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    /**
     * The attributes with an Arabic column.
     *
     * @return list<string>
     */
    public function translatableAttributes(): array
    {
        return ['name', 'role', 'store', 'city', 'quote', 'metric_label', 'metric_short', 'metric_note'];
    }

    /**
     * The columns that hold media refs.
     *
     * @return list<string>
     */
    public function mediaAttributes(): array
    {
        return ['portrait'];
    }
}
