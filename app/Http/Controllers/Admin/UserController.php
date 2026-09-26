<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\GrantAdminRequest;
use App\Http\Requests\Admin\Users\RevokeAdminRequest;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\Activity;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * /admin/users: every account, with admin access granted or revoked here
 * (logged as user.admin_granted / user.admin_revoked). Accounts are never
 * deleted from the panel.
 *
 * @phpstan-type Filters array{search: string|null, role: string|null, status: string|null}
 */
class UserController extends Controller
{
    /**
     * Accounts per page.
     */
    public const PER_PAGE = 25;

    /**
     * Sortable columns: the `sort` query value => the column to order by.
     *
     * @var array<string, string>
     */
    private const SORTS = [
        'name' => 'name',
        'email' => 'email',
        'last_login' => 'last_login_at',
        'created_at' => 'created_at',
    ];

    /**
     * The account list.
     */
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);
        $sort = $this->sort($request);

        $query = $this->filtered(User::query(), $filters)
            ->select(['id', 'name', 'email', 'email_verified_at', 'is_admin', 'two_factor_confirmed_at', 'created_at'])
            ->addSelect([
                'last_login_at' => $this->lastLogin('created_at'),
                'last_login_ip' => $this->lastLogin('ip_address'),
            ]);

        if ($sort === null) {
            // Admins first, then by name.
            $query->orderByDesc('is_admin')->orderBy('name');
        } else {
            $query->orderBy(self::SORTS[$sort['column']], $sort['direction']);
        }

        $currentId = $request->user()?->getKey();
        $currentId = is_numeric($currentId) ? (int) $currentId : null;

        $users = $query->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (User $user): array => $this->present($user, $currentId));

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => $filters,
            'sort' => $sort,
            'adminCount' => User::query()->where('is_admin', true)->count(),
            'totalCount' => User::query()->count(),
        ]);
    }

    /**
     * Give an account access to the admin panel.
     */
    public function grantAdmin(GrantAdminRequest $request, User $user): RedirectResponse
    {
        // One user.admin_granted entry, not a generic user.updated as well.
        Activity::withoutModelLogging(fn () => $user->forceFill(['is_admin' => true])->save());

        Activity::record(
            'user.admin_granted',
            $user,
            $this->byline($request)." made {$user->name} an admin",
            ['via' => 'admin', 'changes' => ['is_admin' => [false, true]]],
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $user->email_verified_at === null
                ? "{$user->name} is now an admin, and can open the panel once their email address is verified."
                : "{$user->name} is now an admin.",
        ]);

        return back(fallback: route('admin.users.index'));
    }

    /**
     * Take an account's admin access away.
     */
    public function revokeAdmin(RevokeAdminRequest $request, User $user): RedirectResponse
    {
        DB::transaction(function () use ($user): void {
            // Checked again under a lock, so two admins demoting each other at
            // the same moment cannot leave the panel without one.
            $others = User::query()
                ->where('is_admin', true)
                ->whereKeyNot($user->getKey())
                ->lockForUpdate()
                ->count();

            if ($others === 0) {
                throw ValidationException::withMessages(['admin' => RevokeAdminRequest::lastAdminMessage($user)]);
            }

            Activity::withoutModelLogging(fn () => $user->forceFill(['is_admin' => false])->save());
        });

        Activity::record(
            'user.admin_revoked',
            $user,
            $this->byline($request)." removed {$user->name}’s admin access",
            ['via' => 'admin', 'changes' => ['is_admin' => [true, false]]],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} is no longer an admin."]);

        return back(fallback: route('admin.users.index'));
    }

    /**
     * The acting admin's name, for log descriptions.
     */
    private function byline(Request $request): string
    {
        $name = $request->user()?->getAttribute('name');

        return is_string($name) && $name !== '' ? $name : 'An admin';
    }

    /**
     * The latest sign-in's column for each user (a correlated subquery).
     *
     * @return Builder<ActivityLog>
     */
    private function lastLogin(string $column): Builder
    {
        return ActivityLog::query()
            ->select($column)
            ->whereColumn('activity_logs.user_id', 'users.id')
            ->where('event', 'auth.login')
            ->latest('created_at')
            ->orderByDesc('id')
            ->limit(1);
    }

    /**
     * The filters from the query string (unknown values are dropped).
     *
     * @return Filters
     */
    private function filters(Request $request): array
    {
        $search = $request->query('search');
        $role = $request->query('role');
        $status = $request->query('status');

        return [
            'search' => is_string($search) && trim($search) !== '' ? Str::limit(trim($search), 100, '') : null,
            'role' => in_array($role, ['admin', 'member'], true) ? $role : null,
            'status' => in_array($status, ['verified', 'unverified'], true) ? $status : null,
        ];
    }

    /**
     * The requested sort, or null for the default (admins first, by name).
     *
     * @return array{column: string, direction: 'asc'|'desc'}|null
     */
    private function sort(Request $request): ?array
    {
        $column = $request->query('sort');

        if (! is_string($column) || ! array_key_exists($column, self::SORTS)) {
            return null;
        }

        return [
            'column' => $column,
            'direction' => $request->query('direction') === 'desc' ? 'desc' : 'asc',
        ];
    }

    /**
     * @param  Builder<User>  $query
     * @param  Filters  $filters
     * @return Builder<User>
     */
    private function filtered(Builder $query, array $filters): Builder
    {
        if ($filters['search'] !== null) {
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['search']).'%';

            $query->where(function (Builder $query) use ($term): void {
                $query->whereRaw("name like ? escape '!'", [$term])
                    ->orWhereRaw("email like ? escape '!'", [$term]);
            });
        }

        match ($filters['role']) {
            'admin' => $query->where('is_admin', true),
            'member' => $query->where('is_admin', false),
            default => null,
        };

        match ($filters['status']) {
            'verified' => $query->whereNotNull('email_verified_at'),
            'unverified' => $query->whereNull('email_verified_at'),
            default => null,
        };

        return $query;
    }

    /**
     * An account as the list shows it.
     *
     * @return array{id: int, name: string, email: string, isAdmin: bool, verified: bool, twoFactor: bool, lastLoginAt: string|null, lastLoginIp: string|null, createdAt: string, createdOn: string, isYou: bool}
     */
    private function present(User $user, ?int $currentId): array
    {
        $lastLogin = $user->getAttribute('last_login_at');
        $lastLoginIp = $user->getAttribute('last_login_ip');
        $createdAt = CarbonImmutable::instance($user->created_at ?? now());

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'isAdmin' => $user->isAdmin(),
            'verified' => $user->email_verified_at !== null,
            'twoFactor' => $user->two_factor_confirmed_at !== null,
            'lastLoginAt' => $lastLogin === null ? null : CarbonImmutable::parse($lastLogin)->toIso8601String(),
            'lastLoginIp' => is_string($lastLoginIp) ? $lastLoginIp : null,
            'createdAt' => $createdAt->toIso8601String(),
            'createdOn' => $createdAt->toDateString(),
            'isYou' => $user->id === $currentId,
        ];
    }
}
