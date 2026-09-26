import { Link, router, usePage } from '@inertiajs/react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ArrowUpRight, ChevronsUpDown, LogOut, UserRound } from 'lucide-react';
import { BRAND } from '@/components/landing/brand';
import { LogoMark } from '@/components/landing/primitives';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { home, logout } from '@/routes';
import { dashboard } from '@/routes/admin';
import { edit as editProfile } from '@/routes/profile';
import { portalSurface } from './dialog';
import { formatNumber } from './format';
import { ADMIN_NAV, findAdminSection } from './nav';
import type { AdminNavEntry, AdminNavLink } from './nav';

const focusRing =
    'focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

/** Logo, product name and the "Admin" mark; links to the dashboard. */
export function AdminBrand({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <Link
            href={dashboard()}
            onClick={onNavigate}
            className={cn(
                'flex items-center gap-3 rounded-[12px] py-1 text-bone',
                focusRing,
            )}
        >
            <LogoMark className="h-5" />
            <span className="font-display text-[1.35rem] leading-none font-medium tracking-[-0.02em]">
                {BRAND.name}
            </span>
            <span aria-hidden className="h-4 w-px bg-white/20" />
            <span className="text-[10px] font-medium tracking-[0.28em] text-mint uppercase">
                Admin
            </span>
        </Link>
    );
}

function Count({ value }: { value: number }) {
    if (value <= 0) {
        return null;
    }

    return (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-[7px] bg-mint px-1.5 text-[11px] font-semibold text-ink tabular-nums shadow-[inset_0_1px_0_oklch(1_0_0/0.5)]">
            {value > 99 ? '99+' : formatNumber(value)}
            <span className="sr-only"> new</span>
        </span>
    );
}

function EntryRow({
    entry,
    active,
    count,
    onNavigate,
}: {
    entry: AdminNavEntry;
    active: boolean;
    count: number;
    onNavigate?: () => void;
}) {
    return (
        <Link
            href={entry.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group flex h-9 items-center rounded-[12px] pr-2 pl-3 text-[14px] transition-colors duration-300 ease-glass',
                focusRing,
                active
                    ? 'bg-white/[0.08] text-bone shadow-[inset_0_1px_0_oklch(1_0_0/0.1)] ring-1 ring-white/[0.1] ring-inset'
                    : 'text-mist hover:bg-white/[0.04] hover:text-bone',
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'w-7 shrink-0 text-[10px] font-medium tracking-[0.1em] tabular-nums transition-colors duration-300',
                    active ? 'text-mint' : 'text-smoke group-hover:text-mist',
                )}
            >
                {entry.index}
            </span>
            {entry.label}
            {entry.count ? <Count value={count} /> : null}
        </Link>
    );
}

