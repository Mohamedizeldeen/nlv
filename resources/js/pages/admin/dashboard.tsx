import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Plus } from 'lucide-react';
import { button } from '@/components/admin/button';
import { DailyChart } from '@/components/admin/daily-chart';
import { DataTable } from '@/components/admin/data-table';
import type { Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import {
    PLAN_LABELS,
    describeEvent,
    formatLongDate,
    formatNumber,
    parseDay,
    plural,
} from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { StatCard, StatGroup } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { DashboardProps, RecentActivity, RecentLead } from '@/types/admin';

// Module pages that don't have Wayfinder routes yet (see components/admin/nav.ts).
const LEADS = '/admin/leads';
const leadHref = (lead: { id: number }) => `${LEADS}/${lead.id}`;

const linkClass =
    'group inline-flex items-center gap-1.5 rounded-[8px] text-[13px] text-mist transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

function Headline({ stats }: { stats: DashboardProps['stats'] }) {
    if (stats.newLeads > 0) {
        return (
            <>
                {formatNumber(stats.newLeads)} new order{' '}
                {stats.newLeads === 1 ? 'request' : 'requests'}{' '}
                <em>to answer.</em>
            </>
        );
    }

    if (stats.totalLeads === 0) {
        return (
            <>
                No order requests <em>yet.</em>
            </>
        );
    }

    return (
        <>
            Every request <em>answered.</em>
        </>
    );
}

const LEAD_COLUMNS: Column<RecentLead>[] = [
    {
        key: 'name',
        header: 'Name',
        mobile: 'title',
        className: 'min-w-[12rem]',
        cell: (lead) => (
            <span className="grid">
                <span className="font-medium">{lead.name}</span>
                <span className="text-[13px] font-normal text-smoke">
                    {lead.company}
                    <span className="max-md:hidden"> · {lead.country}</span>
                </span>
            </span>
        ),
    },
    {
        key: 'country',
        header: 'Country',
        inTable: false,
        cell: (lead) => lead.country,
    },
    {
        key: 'reference',
        header: 'Reference',
        mobile: 'hidden',
        className: 'whitespace-nowrap text-[13px] tabular-nums text-smoke',
        cell: (lead) => lead.reference,
    },
    {
        key: 'devices',
        header: 'Devices',
        align: 'right',
        className: 'tabular-nums',
        cell: (lead) => formatNumber(lead.devices),
    },
    {
        key: 'plan',
        header: 'Plan',
        className: 'whitespace-nowrap',
        cell: (lead) => PLAN_LABELS[lead.plan] ?? lead.plan,
    },
    {
        key: 'status',
        header: 'Status',
        mobile: 'aside',
        cell: (lead) => <StatusBadge status={lead.status} />,
    },
    {
        key: 'createdAt',
        header: 'Received',
        align: 'right',
        className: 'whitespace-nowrap text-[13px] text-smoke',
        cell: (lead) => <RelativeTime value={lead.createdAt} />,
    },
];

function ActivityList({ entries }: { entries: RecentActivity[] }) {
    if (entries.length === 0) {
        return (
            <EmptyState
                compact
                title={
                    <>
                        Quiet, <em>for now.</em>
                    </>
                }
                description="Sign-ins, order requests and every edit to the site are recorded here as they happen."
            />
        );
    }

    return (
        <ol className="divide-y divide-white/[0.07]">
            {entries.map((entry) => {
                const { subject, action } = describeEvent(entry.event);

                return (
                    <li key={entry.id} className="px-5 py-3 sm:px-6">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-[10px] font-medium tracking-[0.2em] text-smoke uppercase">
                                <span className="text-mist">{subject}</span>
                                {action ? <> · {action}</> : null}
                            </p>
                            <RelativeTime
                                value={entry.createdAt}
                                className="shrink-0 text-[12px] text-smoke tabular-nums"
                            />
                        </div>
                        <p className="mt-1 text-[13.5px] leading-snug text-pretty text-bone">
                            {entry.description}
                            {/* "Dev Admin signed in" already says who. */}
                            {entry.user &&
                            entry.description.startsWith(entry.user) ? null : (
                                <span className="text-smoke">
                                    {' '}
                                    · {entry.user ?? 'visitor'}
                                </span>
                            )}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
}

const PUBLISHED = [
    {
        key: 'publishedStories',
        label: 'Stories',
        noun: 'story',
        href: '/admin/stories',
    },
    {
        key: 'publishedLooks',
        label: 'Looks',
        noun: 'look',
        href: '/admin/looks',
    },
    {
        key: 'publishedPages',
        label: 'Pages',
        noun: 'page',
        href: '/admin/pages',
    },
] as const;

const SHORTCUTS = [
    { label: 'Plans & prices', href: '/admin/plans' },
    { label: 'Contact details', href: '/admin/content' },
    { label: 'Activity log', href: '/admin/activity' },
] as const;

export default function AdminDashboard({
    stats,
    leadsByDay,
    recentLeads,
    recentActivity,
}: DashboardProps) {
    // The server's today (the chart's last day), so SSR and the browser agree.
    const today = leadsByDay.at(-1)?.date;
    const monthTotal = leadsByDay.reduce((sum, day) => sum + day.count, 0);
    const wonShare =
        stats.totalLeads > 0
            ? Math.round((stats.wonLeads / stats.totalLeads) * 100)
            : null;

    return (
        <>
            <Head title="Dashboard · Admin" />

            <PageHeader
                title={<Headline stats={stats} />}
                description={
                    <>
                        {today ? `${formatLongDate(parseDay(today))}. ` : null}
                        Order requests from the landing page and the latest
                        changes to it, in one place.
                    </>
                }
                actions={
                    <>
                        <ViewOnSite href={home.url()} />
                        <Link
                            href={
                                stats.newLeads > 0
                                    ? `${LEADS}?status=new`
                                    : LEADS
                            }
                            className={button()}
                        >
                            {stats.newLeads > 0
                                ? 'Answer new leads'
                                : 'All leads'}
                            <ArrowRight aria-hidden />
                        </Link>
                    </>
                }
            />

            <StatGroup label="Leads at a glance" className="mt-8">
                <StatCard
                    label="New"
                    value={stats.newLeads}
                    tone={stats.newLeads > 0 ? 'mint' : 'default'}
                    note={
                        stats.newLeads > 0
                            ? 'waiting for a first reply'
                            : 'nothing waiting'
                    }
                    href={`${LEADS}?status=new`}
                />
                <StatCard
                    label="This week"
                    value={stats.leadsThisWeek}
                    note="last 7 days"
                />
                <StatCard
                    label="All leads"
                    value={stats.totalLeads}
                    note={`${plural(monthTotal, 'request')} in 30 days`}
                    href={LEADS}
                />
                <StatCard
                    label="Won"
                    value={stats.wonLeads}
                    note={
                        wonShare === null
                            ? 'no leads yet'
                            : `${wonShare}% of all leads`
                    }
                    href={`${LEADS}?status=won`}
                />
            </StatGroup>

            <div className="mt-5 grid gap-5 lg:grid-cols-12">
                <Panel
                    kicker="Last 30 days"
                    title="Order requests per day"
                    className="lg:col-span-8"
                    actions={
                        <p className="text-[13px] text-smoke">
                            <span className="font-display text-[1.35rem] text-bone">
                                {formatNumber(monthTotal)}
                            </span>{' '}
                            in total
                        </p>
                    }
                >
                    <DailyChart
                        data={leadsByDay}
                        noun="request"
                        emptyMessage="No order requests in the last 30 days."
                    />
                </Panel>

                <Panel
                    kicker="Published"
                    title="On the landing page"
                    className="lg:col-span-4"
                    padded={false}
                    footer={
                        <div className="flex w-full flex-wrap gap-x-5 gap-y-2">
                            {SHORTCUTS.map((shortcut) => (
                                <Link
                                    key={shortcut.href}
                                    href={shortcut.href}
                                    className={linkClass}
                                >
                                    {shortcut.label}
                                    <ArrowRight
                                        aria-hidden
                                        className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-mint"
                                    />
                                </Link>
                            ))}
                        </div>
                    }
                >
                    <ul className="divide-y divide-white/[0.07]">
                        {PUBLISHED.map((item) => (
                            <li
                                key={item.key}
                                className="flex items-center gap-4 px-5 py-4 sm:px-6"
                            >
                                <span className="w-14 font-display text-[2rem] leading-none font-medium text-bone">
                                    {formatNumber(stats[item.key])}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <Link
                                        href={item.href}
                                        className="rounded-[6px] text-[14px] font-medium text-bone transition-colors hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                    >
                                        {item.label}
                                    </Link>
                                    <span className="block text-[12px] text-smoke">
                                        {stats[item.key] === 1
                                            ? 'is live'
                                            : 'are live'}
                                    </span>
                                </span>
                                <Link
                                    href={`${item.href}/create`}
                                    aria-label={`Add a ${item.noun}`}
                                    title={`Add a ${item.noun}`}
                                    className={cn(
                                        button({
                                            variant: 'glass',
                                            size: 'xs',
                                        }),
                                        'size-8 px-0',
                                    )}
                                >
                                    <Plus aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:items-start">
                <Panel
                    title="Latest order requests"
                    description="From the Order a device pop-up, newest first."
                    className="lg:col-span-8"
                    padded={false}
                    actions={
                        recentLeads.length ? (
                            <Link href={LEADS} className={linkClass}>
                                All leads
                                <ArrowRight
                                    aria-hidden
                                    className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-mint"
                                />
                            </Link>
                        ) : null
                    }
                >
                    <DataTable
                        caption="Latest order requests"
                        columns={LEAD_COLUMNS}
                        rows={recentLeads}
                        rowKey={(lead) => lead.id}
                        rowHref={leadHref}
                        empty={
                            <EmptyState
                                compact
                                className="my-6"
                                title={
                                    <>
                                        The first request <em>lands here.</em>
                                    </>
                                }
                                description="When a shop fills in the Order a device form on the landing page, it shows up here and in the Leads list, with a reference like NLV-000001."
                            />
                        }
                    />
                </Panel>

                <Panel
                    title="Activity"
                    description="Everything done on the site, latest first."
                    className="lg:col-span-4"
                    padded={false}
                    footer={
                        recentActivity.length ? (
                            <Link href="/admin/activity" className={linkClass}>
                                Open the activity log
                                <ArrowRight
                                    aria-hidden
                                    className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-mint"
                                />
                            </Link>
                        ) : null
                    }
                >
                    <ActivityList entries={recentActivity} />
                </Panel>
            </div>
        </>
    );
}
