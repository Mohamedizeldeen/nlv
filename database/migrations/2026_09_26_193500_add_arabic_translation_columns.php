<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Arabic version of every visitor-facing text column, as `<column>_ar`
     * beside it (the existing columns are the English). Same lengths as the
     * English; all nullable: an empty Arabic value shows the English
     * (HasArabic::localized()).
     *
     * @var array<string, array<string, array{0: string, 1?: int}>>
     */
    private array $columns = [
        'stories' => [
            'name_ar' => ['string', 80],
            'role_ar' => ['string', 80],
            'store_ar' => ['string', 80],
            'city_ar' => ['string', 60],
            'quote_ar' => ['text'],
            'metric_label_ar' => ['string', 40],
            'metric_short_ar' => ['string', 24],
            'metric_note_ar' => ['string', 40],
        ],
        'look_categories' => [
            'name_ar' => ['string', 40],
            'note_ar' => ['string', 200],
            'stat_figure_ar' => ['string', 16],
            'stat_unit_ar' => ['string', 40],
        ],
        'looks' => [
            'title_ar' => ['string', 80],
            'city_ar' => ['string', 60],
            'alt_ar' => ['string', 200],
        ],
        'plans' => [
            'name_ar' => ['string', 40],
            'blurb_ar' => ['string', 200],
            'price_caption_ar' => ['string', 120],
            'detail_label_ar' => ['string', 40],
            'detail_caption_ar' => ['string', 60],
            'features_heading_ar' => ['string', 80],
            'features_ar' => ['json'],
            'cta_label_ar' => ['string', 40],
            'badge_ar' => ['string', 40],
            'badge_note_ar' => ['string', 80],
        ],
        'faqs' => [
            'question_ar' => ['string', 200],
            'answer_ar' => ['text'],
        ],
        'pages' => [
            'title_ar' => ['string', 120],
            'summary_ar' => ['string', 200],
            'body_ar' => ['longText'],
        ],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->columns as $table => $columns) {
            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                foreach ($columns as $column => $type) {
                    $definition = match ($type[0]) {
                        'string' => $blueprint->string($column, $type[1] ?? 255),
                        'text' => $blueprint->text($column),
                        'longText' => $blueprint->longText($column),
                        default => $blueprint->json($column),
                    };

                    $definition->nullable()->after(substr($column, 0, -3));
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->columns as $table => $columns) {
            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                $blueprint->dropColumn(array_keys($columns));
            });
        }
    }
};
