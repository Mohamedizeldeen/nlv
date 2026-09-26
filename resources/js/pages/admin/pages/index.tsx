import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PageController from '@/actions/App/Http/Controllers/Admin/PageController';
import { ArabicMissing } from '@/components/admin/arabic-missing';
import { Button, button } from '@/components/admin/button';
import { DataTable } from '@/components/admin/data-table';
import type { Column } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import { plural } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { Select } from '@/components/admin/select';
import { SortableList } from '@/components/admin/sortable-list';
import { Badge } from '@/components/admin/status-badge';
import { Toggle } from '@/components/admin/toggle';
import { show } from '@/routes/pages';
import type {
    FooterGroup,
    FooterLink,
    Option,
    PageRow,
    PagesIndexProps,
    TranslatableColumn,
} from './types';

const STATUS_OPTIONS = [
    { value: 'live', label: 'Live' },
    { value: 'hidden', label: 'Hidden' },
];

/** How the translatable columns are named in the "Arabic missing" note. */
const COLUMN_NAMES: Record<TranslatableColumn, string> = {
    title: 'title',
    summary: 'summary',
    body: 'text',
};

/**
 * A quiet note beside a page whose Arabic is not complete: /ar/pages/{slug}
 * shows the English in those places.
 */
function PageArabicMissing({ columns }: { columns: TranslatableColumn[] }) {
    return (
        <ArabicMissing
            fields={columns.map((column) => COLUMN_NAMES[column])}
            className="leading-none whitespace-nowrap"
        />
    );
}

/**
 * The switch in the Live column: flips at once, saves in the background,
 * and flips back if the save fails. Remount it (via `key`) when the
 * server's value changes.
 */
function PublishSwitch({ page }: { page: PageRow }) {
    const [on, setOn] = useState(page.is_published);

    return (
        <Toggle
            checked={on}
            onCheckedChange={(next) => {
                setOn(next);
                router.patch(
                    PageController.publish.url(page.id),
                    { is_published: next },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onError: () => setOn(!next),
                    },
                );
            }}
            label={<span className="sr-only">Publish “{page.title}”</span>}
        />
    );
}

function columns(
    groupLabel: (group: string | null) => string,
): Column<PageRow>[] {
    return [
        {
            key: 'title',
            header: 'Title',
            sort: true,
            mobile: 'title',
            className: 'min-w-[14rem]',
            cell: (page) => (
                <span className="grid gap-0.5">
                    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 font-medium">
                        {page.title}
                        {page.placeholder ? (
                            <Badge tone="lagoon">Placeholder</Badge>
                        ) : null}
                        <PageArabicMissing columns={page.missing_arabic} />
                    </span>
                    {page.summary ? (
                        <span className="line-clamp-1 max-w-[46ch] text-[13px] font-normal text-smoke max-md:hidden">
                            {page.summary}
                        </span>
                    ) : null}
                </span>
            ),
        },
        {
            key: 'slug',
            header: 'Address',
            sort: true,
            mobile: 'subtitle',
            className: 'whitespace-nowrap text-[13px] text-smoke',
            cell: (page) => `/pages/${page.slug}`,
        },
        {
            key: 'footer_group',
            header: 'Footer',
            sort: true,
            className: 'whitespace-nowrap',
            cell: (page) =>
                page.footer_group ? (
                    groupLabel(page.footer_group)
                ) : (
                    <span className="text-smoke">Not listed</span>
                ),
        },
        {
            key: 'updated_at',
            header: 'Updated',
            sort: true,
            sortFirst: 'desc',
            hideBelow: 'lg',
            className: 'whitespace-nowrap text-[13px] text-smoke',
            cell: (page) => <RelativeTime value={page.updated_at} />,
        },
        {
            key: 'is_published',
            header: 'Live',
            mobile: 'aside',
            className: 'w-px',
            cell: (page) => (
                <PublishSwitch
                    key={`${page.id}-${page.is_published}`}
                    page={page}
                />
            ),
        },
    ];
}