function ParentRow({
    entry,
    activeChild,
    onNavigate,
}: {
    entry: AdminNavEntry & { children: AdminNavLink[] };
    activeChild: string | null;
    onNavigate?: () => void;
}) {
    const open = activeChild !== null;

    return (
        <div>
            <p
                className={cn(
                    'flex h-9 items-center pl-3 text-[14px]',
                    open ? 'text-bone' : 'text-mist',
                )}
            >
                <span
                    aria-hidden
                    className={cn(
                        'w-7 shrink-0 text-[10px] font-medium tracking-[0.1em] tabular-nums',
                        open ? 'text-mint' : 'text-smoke',
                    )}
                >
                    {entry.index}
                </span>
                {entry.label}
            </p>
            <ul className="mb-1 ml-[calc(0.75rem+3px)] border-l border-white/10">
                {entry.children.map((child) => {
                    const active = child.key === activeChild;

                    return (
                        <li key={child.key}>
                            <Link
                                href={child.href}
                                onClick={onNavigate}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    '-ml-px flex h-8 items-center rounded-r-[10px] border-l-2 pl-[calc(1.75rem-5px)] text-[13.5px] transition-colors duration-300 ease-glass',
                                    focusRing,
                                    active
                                        ? 'border-mint bg-white/[0.05] text-bone'
                                        : 'border-transparent text-smoke hover:text-bone',
                                )}
                            >
                                <span className="sr-only">{entry.label}: </span>
                                {child.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** The admin's section list, grouped under spaced-caps labels. */
export function AdminNavList({ onNavigate }: { onNavigate?: () => void }) {
    const { url, props } = usePage();
    const section = findAdminSection(url);
    const newLeads = props.admin?.newLeads ?? 0;

    return (
        <nav aria-label="Admin">
            {ADMIN_NAV.map((group) => (
                <div key={group.label} className="mt-6 first:mt-0">
                    <p className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.26em] text-smoke/80 uppercase">
                        {group.label}
                    </p>
                    <ul className="grid gap-0.5">
                        {group.entries.map((entry) => {
                            const isCurrent = section?.entry.key === entry.key;

                            return (
                                <li key={entry.key}>
                                    {entry.children ? (
                                        <ParentRow
                                            entry={{
                                                ...entry,
                                                children: entry.children,
                                            }}
                                            activeChild={
                                                isCurrent
                                                    ? (section?.child?.key ??
                                                      null)
                                                    : null
                                            }
                                            onNavigate={onNavigate}
                                        />
                                    ) : (
                                        <EntryRow
                                            entry={entry}
                                            active={isCurrent}
                                            count={
                                                entry.count === 'newLeads'
                                                    ? newLeads
                                                    : 0
                                            }
                                            onNavigate={onNavigate}
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

/** "View site" (new tab) for the sidebar's foot. */
export function ViewSiteLink() {
    return (
        <a
            href={home.url()}
            target="_blank"
            rel="noopener"
            className={cn(
                'group flex h-9 items-center justify-between rounded-[12px] px-3 text-[13.5px] text-mist transition-colors duration-300 ease-glass hover:bg-white/[0.04] hover:text-bone',
                focusRing,
            )}
        >
            <span>
                View site
                <span className="sr-only"> (opens in a new tab)</span>
            </span>
            <ArrowUpRight
                aria-hidden
                className="size-4 text-smoke transition-[translate,color] duration-300 ease-glass group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-mint"
            />
        </a>
    );
}

const menuItem =
    'flex h-10 cursor-pointer items-center gap-2.5 rounded-[12px] px-3 text-[14px] text-mist outline-none select-none data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-bone [&_svg]:size-4 [&_svg]:text-smoke data-[highlighted]:[&_svg]:text-mint';

/** The signed-in admin, with Profile and Log out. */
export function AccountMenu({ side = 'top' }: { side?: 'top' | 'bottom' }) {
    const { auth } = usePage().props;
    const initials = useInitials();

    if (!auth.user) {
        return null;
    }

    const user = auth.user;

    return (
        <Menu.Root>
            <Menu.Trigger
                className={cn(
                    'group flex w-full cursor-pointer items-center gap-3 rounded-[16px] p-2 text-left transition-colors duration-300 ease-glass hover:bg-white/[0.05] data-[state=open]:bg-white/[0.07]',
                    focusRing,
                )}
            >
                <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] font-display text-[15px] font-medium text-bone ring-1 ring-white/20 ring-inset"
                >
                    {initials(user.name)}
                </span>
                <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-[14px] font-medium text-bone">
                        {user.name}
                    </span>
                    <span className="truncate text-[12px] text-smoke">
                        {user.email}
                    </span>
                </span>
                <ChevronsUpDown
                    aria-hidden
                    className="size-4 shrink-0 text-smoke group-hover:text-mist"
                />
                <span className="sr-only">Account menu</span>
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Content
                    side={side}
                    align="start"
                    sideOffset={8}
                    className={cn(
                        portalSurface,
                        'glass-rim z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-[18px] p-1.5 glass-strong data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                    )}
                >
                    <Menu.Label className="px-3 pt-2 pb-2.5 text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                        Signed in
                    </Menu.Label>
                    <Menu.Item asChild className={menuItem}>
                        <Link href={editProfile()}>
                            <UserRound aria-hidden />
                            Profile
                        </Link>
                    </Menu.Item>
                    <Menu.Separator className="mx-2 my-1.5 h-px bg-white/10" />
                    <Menu.Item asChild className={menuItem}>
                        <Link
                            href={logout()}
                            as="button"
                            onClick={() => router.flushAll()}
                            className="w-full"
                            data-test="logout-button"
                        >
                            <LogOut aria-hidden />
                            Log out
                        </Link>
                    </Menu.Item>
                </Menu.Content>
            </Menu.Portal>
        </Menu.Root>
    );
}
