<?php

namespace App\Http\Controllers\Admin;

use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Look;
use App\Models\Page;
use App\Models\Story;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

/**
 * GET /admin: the admin panel's overview (ADMIN.md section 9).
 */
class DashboardController extends Controller
{
    /**
     * How many days the leads chart covers (oldest first, zero-filled).
     */
    private const CHART_DAYS = 30;

    /**
     * Show the admin dashboard.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => $this->stats(),
            'leadsByDay' => $this->leadsByDay(),
            'recentLeads' => $this->recentLeads(),
            'recentActivity' => $this->recentActivity(),
        ]);
    }

    /**
     * Headline numbers. Leads exclude deleted ones; "this week" is the last
     * seven days, today included.
     *
     * @return array{newLeads: int, leadsThisWeek: int, totalLeads: int, wonLeads: int, publishedStories: int, publishedLooks: int, publishedPages: int}
     */
    private function stats(): array
    {
        return [
            'newLeads' => Lead::query()->where('status', LeadStatus::New)->count(),
            'leadsThisWeek' => Lead::query()->where('created_at', '>=', Date::today()->subDays(6))->count(),
            'totalLeads' => Lead::query()->count(),
            'wonLeads' => Lead::query()->where('status', LeadStatus::Won)->count(),
            'publishedStories' => Story::query()->published()->count(),
            'publishedLooks' => Look::query()->published()->count(),
            'publishedPages' => Page::query()->published()->count(),
        ];
    }

    /**
     * Leads per day for the chart.
     *
     * @return list<array{date: string, count: int}>
     */
    private function leadsByDay(): array
    {
        $from = Date::today()->subDays(self::CHART_DAYS - 1);

        $counts = Lead::query()
            ->where('created_at', '>=', $from)
            ->toBase()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day')
            ->all();

        $days = [];

        for ($i = 0; $i < self::CHART_DAYS; $i++) {
            $date = $from->copy()->addDays($i)->toDateString();

            $days[] = ['date' => $date, 'count' => (int) ($counts[$date] ?? 0)];
        }

        return $days;
    }

    /**
     * The six latest leads.
     *
     * @return list<array{id: int, reference: string, name: string, company: string, country: string, devices: int, plan: string, status: string, createdAt: string}>
     */
    private function recentLeads(): array
    {
        $leads = Lead::query()
            ->latest()
            ->orderByDesc('id')
            ->limit(6)
            ->get(['id', 'reference', 'name', 'company', 'country', 'devices', 'plan', 'status', 'created_at'])
            ->map(fn (Lead $lead): array => [
                'id' => $lead->id,
                'reference' => $lead->reference,
                'name' => $lead->name,
                'company' => $lead->company,
                'country' => $lead->country,
                'devices' => $lead->devices,
                'plan' => $lead->plan->value,
                'status' => $lead->status->value,
                'createdAt' => ($lead->created_at ?? Date::now())->toIso8601String(),
            ]);

        return array_values($leads->all());
    }

    /**
     * The eight latest activity log entries.
     *
     * @return list<array{id: int, event: string, description: string, user: string|null, createdAt: string}>
     */
    private function recentActivity(): array
    {
        $entries = ActivityLog::query()
            ->with('user:id,name')
            ->latest('created_at')
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn (ActivityLog $entry): array => [
                'id' => $entry->id,
                'event' => $entry->event,
                'description' => $entry->description,
                'user' => $entry->user?->name,
                'createdAt' => ($entry->created_at ?? Date::now())->toIso8601String(),
            ]);

        return array_values($entries->all());
    }
}
