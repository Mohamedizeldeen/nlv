import { Head, Link, usePage } from '@inertiajs/react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import LeadController from '@/actions/App/Http/Controllers/Admin/LeadController';
import { CONTENT_LOCALES } from '@/components/admin/bilingual';
import { Button, button } from '@/components/admin/button';
import { DataTable, useUrlWith } from '@/components/admin/data-table';
import type { Column } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import { PLAN_LABELS, formatNumber, plural } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { Select } from '@/components/admin/select';
import { Badge, StatusBadge } from '@/components/admin/status-badge';
import { Tabs } from '@/components/admin/tabs';
import { TextInput } from '@/components/admin/text-input';
import type { AdminSharedProps } from '@/types/admin';
import { VisitorText, isolate, languageName } from './partials/visitor-text';
import type { LeadRow, LeadTab, LeadsIndexProps } from './types';

const TABS: { value: LeadTab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
    { value: 'deleted', label: 'Deleted' },
];

/** The language of the page a request was sent from (English, Arabic). */
const LANGUAGE_OPTIONS = CONTENT_LOCALES.map((locale) => ({
    value: locale,
    label: languageName(locale),
}));

/** Two filters per row on phones, fixed widths from `sm` up. */
const half = 'w-[calc(50%-0.25rem)]';

function columns(deleted: boolean): Column<LeadRow>[] {
    return [
        {
            key: 'name',
            header: 'Name',
            sort: true,
            mobile: 'title',
            className: 'min-w-[13rem]',
            cell: (lead) => (
                <span className="grid">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <VisitorText text={lead.name} className="font-medium" />
                        {lead.locale === 'ar' ? (
                            // Answer in Arabic: the only language that needs a marker.
                            <Badge tone="muted" className="h-5 px-1.5">
                                Arabic
                                <span className="sr-only">
                                    {' '}
                                    page, reply in Arabic
                                </span>
                            </Badge>
                        ) : null}
                    </span>
                    <VisitorText
                        text={lead.company}
                        className="text-[13px] font-normal text-smoke max-md:hidden"
                    />
                </span>
            ),
        },
        {
            key: 'company',
            header: 'Company',
            inTable: false,
            mobile: 'subtitle',
            cell: (lead) => (
                <>
                    <VisitorText text={lead.company} /> ·{' '}
                    <VisitorText text={lead.city} />,{' '}
                    <VisitorText text={lead.country} />
                </>
            ),
        },
        {
            key: 'reference',
            header: 'Reference',
            hideBelow: 'lg',
            className: 'whitespace-nowrap text-[13px] tabular-nums text-smoke',
            cell: (lead) => lead.reference,
        },
        {
            key: 'country',
            header: 'From',
            sort: true,
            hideBelow: 'xl',
            mobile: 'hidden',
            className: 'max-w-[14rem]',
            cell: (lead) => (
                <span className="grid">
                    <VisitorText text={lead.country} className="truncate" />
                    <VisitorText
                        text={lead.city}
                        className="truncate text-[13px] text-smoke"
                    />
                </span>
            ),
        },
        {
            key: 'devices',
            header: 'Devices',
            sort: true,
            sortFirst: 'desc',
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
            key: 'assignee',
            header: 'Assigned',
            hideBelow: 'xl',
            mobile: 'hidden',
            className: 'whitespace-nowrap',
            cell: (lead) =>
                lead.assignee ?? (
                    <span className="text-smoke">
                        <span aria-hidden>—</span>
                        <span className="sr-only">Nobody</span>
                    </span>
                ),
        },
        {
            key: 'status',
            header: 'Status',
            mobile: 'aside',
            cell: (lead) => <StatusBadge status={lead.status} />,
        },
        {
            key: 'created_at',
            header: 'Received',
            sort: 'created_at',
            sortFirst: 'desc',
            align: 'right',
            className: 'whitespace-nowrap text-[13px] text-smoke',
            cell: (lead) => <RelativeTime value={lead.createdAt} />,
        },
        ...(deleted
            ? [
                  {
                      key: 'deleted_at',
                      header: 'Deleted',
                      align: 'right',
                      className: 'whitespace-nowrap text-[13px] text-smoke',
                      cell: (lead) =>
                          lead.deletedAt ? (
                              <RelativeTime value={lead.deletedAt} />
                          ) : null,
                  } satisfies Column<LeadRow>,
              ]
            : []),
    ];
}

