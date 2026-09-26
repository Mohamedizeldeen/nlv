<?php

namespace Tests\Feature\Admin;

use App\Enums\LeadPlan;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\User;
use App\Notifications\NewOrderRequest;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LeadsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Activity::withoutModelLogging(fn (): User => User::factory()->admin()->create(['name' => 'Dev Admin']));
    }

    // Access ------------------------------------------------------------------

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $lead = $this->lead();

        foreach ($this->routes($lead) as [$method, $url]) {
            $this->call($method, $url)->assertRedirect(route('login'));
        }

        $this->assertNotSoftDeleted($lead);
    }

    public function test_non_admins_are_forbidden(): void
    {
        $lead = $this->lead();
        $this->actingAs(User::factory()->create());

        foreach ($this->routes($lead) as [$method, $url]) {
            $this->call($method, $url, ['status' => 'won'])->assertForbidden();
        }

        $this->assertSame(LeadStatus::New, $lead->fresh()?->status);
        $this->assertNotSoftDeleted($lead);
    }

    public function test_admins_can_open_the_list_the_export_and_a_lead(): void
    {
        $lead = $this->lead();
        $this->actingAs($this->admin);

        $this->get(route('admin.leads.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/leads/index'));
        $this->get(route('admin.leads.show', $lead))->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/leads/show'));
        $this->get(route('admin.leads.export'))->assertOk()->assertDownload();
    }

    public function test_unknown_leads_are_not_found(): void
    {
        $this->actingAs($this->admin)->get('/admin/leads/999')->assertNotFound();
        $this->actingAs($this->admin)->get('/admin/leads/not-a-number')->assertNotFound();
    }

    // The list ----------------------------------------------------------------

    public function test_the_list_shows_leads_newest_first_with_tab_counts(): void
    {
        $old = $this->lead(['name' => 'Oldest'], daysAgo: 5);
        $mid = $this->lead(['name' => 'Middle', 'status' => LeadStatus::Contacted], daysAgo: 2);
        $new = $this->lead(['name' => 'Newest', 'status' => LeadStatus::Won, 'assigned_to' => $this->admin->id]);
        $this->lead(['name' => 'Gone'])->delete();

        $this->actingAs($this->admin)
            ->get(route('admin.leads.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/leads/index')
                ->has('leads.data', 3)
                ->where('leads.data.0.id', $new->id)
                ->where('leads.data.1.id', $mid->id)
                ->where('leads.data.2.id', $old->id)
                ->has('leads.data.0', fn (Assert $row) => $row
                    ->where('reference', $new->reference)
                    ->where('name', 'Newest')
                    ->where('company', $new->company)
                    ->where('email', $new->email)
                    ->where('country', $new->country)
                    ->where('city', $new->city)
                    ->where('devices', $new->devices)
                    ->where('plan', $new->plan->value)
                    ->where('status', 'won')
                    ->where('locale', 'en')
                    ->where('assignee', 'Dev Admin')
                    ->whereType('createdAt', 'string')
                    ->where('deletedAt', null)
                    ->etc(),
                )
                ->where('leads.total', 3)
                ->where('sort', ['column' => 'created_at', 'direction' => 'desc'])
                ->where('filters', ['search' => null, 'status' => null, 'plan' => null, 'country' => null, 'locale' => null, 'from' => null, 'to' => null])
                ->where('counts', ['all' => 3, 'new' => 1, 'contacted' => 1, 'qualified' => 0, 'won' => 1, 'lost' => 0, 'deleted' => 1])
                ->has('options.plans', 4)
                ->where('options.countries', collect([$old, $mid, $new])->pluck('country')->push(Lead::onlyTrashed()->sole()->country)->unique()->sort()->values()->all()),
            );
    }

    public function test_the_list_is_paginated_by_25(): void
    {
        Activity::withoutModelLogging(fn () => Lead::factory()->count(27)->create());

        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', ['page' => 2, 'plan' => 'buy']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('leads.current_page', 2)
                ->where('leads.per_page', 25)
                ->where('filters.plan', 'buy')
                ->etc(),
            );

        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('leads.data', 2)
                ->where('leads.total', 27)
                ->where('leads.last_page', 2)
                ->where('leads.prev_page_url', fn (string $url): bool => str_contains($url, 'page=1')),
            );
    }

    public function test_search_matches_name_company_email_and_reference(): void
    {
        $amira = $this->lead(['name' => 'Amira Haddad', 'company' => 'Maison Rimal', 'email' => 'amira@rimal.test']);
        $elena = $this->lead(['name' => 'Elena Marchetti', 'company' => 'Casa Lino', 'email' => 'elena@casalino.test']);

        $this->assertListed(['search' => 'haddad'], [$amira]);
        $this->assertListed(['search' => 'casa'], [$elena]);
        $this->assertListed(['search' => 'casalino.test'], [$elena]);
        $this->assertListed(['search' => $amira->reference], [$amira]);
        $this->assertListed(['search' => 'nobody at all'], []);
    }

    public function test_search_treats_like_wildcards_as_text(): void
    {
        $percent = $this->lead(['company' => 'Sale 50% off']);
        $this->lead(['company' => 'Studio 5000']);
        $underscore = $this->lead(['company' => 'Atelier_Nord']);
        $this->lead(['company' => 'Atelier Nord']);

        $this->assertListed(['search' => '50%'], [$percent]);
        $this->assertListed(['search' => 'atelier_'], [$underscore]);
    }

    public function test_filters_by_status_plan_country_and_dates(): void
    {
        $riyadh = $this->lead(['country' => 'Saudi Arabia', 'plan' => LeadPlan::Lease, 'status' => LeadStatus::Qualified], daysAgo: 10);
        $milan = $this->lead(['country' => 'Italy', 'plan' => LeadPlan::Buy], daysAgo: 3);
        $london = $this->lead(['country' => 'United Kingdom', 'plan' => LeadPlan::Buy, 'status' => LeadStatus::Qualified]);

        $this->assertListed(['status' => 'qualified'], [$london, $riyadh]);
        $this->assertListed(['plan' => 'buy'], [$london, $milan]);
        $this->assertListed(['country' => 'Italy'], [$milan]);
        $this->assertListed(['from' => now()->subDays(3)->toDateString()], [$london, $milan]);
        $this->assertListed(['to' => now()->subDays(3)->toDateString()], [$milan, $riyadh]);
        $this->assertListed(['from' => now()->subDays(4)->toDateString(), 'to' => now()->subDay()->toDateString()], [$milan]);
        $this->assertListed(['status' => 'qualified', 'plan' => 'buy'], [$london]);

        // Tab counts follow the other filters.
        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', ['plan' => 'buy', 'status' => 'new']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('counts.all', 2)
                ->where('counts.new', 1)
                ->where('counts.qualified', 1)
                ->etc(),
            );
    }

    public function test_filters_by_the_language_of_the_page(): void
    {
        $english = $this->lead(['name' => 'Elena Marchetti'], daysAgo: 1);
        $arabic = $this->lead(['name' => 'نورة الحربي', 'locale' => 'ar', 'status' => LeadStatus::Won]);
        $alsoArabic = $this->lead(['locale' => 'ar'], daysAgo: 2);

        $this->assertListed(['locale' => 'ar'], [$arabic, $alsoArabic]);
        $this->assertListed(['locale' => 'en'], [$english]);
        $this->assertListed(['locale' => 'ar', 'status' => 'won'], [$arabic]);
        $this->assertListed(['locale' => 'ar', 'search' => 'نورة'], [$arabic]);

        // Rows say which language to answer in; the filter is echoed and the tab counts follow it.
        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', ['locale' => 'ar']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.locale', 'ar')
                ->where('leads.data.0.locale', 'ar')
                ->where('counts.all', 2)
                ->where('counts.new', 1)
                ->where('counts.won', 1)
                ->etc(),
            );

        // Anything but "en" or "ar" lists every lead.
        foreach (['AR', 'arabic', 'fr', ' '] as $unknown) {
            $this->actingAs($this->admin)
                ->get(route('admin.leads.index', ['locale' => $unknown]))
                ->assertInertia(fn (Assert $page) => $page->where('filters.locale', null)->where('leads.total', 3)->etc());
        }
    }

    public function test_the_list_can_be_sorted_by_a_column(): void
    {
        $b = $this->lead(['name' => 'Bruno', 'devices' => 9]);
        $a = $this->lead(['name' => 'Amira', 'devices' => 2]);
        $c = $this->lead(['name' => 'Chloé', 'devices' => 5]);

        $this->assertListed(['sort' => 'name', 'direction' => 'asc'], [$a, $b, $c]);
        $this->assertListed(['sort' => 'devices', 'direction' => 'desc'], [$b, $c, $a]);

        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', ['sort' => 'name', 'direction' => 'asc']))
            ->assertInertia(fn (Assert $page) => $page->where('sort', ['column' => 'name', 'direction' => 'asc'])->etc());
    }

    public function test_unknown_filter_and_sort_values_are_ignored(): void
    {
        $lead = $this->lead();

        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', [
                'status' => 'spam', 'plan' => 'free-trial', 'locale' => 'fr', 'from' => '2026-02-31', 'to' => 'yesterday',
                'sort' => 'password', 'direction' => 'sideways', 'search' => ['nested'],
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', ['search' => null, 'status' => null, 'plan' => null, 'country' => null, 'locale' => null, 'from' => null, 'to' => null])
                ->where('sort', ['column' => 'created_at', 'direction' => 'desc'])
                ->where('leads.data.0.id', $lead->id)
                ->etc(),
            );
    }

    public function test_the_deleted_tab_lists_only_deleted_leads(): void
    {
        $this->lead(['name' => 'Kept']);
        $gone = $this->lead(['name' => 'Gone']);
        $gone->delete();

        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', ['status' => 'deleted']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.status', 'deleted')
                ->has('leads.data', 1)
                ->where('leads.data.0.id', $gone->id)
                ->whereType('leads.data.0.deletedAt', 'string')
                ->etc(),
            );
    }

    // One lead ----------------------------------------------------------------

    public function test_the_lead_page_shows_every_field_and_its_own_timeline(): void
    {
        $lead = $this->lead([
            'name' => 'Amira Haddad',
            'company' => 'Maison Rimal',
            'phone' => '+966 12 345 6789',
            'plan' => LeadPlan::Lease,
            'source' => LeadSource::PricingLease,
            'message' => "Two devices for Tahlia Street.\n<b>Not bold</b> *not italic*",
            'admin_notes' => 'Budget approved.',
            'ip_address' => '198.51.100.7',
            'user_agent' => 'Mozilla/5.0 (NLV test)',
        ]);
        $other = $this->lead();

        $this->actingAs($this->admin);
        Activity::record('lead.submitted', $lead, 'Order request received');
        Activity::record('lead.submitted', $other, 'Someone else');
        Activity::record('lead.note_added', $lead, "Note on {$lead->reference}", ['note' => 'Called them.']);

        $this->get(route('admin.leads.show', $lead))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/leads/show')
                ->has('lead', fn (Assert $data) => $data
                    ->where('id', $lead->id)
                    ->where('reference', $lead->reference)
                    ->where('name', 'Amira Haddad')
                    ->where('company', 'Maison Rimal')
                    ->where('email', $lead->email)
                    ->where('phone', '+966 12 345 6789')
                    ->where('whatsapp', '966123456789')
                    ->where('country', $lead->country)
                    ->where('city', $lead->city)
                    ->where('devices', $lead->devices)
                    ->where('plan', 'lease')
                    ->where('planLabel', 'Lease')
                    ->where('message', "Two devices for Tahlia Street.\n<b>Not bold</b> *not italic*")
                    ->where('status', 'new')
                    ->where('source', 'pricing-lease')
                    ->where('sourceLabel', 'Pricing: Lease')
                    ->where('locale', 'en')
                    ->where('ipAddress', '198.51.100.7')
                    ->where('userAgent', 'Mozilla/5.0 (NLV test)')
                    ->where('adminNotes', 'Budget approved.')
                    ->where('assignedTo', null)
                    ->where('assignee', null)
                    ->whereType('consentAt', 'string')
                    ->where('contactedAt', null)
                    ->whereType('createdAt', 'string')
                    ->whereType('updatedAt', 'string')
                    ->where('deletedAt', null),
                )
                ->has('statuses', 5)
                ->where('admins', [['value' => (string) $this->admin->id, 'label' => 'Dev Admin']])
                ->where('limits', ['note' => 1000, 'notes' => 5000])
                ->has('timeline', 2)
                ->where('timeline.0.event', 'lead.note_added')
                ->where('timeline.0.note', 'Called them.')
                ->where('timeline.0.user', 'Dev Admin')
                ->where('timeline.1.event', 'lead.submitted'),
            );
    }

    public function test_the_lead_page_says_which_language_to_reply_in(): void
    {
        $this->actingAs($this->admin);

        $this->get(route('admin.leads.show', $this->lead(['locale' => 'ar'])))
            ->assertInertia(fn (Assert $page) => $page->where('lead.locale', 'ar')->etc());

        $this->get(route('admin.leads.show', $this->lead()))
            ->assertInertia(fn (Assert $page) => $page->where('lead.locale', 'en')->etc());
    }

    public function test_an_order_from_the_arabic_page_reaches_the_admin_in_arabic(): void
    {
        Notification::fake();

        $this->post(route('order-requests.store'), [
            'name' => 'نورة الحربي',
            'company' => 'رمال للعبايات',
            'email' => 'noura@rimal.test',
            'phone' => '+966 11 555 0177',
            'country' => 'السعودية',
            'city' => 'الرياض',
            'devices' => '2',
            'plan' => 'lease',
            'message' => 'نرغب في جهازين لفرع شارع التحلية.',
            'consent' => '1',
            'source' => 'hero',
            'website' => '',
            'locale' => 'ar',
        ])->assertSessionHasNoErrors();

        $lead = Lead::query()->sole();
        $this->actingAs($this->admin);

        $this->get(route('admin.leads.index', ['locale' => 'ar']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('leads.data', 1)
                ->where('leads.data.0.id', $lead->id)
                ->where('leads.data.0.name', 'نورة الحربي')
                ->where('leads.data.0.locale', 'ar')
                ->etc(),
            );

        $this->get(route('admin.leads.show', $lead))
            ->assertInertia(fn (Assert $page) => $page
                ->where('lead.locale', 'ar')
                ->where('lead.message', 'نرغب في جهازين لفرع شارع التحلية.')
                ->where('lead.city', 'الرياض')
                ->etc(),
            );

        $rows = $this->csv($this->get(route('admin.leads.export', ['locale' => 'ar']))->streamedContent());
        $this->assertSame(['نورة الحربي', 'رمال للعبايات', 'الرياض', 'نرغب في جهازين لفرع شارع التحلية.', 'Arabic'], [$rows[1][3], $rows[1][4], $rows[1][8], $rows[1][11], $rows[1][13]]);
    }

    public function test_whatsapp_needs_a_phone_with_a_country_code(): void
    {
        $this->actingAs($this->admin);

        foreach (['0044 20 7946 0142' => '442079460142', '020 7946 0142' => null, '+1 (555) 010-9999' => '15550109999'] as $phone => $whatsapp) {
            $this->get(route('admin.leads.show', $this->lead(['phone' => $phone])))
                ->assertInertia(fn (Assert $page) => $page->where('lead.whatsapp', $whatsapp)->etc());
        }
    }

    public function test_a_former_admin_who_holds_a_lead_stays_in_the_assignee_list(): void
    {
        $former = User::factory()->create(['name' => 'Former Admin']);
        $lead = $this->lead(['assigned_to' => $former->id]);

        $this->actingAs($this->admin)
            ->get(route('admin.leads.show', $lead))
            ->assertInertia(fn (Assert $page) => $page
                ->where('admins', [
                    ['value' => (string) $this->admin->id, 'label' => 'Dev Admin'],
                    ['value' => (string) $former->id, 'label' => 'Former Admin (no longer an admin)'],
                ])
                ->etc(),
            );
    }

    public function test_a_deleted_lead_can_still_be_viewed(): void
    {
        $lead = $this->lead();
        $lead->delete();

        $this->actingAs($this->admin)
            ->get(route('admin.leads.show', $lead))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->whereType('lead.deletedAt', 'string')->etc());
    }

    // Status, assignee, notes -------------------------------------------------

    public function test_changing_the_status_logs_it_with_the_note(): void
    {
        $lead = $this->lead();

        $this->actingAs($this->admin)
            ->from(route('admin.leads.show', $lead))
            ->put(route('admin.leads.update', $lead), ['status' => 'contacted', 'note' => '  Called; wants a demo.  '])
            ->assertRedirect(route('admin.leads.show', $lead))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Status set to Contacted.']);

        $lead->refresh();
        $this->assertSame(LeadStatus::Contacted, $lead->status);
        $this->assertNotNull($lead->contacted_at);

        $log = ActivityLog::query()->sole();
        $this->assertSame('lead.status_changed', $log->event);
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertTrue($log->subject?->is($lead));
        $this->assertSame("Status of {$lead->reference}: New → Contacted", $log->description);
        $this->assertSame('Called; wants a demo.', $log->properties['note'] ?? null);
        $this->assertSame(['new', 'contacted'], $log->properties['changes']['status'] ?? null);
        $this->assertArrayHasKey('contacted_at', $log->properties['changes'] ?? []);
    }

    public function test_the_first_contact_time_is_kept_on_later_moves(): void
    {
        $lead = $this->lead(['status' => LeadStatus::Contacted, 'contacted_at' => now()->subWeek()]);
        $first = $lead->contacted_at?->toIso8601String();

        $this->actingAs($this->admin)->put(route('admin.leads.update', $lead), ['status' => 'won']);

        $lead->refresh();
        $this->assertSame(LeadStatus::Won, $lead->status);
        $this->assertSame($first, $lead->contacted_at?->toIso8601String());
        $this->assertSame(['status'], array_keys(ActivityLog::query()->sole()->properties['changes'] ?? []));
    }

    public function test_a_note_without_a_status_change_goes_on_the_timeline(): void
    {
        $lead = $this->lead();

        $this->actingAs($this->admin)
            ->put(route('admin.leads.update', $lead), ['status' => 'new', 'note' => 'Left a voicemail.'])
            ->assertInertiaFlash('toast.message', 'Note added to the timeline.');

        $log = ActivityLog::query()->sole();
        $this->assertSame('lead.note_added', $log->event);
        $this->assertSame(['note' => 'Left a voicemail.'], $log->properties);
        $this->assertSame(LeadStatus::New, $lead->fresh()?->status);
    }

    public function test_the_status_and_note_are_validated(): void
    {
        $lead = $this->lead();
        $this->actingAs($this->admin);

        $this->put(route('admin.leads.update', $lead), ['status' => 'spam'])->assertSessionHasErrors(['status' => 'Choose one of the listed statuses.']);
        $this->put(route('admin.leads.update', $lead), ['status' => ''])->assertSessionHasErrors(['status' => 'Choose a status.']);
        $this->put(route('admin.leads.update', $lead), ['status' => 'won', 'note' => str_repeat('n', 1001)])->assertSessionHasErrors('note');
        $this->put(route('admin.leads.update', $lead), ['admin_notes' => str_repeat('n', 5001)])->assertSessionHasErrors(['admin_notes' => 'The notes field must not be greater than 5000 characters.']);

        $this->assertSame(LeadStatus::New, $lead->fresh()?->status);
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_a_lead_can_be_assigned_to_an_admin_and_unassigned(): void
    {
        $lead = $this->lead();
        $this->actingAs($this->admin);

        $this->put(route('admin.leads.update', $lead), ['assigned_to' => (string) $this->admin->id])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Assigned to Dev Admin.');

        $this->assertSame($this->admin->id, $lead->fresh()?->assigned_to);

        $this->put(route('admin.leads.update', $lead), ['assigned_to' => ''])
            ->assertInertiaFlash('toast.message', 'Nobody is assigned now.');

        $this->assertNull($lead->fresh()?->assigned_to);

        $logs = ActivityLog::query()->oldest('id')->get();
        $this->assertSame(['lead.assigned', 'lead.unassigned'], $logs->pluck('event')->all());
        $this->assertSame("Assigned {$lead->reference} to Dev Admin", $logs[0]->description);
        $this->assertSame(['changes' => ['assignee' => [null, 'Dev Admin']]], $logs[0]->properties);
        $this->assertSame("Unassigned {$lead->reference} (was Dev Admin)", $logs[1]->description);
    }

    public function test_only_admins_can_be_assigned(): void
    {
        $lead = $this->lead();
        $customer = User::factory()->create();

        $this->actingAs($this->admin)
            ->put(route('admin.leads.update', $lead), ['assigned_to' => $customer->id])
            ->assertSessionHasErrors(['assigned_to' => 'Choose one of the admins in the list.']);

        $this->assertNull($lead->fresh()?->assigned_to);
    }

    public function test_admin_notes_are_saved_and_logged(): void
    {
        $lead = $this->lead();

        $this->actingAs($this->admin)
            ->put(route('admin.leads.update', $lead), ['admin_notes' => "Budget approved.\nCall back in October."])
            ->assertInertiaFlash('toast.message', 'Notes saved.');

        $this->assertSame("Budget approved.\nCall back in October.", $lead->fresh()?->admin_notes);

        $log = ActivityLog::query()->sole();
        $this->assertSame('lead.notes_updated', $log->event);
        $this->assertSame([null, "Budget approved.\nCall back in October."], $log->properties['changes']['admin_notes'] ?? null);

        // Emptying the field clears the notes.
        $this->put(route('admin.leads.update', $lead), ['admin_notes' => '']);
        $this->assertNull($lead->fresh()?->admin_notes);
        $this->assertSame("Cleared the notes on {$lead->reference}", ActivityLog::query()->latest('id')->first()?->description);
    }

    public function test_saving_without_changes_logs_nothing(): void
    {
        $lead = $this->lead(['admin_notes' => 'Same.', 'assigned_to' => $this->admin->id]);

        $this->actingAs($this->admin)
            ->put(route('admin.leads.update', $lead), ['status' => 'new', 'note' => '', 'assigned_to' => $this->admin->id, 'admin_notes' => ' Same. '])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'Nothing to save: no changes.']);

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_deleted_leads_cannot_be_updated(): void
    {
        $lead = $this->lead();
        $lead->delete();

        $this->actingAs($this->admin)
            ->put(route('admin.leads.update', $lead), ['status' => 'won'])
            ->assertNotFound();
    }

    // Delete and restore ------------------------------------------------------

    public function test_deleting_a_lead_soft_deletes_and_logs_it(): void
    {
        $lead = $this->lead();

        $this->actingAs($this->admin)
            ->from(route('admin.leads.show', $lead))
            ->delete(route('admin.leads.destroy', $lead))
            ->assertRedirect(route('admin.leads.index'))
            ->assertInertiaFlash('toast.message', "{$lead->reference} deleted. You can restore it from Deleted.");

        $this->assertSoftDeleted($lead);

        $log = ActivityLog::query()->sole();
        $this->assertSame('lead.deleted', $log->event);
        $this->assertSame($this->admin->id, $log->user_id);
    }

    public function test_deleting_from_the_list_returns_to_the_same_view(): void
    {
        $lead = $this->lead();
        $list = route('admin.leads.index', ['status' => 'new', 'page' => 1]);

        $this->actingAs($this->admin)
            ->from($list)
            ->delete(route('admin.leads.destroy', $lead))
            ->assertRedirect($list);
    }

    public function test_a_deleted_lead_can_be_restored(): void
    {
        $lead = $this->lead();
        $lead->delete();
        $list = route('admin.leads.index', ['status' => 'deleted']);

        $this->actingAs($this->admin)
            ->from($list)
            ->post(route('admin.leads.restore', $lead))
            ->assertRedirect($list)
            ->assertInertiaFlash('toast.message', "{$lead->reference} restored.");

        $this->assertNotSoftDeleted($lead);
        $this->assertSame(['lead.deleted', 'lead.restored'], ActivityLog::query()->oldest('id')->pluck('event')->all());

        // Restoring again changes and logs nothing.
        $this->post(route('admin.leads.restore', $lead))->assertInertiaFlash('toast.type', 'info');
        $this->assertSame(2, ActivityLog::query()->count());
    }

    // Export ------------------------------------------------------------------

    public function test_the_export_streams_the_current_filter_as_csv(): void
    {
        $old = $this->lead(['name' => 'Old Buyer', 'plan' => LeadPlan::Buy, 'message' => "Line one\nLine \"two\", with a comma"], daysAgo: 3);
        $new = $this->lead(['name' => 'New Buyer', 'plan' => LeadPlan::Buy, 'assigned_to' => $this->admin->id]);
        $this->lead(['name' => 'Leaser', 'plan' => LeadPlan::Lease]);

        $response = $this->actingAs($this->admin)->get(route('admin.leads.export', ['plan' => 'buy']));

        $response->assertOk()->assertDownload();
        $this->assertStringStartsWith('text/csv', (string) $response->headers->get('Content-Type'));
        $this->assertMatchesRegularExpression('/filename=nlv-leads-all-\d{4}-\d{2}-\d{2}-\d{6}\.csv/', (string) $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);

        $rows = $this->csv($content);
        $this->assertCount(3, $rows);
        $this->assertSame(['Reference', 'Received (UTC)', 'Status', 'Name', 'Company', 'Email', 'Phone', 'Country', 'City', 'Devices', 'Plan', 'Message', 'Source', 'Language', 'Assigned to', 'First contacted (UTC)', 'Admin notes', 'Consent given (UTC)', 'Deleted (UTC)'], $rows[0]);
        $this->assertSame([$new->reference, 'New Buyer', 'Buy', 'English', 'Dev Admin'], [$rows[1][0], $rows[1][3], $rows[1][10], $rows[1][13], $rows[1][14]]);
        $this->assertSame([$old->reference, 'Old Buyer', "Line one\nLine \"two\", with a comma"], [$rows[2][0], $rows[2][3], $rows[2][11]]);
        $this->assertSame($old->created_at?->format('Y-m-d H:i'), $rows[2][1]);
    }

    public function test_the_export_is_logged_with_its_filters(): void
    {
        $this->lead(['status' => LeadStatus::Won]);
        $this->lead();

        $this->actingAs($this->admin)->get(route('admin.leads.export', ['status' => 'won', 'search' => 'a', 'page' => 3]))->streamedContent();

        $log = ActivityLog::query()->sole();
        $this->assertSame('lead.exported', $log->event);
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertNull($log->subject_type);
        $this->assertSame(['count' => $log->properties['count'] ?? null, 'filters' => ['search' => 'a', 'status' => 'won']], $log->properties);
        $this->assertStringStartsWith('Exported ', $log->description);
        $this->assertStringContainsString('to CSV (search “a”, status: won)', $log->description);
    }

    public function test_the_export_has_the_language_and_follows_the_language_filter(): void
    {
        $english = $this->lead(['name' => 'Elena Marchetti'], daysAgo: 1);
        $arabic = $this->lead(['name' => 'Khalid Mansour', 'locale' => 'ar']);

        $rows = $this->csv($this->actingAs($this->admin)->get(route('admin.leads.export'))->streamedContent());
        $this->assertSame('Language', $rows[0][13]);
        $this->assertSame([[$arabic->reference, 'Arabic'], [$english->reference, 'English']], [[$rows[1][0], $rows[1][13]], [$rows[2][0], $rows[2][13]]]);

        $rows = $this->csv($this->get(route('admin.leads.export', ['locale' => 'ar']))->streamedContent());
        $this->assertCount(2, $rows);
        $this->assertSame('Khalid Mansour', $rows[1][3]);

        $log = ActivityLog::query()->where('event', 'lead.exported')->latest('id')->firstOrFail();
        $this->assertSame(['count' => 1, 'filters' => ['locale' => 'ar']], $log->properties);
        $this->assertSame('Exported 1 lead to CSV (language: Arabic)', $log->description);
    }

    public function test_the_export_of_the_deleted_tab_has_only_deleted_leads(): void
    {
        $this->lead(['name' => 'Kept']);
        $gone = $this->lead(['name' => 'Gone']);
        $gone->delete();

        $rows = $this->csv($this->actingAs($this->admin)->get(route('admin.leads.export', ['status' => 'deleted']))->streamedContent());

        $this->assertCount(2, $rows);
        $this->assertSame('Gone', $rows[1][3]);
        $this->assertNotSame('', $rows[1][18]);
    }

    public function test_the_export_keeps_spreadsheet_formulas_from_running(): void
    {
        $this->lead(['name' => '=HYPERLINK("https://evil.example","Click")', 'company' => '@SUM(1+1)', 'phone' => '+44 20 7946 0142', 'message' => '-2+3 is plain text']);

        $row = $this->csv($this->actingAs($this->admin)->get(route('admin.leads.export'))->streamedContent())[1];

        $this->assertSame('\'=HYPERLINK("https://evil.example","Click")', $row[3]);
        $this->assertSame("'@SUM(1+1)", $row[4]);
        $this->assertSame("'+44 20 7946 0142", $row[6]);
        $this->assertSame("'-2+3 is plain text", $row[11]);
    }

    // The order email ---------------------------------------------------------

    public function test_the_order_email_shows_what_the_visitor_typed_literally(): void
    {
        $lead = $this->lead([
            'name' => '[Amira](https://evil.example/name)',
            'company' => '*Maison* <i>Rimal</i>',
            'message' => "Hello *there* and _you_, see [our site](https://evil.example/x) or www.evil.example.\n# Not a heading\n1. Not a list\n> Not a quote\n<script>alert(1)</script> ![pixel](https://evil.example/p.png) `code` \\*kept\\*",
        ]);

        $mail = (new NewOrderRequest($lead))->toMail(new AnonymousNotifiable);
        $html = (string) $mail->render();

        // What the visitor typed sits between the greeting and the button.
        $body = Str::between($html, '</h1>', '<table class="action"');
        $this->assertStringContainsString('Message:', $body);

        // None of it became markup or a link...
        foreach (['<em', '<strong', '<code', '<ol', '<li', '<h', '<blockquote', '<img', '<script', '<i>', '<a ', 'evil.example'] as $markup) {
            $this->assertStringNotContainsString($markup, $body, "The email body contains [{$markup}].");
        }

        $this->assertStringContainsString('href="'.route('admin.leads.show', $lead).'"', $html);

        // ...and it still reads exactly as typed, one paragraph per line.
        $text = str_replace("\u{200B}", '', html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5));

        foreach ([
            'Hello *there* and _you_, see [our site](https://evil.example/x) or www.evil.example.',
            '# Not a heading',
            '1. Not a list',
            '> Not a quote',
            '<script>alert(1)</script> ![pixel](https://evil.example/p.png) `code` \\*kept\\*',
            '[Amira](https://evil.example/name) from *Maison* <i>Rimal</i>',
        ] as $line) {
            $this->assertStringContainsString($line, $text);
        }
    }

    /**
     * A lead created without activity entries (so each test sees only its own).
     *
     * @param  array<string, mixed>  $attributes
     */
    private function lead(array $attributes = [], int $daysAgo = 0): Lead
    {
        $this->travelTo(now()->subDays($daysAgo)->setTime(10, 0));

        $lead = Activity::withoutModelLogging(fn (): Lead => Lead::factory()->create(['status' => LeadStatus::New, ...$attributes]));

        $this->travelBack();

        return $lead;
    }

    /**
     * Every leads route as [method, url].
     *
     * @return list<array{0: string, 1: string}>
     */
    private function routes(Lead $lead): array
    {
        return [
            ['GET', route('admin.leads.index')],
            ['GET', route('admin.leads.export')],
            ['GET', route('admin.leads.show', $lead)],
            ['PUT', route('admin.leads.update', $lead)],
            ['DELETE', route('admin.leads.destroy', $lead)],
            ['POST', route('admin.leads.restore', $lead)],
        ];
    }

    /**
     * The list with these query values shows exactly these leads, in order.
     *
     * @param  array<string, string>  $query
     * @param  list<Lead>  $expected
     */
    private function assertListed(array $query, array $expected): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.leads.index', $query))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('leads.data', fn ($rows): bool => collect($rows)->pluck('id')->all() === array_map(fn (Lead $lead): int => $lead->id, $expected))
                ->etc(),
            );
    }

    /**
     * Parse CSV text (without its byte order mark) into rows.
     *
     * @return list<list<string|null>>
     */
    private function csv(string $content): array
    {
        $handle = fopen('php://memory', 'r+');
        $this->assertNotFalse($handle);
        fwrite($handle, substr($content, 3));
        rewind($handle);

        $rows = [];

        while (($row = fgetcsv($handle, escape: '')) !== false) {
            $rows[] = $row;
        }

        fclose($handle);

        return $rows;
    }
}
