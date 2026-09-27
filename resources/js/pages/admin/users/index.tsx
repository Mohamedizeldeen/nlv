import { Head, Link } from '@inertiajs/react';
import { History, PenLine, Trash2, UserPlus } from 'lucide-react';
import ActivityController from '@/actions/App/Http/Controllers/Admin/ActivityController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { Button, button } from '@/components/admin/button';
import { DataTable } from '@/components/admin/data-table';
import type { Column } from '@/components/admin/data-table';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import { formatDate, parseDay, plural } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { Select } from '@/components/admin/select';
import { deleteBlocker } from './partials/account';
import { DeleteUserDialog } from './partials/delete-user-dialog';
import type { AdminUserRow, UsersIndexProps } from './types';

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
        key: 'verified',
        header: 'Email',
        mobile: 'aside',
        cell: (user) =>
            !user.isAdmin ? (
                <span
                    className="text-coral"
                    title="Made before every account was an admin. Open it to give it access, or delete it."
                >
                    No panel access
                </span>
            ) : user.verified ? (
                <span className="text-mist">Verified</span>
            ) : (
                <span
                    className="text-smoke"
                    title="The panel opens once they confirm their email address."
                >
                    Not verified
                </span>
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
        header: 'Added',
        sort: true,
        sortFirst: 'desc',
        hideBelow: 'lg',
        className: 'whitespace-nowrap text-[13px] text-smoke',
        cell: (user) => formatDate(parseDay(user.createdOn)),
    },
];

function RowActions({
    user,
    adminCount,
}: {
    user: AdminUserRow;
    adminCount: number;
}) {
    const blocker = deleteBlocker(user, adminCount);

    return (
        <>
            <Link
                href={UserController.edit.url(user.id)}
                aria-label={`Edit ${user.name}`}
                title="Edit"
                className={button({ variant: 'ghost', size: 'xs' })}
            >
                <PenLine aria-hidden />
                <span className="md:hidden">Edit</span>
            </Link>
            {blocker ? (
                // Kept in place (and explained) so the rows line up.
                <span title={blocker} className="inline-flex">
                    <Button
                        variant="danger"
                        size="xs"
                        disabled
                        aria-label={`Delete ${user.name}: ${blocker}`}
                        className="pointer-events-none opacity-35"
                    >
                        <Trash2 aria-hidden />
                        <span className="md:hidden">Delete</span>
                    </Button>
                </span>
            ) : (
                <DeleteUserDialog
                    user={user}
                    trigger={
                        <Button
                            variant="danger"
                            size="xs"
                            aria-label={`Delete ${user.name}`}
                            title="Delete"
                        >
                            <Trash2 aria-hidden />
                            <span className="md:hidden">Delete</span>
                        </Button>
                    }
                />
            )}
        </>
    );
}

export default function UsersIndex({
    users,
    filters,
    sort,
    adminCount,
    totalCount,
}: UsersIndexProps) {
    const filtered = Object.values(filters).some((value) => value !== null);
    const addUser = (
        <Link href={UserController.create.url()} className={button()}>
            <UserPlus aria-hidden /> Add user
        </Link>
    );

    return (
        <>
            <Head title="Users · Admin" />

            <PageHeader
                title={
                    <>
                        The people who <em>run the panel.</em>
                    </>
                }
                description="Every account here is an admin: it opens the whole panel, from the landing copy to every lead, and can add or remove people. Add someone with a password you set, or email them a link to choose their own."
                actions={
                    <>
                        <Link
                            href={ActivityController.index.url({
                                query: { group: 'users' },
                            })}
                            className={button({ variant: 'glass' })}
                        >
                            <History aria-hidden />
                            Account history
                        </Link>
                        {addUser}
                    </>
                }
            />

            <div className="mt-8 grid gap-4">
                <FilterBar aside={<span>{plural(totalCount, 'account')}</span>}>
                    <SearchInput
                        name="search"
                        defaultValue={filters.search ?? ''}
                        placeholder="Name or email"
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
                        rowHref={(user) => UserController.edit.url(user.id)}
                        sort={sort}
                        actions={(user) => (
                            <RowActions user={user} adminCount={adminCount} />
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
                                    description="Add the people who run the landing page and follow up on leads."
                                    action={addUser}
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
