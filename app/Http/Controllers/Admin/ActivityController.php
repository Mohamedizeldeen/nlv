<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\Lead;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Story;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\UrlGenerationException;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * GET /admin/activity: the read-only activity log ("log everything",
 * ADMIN.md section 3). Entries are filtered, paginated and expandable;
 * nothing here edits or deletes them.
 *
 * @phpstan-type Filters array{group: string|null, user: string|null, from: string|null, to: string|null, search: string|null}
 * @phpstan-type Subject array{type: string, id: int|null, label: string|null, href: string|null, exists: bool}
 * @phpstan-type Entry array{id: int, event: string, group: string, description: string, user: array{id: int, name: string, email: string}|null, actor: string, actorKind: 'user'|'deleted'|'visitor'|'system', causerName: string|null, subject: Subject|null, changes: array<string, mixed>|null, properties: array<string, mixed>|null, ip: string|null, userAgent: string|null, createdAt: string, day: string, time: string}
 */
class ActivityController extends Controller
{
    /**
     * Entries per page.
     */
    public const PER_PAGE = 25;

    /**
     * How many days the per-day chart covers.
     */
    private const CHART_DAYS = 30;

    /**
     * The filter's event groups: key => label and the event prefixes it covers
     * (the part of the event name before the dot).
     *
     * @var array<string, array{label: string, prefixes: list<string>}>
     */
    public const GROUPS = [
        'auth' => ['label' => 'Sign-ins and security', 'prefixes' => ['auth']],
        'lead' => ['label' => 'Leads and order requests', 'prefixes' => ['lead']],
        'content' => ['label' => 'Stories, looks, plans, pages', 'prefixes' => ['story', 'look', 'look_category', 'plan', 'pricing', 'faq', 'page']],
        'settings' => ['label' => 'Site content and contacts', 'prefixes' => ['setting', 'settings']],
        'users' => ['label' => 'Users and admin access', 'prefixes' => ['user']],
    ];

    /**
     * The `user` filter value for entries without a signed-in user
     * (visitors' order requests, failed sign-ins, the console).
     */
    public const NO_USER = 'none';

    /**
     * The `user` filter value for entries by accounts deleted since (their
     * user_id is gone, their name is kept in causer_name).
     */
    public const DELETED_USERS = 'deleted';

    /**
     * Where each kind of record is edited in the admin: model => route names
     * to try, in order (a module whose routes are missing just gets no link).
     *
     * @var array<class-string<Model>, list<string>>
     */
    private const SUBJECT_ROUTES = [
        Lead::class => ['admin.leads.show', 'admin.leads.edit'],
        Story::class => ['admin.stories.edit'],
        Look::class => ['admin.looks.edit'],
        LookCategory::class => ['admin.look-categories.edit'],
        Plan::class => ['admin.plans.edit'],
        Faq::class => ['admin.faqs.edit'],
        Page::class => ['admin.pages.edit'],
    ];

