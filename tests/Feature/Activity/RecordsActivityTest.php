<?php

namespace Tests\Feature\Activity;

use App\Enums\LeadStatus;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Story;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecordsActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_record_logs_its_fields(): void
    {
        $story = Story::factory()->create(['name' => 'Noura Al-Harbi', 'city' => 'Riyadh']);

        $log = $this->latestLog('story.created');

        $this->assertTrue($log->subject?->is($story));
        $this->assertSame('Created story “Noura Al-Harbi”', $log->description);
        $this->assertSame([null, 'Noura Al-Harbi'], $log->properties['changes']['name']);
        $this->assertSame([null, 'Riyadh'], $log->properties['changes']['city']);
        $this->assertArrayNotHasKey('created_at', $log->properties['changes']);
        $this->assertArrayNotHasKey('updated_at', $log->properties['changes']);
        $this->assertArrayNotHasKey('id', $log->properties['changes']);
    }

    public function test_updating_logs_only_the_changed_fields_with_old_and_new_values(): void
    {
        $story = Story::factory()->create(['name' => 'Old name', 'city' => 'Milan']);

        $story->update(['name' => 'New name', 'city' => 'Milan']);

        $log = $this->latestLog('story.updated');

        $this->assertSame(['name' => ['Old name', 'New name']], $log->properties['changes']);
        $this->assertSame('Updated story “New name” (name)', $log->description);
    }

    public function test_saving_without_changes_logs_nothing(): void
    {
        $story = Story::factory()->create();

        $story->update(['name' => $story->name]);
        $story->touch();

        $this->assertSame(0, ActivityLog::query()->where('event', 'story.updated')->count());
    }

    public function test_long_strings_are_cut_to_300_characters(): void
    {
        $story = Story::factory()->create(['quote' => 'Short and *sweet*.']);

        $story->update(['quote' => str_repeat('a', 500)]);

        [$old, $new] = $this->latestLog('story.updated')->properties['changes']['quote'];

        $this->assertSame(300, mb_strlen($new));
        $this->assertStringEndsWith('…', $new);
        $this->assertSame('Short and *sweet*.', $old);
    }

    public function test_deleting_logs_the_last_values(): void
    {
        $look = Look::factory()->create(['title' => 'Silk gown, black']);

        $look->delete();

        $log = $this->latestLog('look.deleted');

        $this->assertSame('Deleted look “Silk gown, black”', $log->description);
        $this->assertSame(['Silk gown, black', null], $log->properties['changes']['title']);
    }

    public function test_subjects_are_named_in_snake_case(): void
    {
        LookCategory::factory()->create(['name' => 'Abayas']);

        $this->assertSame('Created look category “Abayas”', $this->latestLog('look_category.created')->description);
    }

    public function test_enums_and_dates_are_logged_as_plain_values(): void
    {
        $lead = Lead::factory()->create();

        $lead->update(['status' => LeadStatus::Contacted, 'contacted_at' => '2026-09-20 10:30:00']);

        $changes = $this->latestLog('lead.updated')->properties['changes'];

        $this->assertSame(['new', 'contacted'], $changes['status']);
        $this->assertSame([null, '2026-09-20 10:30:00'], $changes['contacted_at']);
    }

    public function test_the_lead_created_entry_carries_the_final_reference(): void
    {
        $lead = Lead::factory()->create();

        $log = $this->latestLog('lead.created');

        $this->assertSame(Lead::referenceFor($lead->id), $lead->reference);
        $this->assertSame([null, $lead->reference], $log->properties['changes']['reference']);
        $this->assertSame("Created lead “{$lead->reference}”", $log->description);
    }

    public function test_soft_deleting_and_restoring_a_lead_are_logged(): void
    {
        $lead = Lead::factory()->create();

        $lead->delete();
        $lead->restore();

        $this->assertSame(1, ActivityLog::query()->where('event', 'lead.deleted')->count());
        $this->assertSame(1, ActivityLog::query()->where('event', 'lead.restored')->count());
        $this->assertSame(0, ActivityLog::query()->where('event', 'lead.updated')->count());
    }

    public function test_passwords_and_two_factor_secrets_are_never_logged(): void
    {
        $user = User::factory()->create();

        $user->forceFill([
            'password' => 'a-brand-new-secret-password',
            'two_factor_secret' => encrypt('TOTP-SECRET'),
        ])->save();

        $log = $this->latestLog('user.updated');
        $raw = (string) ActivityLog::query()->whereKey($log->id)->toBase()->value('properties');

        $this->assertSame(['[redacted]', '[redacted]'], $log->properties['changes']['password']);
        $this->assertSame([null, '[redacted]'], $log->properties['changes']['two_factor_secret']);
        $this->assertStringNotContainsString('a-brand-new-secret-password', $raw);
        $this->assertStringNotContainsString('$2y$', $raw);
        $this->assertStringNotContainsString((string) $user->two_factor_secret, $raw);
    }

    public function test_remember_token_changes_are_not_logged(): void
    {
        $user = User::factory()->create();

        $user->setRememberToken('another-token');
        $user->save();

        $this->assertSame(0, ActivityLog::query()->where('event', 'user.updated')->count());
    }

    public function test_the_signed_in_user_is_recorded_as_the_actor(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin);

        Story::factory()->create();

        $this->assertSame($admin->id, $this->latestLog('story.created')->user_id);
    }

    public function test_model_logging_can_be_paused_while_explicit_entries_are_still_written(): void
    {
        $result = Activity::withoutModelLogging(function (): string {
            Story::factory()->create();
            Activity::record('lead.exported', null, 'Exported 3 leads', ['count' => 3]);

            return 'done';
        });

        $this->assertSame('done', $result);
        $this->assertSame(0, ActivityLog::query()->where('event', 'story.created')->count());
        $this->assertSame(['count' => 3], $this->latestLog('lead.exported')->properties);
        $this->assertTrue(Activity::logsModelEvents());
    }

    public function test_console_entries_carry_no_ip_address_or_browser(): void
    {
        // Outside the test suite, artisan commands and seeders run with a placeholder request.
        $environment = $this->app['env'];
        $this->app['env'] = 'local';

        try {
            $log = Activity::record('admin.created', null, 'Created an admin from the console');
        } finally {
            $this->app['env'] = $environment;
        }

        $this->assertNull($log->ip_address);
        $this->assertNull($log->user_agent);
    }

    public function test_changes_compares_two_snapshots(): void
    {
        $this->assertSame(
            ['b' => [2, 3], 'c' => [null, 'x']],
            Activity::changes(['a' => 1, 'b' => 2], ['a' => 1, 'b' => 3, 'c' => 'x']),
        );
    }

    private function latestLog(string $event): ActivityLog
    {
        $log = ActivityLog::query()->where('event', $event)->latest('id')->first();

        $this->assertNotNull($log, "No [{$event}] entry was logged.");

        return $log;
    }
}