function RowActions({
    lead,
    deleted,
    onDelete,
}: {
    lead: LeadRow;
    deleted: boolean;
    onDelete: (lead: LeadRow) => void;
}) {
    if (deleted) {
        return (
            <Link
                href={LeadController.restore.url(lead)}
                method="post"
                as="button"
                preserveScroll
                className={button({ variant: 'glass', size: 'xs' })}
                aria-label={`Restore ${lead.reference} (${isolate(lead.name)})`}
            >
                <RotateCcw aria-hidden /> Restore
            </Link>
        );
    }

    // Quiet until hovered; phones delete from the lead's own page.
    return (
        <Button
            variant="ghost"
            size="xs"
            aria-label={`Delete ${lead.reference} (${isolate(lead.name)})`}
            aria-haspopup="dialog"
            title="Delete"
            onClick={() => onDelete(lead)}
            className="size-8 px-0 text-smoke hover:bg-coral/10 hover:text-coral max-md:hidden"
        >
            <Trash2 aria-hidden />
        </Button>
    );
}

export default function LeadsIndex({
    leads,
    filters,
    sort,
    counts,
    options,
}: LeadsIndexProps) {
    const { url, props } = usePage<{ admin: AdminSharedProps | null }>();
    // One delete dialog for the page, rendered outside the table: a dialog
    // inside a row would pass its backdrop clicks on to the row (React
    // events bubble through portals) and open the lead.
    const [confirming, setConfirming] = useState(false);
    const [target, setTarget] = useState<LeadRow | null>(null);
    const urlWith = useUrlWith();
    const tab: LeadTab = filters.status ?? 'all';
    const deleted = tab === 'deleted';
    const newLeads = props.admin?.newLeads ?? counts.new;
    const filtered = Boolean(
        filters.search ||
        filters.plan ||
        filters.country ||
        filters.locale ||
        filters.from ||
        filters.to,
    );

    // The export takes the list's own query (filters and sort), minus the page.
    const query = new URL(url, 'http://localhost').searchParams;
    query.delete('page');
    const exportQuery = query.toString();
    const exportHref = `${LeadController.export.url()}${exportQuery ? `?${exportQuery}` : ''}`;

    const countries = options.countries.map((country) => ({
        value: country,
        label: country,
    }));

    // A shared filter URL may name a country no lead has any more: keep it selectable.
    if (filters.country && !options.countries.includes(filters.country)) {
        countries.unshift({ value: filters.country, label: filters.country });
    }

    const clearHref = urlWith({
        search: null,
        plan: null,
        country: null,
        locale: null,
        from: null,
        to: null,
        page: null,
    });

    return (
        <>
            <Head title="Leads · Admin" />

            <PageHeader
                title={
                    <>
                        Order <em>requests.</em>
                    </>
                }
                description={
                    newLeads > 0
                        ? `${plural(newLeads, 'new request')} ${newLeads === 1 ? 'is' : 'are'} waiting for a first reply. Everything sent through the Order a device pop-up lands here.`
                        : 'Everything sent through the Order a device pop-up lands here. Open one to answer it, assign it or move it along.'
                }
                actions={
                    leads.total > 0 ? (
                        <a
                            href={exportHref}
                            download
                            className={button({ variant: 'glass' })}
                        >
                            <Download aria-hidden />
                            Export CSV
                            <span className="sr-only">
                                {' '}
                                of the {plural(leads.total, 'lead')} in this
                                view
                            </span>
                        </a>
                    ) : (
                        <Button variant="glass" disabled>
                            <Download aria-hidden />
                            Export CSV
                        </Button>
                    )
                }
            />

            <Tabs
                className="mt-8"
                label="Lead status"
                value={tab}
                items={TABS.map((item) => ({
                    value: item.value,
                    label: item.label,
                    count: counts[item.value],
                    href: urlWith({
                        status: item.value === 'all' ? null : item.value,
                        page: null,
                    }),
                }))}
            />

            {/* The view's count is in its tab and under the table, which keeps
                the six filters on one row at 1440. */}
            <FilterBar className="mt-5">
                {/* Keep the status tab when the other filters change. */}
                <input
                    type="hidden"
                    name="status"
                    defaultValue={filters.status ?? ''}
                />
                <SearchInput
                    name="search"
                    defaultValue={filters.search ?? ''}
                    placeholder="Name, company, email or ref"
                    className="sm:w-64"
                />
                <Select
                    size="sm"
                    name="plan"
                    aria-label="Plan"
                    placeholder="All plans"
                    options={options.plans}
                    defaultValue={filters.plan ?? ''}
                    className={`${half} sm:w-32`}
                />
                <Select
                    size="sm"
                    name="country"
                    aria-label="Country"
                    placeholder="All countries"
                    options={countries}
                    defaultValue={filters.country ?? ''}
                    className={`${half} sm:w-36`}
                />
                <Select
                    size="sm"
                    name="locale"
                    aria-label="Language"
                    placeholder="All languages"
                    options={LANGUAGE_OPTIONS}
                    defaultValue={filters.locale ?? ''}
                    className="w-full sm:w-36"
                />
                <TextInput
                    size="sm"
                    type="date"
                    name="from"
                    leading="From"
                    aria-label="Received from"
                    defaultValue={filters.from ?? ''}
                    max={filters.to ?? undefined}
                    className={`${half} sm:w-44`}
                />
                <TextInput
                    size="sm"
                    type="date"
                    name="to"
                    leading="To"
                    aria-label="Received until"
                    defaultValue={filters.to ?? ''}
                    min={filters.from ?? undefined}
                    className={`${half} sm:w-44`}
                />
            </FilterBar>

            <Panel padded={false} className="mt-4">
                <DataTable
                    caption={deleted ? 'Deleted leads' : 'Leads'}
                    columns={columns(deleted)}
                    rows={leads.data}
                    rowKey={(lead) => lead.id}
                    sort={sort}
                    rowHref={(lead) => LeadController.show.url(lead)}
                    actions={(lead) => (
                        <RowActions
                            lead={lead}
                            deleted={deleted}
                            onDelete={(row) => {
                                setTarget(row);
                                setConfirming(true);
                            }}
                        />
                    )}
                    empty={
                        deleted && !filtered ? (
                            <EmptyState
                                className="my-6"
                                title={
                                    <>
                                        Nothing in <em>Deleted.</em>
                                    </>
                                }
                                description="Deleted requests wait here, so a slip of the finger can always be undone."
                            />
                        ) : filtered ? (
                            <NoMatches noun="requests" clearHref={clearHref} />
                        ) : tab !== 'all' ? (
                            <EmptyState
                                compact
                                className="my-6"
                                title={
                                    <>
                                        No requests <em>here.</em>
                                    </>
                                }
                                description="No request has this status right now."
                            />
                        ) : (
                            <EmptyState
                                className="my-6"
                                title={
                                    <>
                                        The first request <em>lands here.</em>
                                    </>
                                }
                                description="When a shop fills in the Order a device form on the landing page, it shows up here with a reference like NLV-000001, and the sales inbox gets an email."
                            />
                        )
                    }
                />
            </Panel>

            <Pagination
                paginator={leads}
                noun={deleted ? 'deleted leads' : 'leads'}
                className="mt-4"
            />

            {target ? (
                <ConfirmDialog
                    open={confirming}
                    onOpenChange={setConfirming}
                    title={
                        <>
                            Delete this <em>request?</em>
                        </>
                    }
                    description={`${target.reference} from ${isolate(target.name)}, ${isolate(target.company)}, moves to Deleted. You can restore it from there at any time.`}
                    confirmLabel="Delete request"
                    form={LeadController.destroy.form(target)}
                />
            ) : null}
        </>
    );
}
