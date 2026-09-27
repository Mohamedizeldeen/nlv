<?php

namespace App\Http\Controllers\Admin;

use App\Enums\LeadPlan;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Leads\LeadIndexRequest;
use App\Http\Requests\Admin\Leads\UpdateLeadRequest;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\User;
use App\Support\Activity;
use App\Support\Locales;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * /admin/leads: the "Order a device" requests from the landing page.
 *
 * Status, assignee and notes changes are logged as their own events
 * (lead.status_changed, lead.note_added, lead.assigned / lead.unassigned,
 * lead.notes_updated) so the lead's timeline reads like a case file; the
 * model trait logs deletes and restores.
 *
 * @phpstan-import-type LeadFilters from LeadIndexRequest
 * @phpstan-import-type LeadSort from LeadIndexRequest
 */
class LeadController extends Controller
{
    /**
     * Leads per page.
     */
    private const PER_PAGE = 25;

    /**
     * Most timeline entries shown on a lead's page.
     */
    private const TIMELINE_LIMIT = 100;

    /**
     * The CSV export's columns.
     */
    private const CSV_HEADER = [
        'Reference', 'Received (UTC)', 'Status', 'Name', 'Company', 'Email', 'Phone', 'Country', 'City',
        'Devices', 'Plan', 'Message', 'Source', 'Language', 'Assigned to', 'First contacted (UTC)', 'Admin notes',
        'Consent given (UTC)', 'Deleted (UTC)',
    ];

    /**
     * The language of the page a lead was sent from, by locale (a lead from
     * the Arabic page is answered in Arabic).
     */
    private const LANGUAGES = [
        Locales::ENGLISH => 'English',
        Locales::ARABIC => 'Arabic',
    ];