function RowActions({ page }: { page: PageRow }) {
    return (
        <>
            <a
                href={show.url(page.slug)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open /pages/${page.slug} in a new tab`}
                title="Open the page"
                className={button({ variant: 'ghost', size: 'xs' })}
            >
                <ArrowUpRight aria-hidden />
                <span className="md:hidden">View</span>
            </a>
            <ConfirmDialog
                trigger={
                    <Button
                        variant="danger"
                        size="xs"
                        aria-label={`Delete “${page.title}”`}
                        title="Delete"
                    >
                        <Trash2 aria-hidden />
                        <span className="md:hidden">Delete</span>
                    </Button>
                }
                title={
                    <>
                        Delete this <em>page?</em>
                    </>
                }
                description={`“${page.title}” is removed${page.footer_group ? ' from the footer' : ''} and /pages/${page.slug} stops working. This cannot be undone.`}
                confirmLabel="Delete page"
                form={PageController.destroy.form(page.id)}
            />
        </>
    );
}

/** One footer column, reorderable. */
function FooterColumn({
    label,
    pages,
}: {
    label: string;
    pages: FooterLink[];
}) {
    return (
        <section aria-labelledby={`footer-${label}`} className="min-w-0">
            <h3
                id={`footer-${label}`}
                className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase"
            >
                {label}
            </h3>
            {pages.length ? (
                <SortableList
                    className="mt-3"
                    label={`${label} column of the footer, in link order`}
                    items={pages}
                    getKey={(page) => page.id}
                    getLabel={(page) => page.title}
                    onReorder={(next) =>
                        router.post(
                            PageController.reorder.url(),
                            { ids: next.map((page) => page.id) },
                            { preserveScroll: true, preserveState: true },
                        )
                    }
                    itemClassName="rounded-[14px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
                    renderItem={(page, { handle, index }) => (
                        <div className="flex items-center gap-3 p-1.5 pr-3">
                            {handle}
                            <span className="w-5 text-[11px] text-smoke tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] text-bone">
                                    {page.title}
                                </span>
                                <span className="block truncate text-[12px] text-smoke">
                                    /pages/{page.slug}
                                </span>
                            </span>
                            {page.is_published ? null : (
                                <Badge tone="muted">Hidden</Badge>
                            )}
                        </div>
                    )}
                />
            ) : (
                <p className="mt-3 rounded-[14px] border border-dashed border-white/[0.12] px-4 py-3 text-[13px] leading-relaxed text-smoke">
                    No pages yet. Choose “{label}” as a page’s footer column to
                    list it here.
                </p>
            )}
        </section>
    );
}

export default function PagesIndex({
    pages,
    filters,
    sort,
    footer,
    footerGroups,
    total,
}: PagesIndexProps) {
    const label = (group: string | null) =>
        footerGroups.find((option) => option.value === group)?.label ??
        group ??
        '';
    const groupFilter: Option[] = [
        ...footerGroups,
        { value: 'none', label: 'Not in the footer' },
    ];
    const newPage = (
        <Link href={PageController.create.url()} className={button()}>
            <Plus aria-hidden /> Add a page
        </Link>
    );

    return (
        <>
            <Head title="Pages · Admin" />
            <PageHeader
                title={
                    <>
                        The pages <em>behind the footer.</em>
                    </>
                }
                description="About, careers, press and the legal pages, in English and Arabic. Each is written in Markdown and has its own address under /pages and /ar/pages."
                actions={newPage}
            />

            <div className="mt-8 grid gap-5">
                {total === 0 ? (
                    <Panel>
                        <EmptyState
                            title={
                                <>
                                    No pages <em>yet.</em>
                                </>
                            }
                            description="Pages hold the longer text the footer links to: who you are, open roles, privacy and terms."
                            action={
                                <Link
                                    href={PageController.create.url()}
                                    className={button()}
                                >
                                    <Plus aria-hidden /> Add the first page
                                </Link>
                            }
                        />
                    </Panel>
                ) : (
                    <>
                        <FilterBar
                            aside={<span>{plural(pages.total, 'page')}</span>}
                        >
                            <SearchInput
                                name="search"
                                defaultValue={filters.search ?? ''}
                                placeholder="Title, address or summary"
                            />
                            <Select
                                size="sm"
                                name="group"
                                aria-label="Footer column"
                                placeholder="Any footer column"
                                options={groupFilter}
                                defaultValue={filters.group ?? ''}
                                className="w-[calc(50%-0.25rem)] sm:w-48"
                            />
                            <Select
                                size="sm"
                                name="status"
                                aria-label="Status"
                                placeholder="Live and hidden"
                                options={STATUS_OPTIONS}
                                defaultValue={filters.status ?? ''}
                                className="w-[calc(50%-0.25rem)] sm:w-40"
                            />
                        </FilterBar>

                        <Panel padded={false}>
                            <DataTable
                                caption="Pages"
                                columns={columns(label)}
                                rows={pages.data}
                                rowKey={(page) => page.id}
                                sort={sort}
                                rowHref={(page) =>
                                    PageController.edit.url(page.id)
                                }
                                actions={(page) => <RowActions page={page} />}
                                empty={
                                    <NoMatches
                                        noun="pages"
                                        clearHref={PageController.index.url()}
                                    />
                                }
                            />
                        </Panel>
                        <Pagination paginator={pages} noun="pages" />

                        <Panel
                            title="Footer order"
                            description="The links in each footer column, top to bottom. Drag a page by its handle, or focus the handle and use the arrow keys; the order saves as soon as you drop."
                        >
                            <div className="grid gap-8 md:grid-cols-2">
                                {(Object.keys(footer) as FooterGroup[]).map(
                                    (group) => (
                                        <FooterColumn
                                            key={group}
                                            label={label(group)}
                                            pages={footer[group]}
                                        />
                                    ),
                                )}
                            </div>
                        </Panel>
                    </>
                )}
            </div>
        </>
    );
}
