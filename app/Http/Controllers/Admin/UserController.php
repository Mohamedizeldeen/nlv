<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\DeleteUserRequest;
use App\Http\Requests\Admin\Users\GrantAdminRequest;
use App\Http\Requests\Admin\Users\RevokeAdminRequest;
use App\Http\Requests\Admin\Users\SendPasswordLinkRequest;
use App\Http\Requests\Admin\Users\SetUserPasswordRequest;
use App\Http\Requests\Admin\Users\StoreUserRequest;
use App\Http\Requests\Admin\Users\UpdateUserRequest;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\User;
use App\Notifications\SetPasswordLink;
use App\Support\Activity;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Auth\PasswordBroker;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * /admin/users: every account. Admins add accounts here (always as verified
 * admins: there are no other roles), edit a name or email address, give
 * someone a new password or email them a link to choose one, delete an
 * account, and remove or give back admin access.
 *
 * Logged as user.created, user.updated (a before/after of name and email),
 * user.password_set, user.password_link_sent, user.deleted,
 * user.admin_granted and user.admin_revoked. Passwords never reach the log.
 *
 * @phpstan-type Filters array{search: string|null, role: string|null, status: string|null}
 * @phpstan-type Row array{id: int, name: string, email: string, isAdmin: bool, verified: bool, twoFactor: bool, lastLoginAt: string|null, lastLoginIp: string|null, assignedLeads: int, createdAt: string, createdOn: string, isYou: bool}
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
     * The fields an admin edits here (and user.updated logs).
     *
     * @var list<string>
     */
    private const EDITABLE = ['name', 'email'];

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
                'assigned_leads' => Lead::query()
                    ->selectRaw('count(*)')
                    ->whereColumn('leads.assigned_to', 'users.id'),
            ]);

        if ($sort === null) {
            // Admins first, then by name.
            $query->orderByDesc('is_admin')->orderBy('name');
        } else {
            $query->orderBy(self::SORTS[$sort['column']], $sort['direction']);
        }

        $currentId = $this->currentId($request);

        $users = $query->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (User $user): array => $this->present($user, $currentId));

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => $filters,
            'sort' => $sort,
            'adminCount' => $this->adminCount(),
            'totalCount' => User::query()->count(),
        ]);
    }

    /**
     * The form for a new account.
     */
    public function create(): Response
    {
        return Inertia::render('admin/users/create', [
            'password' => $this->passwordPolicy(),
        ]);
    }

    /**
     * Add a verified admin account, with a password set now or chosen by the
     * person through an emailed link.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $by = $this->byline($request);
        $sendsLink = $request->sendsLink();

        $user = new User;
        $user->forceFill([
            'name' => (string) $request->validated('name'),
            'email' => (string) $request->validated('email'),
            // With a link, nobody knows this one: the person chooses their own.
            'password' => $request->password() ?? Str::random(64),
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);

        // One user.created entry (never with the password), not the model's own.
        Activity::withoutModelLogging(fn (): bool => $user->save());

        Activity::record(
            'user.created',
            $user,
            "{$by} added ".Activity::isolate($user->name)." ({$user->email}) as an admin",
            [
                'via' => 'admin',
                // How the password was chosen, never the password itself.
                'password_method' => $sendsLink ? 'emailed link' : 'set by admin',
                'changes' => [
                    'name' => [null, $user->name],
                    'email' => [null, $user->email],
                    'is_admin' => [null, true],
                ],
            ],
        );

        if (! $sendsLink) {
            Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} can sign in now with the password you set."]);

            return to_route('admin.users.index');
        }

        $status = $this->sendPasswordLinkTo($user, $by, newAccount: true);

        if ($status !== PasswordBroker::RESET_LINK_SENT) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => "{$user->name} was added, but the email with the link couldn’t be sent. Send it again from here."]);

            return to_route('admin.users.edit', $user);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} was added. A link to choose a password is on its way to {$user->email}."]);

        return to_route('admin.users.index');
    }

    /**
     * One account: name and email, its password, admin access and deletion.
     */
    public function edit(Request $request, User $user): Response
    {
        $lastLogin = ActivityLog::query()
            ->where('user_id', $user->id)
            ->where('event', 'auth.login')
            ->latest('created_at')
            ->orderByDesc('id')
            ->first(['created_at', 'ip_address']);

        $user->setAttribute('last_login_at', $lastLogin?->created_at);
        $user->setAttribute('last_login_ip', $lastLogin?->ip_address);
        $user->setAttribute('assigned_leads', Lead::query()->where('assigned_to', $user->id)->count());

        return Inertia::render('admin/users/edit', [
            'user' => [
                ...$this->present($user, $this->currentId($request)),
                'updatedAt' => $user->updated_at?->toIso8601String(),
            ],
            'adminCount' => $this->adminCount(),
            'password' => $this->passwordPolicy(),
        ]);
    }

    /**
     * Save a name and email address.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $before = $user->only(self::EDITABLE);
        $oldName = $user->name;
        $after = $request->accountAttributes();

        if ($after['email'] !== $user->email) {
            // A link sent to the old address stops working.
            Password::deleteToken($user);
        }

        $user->forceFill($after);

        if (! $user->isDirty()) {
            Inertia::flash('toast', ['type' => 'info', 'message' => 'No changes to save.']);

            return to_route('admin.users.edit', $user);
        }

        // One user.updated entry with a readable description, not the model's own.
        Activity::withoutModelLogging(fn (): bool => $user->save());

        $changes = Activity::changes($before, $user->only(self::EDITABLE));

        Activity::record(
            'user.updated',
            $user,
            $this->byline($request).' '.$this->describeEdit($oldName, $user),
            ['via' => 'admin', 'changes' => $changes],
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => isset($changes['email'])
                ? "Saved. {$user->name} now signs in with {$user->email}."
                : 'Saved.',
        ]);

        return to_route('admin.users.edit', $user);
    }

    /**
     * Give someone a new password now. Their other sessions end, and a link
     * sent earlier stops working.
     */
    public function setPassword(SetUserPasswordRequest $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'password' => $request->password(),
            'remember_token' => Str::random(60),
        ]);

        // Never the model's user.updated: it would list the password.
        Activity::withoutModelLogging(fn (): bool => $user->save());
        Password::deleteToken($user);
        $ended = $this->endSessions($user);

        Activity::record(
            'user.password_set',
            $user,
            $this->byline($request).' set a new password for '.Activity::isolate($user->name),
            ['via' => 'admin', 'sessions_ended' => $ended],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => "New password set. {$user->name} is signed out everywhere and signs in with it next time."]);

        return to_route('admin.users.edit', $user);
    }

    /**
     * Email someone a link to choose a new password (the app's reset page).
     */
    public function sendPasswordLink(SendPasswordLinkRequest $request, User $user): RedirectResponse
    {
        $status = $this->sendPasswordLinkTo($user, $this->byline($request), newAccount: false);

        if ($status !== PasswordBroker::RESET_LINK_SENT) {
            throw ValidationException::withMessages(['password_link' => $this->linkError($status)]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Link sent to {$user->email}. It works for ".SetPasswordLink::expiresInMinutes().' minutes.',
        ]);

        return to_route('admin.users.edit', $user);
    }

    /**
     * Delete an account for good. Leads assigned to it become unassigned (each
     * logged as lead.unassigned, so its timeline says why), and its activity
     * stays in the log under the name it had, marked "(deleted account)".
     */
    public function destroy(DeleteUserRequest $request, User $user): RedirectResponse
    {
        $by = $this->byline($request);
        $snapshot = ['name' => $user->name, 'email' => $user->email, 'is_admin' => $user->isAdmin()];

        $leads = DB::transaction(function () use ($user): Collection {
            // Checked again under a lock, so two admins deleting each other at
            // the same moment cannot leave the panel without one.
            if ($user->isAdmin()) {
                $others = User::query()
                    ->where('is_admin', true)
                    ->whereKeyNot($user->getKey())
                    ->lockForUpdate()
                    ->count();

                if ($others === 0) {
                    throw ValidationException::withMessages(['confirm_email' => DeleteUserRequest::lastAdminMessage($user)]);
                }
            }

            // The foreign key would do this too; done here to log each lead
            // (deleted ones included, so a restored lead comes back unassigned).
            $leads = Lead::withTrashed()->where('assigned_to', $user->id)->get(['id', 'reference', 'deleted_at']);

            if ($leads->isNotEmpty()) {
                Lead::withTrashed()->whereKey($leads->modelKeys())->toBase()->update(['assigned_to' => null]);
            }

            Password::deleteToken($user);
            Activity::withoutModelLogging(fn (): ?bool => $user->delete());

            return $leads;
        });

        $this->endSessions($user);

        Activity::record(
            'user.deleted',
            $user,
            "{$by} deleted the account of ".Activity::isolate($snapshot['name'])." ({$snapshot['email']})",
            [
                'via' => 'admin',
                'unassigned_leads' => $leads->count(),
                'changes' => [
                    'name' => [$snapshot['name'], null],
                    'email' => [$snapshot['email'], null],
                    'is_admin' => [$snapshot['is_admin'], null],
                ],
            ],
        );

        foreach ($leads as $lead) {
            Activity::record(
                'lead.unassigned',
                $lead,
                "Unassigned {$lead->reference} (was ".Activity::isolate($snapshot['name']).'): the account was deleted',
                ['via' => 'admin', 'changes' => ['assignee' => [$snapshot['name'], null]]],
            );
        }

        $open = $leads->whereNull('deleted_at')->count();
        $note = match ($open) {
            0 => '',
            1 => ' Its lead is unassigned now.',
            default => " Its {$open} leads are unassigned now.",
        };

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$snapshot['name']}’s account was deleted.{$note}"]);

        return to_route('admin.users.index');
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
     * Email the link through the password broker (the same token and page as
     * "Forgot your password?"), and log it once it is sent. Returns the
     * broker's status, or "failed" when the email could not be sent.
     */
    private function sendPasswordLinkTo(User $user, string $by, bool $newAccount): string
    {
        try {
            $status = Password::sendResetLink(
                ['email' => $user->email],
                function (User $recipient, string $token) use ($by, $newAccount): string {
                    $recipient->notify(new SetPasswordLink($token, $newAccount, $by));

                    return PasswordBroker::RESET_LINK_SENT;
                },
            );
        } catch (Throwable $exception) {
            report($exception);
            // Nobody got this token: without it, "Send again" isn't throttled.
            Password::deleteToken($user);

            return 'failed';
        }

        if ($status === PasswordBroker::RESET_LINK_SENT) {
            $minutes = SetPasswordLink::expiresInMinutes();

            Activity::record(
                'user.password_link_sent',
                $user,
                "{$by} emailed ".Activity::isolate($user->name).' a link to choose '.($newAccount ? 'a password' : 'a new password'),
                ['via' => 'admin', 'email' => $user->email, 'expires_in_minutes' => $minutes],
            );
        }

        return $status;
    }

    /**
     * Why a link was not sent, for the admin.
     */
    private function linkError(string $status): string
    {
        return match ($status) {
            PasswordBroker::RESET_THROTTLED => 'A link was sent less than a minute ago. Wait a minute before sending another.',
            'failed' => 'The email couldn’t be sent. Check the mail settings, then try again.',
            default => 'The link couldn’t be sent. Try again.',
        };
    }

    /**
     * Sign the account out of every browser (database sessions only; other
     * drivers end at their next request, when the remember token no longer
     * matches or the account is gone). Returns how many sessions ended.
     */
    private function endSessions(User $user): int
    {
        if (config('session.driver') !== 'database') {
            return 0;
        }

        $connection = config('session.connection');
        $table = config('session.table');

        return DB::connection(is_string($connection) ? $connection : null)
            ->table(is_string($table) ? $table : 'sessions')
            ->where('user_id', $user->id)
            ->delete();
    }

    /**
     * What the password fields need to know: the shortest length, the
     * browser's `passwordrules` hint and how long an emailed link works.
     *
     * @return array{min: int, rules: string, linkMinutes: int}
     */
    private function passwordPolicy(): array
    {
        $min = StoreUserRequest::minPasswordLength();
        // The app's rules (stricter in production), with the longer minimum.
        $rules = preg_replace('/minlength: \d+/', "minlength: {$min}", PasswordRule::defaults()->toPasswordRulesString());

        return [
            'min' => $min,
            'rules' => is_string($rules) ? $rules : "minlength: {$min};",
            'linkMinutes' => SetPasswordLink::expiresInMinutes(),
        ];
    }

    /**
     * What an edit did, after the admin's name: "renamed Jane Doe to Jane
     * Smith", "changed Jane Doe’s email address to jane@shop.com", or both.
     */
    private function describeEdit(string $oldName, User $user): string
    {
        $renamed = $user->wasChanged('name');
        $parts = [];

        if ($renamed) {
            $parts[] = 'renamed '.Activity::isolate($oldName).' to '.Activity::isolate($user->name);
        }

        if ($user->wasChanged('email')) {
            $whose = $renamed ? 'the' : Activity::isolate($user->name).'’s';
            $parts[] = "changed {$whose} email address to {$user->email}";
        }

        return implode(' and ', $parts);
    }

    /**
     * How many admins there are.
     */
    private function adminCount(): int
    {
        return User::query()->where('is_admin', true)->count();
    }

    /**
     * The signed-in admin's id.
     */
    private function currentId(Request $request): ?int
    {
        $id = $request->user()?->getKey();

        return is_numeric($id) ? (int) $id : null;
    }

    /**
     * The acting admin's name, for log descriptions.
     */
    private function byline(Request $request): string
    {
        $name = $request->user()?->getAttribute('name');

        return is_string($name) && $name !== '' ? Activity::isolate($name) : 'An admin';
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
     * @return Row
     */
    private function present(User $user, ?int $currentId): array
    {
        $lastLogin = $user->getAttribute('last_login_at');
        $lastLoginIp = $user->getAttribute('last_login_ip');
        $assignedLeads = $user->getAttribute('assigned_leads');
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
            // Leads in the list (deleted ones are unassigned too, but nobody sees them).
            'assignedLeads' => is_numeric($assignedLeads) ? (int) $assignedLeads : 0,
            'createdAt' => $createdAt->toIso8601String(),
            'createdOn' => $createdAt->toDateString(),
            'isYou' => $user->id === $currentId,
        ];
    }
}
