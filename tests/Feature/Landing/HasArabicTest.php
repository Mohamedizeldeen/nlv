<?php

namespace Tests\Feature\Landing;

use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HasArabicTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_translatable_attribute_has_an_arabic_column_that_can_be_filled(): void
    {
        foreach ([Story::class, LookCategory::class, Look::class, Plan::class, Faq::class, Page::class] as $class) {
            $model = new $class;

            foreach ($model->arabicAttributes() as $column) {
                $this->assertTrue($model->isFillable($column), "{$class}::{$column} is not fillable.");
                $this->assertTrue(
                    $model->getConnection()->getSchemaBuilder()->hasColumn($model->getTable(), $column),
                    "{$model->getTable()}.{$column} does not exist.",
                );
            }
        }

        $this->assertSame(
            ['name_ar', 'role_ar', 'store_ar', 'city_ar', 'quote_ar', 'metric_label_ar', 'metric_short_ar', 'metric_note_ar'],
            (new Story)->arabicAttributes(),
        );
    }

    public function test_localized_reads_the_arabic_and_falls_back_to_the_english(): void
    {
        $story = Story::factory()->create(['name' => 'Noura Al-Harbi', 'name_ar' => 'نورة الحربي', 'role' => 'Founder', 'role_ar' => '  ']);

        $this->assertSame('نورة الحربي', $story->localized('name', 'ar'));
        $this->assertSame('Noura Al-Harbi', $story->localized('name', 'en'));
        $this->assertSame('Founder', $story->localized('role', 'ar'), 'A blank Arabic shows the English.');
        $this->assertSame('Noura Al-Harbi', $story->localized('name'), 'Without a locale: the current language.');

        app()->setLocale('ar');
        $this->assertSame('نورة الحربي', $story->localized('name'));
    }

    public function test_a_features_list_is_used_only_when_every_line_is_translated(): void
    {
        $plan = Plan::factory()->buy()->create(['features_ar' => ['ضمان *12 شهرًا*', '']]);

        $this->assertSame($plan->features, $plan->localized('features', 'ar'));

        $plan->update(['features_ar' => ['ضمان *12 شهرًا*', 'تجارب *غير محدودة*']]);

        $this->assertSame(['ضمان *12 شهرًا*', 'تجارب *غير محدودة*'], $plan->fresh()?->localized('features', 'ar'));
    }

    public function test_missing_arabic_lists_the_untranslated_attributes(): void
    {
        $faq = Faq::factory()->create(['question' => 'Why?', 'answer' => 'Because.', 'question_ar' => 'لماذا؟']);
        $this->assertSame(['answer'], $faq->missingArabic());

        $this->assertSame([], Faq::factory()->arabic()->create()->missingArabic());

        // An attribute without English (an optional one) needs no Arabic.
        $category = LookCategory::factory()->arabic()->create(['stat_figure' => null, 'stat_figure_ar' => null]);
        $this->assertSame([], $category->missingArabic());
    }

    public function test_arabic_edits_are_logged_like_any_other_change(): void
    {
        $look = Look::factory()->create();

        $look->update(['title_ar' => 'عباءة مبطّنة، كحلي']);

        $log = ActivityLog::query()->where('event', 'look.updated')->sole();
        $this->assertSame([null, 'عباءة مبطّنة، كحلي'], $log->properties['changes']['title_ar'] ?? null);
        $this->assertStringEndsWith('(title_ar)', $log->description);
    }
}
