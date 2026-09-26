<?php

namespace App\Models;

use App\Models\Concerns\HasArabic;
use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Models\Concerns\Sortable;
use Carbon\CarbonImmutable;
use Database\Factories\LookCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A Lookbook filter (Abayas, Everyday, Evening, Eyewear...). `note` is the
 * filter's one-line "this week" note; `stat_figure` and `stat_unit` are the
 * figure set large beside it ("54" / "most tried size"). A category that
 * still has looks cannot be deleted (restrictOnDelete). The `*_ar` columns
 * hold the Arabic (HasArabic); empty ones show the English.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $note
 * @property string|null $stat_figure
 * @property string|null $stat_unit
 * @property string|null $name_ar
 * @property string|null $note_ar
 * @property string|null $stat_figure_ar
 * @property string|null $stat_unit_ar
 * @property int $sort_order
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Collection<int, Look> $looks
 */
#[Fillable(['name', 'slug', 'note', 'stat_figure', 'stat_unit', 'sort_order', 'name_ar', 'note_ar', 'stat_figure_ar', 'stat_unit_ar'])]
class LookCategory extends Model
{
    /** @use HasFactory<LookCategoryFactory> */
    use HasArabic, HasFactory, RecordsActivity, RefreshesLandingContent, Sortable;

    /**
     * Bootstrap the model: a missing slug is made from the name.
     */
    protected static function booted(): void
    {
        static::saving(function (LookCategory $category): void {
            if (blank($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * The attributes with an Arabic column.
     *
     * @return list<string>
     */
    public function translatableAttributes(): array
    {
        return ['name', 'note', 'stat_figure', 'stat_unit'];
    }

    /**
     * The looks filed under this category.
     *
     * @return HasMany<Look, $this>
     */
    public function looks(): HasMany
    {
        return $this->hasMany(Look::class);
    }
}
