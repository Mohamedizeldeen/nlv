<?php

namespace App\Models;

use App\Models\Concerns\HasArabic;
use App\Models\Concerns\Publishable;
use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Models\Concerns\Sortable;
use Carbon\CarbonImmutable;
use Database\Factories\FaqFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A question under the pricing plans ("Asked before every order"). The
 * `*_ar` columns hold the Arabic (HasArabic); empty ones show the English.
 *
 * @property int $id
 * @property string $question
 * @property string $answer
 * @property string|null $question_ar
 * @property string|null $answer_ar
 * @property int $sort_order
 * @property bool $is_published
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['question', 'answer', 'sort_order', 'is_published', 'question_ar', 'answer_ar'])]
class Faq extends Model
{
    /** @use HasFactory<FaqFactory> */
    use HasArabic, HasFactory, Publishable, RecordsActivity, RefreshesLandingContent, Sortable;

    /**
     * "FAQ" in log descriptions ("Updated FAQ “…”"), not "faq".
     */
    public static function activityNoun(): string
    {
        return 'FAQ';
    }

    /**
     * "Reordered FAQs".
     */
    public static function activityPluralNoun(): string
    {
        return 'FAQs';
    }

    /**
     * The attributes with an Arabic column.
     *
     * @return list<string>
     */
    public function translatableAttributes(): array
    {
        return ['question', 'answer'];
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
            'is_published' => 'boolean',
        ];
    }
}