    /**
     * The log, newest first.
     */
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $entries = $this->filtered(ActivityLog::query(), $filters)
            ->with(['user:id,name,email', 'subject'])
            ->latest('created_at')
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (ActivityLog $entry): array => $this->present($entry));

        return Inertia::render('admin/activity/index', [
            'entries' => $entries,
            'filters' => $filters,
            'groups' => $this->groupOptions(),
            'users' => $this->userOptions(),
            'perDay' => $this->perDay($filters),
            'timezone' => (string) config('app.timezone'),
        ]);
    }

    /**
     * One entry in full, with the other entries about the same record.
     */
    public function show(ActivityLog $activity): Response
    {
        $activity->load(['user:id,name,email', 'subject']);

        $related = $activity->subject_type === null || $activity->subject_id === null
            ? []
            : ActivityLog::query()
                ->with('user:id,name,email')
                ->where('subject_type', $activity->subject_type)
                ->where('subject_id', $activity->subject_id)
                ->whereKeyNot($activity->getKey())
                ->latest('created_at')
                ->orderByDesc('id')
                ->limit(20)
                ->get()
                ->map(fn (ActivityLog $entry): array => [
                    'id' => $entry->id,
                    'event' => $entry->event,
                    'description' => $entry->description,
                    'actor' => $this->actor($entry),
                    'createdAt' => $this->timestamp($entry)->toIso8601String(),
                ])
                ->all();

        return Inertia::render('admin/activity/show', [
            'entry' => $this->present($activity),
            'related' => array_values($related),
            'newerId' => ActivityLog::query()->where('id', '>', $activity->id)->min('id'),
            'olderId' => ActivityLog::query()->where('id', '<', $activity->id)->max('id'),
            'timezone' => (string) config('app.timezone'),
        ]);
    }

    /**
     * The filters from the query string. Unknown or malformed values are
     * dropped rather than rejected, so a stale link still opens the log.
     *
     * @return Filters
     */
    private function filters(Request $request): array
    {
        $group = $request->query('group');
        $user = $request->query('user');
        $search = $request->query('search');

        return [
            'group' => is_string($group) && array_key_exists($group, self::GROUPS) ? $group : null,
            'user' => is_string($user) && (in_array($user, [self::NO_USER, self::DELETED_USERS], true) || ctype_digit($user)) ? $user : null,
            'from' => $this->day($request->query('from')),
            'to' => $this->day($request->query('to')),
            'search' => is_string($search) && trim($search) !== '' ? Str::limit(trim($search), 100, '') : null,
        ];
    }

    /**
     * A valid YYYY-MM-DD date, or null.
     */
    private function day(mixed $value): ?string
    {
        if (! is_string($value) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts) !== 1) {
            return null;
        }

        return checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]) ? $value : null;
    }

    /**
     * Apply the filters to a query.
     *
     * @param  Builder<ActivityLog>  $query
     * @param  Filters  $filters
     * @param  bool  $withDates  false: ignore the date range (the chart has its own)
     * @return Builder<ActivityLog>
     */
    private function filtered(Builder $query, array $filters, bool $withDates = true): Builder
    {
        if ($filters['group'] !== null) {
            $prefixes = self::GROUPS[$filters['group']]['prefixes'];

            $query->where(function (Builder $query) use ($prefixes): void {
                foreach ($prefixes as $prefix) {
                    $query->orWhere('event', 'like', $prefix.'.%');
                }
            });
        }

        if ($filters['user'] === self::NO_USER) {
            $query->whereNull('user_id')->whereNull('causer_name');
        } elseif ($filters['user'] === self::DELETED_USERS) {
            $query->whereNull('user_id')->whereNotNull('causer_name');
        } elseif ($filters['user'] !== null) {
            $query->where('user_id', (int) $filters['user']);
        }

        if ($withDates && $filters['from'] !== null) {
            $query->where('created_at', '>=', CarbonImmutable::parse($filters['from'])->startOfDay());
        }

        if ($withDates && $filters['to'] !== null) {
            $query->where('created_at', '<', CarbonImmutable::parse($filters['to'])->addDay()->startOfDay());
        }

        if ($filters['search'] !== null) {
            $term = '%'.$this->escapeLike($filters['search']).'%';

            $query->where(function (Builder $query) use ($term): void {
                $query->whereRaw("description like ? escape '!'", [$term])
                    ->orWhereRaw("event like ? escape '!'", [$term]);
            });
        }

        return $query;
    }

    /**
     * Escape LIKE wildcards so a search for "50%" means the text "50%" ("!" is
     * the escape character: MySQL and SQLite disagree about backslashes).
     */
    private function escapeLike(string $value): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value);
    }

    /**
     * An entry as the page shows it.
     *
     * @return Entry
     */
    private function present(ActivityLog $entry): array
    {
        $properties = $entry->properties ?? [];
        $changes = $properties['changes'] ?? null;
        unset($properties['changes']);

        $createdAt = $this->timestamp($entry);

        return [
            'id' => $entry->id,
            'event' => $entry->event,
            'group' => $this->groupOf($entry->event),
            'description' => $entry->description,
            'user' => $entry->user === null ? null : [
                'id' => $entry->user->id,
                'name' => $entry->user->name,
                'email' => $entry->user->email,
            ],
            'actor' => $this->actor($entry),
            'actorKind' => $this->actorKind($entry),
            // The name when the entry was written (kept after the account is deleted).
            'causerName' => $entry->causer_name,
            'subject' => $this->subject($entry),
            'changes' => is_array($changes) && $changes !== [] ? $changes : null,
            'properties' => $properties === [] ? null : $properties,
            'ip' => $entry->ip_address,
            'userAgent' => $entry->user_agent,
            'createdAt' => $createdAt->toIso8601String(),
            // Day headings and times in the app's time zone, so the server
            // render and the browser agree.
            'day' => $createdAt->toDateString(),
            'time' => $createdAt->format('H:i'),
        ];
    }

    private function timestamp(ActivityLog $entry): CarbonImmutable
    {
        return CarbonImmutable::instance($entry->created_at ?? Date::now());
    }

    /**
     * Who did it: the user's name ("Jane Doe (deleted account)" once the
     * account is gone), "Visitor" for requests without a signed-in user,
     * "System" for the console and scheduled tasks.
     */
    private function actor(ActivityLog $entry): string
    {
        return $entry->causerLabel() ?? match ($this->actorKind($entry)) {
            'system' => 'System',
            default => 'Visitor',
        };
    }

    /**
     * What kind of actor did it: a user, a user whose account was deleted
     * since, a visitor, or the system (no request at all, or the placeholder
     * one artisan runs with: 127.0.0.1, "Symfony").
     *
     * @return 'user'|'deleted'|'visitor'|'system'
     */
    private function actorKind(ActivityLog $entry): string
    {
        if ($entry->user !== null) {
            return 'user';
        }

        if ($entry->causedByDeletedAccount()) {
            return 'deleted';
        }

        $console = $entry->ip_address === null
            || $entry->user_agent === 'Symfony'
            || ($entry->properties['via'] ?? null) === 'console';

        return $console ? 'system' : 'visitor';
    }

    /**
     * The filter group an event belongs to ("other" when none).
     */
    private function groupOf(string $event): string
    {
        $prefix = explode('.', $event, 2)[0];

        foreach (self::GROUPS as $key => $group) {
            if (in_array($prefix, $group['prefixes'], true)) {
                return $key;
            }
        }

        return 'other';
    }

    /**
     * The record an entry is about, with a link to it when it still exists.
     *
     * @return Subject|null
     */
    private function subject(ActivityLog $entry): ?array
    {
        if ($entry->subject_type === null) {
            return null;
        }

        $model = $entry->subject;
        $label = $model !== null && method_exists($model, 'activityLabel') ? $model->activityLabel() : null;

        return [
            'type' => str_replace('_', ' ', Str::snake(class_basename($entry->subject_type))),
            'id' => $entry->subject_id,
            'label' => is_string($label) ? $label : null,
            'href' => $model === null ? null : $this->subjectUrl($model),
            'exists' => $model !== null,
        ];
    }

    /**
     * The admin page of a record, if its module has one.
     */
    private function subjectUrl(Model $model): ?string
    {
        if ($model instanceof User) {
            return route('admin.users.index', ['search' => $model->email], absolute: false);
        }

        if ($model instanceof Setting) {
            return $this->firstRoute(['admin.content.index', 'admin.content.edit'], ['group' => strtok($model->key, '.')]);
        }

        foreach (self::SUBJECT_ROUTES as $class => $names) {
            if ($model instanceof $class) {
                return $this->firstRoute($names, [$model]);
            }
        }

        return null;
    }

    /**
     * The URL of the first of these routes that exists and accepts the parameters.
     *
     * @param  list<string>  $names
     * @param  array<int|string, mixed>  $parameters
     */
    private function firstRoute(array $names, array $parameters): ?string
    {
        foreach ($names as $name) {
            if (! Route::has($name)) {
                continue;
            }

            try {
                // Paths, not URLs: APP_URL may not be the host the panel is served on.
                return route($name, $parameters, absolute: false);
            } catch (UrlGenerationException) {
                continue;
            } catch (Throwable) {
                return null;
            }
        }

        return null;
    }

    /**
     * The group filter's options.
     *
     * @return list<array{value: string, label: string}>
     */
    private function groupOptions(): array
    {
        $options = [];

        foreach (self::GROUPS as $key => $group) {
            $options[] = ['value' => $key, 'label' => $group['label']];
        }

        return $options;
    }

    /**
     * The user filter's options: everyone who appears in the log, by name,
     * then deleted accounts (when the log has any), then the entries
     * without a user.
     *
     * @return list<array{value: string, label: string}>
     */
    private function userOptions(): array
    {
        $users = User::query()
            ->whereIn('id', ActivityLog::query()->select('user_id')->whereNotNull('user_id')->distinct())
            ->orderBy('name')
            ->limit(200)
            ->get(['id', 'name', 'email'])
            ->map(fn (User $user): array => ['value' => (string) $user->id, 'label' => $user->name])
            ->all();

        $deleted = ActivityLog::query()->whereNull('user_id')->whereNotNull('causer_name')->exists()
            ? [['value' => self::DELETED_USERS, 'label' => 'Deleted accounts']]
            : [];

        return [...array_values($users), ...$deleted, ['value' => self::NO_USER, 'label' => 'Visitors and system']];
    }

    /**
     * Entries per day for the last 30 days (oldest first, zero-filled), with
     * every filter but the date range applied.
     *
     * @param  Filters  $filters
     * @return list<array{date: string, count: int}>
     */
    private function perDay(array $filters): array
    {
        $from = Date::today()->subDays(self::CHART_DAYS - 1);

        $counts = $this->filtered(ActivityLog::query(), $filters, withDates: false)
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
}
