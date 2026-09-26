import { Head, Link, router, usePage } from '@inertiajs/react';
import { History, ShieldCheck, ShieldOff } from 'lucide-react';
import ActivityController from '@/actions/App/Http/Controllers/Admin/ActivityController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { Button, button } from '@/components/admin/button';
import { DataTable } from '@/components/admin/data-table';
import type { Column } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import { formatDate, parseDay, plural } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { Select } from '@/components/admin/select';
import { Badge } from '@/components/admin/status-badge';
import type { AdminUserRow, UsersIndexProps } from './types';

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Run an Inertia visit and settle when it finishes (keeps the dialog busy meanwhile). */
function visit(send: (onFinish: () => void) => void): Promise<void> {
    return new Promise((resolve) => send(() => resolve()));
}

function GrantButton({ user }: { user: AdminUserRow }) {
    return (
        <ConfirmDialog
            tone="default"
            trigger={
                <Button
                    variant="glass"
                    size="xs"
                    aria-label={`Make ${user.name} an admin`}
                >
                    <ShieldCheck aria-hidden />
                    Make admin
                </Button>
            }
            title={
                <>
                    Make {firstName(user.name)} <em>an admin?</em>
                </>
            }
            description={`${user.name} (${user.email}) will be able to edit the landing page, read and export every lead, and give or remove admin access.`}
            confirmLabel="Make admin"
            onConfirm={() =>
                visit((onFinish) =>
                    router.post(
                        UserController.grantAdmin.url(user.id),
                        {},
                        { preserveScroll: true, onFinish },
                    ),
                )
            }
        >
            {user.verified ? null : (
                <p className="text-[13.5px] leading-relaxed text-pretty text-smoke">
                    Their email address isn’t verified yet, so the panel opens
                    for them once they confirm it.
                </p>
            )}
        </ConfirmDialog>
    );
}

function RevokeButton({ user }: { user: AdminUserRow }) {
    return (
        <ConfirmDialog
            trigger={
                <Button
                    variant="danger"
                    size="xs"
                    aria-label={`Remove admin access from ${user.name}`}
                >
                    <ShieldOff aria-hidden />
                    Remove admin
                </Button>
            }
            title={
                <>
                    Remove {firstName(user.name)}’s <em>admin access?</em>
                </>
            }
            description={`${user.name} keeps their account but can no longer open the admin panel. Their next click inside it shows a “staff only” page.`}
            confirmLabel="Remove admin"
            onConfirm={() =>
                visit((onFinish) =>
                    router.delete(UserController.revokeAdmin.url(user.id), {
                        preserveScroll: true,
                        onFinish,
                    }),
                )
            }
        />
    );
}

function AccessAction({
    user,
    adminCount,
}: {
    user: AdminUserRow;
    adminCount: number;
}) {
    if (!user.isAdmin) {
        return <GrantButton user={user} />;
    }

    if (user.isYou) {
        return (
            <span
                className="px-2 text-[12px] text-smoke"
                title="Another admin has to remove your access."
            >
                Your account
            </span>
        );
    }

    if (adminCount <= 1) {
        return (
            <span
                className="px-2 text-[12px] text-smoke"
                title="Make someone else an admin before removing this one."
            >
                Only admin
            </span>
        );
    }

    return <RevokeButton user={user} />;
}

const COLUMNS: Column<AdminUserRow>[] = [
    {
        key: 'name',
        header: 'Name',
        sort: true,
        mobile: 'title',
        className: 'min-w-[14rem]',
        cell: (user) => (
            <span className="grid">
                <span className="flex items-center gap-2 font-medium">
                    {user.name}
                    {user.isYou ? (
                        <span className="text-[10px] font-medium tracking-[0.2em] text-mint uppercase">
                            You
                        </span>
                    ) : null}
                </span>
                <span className="text-[13px] font-normal break-all text-smoke">
                    {user.email}
                </span>
            </span>
        ),
    },
    {
        key: 'role',
        header: 'Access',
        mobile: 'aside',
        cell: (user) =>
            user.isAdmin ? (
                <Badge tone="mint">Admin</Badge>
            ) : (
                <Badge tone="muted">Member</Badge>
            ),
    },
    {
        key: 'verified',
        header: 'Email',
        cell: (user) =>
            user.verified ? (
                <span className="text-mist">Verified</span>
            ) : (
                <span className="text-smoke">Not verified</span>
            ),
    },
    {
        key: 'twoFactor',
        header: 'Two-factor',
        hideBelow: 'xl',
        cell: (user) =>
            user.twoFactor ? (
                <span className="text-mint">On</span>
            ) : (
                <span className="text-smoke">Off</span>
            ),
    },
    {
        key: 'last_login',
        header: 'Last sign-in',
        sort: true,
        sortFirst: 'desc',
        className: 'whitespace-nowrap',
        cell: (user) =>
            user.lastLoginAt ? (
                <span className="grid">
                    <RelativeTime value={user.lastLoginAt} />
                    {user.lastLoginIp ? (
                        <span className="font-mono text-[11.5px] text-smoke tabular-nums">
                            {user.lastLoginIp}
                        </span>
                    ) : null}
                </span>
            ) : (
                <span className="text-smoke">Never</span>
            ),
    },
    {
        key: 'created_at',
        header: 'Joined',
        sort: true,
        sortFirst: 'desc',
        hideBelow: 'lg',
        className: 'whitespace-nowrap text-[13px] text-smoke',
        cell: (user) => formatDate(parseDay(user.createdOn)),
    },
];

