<?php

namespace Tests\Feature\Admin;

use App\Enums\LeadStatus;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Look;
use App\Models\Page;
use App\Models\Story;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
    }

    public function test_non_admins_are_forbidden(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_unverified_admins_must_verify_their_email_first(): void
    {
        $this->actingAs(User::factory()->admin()->unverified()->create())
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('verification.notice'));
    }

    public function test_admins_can_visit_the_dashboard(): void
    {
        // Created without logging, so the activity feed starts empty.
        $admin = Activity::withoutModelLogging(fn () => User::factory()->admin()->create());

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                // The page file is built by the admin kit; only the component name is checked here.
                ->component('admin/dashboard')
                ->has('stats', fn (Assert $stats) => $stats
                    ->where('newLeads', 0)
                    ->where('leadsThisWeek', 0)
                    ->where('totalLeads', 0)
                    ->where('wonLeads', 0)
                    ->where('publishedStories', 0)
                    ->where('publishedLooks', 0)
                    ->where('publishedPages', 0),
                )
                ->has('leadsByDay', 30, fn (Assert $day) => $day
                    ->whereType('date', 'string')
                    ->where('count', 0),
                )
                ->where('leadsByDay.0.date', now()->subDays(29)->toDateString())
                ->where('leadsByDay.29.date', now()->toDateString())
                ->has('recentLeads', 0)
                ->has('recentActivity', 0),
            );
    }

    public function test_the_dashboard_summarises_leads_content_and_activity(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Dev Admin']);

        $this->travelTo(now()->subDays(40));
        Lead::factory()->create();
        $this->travelBack();

        $this->travelTo(now()->subDays(10)->setTime(9, 0));
        Lead::factory()->status(LeadStatus::Won)->create();
        $this->travelBack();

        $this->travelTo(now()->subDays(2)->setTime(9, 0));
        Lead::factory()->count(2)->create();
        $this->travelBack();

        $latest = Lead::factory()->create(['name' => 'Amira Haddad', 'devices' => 4]);
        Lead::factory()->create()->delete();

        Story::factory()->count(2)->create();
        Story::factory()->unpublished()->create();
        Look::factory()->count(3)->create();
        Page::factory()->create();
        Page::factory()->unpublished()->create();

        $this->actingAs($admin);
        Activity::record('lead.exported', null, 'Exported 5 leads');

        $this->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('stats', [
                    'newLeads' => 4,
                    'leadsThisWeek' => 3,
                    'totalLeads' => 5,
                    'wonLeads' => 1,
                    'publishedStories' => 2,
                    'publishedLooks' => 3,
                    'publishedPages' => 1,
                ])
                ->where('leadsByDay.27.count', 2)
                ->where('leadsByDay.29.count', 1)
                ->where('leadsByDay.19.count', 1)
                ->where('leadsByDay', fn ($days): bool => collect($days)->sum('count') === 4)
                ->has('recentLeads', 5)
                ->has('recentLeads.0', fn (Assert $lead) => $lead
                    ->where('id', $latest->id)
                    ->where('reference', $latest->reference)
                    ->where('name', 'Amira Haddad')
                    ->where('company', $latest->company)
                    ->where('country', $latest->country)
                    ->where('devices', 4)
                    ->where('plan', $latest->plan->value)
                    ->where('status', 'new')
                    ->whereType('createdAt', 'string'),
                )
                ->has('recentActivity', 8)
                ->has('recentActivity.0', fn (Assert $entry) => $entry
                    ->whereType('id', 'integer')
                    ->where('event', 'lead.exported')
                    ->where('description', 'Exported 5 leads')
                    ->where('user', 'Dev Admin')
                    ->whereType('createdAt', 'string'),
                ),
            );

        $this->assertGreaterThan(8, ActivityLog::query()->count());
    }

    public function test_the_admin_dashboard_is_served_at_admin(): void
    {
        $this->assertSame('/admin', route('admin.dashboard', absolute: false));
    }

    public function test_admins_receive_the_shared_admin_prop(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('admin', ['newLeads' => 0]),
            );
    }

    public function test_the_shared_admin_prop_counts_new_leads(): void
    {
        Lead::factory()->count(2)->create();
        Lead::factory()->status(LeadStatus::Contacted)->create();
        Lead::factory()->create()->delete();

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('admin', ['newLeads' => 2]),
            );
    }

    public function test_non_admins_receive_a_null_admin_prop(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('admin', null),
            );
    }

    public function test_the_access_admin_gate_follows_the_admin_flag(): void
    {
        $this->assertTrue(Gate::forUser(User::factory()->admin()->create())->allows('access-admin'));
        $this->assertFalse(Gate::forUser(User::factory()->create())->allows('access-admin'));
    }
}
