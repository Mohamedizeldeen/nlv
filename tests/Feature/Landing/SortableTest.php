<?php

namespace Tests\Feature\Landing;

use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\LookCategory;
use App\Models\Story;
use App\Support\LandingContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SortableTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_records_are_placed_last(): void
    {
        $first = Story::factory()->create();
        $second = Story::factory()->create();
        $pinned = Story::factory()->create(['sort_order' => 0]);

        $this->assertSame(0, $first->sort_order);
        $this->assertSame(1, $second->sort_order);
        $this->assertSame(0, $pinned->sort_order);
        $this->assertSame([$first->id, $pinned->id, $second->id], Story::query()->ordered()->pluck('id')->all());
    }

    public function test_reorder_saves_the_order_and_logs_one_entry(): void
    {
        [$a, $b, $c] = LookCategory::factory()->count(3)->create()->all();
        $before = ActivityLog::query()->count();

        LookCategory::reorder([$c->id, (string) $a->id, $b->id]);

        $this->assertSame([$c->id, $a->id, $b->id], LookCategory::query()->ordered()->pluck('id')->all());
        $this->assertSame($before + 1, ActivityLog::query()->count());

        $log = ActivityLog::query()->latest('id')->firstOrFail();

        $this->assertSame('look_category.reordered', $log->event);
        $this->assertSame('Reordered look categories', $log->description);
        $this->assertSame(['order' => [$c->id, $a->id, $b->id]], $log->properties);
    }

    public function test_reorder_leaves_the_records_timestamps_alone(): void
    {
        $this->travelTo(now()->subDay());
        [$a, $b] = Story::factory()->count(2)->create()->all();
        $this->travelBack();

        $stamps = Story::query()->orderBy('id')->pluck('updated_at')->map(fn ($date) => (string) $date)->all();

        Story::reorder([$b->id, $a->id]);

        $this->assertSame([$b->id, $a->id], Story::query()->ordered()->pluck('id')->all());
        $this->assertSame($stamps, Story::query()->orderBy('id')->pluck('updated_at')->map(fn ($date) => (string) $date)->all());
    }

    public function test_faq_entries_say_faq(): void
    {
        [$a, $b] = Faq::factory()->count(2)->create(['question' => fn () => fake()->unique()->sentence().'?'])->all();

        Faq::reorder([$b->id, $a->id]);
        $a->delete();

        $this->assertSame('Reordered FAQs', ActivityLog::query()->where('event', 'faq.reordered')->latest('id')->value('description'));
        $this->assertStringStartsWith('Deleted FAQ “', (string) ActivityLog::query()->where('event', 'faq.deleted')->latest('id')->value('description'));
    }

    public function test_reorder_refreshes_the_landing_payload(): void
    {
        $first = Story::factory()->create(['name' => 'First']);
        $second = Story::factory()->create(['name' => 'Second']);

        $this->assertSame(['First', 'Second'], array_column(LandingContent::build()['stories'], 'name'));

        Story::reorder([$second->id, $first->id]);

        $this->assertSame(['Second', 'First'], array_column(LandingContent::build()['stories'], 'name'));
    }
}