export default function UsersIndex({
    users,
    filters,
    sort,
    adminCount,
    totalCount,
}: UsersIndexProps) {
    const { errors } = usePage().props;
    const filtered = Object.values(filters).some((value) => value !== null);

    return (
        <>
            <Head title="Users · Admin" />

            <PageHeader
                title={
                    <>
                        Accounts and <em>admin access.</em>
                    </>
                }
                description="Everyone with an account. Admins edit the landing page, read every lead and decide who else is an admin. Accounts can’t be deleted from here."
                actions={
                    <Link
                        href={ActivityController.index.url({
                            query: { group: 'users' },
                        })}
                        className={button({ variant: 'glass' })}
                    >
                        <History aria-hidden />
                        Access changes
                    </Link>
                }
            />

            <div className="mt-8 grid gap-4">
                {errors.admin ? (
                    <div
                        role="alert"
                        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-[18px] bg-coral/[0.08] px-5 py-3.5 ring-1 ring-coral/35 ring-inset sm:px-6"
                    >
                        <span className="text-[10px] font-medium tracking-[0.22em] text-coral uppercase">
                            Nothing changed
                        </span>
                        <span className="text-[14px] leading-relaxed text-pretty text-bone">
                            {errors.admin}
                        </span>
                    </div>
                ) : null}

                <FilterBar
                    aside={
                        <span>
                            {plural(totalCount, 'account')} ·{' '}
                            {plural(adminCount, 'admin')}
                        </span>
                    }
                >
                    <SearchInput
                        name="search"
                        defaultValue={filters.search ?? ''}
                        placeholder="Name or email"
                    />
                    <Select
                        size="sm"
                        name="role"
                        aria-label="Access"
                        placeholder="Admins and members"
                        options={[
                            { value: 'admin', label: 'Admins only' },
                            { value: 'member', label: 'Members only' },
                        ]}
                        defaultValue={filters.role ?? ''}
                        className="w-full sm:w-52"
                    />
                    <Select
                        size="sm"
                        name="status"
                        aria-label="Email status"
                        placeholder="Any email status"
                        options={[
                            { value: 'verified', label: 'Verified' },
                            { value: 'unverified', label: 'Not verified' },
                        ]}
                        defaultValue={filters.status ?? ''}
                        className="w-full sm:w-48"
                    />
                </FilterBar>

                <Panel padded={false} variant="strong">
                    <DataTable
                        caption="Accounts"
                        columns={COLUMNS}
                        rows={users.data}
                        rowKey={(user) => user.id}
                        sort={sort}
                        actions={(user) => (
                            <>
                                <Link
                                    href={ActivityController.index.url({
                                        query: { user: String(user.id) },
                                    })}
                                    aria-label={`Activity of ${user.name}`}
                                    className={button({
                                        variant: 'ghost',
                                        size: 'xs',
                                    })}
                                >
                                    <History aria-hidden />
                                    Activity
                                </Link>
                                <AccessAction
                                    user={user}
                                    adminCount={adminCount}
                                />
                            </>
                        )}
                        empty={
                            filtered ? (
                                <NoMatches
                                    noun="accounts"
                                    clearHref={UserController.index.url()}
                                />
                            ) : (
                                <EmptyState
                                    compact
                                    className="my-6"
                                    title={
                                        <>
                                            No accounts <em>yet.</em>
                                        </>
                                    }
                                    description="People appear here once they create an account."
                                />
                            )
                        }
                    />
                </Panel>

                <Pagination paginator={users} noun="accounts" />
            </div>
        </>
    );
}
