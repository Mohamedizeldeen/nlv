<?php

namespace Tests\Feature\Activity;

use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Story;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The audit trail keeps the acting user's name (activity_logs.causer_name),
 * so an entry still says who did it once that account is deleted.
 */
class CauserNameTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $attributes = []): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->admin()->create($attributes));
    }

    public function test_an_entry_keeps_the_signed_in_users_name(): void
    {
        $admin = $this->admin(['name' => 'Dev Admin']);
        $this->actingAs($admin);

        $log = Activity::record('story.updated', null, 'Updated a story');

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('Dev Admin', $log->fresh()?->causer_name);
    }

    public function test_an_entry_keeps_the_given_causers_name(): void
    {
        $admin = $this->admin(['name' => 'Other Admin']);

        $log = Activity::record('user.admin_granted', null, 'Granted', [], $admin);

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('Other Admin', $log->causer_name);
    }

    public function test_guests_and_the_console_have_no_name(): void
    {
        $log = Activity::record('lead.submitted', null, 'A visitor’s order request');

        $this->assertNull($log->user_id);
        $this->assertNull($log->fresh()?->causer_name);
    }

    public function test_a_long_name_is_cut_to_the_column(): void
    {
        $admin = $this->admin(['name' => Str::repeat('a', 200)]);

        $log = Activity::record('story.updated', null, 'Updated', [], $admin);

        $this->assertSame(Activity::MAX_CAUSER_NAME_LENGTH, mb_strlen((string) $log->causer_name));
        $this->assertStringEndsWith('…', (string) $log->causer_name);
    }

    public function test_an_already_deleted_causer_is_kept_by_name_only(): void
    {
        $user = $this->admin(['name' => 'Gone Admin']);
        Activity::withoutModelLogging(fn () => $user->delete());

        $log = Activity::record('user.deleted', $user, 'Gone Admin deleted their own account', [], $user);

        $this->assertNull($log->user_id);
        $this->assertSame('Gone Admin', $log->causer_name);
    }

    public function test_model_changes_keep_the_name_too(): void
    {
        $admin = $this->admin(['name' => 'Dev Admin']);
        $this->actingAs($admin);

        Story::factory()->create();

        $log = ActivityLog::query()->where('event', 'story.created')->sole();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('Dev Admin', $log->causer_name);
    }

    public function test_the_log_names_a_deleted_account_and_keeps_visitor_for_guests(): void
    {
        $viewer = $this->admin(['name' => 'Viewer']);
        $gone = $this->admin(['name' => 'Jane Doe']);

        $byGone = Activity::record('story.updated', null, 'Jane Doe updated a story', [], $gone);
        $byVisitor = ActivityLog::factory()->create(['description' => 'A visitor’s order request']);
        $byConsole = ActivityLog::factory()->create(['description' => 'Seeded', 'ip_address' => null, 'user_agent' => null]);

        Activity::withoutModelLogging(fn () => $gone->delete());

        $this->assertNull($byGone->fresh()?->user_id);
        $this->assertSame('Jane Doe', $byGone->fresh()?->causer_name);

        $this->actingAs($viewer)
            ->get(route('admin.activity.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('entries.data', fn ($entries) => collect($entries)->keyBy('id')->pipe(fn ($byId) => $byId[$byGone->id]['actor'] === 'Jane Doe (deleted account)'
                    && $byId[$byGone->id]['actorKind'] === 'deleted'
                    && $byId[$byGone->id]['causerName'] === 'Jane Doe'
                    && $byId[$byGone->id]['user'] === null
                    && $byId[$byVisitor->id]['actor'] === 'Visitor'
                    && $byId[$byVisitor->id]['actorKind'] === 'visitor'
                    && $byId[$byConsole->id]['actor'] === 'System'
                    && $byId[$byConsole->id]['actorKind'] === 'system'))
                ->where('users', [
                    ['value' => 'deleted', 'label' => 'Deleted accounts'],
                    ['value' => 'none', 'label' => 'Visitors and system'],
                ]),
            );

        $this->actingAs($viewer)
            ->get(route('admin.activity.show', $byGone))
            ->assertInertia(fn (Assert $page) => $page
                ->where('entry.actor', 'Jane Doe (deleted account)')
                ->where('entry.actorKind', 'deleted'),
            );
    }

    public function test_the_dashboard_and_a_leads_timeline_name_a_deleted_account(): void
    {
        $viewer = $this->admin(['name' => 'Viewer']);
        $gone = $this->admin(['name' => 'Jane Doe']);
        $lead = Activity::withoutModelLogging(fn () => Lead::factory()->create());

        $entry = Activity::record('lead.updated', $lead, 'Marked the lead as contacted', [], $gone);
        Activity::withoutModelLogging(fn () => $gone->delete());

        $this->actingAs($viewer)
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('recentActivity', fn ($entries) => collect($entries)->firstWhere('id', $entry->id)['user'] === 'Jane Doe (deleted account)'),
            );

        $this->actingAs($viewer)
            ->get(route('admin.leads.show', $lead))
            ->assertInertia(fn (Assert $page) => $page
                ->where('timeline', fn ($entries) => collect($entries)->firstWhere('id', $entry->id)['user'] === 'Jane Doe (deleted account)'),
            );
    }

    public function test_deleted_accounts_and_visitors_are_filtered_apart(): void
    {
        $viewer = $this->admin(['name' => 'Viewer']);
        $gone = $this->admin(['name' => 'Jane Doe']);

        Activity::record('story.updated', null, 'Jane Doe updated a story', [], $gone);
        ActivityLog::factory()->create(['description' => 'A visitor’s order request']);
        Activity::withoutModelLogging(fn () => $gone->delete());

        $this->actingAs($viewer)
            ->get(route('admin.activity.index', ['user' => 'deleted']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.description', 'Jane Doe updated a story')
                ->where('filters.user', 'deleted'),
            );

        $this->actingAs($viewer)
            ->get(route('admin.activity.index', ['user' => 'none']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.description', 'A visitor’s order request'),
            );
    }

    public function test_a_renamed_user_shows_their_current_name(): void
    {
        $admin = $this->admin(['name' => 'Old Name']);

        $log = Activity::record('story.updated', null, 'Updated', [], $admin);

        Activity::withoutModelLogging(fn () => $admin->forceFill(['name' => 'New Name'])->save());

        $this->assertSame('New Name', $log->fresh()?->causerLabel());
        $this->assertSame('Old Name', $log->fresh()?->causer_name);
    }

    public function test_the_migration_backfills_names_from_existing_users(): void
    {
        $admin = $this->admin(['name' => 'Dev Admin']);
        $gone = $this->admin(['name' => 'Gone Admin']);

        $mine = ActivityLog::factory()->create(['user_id' => $admin->id]);
        $theirs = ActivityLog::factory()->create(['user_id' => $gone->id]);
        $visitor = ActivityLog::factory()->create(['user_id' => null]);

        // Entries written before the column existed have no name.
        $migration = require database_path('migrations/2026_09_27_090000_add_causer_name_to_activity_logs_table.php');
        $migration->down();

        // An account deleted before the column existed can't be named.
        Activity::withoutModelLogging(fn () => $gone->delete());

        $migration->up();

        $this->assertSame('Dev Admin', $mine->fresh()?->causer_name);
        $this->assertNull($theirs->fresh()?->user_id);
        $this->assertNull($theirs->fresh()?->causer_name);
        $this->assertNull($visitor->fresh()?->causer_name);
    }
}
