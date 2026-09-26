<?php

namespace App\Models;

use App\Enums\FooterGroup;
use App\Models\Concerns\HasArabic;
use App\Models\Concerns\Publishable;
use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Models\Concerns\Sortable;
use Carbon\CarbonImmutable;
use Database\Factories\PageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A content page (About, Privacy, Terms...) served at /pages/{slug}. The body
 * is Markdown; `footer_group` lists it in the landing footer (null: not listed).
 * The Arabic page is /ar/pages/{slug} (same slug); the `*_ar` columns hold
 * its Arabic (HasArabic), and empty ones show the English.
 *
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $summary
 * @property string $body
 * @property string|null $title_ar
 * @property string|null $summary_ar
 * @property string|null $body_ar
 * @property FooterGroup|null $footer_group
 * @property int $sort_order
 * @property bool $is_published
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['title', 'slug', 'summary', 'body', 'footer_group', 'sort_order', 'is_published', 'title_ar', 'summary_ar', 'body_ar'])]
class Page extends Model
{
    /** @use HasFactory<PageFactory> */
    use HasArabic, HasFactory, Publishable, RecordsActivity, RefreshesLandingContent, Sortable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'footer_group' => FooterGroup::class,
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
        return ['title', 'summary', 'body'];
    }

    /**
     * The body rendered to HTML, in a language (default: the current one;
     * the English body when the Arabic is empty). Raw HTML in the Markdown
     * is stripped and unsafe links (javascript:, data:...) are dropped.
     */
    public function html(?string $locale = null): string
    {
        $body = $this->localized('body', $locale);

        return (string) Str::markdown(is_string($body) ? $body : '', [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);
    }
}