    /**
     * The list: search, filters, status tabs with counts, sort and pages.
     */
    public function index(LeadIndexRequest $request): Response
    {
        $filters = $request->filters();
        $sort = $request->sort();

        $leads = $this->query($filters, $sort)
            ->with('assignee:id,name')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Lead $lead): array => $this->row($lead));

        return Inertia::render('admin/leads/index', [
            'leads' => $leads,
            'filters' => $filters,
            'sort' => $sort,
            'counts' => $this->counts($filters),
            'options' => [
                'plans' => LeadPlan::options(),
                'countries' => $this->countries(),
            ],
        ]);
    }

    /**
     * One lead as a dossier, with its forms and timeline. Deleted leads can
     * be viewed (and restored) too.
     */
    public function show(Lead $lead): Response
    {
        $lead->load('assignee:id,name,is_admin');

        return Inertia::render('admin/leads/show', [
            'lead' => $this->detail($lead),
            'statuses' => LeadStatus::options(),
            'admins' => $this->assignees($lead),
            'timeline' => $this->timeline($lead),
            'limits' => ['note' => UpdateLeadRequest::NOTE_MAX, 'notes' => UpdateLeadRequest::NOTES_MAX],
        ]);
    }

    /**
     * Save one of the lead page's forms: status (+ note), assignee or notes.
     */
    public function update(UpdateLeadRequest $request, Lead $lead): RedirectResponse
    {
        /** @var array{status?: string, note?: string|null, assigned_to?: int|string|null, admin_notes?: string|null} $data */
        $data = $request->validated();

        $done = DB::transaction(function () use ($data, $lead): array {
            $done = [];

            if (array_key_exists('status', $data)) {
                $done[] = $this->changeStatus($lead, LeadStatus::from($data['status']), $this->clean($data['note'] ?? null));
            }

            if (array_key_exists('assigned_to', $data)) {
                $done[] = $this->assign($lead, $data['assigned_to'] === null ? null : (int) $data['assigned_to']);
            }

            if (array_key_exists('admin_notes', $data)) {
                $done[] = $this->saveNotes($lead, $this->clean($data['admin_notes']));
            }

            return array_values(array_filter($done));
        });

        Inertia::flash('toast', $done === []
            ? ['type' => 'info', 'message' => 'Nothing to save: no changes.']
            : ['type' => 'success', 'message' => implode(' ', $done)]);

        return back();
    }

    /**
     * Soft delete (listed under "Deleted", restorable). Logged as lead.deleted.
     */
    public function destroy(Lead $lead): RedirectResponse
    {
        $lead->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$lead->reference} deleted. You can restore it from Deleted.",
        ]);

        // From the list, stay on it (same filters and page); from the lead's own page, go to the list.
        $index = route('admin.leads.index');
        $previous = url()->previous();

        return Str::before($previous, '?') === $index
            ? redirect()->to($previous)
            : redirect()->to($index);
    }

    /**
     * Bring a deleted lead back. Logged as lead.restored.
     */
    public function restore(Lead $lead): RedirectResponse
    {
        if (! $lead->trashed()) {
            Inertia::flash('toast', ['type' => 'info', 'message' => "{$lead->reference} is not deleted."]);

            return back();
        }

        $lead->restore();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$lead->reference} restored."]);

        return back();
    }

    /**
     * The leads of the current filter and sort as a CSV file, streamed.
     * Logged as lead.exported with the count and the filters.
     */
    public function export(LeadIndexRequest $request): StreamedResponse
    {
        $filters = $request->filters();
        $query = $this->query($filters, $request->sort())->with('assignee:id,name');
        $count = (clone $query)->count();
        $applied = array_filter($filters, fn (?string $value): bool => $value !== null);

        Activity::record(
            'lead.exported',
            null,
            'Exported '.$count.' '.Str::plural('lead', $count).' to CSV'.($applied === [] ? '' : ' ('.$this->describeFilters($applied).')'),
            ['count' => $count, 'filters' => $applied],
        );

        $name = 'nlv-leads-'.($filters['status'] ?? 'all').'-'.Date::now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($query): void {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            // A byte order mark so spreadsheet apps read the file as UTF-8.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, self::CSV_HEADER, escape: '');

            foreach ($query->lazy(500) as $lead) {
                fputcsv($out, array_map($this->csvCell(...), $this->csvRow($lead)), escape: '');
            }

            fclose($out);
        }, $name, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, private',
        ]);
    }

    /**
     * The filtered, sorted query shared by the list and the export.
     *
     * @param  LeadFilters  $filters
     * @param  LeadSort|null  $sort
     * @return Builder<Lead>
     */
    private function query(array $filters, ?array $sort): Builder
    {
        $query = Lead::query();

        if ($filters['status'] === LeadIndexRequest::DELETED) {
            $query->onlyTrashed();
        } elseif ($filters['status'] !== null) {
            $query->where('status', $filters['status']);
        }

        if ($filters['search'] !== null) {
            // "!" escapes LIKE's wildcards, so "50%" or "a_b" mean exactly that
            // (MySQL and SQLite disagree about backslashes).
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['search']).'%';

            $query->where(function (Builder $query) use ($term): void {
                foreach (['name', 'company', 'email', 'reference'] as $column) {
                    $query->orWhereRaw("{$column} like ? escape '!'", [$term]);
                }
            });
        }

        if ($filters['plan'] !== null) {
            $query->where('plan', $filters['plan']);
        }

        if ($filters['country'] !== null) {
            $query->where('country', $filters['country']);
        }

        if ($filters['locale'] !== null) {
            $query->where('locale', $filters['locale']);
        }

        if ($filters['from'] !== null) {
            $query->where('created_at', '>=', Date::parse($filters['from'])->startOfDay());
        }

        if ($filters['to'] !== null) {
            $query->where('created_at', '<', Date::parse($filters['to'])->addDay()->startOfDay());
        }

        if ($sort !== null) {
            $query->orderBy($sort['column'], $sort['direction'])->orderBy('id', $sort['direction']);
        }

        return $query;
    }

    /**
     * Leads per status tab under the other filters (search, plan, country,
     * dates), plus "all" (not deleted) and "deleted".
     *
     * @param  LeadFilters  $filters
     * @return array<string, int>
     */
    private function counts(array $filters): array
    {
        $base = $this->query([...$filters, 'status' => null], null);

        /** @var array<string, int|string> $byStatus */
        $byStatus = (clone $base)
            ->toBase()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->all();

        $counts = ['all' => 0];

        foreach (LeadStatus::values() as $status) {
            $counts[$status] = (int) ($byStatus[$status] ?? 0);
            $counts['all'] += $counts[$status];
        }

        $counts[LeadIndexRequest::DELETED] = (clone $base)->onlyTrashed()->count();

        return $counts;
    }

    /**
     * Every country a lead came from (as typed by the visitor), A to Z.
     *
     * @return list<string>
     */
    private function countries(): array
    {
        /** @var list<string> */
        return Lead::withTrashed()
            ->toBase()
            ->distinct()
            ->orderBy('country')
            ->limit(300)
            ->pluck('country')
            ->filter(fn (mixed $country): bool => is_string($country) && $country !== '')
            ->values()
            ->all();
    }

    /**
     * A lead as a list row.
     *
     * @return array<string, mixed>
     */
    private function row(Lead $lead): array
    {
        return [
            'id' => $lead->id,
            'reference' => $lead->reference,
            'name' => $lead->name,
            'company' => $lead->company,
            'email' => $lead->email,
            'country' => $lead->country,
            'city' => $lead->city,
            'devices' => $lead->devices,
            'plan' => $lead->plan->value,
            'status' => $lead->status->value,
            'locale' => $lead->locale,
            'assignee' => $lead->assignee?->name,
            'createdAt' => $this->iso($lead->created_at),
            'deletedAt' => $lead->deleted_at?->toIso8601String(),
        ];
    }

    /**
     * Every field of a lead, for its page.
     *
     * @return array<string, mixed>
     */
    private function detail(Lead $lead): array
    {
        return [
            'id' => $lead->id,
            'reference' => $lead->reference,
            'name' => $lead->name,
            'company' => $lead->company,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'whatsapp' => $this->whatsappNumber($lead->phone),
            'country' => $lead->country,
            'city' => $lead->city,
            'devices' => $lead->devices,
            'plan' => $lead->plan->value,
            'planLabel' => $lead->plan->label(),
            'message' => $lead->message,
            'status' => $lead->status->value,
            'source' => $lead->source?->value,
            'sourceLabel' => $lead->source?->label(),
            'locale' => $lead->locale,
            'ipAddress' => $lead->ip_address,
            'userAgent' => $lead->user_agent,
            'adminNotes' => $lead->admin_notes,
            'assignedTo' => $lead->assigned_to,
            'assignee' => $lead->assignee?->name,
            'consentAt' => $lead->consent_at?->toIso8601String(),
            'contactedAt' => $lead->contacted_at?->toIso8601String(),
            'createdAt' => $this->iso($lead->created_at),
            'updatedAt' => $this->iso($lead->updated_at),
            'deletedAt' => $lead->deleted_at?->toIso8601String(),
        ];
    }

    /**
     * The people a lead can be assigned to: every admin, plus the current
     * assignee if they have since lost admin access.
     *
     * @return list<array{value: string, label: string}>
     */
    private function assignees(Lead $lead): array
    {
        $admins = User::query()
            ->where('is_admin', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user): array => ['value' => (string) $user->id, 'label' => $user->name]);

        $current = $lead->assignee;

        if ($current !== null && ! $current->isAdmin()) {
            $admins->push(['value' => (string) $current->id, 'label' => "{$current->name} (no longer an admin)"]);
        }

        return array_values($admins->all());
    }

    /**
     * The lead's activity log entries, newest first.
     *
     * @return list<array{id: int, event: string, description: string, user: string|null, createdAt: string, note: string|null, changes: array<string, mixed>|null}>
     */
    private function timeline(Lead $lead): array
    {
        $entries = ActivityLog::query()
            ->with('user:id,name')
            ->where('subject_type', $lead->getMorphClass())
            ->where('subject_id', $lead->getKey())
            ->latest('created_at')
            ->orderByDesc('id')
            ->limit(self::TIMELINE_LIMIT)
            ->get()
            ->map(function (ActivityLog $entry): array {
                $properties = $entry->properties ?? [];
                $note = $properties['note'] ?? null;
                $changes = $properties['changes'] ?? null;

                return [
                    'id' => $entry->id,
                    'event' => $entry->event,
                    'description' => $entry->description,
                    'user' => $entry->causerLabel(),
                    'createdAt' => $this->iso($entry->created_at),
                    'note' => is_string($note) ? $note : null,
                    'changes' => is_array($changes) && $changes !== [] ? $changes : null,
                ];
            });

        return array_values($entries->all());
    }

    /**
     * Change the status; the first move away from "new" stamps contacted_at.
     * With the status unchanged, a note is added to the timeline on its own.
     * Returns the toast line (null when nothing happened).
     */
    private function changeStatus(Lead $lead, LeadStatus $status, ?string $note): ?string
    {
        $previous = $lead->status;

        if ($status === $previous) {
            if ($note === null) {
                return null;
            }

            Activity::record('lead.note_added', $lead, "Note on {$lead->reference}", ['note' => $note]);

            return 'Note added to the timeline.';
        }

        $lead->status = $status;

        if ($status !== LeadStatus::New && $lead->contacted_at === null) {
            // fill(): the Date facade is typed as returning Illuminate\Support\Carbon; the app's dates are CarbonImmutable.
            $lead->fill(['contacted_at' => Date::now()]);
        }

        $changes = $this->saveUnlogged($lead);

        Activity::record(
            'lead.status_changed',
            $lead,
            "Status of {$lead->reference}: {$previous->label()} → {$status->label()}",
            $note === null ? ['changes' => $changes] : ['changes' => $changes, 'note' => $note],
        );

        return "Status set to {$status->label()}.";
    }

    /**
     * Assign the lead to an admin (null = nobody).
     */
    private function assign(Lead $lead, ?int $userId): ?string
    {
        if ($userId === $lead->assigned_to) {
            return null;
        }

        $previous = $lead->assignee?->name;
        $lead->assigned_to = $userId;
        $this->saveUnlogged($lead);
        $lead->load('assignee:id,name');
        $current = $lead->assignee?->name;

        $changes = ['assignee' => [$previous, $current]];

        if ($current === null) {
            Activity::record('lead.unassigned', $lead, "Unassigned {$lead->reference}".($previous ? " (was {$previous})" : ''), ['changes' => $changes]);

            return 'Nobody is assigned now.';
        }

        Activity::record('lead.assigned', $lead, "Assigned {$lead->reference} to {$current}", ['changes' => $changes]);

        return "Assigned to {$current}.";
    }

    /**
     * Save the admin notes.
     */
    private function saveNotes(Lead $lead, ?string $notes): ?string
    {
        if ($notes === $lead->admin_notes) {
            return null;
        }

        $lead->admin_notes = $notes;

        Activity::record(
            'lead.notes_updated',
            $lead,
            $notes === null ? "Cleared the notes on {$lead->reference}" : "Updated the notes on {$lead->reference}",
            ['changes' => $this->saveUnlogged($lead)],
        );

        return 'Notes saved.';
    }

    /**
     * Save without the model trait's generic lead.updated entry (the caller
     * logs a specific event) and return the changes as {field: [old, new]}.
     *
     * @return array<string, array{0: mixed, 1: mixed}>
     */
    private function saveUnlogged(Lead $lead): array
    {
        $changes = [];

        foreach (array_keys($lead->getDirty()) as $field) {
            $changes[$field] = [Activity::normalize($lead->getOriginal($field)), Activity::normalize($lead->getAttribute($field))];
        }

        Activity::withoutModelLogging(fn (): bool => $lead->save());

        return $changes;
    }

    /**
     * Trimmed text, null when empty.
     */
    private function clean(?string $value): ?string
    {
        $value = $value === null ? '' : trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * The digits wa.me needs, when the phone is in international form
     * ("+44 20 7946 0142" or "0044..."); null otherwise, since a local
     * number cannot be opened in WhatsApp without its country code.
     */
    private function whatsappNumber(string $phone): ?string
    {
        $phone = trim($phone);
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($phone, '00')) {
            $digits = substr($digits, 2);
        } elseif (! str_starts_with($phone, '+')) {
            return null;
        }

        return strlen($digits) >= 7 ? $digits : null;
    }

    /**
     * "status: new, search: “casa”, language: Arabic" for the export's log line.
     *
     * @param  array<string, string>  $filters
     */
    private function describeFilters(array $filters): string
    {
        return implode(', ', array_map(
            fn (string $key, string $value): string => match ($key) {
                'search' => "search “{$value}”",
                'locale' => 'language: '.$this->language($value),
                default => "{$key}: {$value}",
            },
            array_keys($filters),
            $filters,
        ));
    }

    /**
     * "English" or "Arabic" for a lead's locale.
     */
    private function language(string $locale): string
    {
        return self::LANGUAGES[$locale] ?? $locale;
    }

    /**
     * A lead as one CSV line (see CSV_HEADER).
     *
     * @return list<string|int|null>
     */
    private function csvRow(Lead $lead): array
    {
        $time = fn (?CarbonInterface $date): ?string => $date?->copy()->setTimezone('UTC')->format('Y-m-d H:i');

        return [
            $lead->reference,
            $time($lead->created_at),
            $lead->status->label(),
            $lead->name,
            $lead->company,
            $lead->email,
            $lead->phone,
            $lead->country,
            $lead->city,
            $lead->devices,
            $lead->plan->label(),
            $lead->message,
            $lead->source?->label(),
            $this->language($lead->locale),
            $lead->assignee?->name,
            $time($lead->contacted_at),
            $lead->admin_notes,
            $time($lead->consent_at),
            $time($lead->deleted_at),
        ];
    }

    /**
     * Keep spreadsheet apps from running a cell as a formula: text that
     * starts with = + - @ or a tab / carriage return gets a leading
     * apostrophe (OWASP "CSV injection").
     */
    private function csvCell(string|int|null $value): string|int|null
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }

    /**
     * ISO 8601 for a timestamp that is always set on saved rows.
     */
    private function iso(?CarbonInterface $date): string
    {
        return ($date ?? Date::now())->toIso8601String();
    }
}
