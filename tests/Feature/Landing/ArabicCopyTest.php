<?php

namespace Tests\Feature\Landing;

use App\Enums\PlanKey;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use App\Support\Settings;
use Database\Factories\PlanFactory;
use Database\Seeders\LandingContentSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The seeded Arabic copy (config/landing.php `default_ar`, the seeder's
 * arabic(), lang/ar.json) is complete and keeps the English's markup and
 * figures: every English text has its Arabic, the same *accents* and
 * Markdown structure, the same numbers in Western digits, and no English
 * words besides the brand names.
 */
class ArabicCopyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Latin words allowed in Arabic copy: the brand names.
     */
    private const BRANDS = ['NLV', 'TryOn'];

    public function test_every_copy_setting_has_an_arabic_default(): void
    {
        $checked = 0;

        foreach (Settings::schema() as $key => $definition) {
            if (! $definition['translatable']) {
                continue;
            }

            $english = (string) $definition['default'];
            $arabic = (string) $definition['default_ar'];

            if ($english === '') {
                $this->assertSame('', $arabic, "[{$key}] has an Arabic default but no English one.");

                continue;
            }

            $this->assertArabicCopy($key, $english, $arabic);
            $checked++;
        }

        $this->assertSame(68, $checked, 'Every copy setting but the (empty) address has Arabic.');
    }

    public function test_every_seeded_record_has_its_arabic(): void
    {
        $english = [
            'stories' => collect(LandingContentSeeder::stories())->keyBy('name')->all(),
            'categories' => collect(LandingContentSeeder::categories())->keyBy('slug')->all(),
            'looks' => collect(LandingContentSeeder::looks())->keyBy('title')->all(),
            'plans' => collect(PlanKey::cases())->mapWithKeys(fn (PlanKey $key): array => [$key->value => PlanFactory::defaults($key)])->all(),
            'faqs' => collect(LandingContentSeeder::faqs())->mapWithKeys(fn (array $faq): array => [$faq[0] => ['question' => $faq[0], 'answer' => $faq[1]]])->all(),
            'pages' => collect(LandingContentSeeder::pages())->keyBy('slug')->all(),
        ];

        foreach (LandingContentSeeder::arabic() as $group => $records) {
            foreach ($records as $key => $columns) {
                foreach ($columns as $column => $arabic) {
                    $label = "{$group} “{$key}” {$column}";
                    $source = $english[$group][$key][substr($column, 0, -3)] ?? null;

                    if (blank($source)) {
                        $this->assertTrue(blank($arabic), "{$label} has Arabic but no English.");

                        continue;
                    }

                    if (is_array($source)) {
                        $this->assertIsArray($arabic, $label);
                        $this->assertCount(count($source), $arabic, "{$label}: one Arabic line per English line.");

                        foreach (array_values($source) as $index => $line) {
                            $this->assertArabicCopy("{$label}.{$index}", $line, $arabic[$index]);
                        }

                        continue;
                    }

                    $this->assertIsString($arabic, $label);
                    $this->assertArabicCopy($label, (string) $source, $arabic);
                }
            }
        }
    }

    public function test_the_arabic_pages_keep_the_english_structure(): void
    {
        $english = collect(LandingContentSeeder::pages())->keyBy('slug');

        foreach (LandingContentSeeder::arabic()['pages'] as $slug => $page) {
            $source = (string) $english[$slug]['body'];
            $arabic = $page['body_ar'];

            $this->assertStringStartsWith('> **صفحة مؤقتة.**', $arabic, "{$slug}: the placeholder notice comes first.");
            $this->assertSame(
                preg_match_all('/^## /m', $source),
                preg_match_all('/^## /m', $arabic),
                "{$slug}: the same sections.",
            );
            $this->assertSame(
                preg_match_all('/^\[.+\]$/m', $source),
                preg_match_all('/^\[.+\]$/m', $arabic),
                "{$slug}: the same [placeholder] paragraphs.",
            );
        }
    }

    public function test_the_seeded_records_have_nothing_missing_in_arabic(): void
    {
        $this->seed(LandingContentSeeder::class);

        foreach ([Story::class, LookCategory::class, Look::class, Plan::class, Faq::class, Page::class] as $class) {
            $records = $class::query()->get();

            $this->assertNotEmpty($records, $class);

            $records->each(function (Model $record) use ($class): void {
                /** @var Story|LookCategory|Look|Plan|Faq|Page $record */
                $this->assertSame([], $record->missingArabic(), "{$class} #{$record->getKey()} misses Arabic.");
            });
        }
    }

    public function test_every_arabic_message_is_translated_with_its_placeholders(): void
    {
        /** @var array<string, string> $messages */
        $messages = json_decode((string) file_get_contents(lang_path('ar.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach ($messages as $english => $arabic) {
            $this->assertMatchesRegularExpression('/\p{Arabic}/u', $arabic, "“{$english}” is not translated.");
            $this->assertDoesNotMatchRegularExpression('/[\x{0660}-\x{0669}\x{06F0}-\x{06F9}]/u', $arabic, "“{$english}”: Western digits only.");

            preg_match_all('/:[a-z]+/', $english, $placeholders);
            foreach ($placeholders[0] as $placeholder) {
                $this->assertStringContainsString($placeholder, $arabic, "“{$english}” lost {$placeholder}.");
            }
        }
    }

    /**
     * One Arabic text against its English: filled, in Arabic (when the
     * English has words), the same *accent* markup, the same figures in
     * Western digits, and only brand names in Latin script.
     */
    private function assertArabicCopy(string $label, string $english, string $arabic): void
    {
        $this->assertNotSame('', trim($arabic), "{$label} has no Arabic.");

        if (preg_match('/[A-Za-z]{2,}/', $english) === 1) {
            $this->assertMatchesRegularExpression('/\p{Arabic}/u', $arabic, "{$label} is not in Arabic.");
        }

        $this->assertSame(substr_count($english, '*'), substr_count($arabic, '*'), "{$label}: the same *accent* markup.");
        $this->assertDoesNotMatchRegularExpression('/[\x{0660}-\x{0669}\x{06F0}-\x{06F9}]/u', $arabic, "{$label}: Western digits only.");

        preg_match_all('/\d+(?:[.,]\d+)*/', $english, $figures);
        foreach ($figures[0] as $figure) {
            $this->assertStringContainsString($figure, $arabic, "{$label} lost the figure {$figure}.");
        }

        preg_match_all('/[A-Za-z]+/', $arabic, $latin);
        $this->assertSame([], array_values(array_diff($latin[0], self::BRANDS)), "{$label}: English words in the Arabic.");
    }
}
