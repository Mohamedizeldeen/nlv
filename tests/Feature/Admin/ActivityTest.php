<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Story;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $attributes = []): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->admin()->create($attributes));
    }

    private function entry(array $attributes = []): ActivityLog
    {
        return ActivityLog::factory()->create($attributes);
    }

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $entry = $this->entry();

        $this->get(route('admin.activity.index'))->assertRedirect(route('login'));
        $this->get(route('admin.activity.show', $entry))->assertRedirect(route('login'));
    }

    public function test_non_admins_are_forbidden(): void
    {
        $entry = $this->entry();
        $member = User::factory()->create();

        $this->actingAs($member)->get(route('admin.activity.index'))->assertForbidden();
        $this->actingAs($member)->get(route('admin.activity.show', $entry))->assertForbidden();
    }

    public function test_admins_see_the_log_newest_first_with_changes_split_from_other_properties(): void
    {
        $this->travelTo(now()->setTime(12, 0));
        $admin = $this->admin(['name' => 'Dev Admin', 'email' => 'dev@nlv.test']);

        $this->travelTo(now()->subHour());
        $this->entry(['event' => 'auth.login', 'user_id' => $admin->id, 'description' => 'Dev Admin signed in']);
        $this->travelTo(now()->addHour());

        $story = Activity::withoutModelLogging(fn () => Story::factory()->create(['name' => 'Noura Al-Harbi']));
        $this->entry([
            'event' => 'story.updated',
            'user_id' => $admin->id,
            'subject_type' => $story->getMorphClass(),
            'subject_id' => $story->id,
            'description' => 'Updated story “Noura Al-Harbi” (city)',
            'properties' => ['changes' => ['city' => ['Riyadh', 'Jeddah']], 'via' => 'admin'],
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Mozilla/5.0 (Macintosh) Chrome/141.0 Safari/537.36',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.activity.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/activity/index')
                ->where('entries.total', 2)
                ->where('entries.per_page', 25)
                ->has('entries.data', 2)
                ->where('entries.data.0.event', 'story.updated')
                ->where('entries.data.0.group', 'content')
                ->where('entries.data.0.changes', ['city' => ['Riyadh', 'Jeddah']])
                ->where('entries.data.0.properties', ['via' => 'admin'])
                ->where('entries.data.0.user', ['id' => $admin->id, 'name' => 'Dev Admin', 'email' => 'dev@nlv.test'])
                ->where('entries.data.0.actor', 'Dev Admin')
                ->where('entries.data.0.subject.type', 'story')
                ->where('entries.data.0.subject.id', $story->id)
                ->where('entries.data.0.subject.label', 'Noura Al-Harbi')
                ->where('entries.data.0.subject.exists', true)
                ->where('entries.data.0.ip', '203.0.113.9')
                ->where('entries.data.0.day', now()->toDateString())
                ->where('entries.data.1.event', 'auth.login')
                ->where('entries.data.1.group', 'auth')
                ->where('entries.data.1.changes', null)
                ->where('entries.data.1.subject', null)
                ->has('perDay', 30)
                ->where('perDay.29.count', 2)
                ->where('timezone', 'UTC')
                ->has('groups', 5)
                ->where('filters', ['group' => null, 'user' => null, 'from' => null, 'to' => null, 'search' => null]),
            );
    }

    public function test_the_log_is_paginated_by_25(): void
    {
        $admin = $this->admin();
        ActivityLog::factory()->count(30)->create();

        $this->actingAs($admin)
            ->get(route('admin.activity.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('entries.total', 30)
                ->where('entries.current_page', 2)
                ->has('entries.data', 5),
            );
    }

    public function test_entries_can_be_filtered_by_event_group(): void
    {
        $admin = $this->admin();
        $this->entry(['event' => 'auth.login']);
        $this->entry(['event' => 'look_category.created', 'description' => 'Created look category']);
        $this->entry(['event' => 'look.updated', 'description' => 'Updated look']);
        $this->entry(['event' => 'pricing.updated', 'description' => 'Updated currencies']);
        $this->entry(['event' => 'settings.updated', 'description' => 'Updated contact details']);
        $this->entry(['event' => 'lead.submitted', 'description' => 'New order request']);
        $this->entry(['event' => 'user.admin_granted', 'description' => 'Made an admin']);

        $events = fn (string $group) => collect(
            $this->actingAs($admin)->get(route('admin.activity.index', ['group' => $group]))->inertiaProps('entries.data'),
        )->pluck('event')->sort()->values()->all();

        $this->assertSame(['look.updated', 'look_category.created', 'pricing.updated'], $events('content'));
        $this->assertSame(['settings.updated'], $events('settings'));
        $this->assertSame(['lead.submitted'], $events('lead'));
        $this->assertSame(['user.admin_granted'], $events('users'));
        $this->assertSame(['auth.login'], $events('auth'));
    }

    public function test_entries_can_be_filtered_by_user_including_visitors_and_the_system(): void
    {
        $admin = $this->admin(['name' => 'Dev Admin']);
        $other = $this->admin(['name' => 'Other Admin']);
        $this->entry(['user_id' => $admin->id, 'description' => 'Mine']);
        $this->entry(['user_id' => $other->id, 'description' => 'Theirs']);
        $this->entry(['user_id' => null, 'description' => 'A visitor’s order request']);

        $this->actingAs($admin)
            ->get(route('admin.activity.index', ['user' => $other->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.description', 'Theirs')
                ->where('filters.user', (string) $other->id),
            );

        $this->actingAs($admin)
            ->get(route('admin.activity.index', ['user' => 'none']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.description', 'A visitor’s order request')
                ->where('entries.data.0.actor', 'Visitor'),
            );

        // The options list everyone in the log, by name, then visitors.
        $this->actingAs($admin)
            ->get(route('admin.activity.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('users.0', ['value' => (string) $admin->id, 'label' => 'Dev Admin'])
                ->where('users.1', ['value' => (string) $other->id, 'label' => 'Other Admin'])
                ->where('users.2', ['value' => 'none', 'label' => 'Visitors and system']),
            );
    }

    public function test_entries_can_be_filtered_by_date_range_including_both_ends(): void
    {
        $admin = $this->admin();
        $this->entry(['description' => 'Before', 'created_at' => '2026-09-09 23:59:59']);
        $this->entry(['description' => 'First day', 'created_at' => '2026-09-10 00:00:00']);
        $this->entry(['description' => 'Last day', 'created_at' => '2026-09-12 23:59:59']);
        $this->entry(['description' => 'After', 'created_at' => '2026-09-13 00:00:00']);

        $descriptions = collect(
            $this->actingAs($admin)
                ->get(route('admin.activity.index', ['from' => '2026-09-10', 'to' => '2026-09-12']))
                ->inertiaProps('entries.data'),
        )->pluck('description')->all();

        $this->assertSame(['Last day', 'First day'], $descriptions);
    }

    public function test_the_search_looks_in_descriptions_and_treats_wildcards_literally(): void
    {
        $admin = $this->admin();
        $this->entry(['description' => 'Updated plan “Lease” (prices)']);
        $this->entry(['description' => 'Discount raised to 50% for chains']);
        $this->entry(['description' => 'Discount raised to 505 for chains']);

        $this->actingAs($admin)
            ->get(route('admin.activity.index', ['search' => 'lease']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.description', 'Updated plan “Lease” (prices)'),
            );

        $this->actingAs($admin)
            ->get(route('admin.activity.index', ['search' => '50%']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.description', 'Discount raised to 50% for chains'),
            );
    }

    public function test_malformed_filters_are_ignored(): void
    {
        $admin = $this->admin();
        $this->entry();

        $this->actingAs($admin)
            ->get(route('admin.activity.index', ['group' => 'nope', 'user' => 'abc', 'from' => '2026-02-31', 'to' => 'yesterday', 'search' => '   ']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('filters', ['group' => null, 'user' => null, 'from' => null, 'to' => null, 'search' => null]),
            );
    }

    public function test_an_entry_can_be_opened_with_its_neighbours_and_the_same_records_history(): void
    {
        $admin = $this->admin();
        $story = Activity::withoutModelLogging(fn () => Story::factory()->create(['name' => 'Elena Marchetti']));
        $subject = ['subject_type' => $story->getMorphClass(), 'subject_id' => $story->id];

        $first = $this->entry([...$subject, 'event' => 'story.created', 'description' => 'Created']);
        $middle = $this->entry([...$subject, 'event' => 'story.updated', 'description' => 'Updated']);
        $unrelated = $this->entry(['event' => 'auth.login']);

        $this->actingAs($admin)
            ->get(route('admin.activity.show', $middle))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/activity/show')
                ->where('entry.id', $middle->id)
                ->where('entry.subject.label', 'Elena Marchetti')
                ->has('related', 1)
                ->where('related.0.id', $first->id)
                ->where('olderId', $first->id)
                ->where('newerId', $unrelated->id),
            );
    }

    public function test_entries_about_deleted_records_still_open(): void
    {
        $admin = $this->admin();
        $story = Story::factory()->create();
        $story->delete();

        $entry = ActivityLog::query()->where('event', 'story.deleted')->firstOrFail();

        $this->actingAs($admin)
            ->get(route('admin.activity.show', $entry))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('entry.subject.exists', false)
                ->where('entry.subject.href', null)
                ->where('entry.subject.label', null),
            );
    }

    public function test_user_subjects_link_to_the_users_page(): void
    {
        $admin = $this->admin();
        $member = Activity::withoutModelLogging(fn () => User::factory()->create(['email' => 'jane@nlv.test']));
        $this->entry(['event' => 'user.admin_granted', 'subject_type' => $member->getMorphClass(), 'subject_id' => $member->id]);

        $this->actingAs($admin)
            ->get(route('admin.activity.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('entries.data.0.subject.href', '/admin/users?search=jane%40nlv.test'),
            );
    }

    public function test_content_subjects_link_to_their_admin_page_when_the_module_has_one(): void
    {
        $admin = $this->admin();
        $story = Activity::withoutModelLogging(fn () => Story::factory()->create());
        $this->entry(['event' => 'story.updated', 'subject_type' => $story->getMorphClass(), 'subject_id' => $story->id]);

        $expected = Route::has('admin.stories.edit') ? route('admin.stories.edit', $story, false) : null;

        $this->actingAs($admin)
            ->get(route('admin.activity.index'))
            ->assertInertia(fn (Assert $page) => $page->where('entries.data.0.subject.href', $expected));
    }

    public function test_unknown_entries_are_not_found(): void
    {
        $this->actingAs($this->admin())->get('/admin/activity/999999')->assertNotFound();
    }

    public function test_the_log_is_read_only(): void
    {
        $admin = $this->admin();
        $entry = $this->entry();

        $this->actingAs($admin)->delete("/admin/activity/{$entry->id}")->assertMethodNotAllowed();
        $this->actingAs($admin)->put("/admin/activity/{$entry->id}")->assertMethodNotAllowed();
        $this->actingAs($admin)->delete('/admin/activity')->assertMethodNotAllowed();

        $this->assertModelExists($entry);
    }
}
