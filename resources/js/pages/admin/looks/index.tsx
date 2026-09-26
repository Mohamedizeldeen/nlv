import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import LookCategoryController from '@/actions/App/Http/Controllers/Admin/LookCategoryController';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import { plural } from '@/components/admin/format';
import { MediaImage, mediaUrl } from '@/components/admin/media';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Panel } from '@/components/admin/panel';
import { Select } from '@/components/admin/select';
import { SortableList } from '@/components/admin/sortable-list';
import { Badge, PublishedBadge } from '@/components/admin/status-badge';
import { Tabs } from '@/components/admin/tabs';
import { Toggle } from '@/components/admin/toggle';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { ArabicMissing, LOOK_FIELD_LABELS } from './arabic-missing';
import { BeforeAfterThumb } from './before-after';
import type { LookFilters, LookRow, LooksIndexProps } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

const STATUS_OPTIONS = [
    { value: 'live', label: 'Live' },
    { value: 'hidden', label: 'Hidden' },
];

function hasFilters(filters: LookFilters): boolean {
    return Boolean(filters.search || filters.category || filters.status);
}

/** The inline Live switch: saves at once, shows the new state straight away. */
function PublishSwitch({ look }: { look: LookRow }) {
    const [pending, setPending] = useState<boolean | null>(null);
    const checked = pending ?? look.is_published;

    return (
        <Toggle
            checked={checked}
            disabled={pending !== null}
            onCheckedChange={(next) => {
                setPending(next);
                router.patch(
                    LookController.publish.url(look.id),
                    { is_published: next },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onFinish: () => setPending(null),
                    },
                );
            }}
            label={
                <>
                    <span className="sr-only">
                        Show “{look.title}” on the landing page
                    </span>
                    <span
                        aria-hidden
                        className={cn(
                            'text-[10px] font-medium tracking-[0.2em] uppercase',
                            checked ? 'text-mint' : 'text-smoke',
                        )}
                    >
                        {checked ? 'Live' : 'Hidden'}
                    </span>
                </>
            }
            className="items-center [&>div]:pt-0"
        />
    );
}

function DeleteLook({ look }: { look: LookRow }) {
    const uploads = [look.after, look.before].some(
        (media) => media?.kind === 'upload',
    );

    return (
        <ConfirmDialog
            trigger={
                <Button
                    variant="danger"
                    size="xs"
                    className="size-8 px-0"
                    aria-label={`Delete “${look.title}”`}
                >
                    <Trash2 aria-hidden />
                </Button>
            }
            title={
                <>
                    Delete this <em>look?</em>
                </>
            }
            description={`“${look.title}” leaves the lookbook${uploads ? ' and its uploaded photos are deleted' : ''}. This can't be undone.`}
            confirmLabel="Delete look"
            form={LookController.destroy.form(look.id)}
        />
    );
}

/** One look in the grid: hover the photo for its before. */
function LookTile({ look }: { look: LookRow }) {
    const edit = LookController.edit.url(look.id);

    return (
        <article className="group/look glass-rim relative flex w-full min-w-0 flex-col rounded-[22px] p-2 glass [--r:0] hover:[--r:1] has-[a:focus-visible]:[--r:1] sm:p-2.5">
            <Link
                href={edit}
                className="relative block overflow-hidden rounded-[16px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
            >
                <span className="sr-only">Edit “{look.title}”</span>
                <BeforeAfterThumb
                    after={look.after ? mediaUrl(look.after, 520) : null}
                    before={look.before ? mediaUrl(look.before, 520) : null}
                    focus={look.focus}
                    alt=""
                    className={cn(
                        'transition-[filter,opacity] duration-500 ease-glass',
                        !look.is_published && 'opacity-55 saturate-[0.6]',
                    )}
                />
                <span
                    aria-hidden
                    className="absolute right-2 bottom-2 rounded-[8px] bg-ink/60 px-1.5 py-0.5 text-[10px] font-medium tracking-[0.16em] text-bone tabular-nums backdrop-blur-sm"
                >
                    N° {pad(look.position)}
                </span>
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset"
                />
            </Link>

            <div className="min-w-0 px-1 pt-3 pb-3 sm:px-1.5">
                <p className="flex items-baseline justify-between gap-2 text-[10px] leading-4 font-medium tracking-[0.2em] text-smoke uppercase">
                    <span className="truncate">{look.category.name}</span>
                    <span className="shrink-0 tracking-[0.06em] normal-case tabular-nums">
                        {look.seconds.toFixed(1)} s
                    </span>
                </p>
                <h2 className="mt-1 line-clamp-2 font-display text-[16px] leading-snug font-medium text-bone sm:truncate sm:text-[17px]">
                    <Link
                        href={edit}
                        tabIndex={-1}
                        className="transition-colors duration-300 ease-glass hover:text-mint"
                    >
                        {look.title}
                    </Link>
                </h2>
                <p className="mt-0.5 truncate text-[12.5px] text-smoke">
                    {look.city}
                    {look.before ? (
                        <span className="text-mint"> · own before photo</span>
                    ) : null}
                </p>
                <ArabicMissing
                    fields={look.arabic_missing}
                    labels={LOOK_FIELD_LABELS}
                    className="mt-2 block"
                />
            </div>

            <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 px-1 pt-2.5 pb-0.5 sm:px-1.5">
                <PublishSwitch look={look} />
                <div className="ml-auto flex items-center gap-1">
                    <Link
                        href={edit}
                        aria-label={`Edit “${look.title}”`}
                        className={button({
                            variant: 'ghost',
                            size: 'xs',
                            className: 'size-8 px-0',
                        })}
                    >
                        <Pencil aria-hidden />
                    </Link>
                    <DeleteLook look={look} />
                </div>
            </div>
        </article>
    );
}

function GridView({
    looks,
    categories,
    filters,
    counts,
}: Pick<LooksIndexProps, 'categories' | 'filters' | 'counts'> & {
    looks: NonNullable<LooksIndexProps['looks']>;
}) {
    const filtered = hasFilters(filters);

    return (
        <div className="mt-6 grid gap-5">
            <FilterBar
                aside={
                    <span className="tabular-nums">
                        {filtered
                            ? `${plural(looks.total, 'look')} of ${counts.total}`
                            : `${plural(counts.total, 'look')} · ${counts.live} live`}
                    </span>
                }
            >
                <SearchInput
                    name="search"
                    defaultValue={filters.search ?? ''}
                    placeholder="Title, city or alt text"
                    aria-label="Search looks by title, city or alt text, in English or Arabic"
                />
                <Select
                    size="sm"
                    name="category"
                    aria-label="Category"
                    placeholder="All categories"
                    defaultValue={filters.category ?? ''}
                    options={categories.map((category) => ({
                        value: category.slug,
                        label: `${category.name} (${category.looks_count})`,
                    }))}
                    className="w-full sm:w-48"
                />
                <Select
                    size="sm"
                    name="status"
                    aria-label="Status"
                    placeholder="Live and hidden"
                    defaultValue={filters.status ?? ''}
                    options={STATUS_OPTIONS}
                    className="w-full sm:w-40"
                />
            </FilterBar>

            {looks.data.length ? (
                <ul
                    aria-label="Looks"
                    className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {looks.data.map((look) => (
                        <li key={look.id} className="flex min-w-0">
                            <LookTile look={look} />
                        </li>
                    ))}
                </ul>
            ) : (
                <Panel>
                    {filtered ? (
                        <NoMatches
                            noun="looks"
                            clearHref={LookController.index.url()}
                            className="my-0"
                        />
                    ) : (
                        <EmptyState
                            title={
                                <>
                                    The lookbook is <em>empty.</em>
                                </>
                            }
                            description="Looks are the try-on photos in the landing page's lookbook: the result shoppers saw, and the photo they started from."
                            action={
                                <Link
                                    href={LookController.create.url()}
                                    className={button()}
                                >
                                    <Plus aria-hidden /> Add the first look
                                </Link>
                            }
                        />
                    )}
                </Panel>
            )}

            <Pagination paginator={looks} noun="looks" />
        </div>
    );
}

/*
 * The landing grid's layout, in miniature: four columns (the third starts
 * lower), the week's note first, then each live look dealt to the shortest
 * column, the first row left to right.
 */
const MAP_OFFSETS = [0, 0, 0.22, 0];
const NOTE_HEIGHT = 0.93;
const GAP = 0.07;

type MapTile = { kind: 'note' } | { kind: 'look'; look: LookRow; n: number };

function dealColumns(looks: LookRow[]): MapTile[][] {
    const columns: MapTile[][] = MAP_OFFSETS.map(() => []);
    const heights = [...MAP_OFFSETS];
    const tiles: MapTile[] = [
        { kind: 'note' },
        ...looks.map((look, index) => ({
            kind: 'look' as const,
            look,
            n: index + 1,
        })),
    ];

    tiles.forEach((tile, index) => {
        const target =
            index < columns.length
                ? index
                : heights.indexOf(Math.min(...heights));

        columns[target].push(tile);
        heights[target] +=
            (tile.kind === 'look' ? 1 / tile.look.aspect : NOTE_HEIGHT) + GAP;
    });

    return columns;
}

function PageMap({ looks }: { looks: LookRow[] }) {
    const live = looks.filter((look) => look.is_published);
    const columns = dealColumns(live);

    return (
        <div aria-hidden className="flex items-start gap-1.5">
            {columns.map((column, index) => (
                <div
                    key={index}
                    className="flex min-w-0 flex-1 flex-col gap-1.5"
                    style={{ paddingTop: `${MAP_OFFSETS[index] * 100}%` }}
                >
                    {column.map((tile) =>
                        tile.kind === 'note' ? (
                            <div
                                key="note"
                                className="flex flex-col border-t border-white/25 pt-1.5"
                                style={{ aspectRatio: 1 / NOTE_HEIGHT }}
                            >
                                <span className="text-[6.5px] tracking-[0.18em] text-mist uppercase">
                                    This week
                                </span>
                                <span className="mt-1 font-display text-[22px] leading-none text-bone">
                                    {live.length}
                                </span>
                                <span className="mt-0.5 font-display text-[10px] text-mint italic">
                                    looks
                                </span>
                            </div>
                        ) : (
                            <div
                                key={tile.look.id}
                                className="relative overflow-hidden rounded-[6px] bg-ink-raised"
                                style={{ aspectRatio: tile.look.aspect }}
                            >
                                {tile.look.after ? (
                                    <MediaImage
                                        media={tile.look.after}
                                        alt=""
                                        width={90}
                                        focus={tile.look.focus}
                                        className="absolute inset-0 size-full"
                                    />
                                ) : null}
                                <span className="absolute top-1 left-1 rounded-[4px] bg-ink/65 px-1 text-[8px] leading-[13px] text-bone tabular-nums">
                                    {pad(tile.n)}
                                </span>
                            </div>
                        ),
                    )}
                </div>
            ))}
        </div>
    );
}

function OrderView({ order }: { order: LookRow[] }) {
    const [source, setSource] = useState(order);
    const [current, setCurrent] = useState(order);

    // New props after a save replace the local order.
    if (order !== source) {
        setSource(order);
        setCurrent(order);
    }

    const save = (next: LookRow[]) => {
        setCurrent(next);
        router.post(
            LookController.reorder.url(),
            { ids: next.map((look) => look.id) },
            { preserveScroll: true, preserveState: true },
        );
    };

    if (order.length === 0) {
        return (
            <Panel className="mt-6">
                <EmptyState
                    title={
                        <>
                            Nothing to <em>arrange.</em>
                        </>
                    }
                    description="Add looks first; their order on the page is set here."
                    action={
                        <Link
                            href={LookController.create.url()}
                            className={button()}
                        >
                            <Plus aria-hidden /> Add the first look
                        </Link>
                    }
                />
            </Panel>
        );
    }

    return (
        <div className="mt-6 grid gap-5 lg:grid-cols-12 lg:items-start">
            <Panel
                title="Page order"
                description="The grid fills from the top left. Drag a handle, or focus one and press ↑ or ↓. Each move is saved at once."
                className="lg:col-span-7 xl:col-span-8"
            >
                <SortableList
                    label="Looks in page order"
                    items={current}
                    getKey={(look) => look.id}
                    getLabel={(look) => look.title}
                    onReorder={save}
                    itemClassName="min-w-0 rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
                    renderItem={(look, { handle, index }) => (
                        <div className="flex items-center gap-3 py-2 pr-2 pl-1.5 sm:pr-3">
                            {handle}
                            <span className="w-6 text-[11px] text-smoke tabular-nums">
                                {pad(index + 1)}
                            </span>
                            {look.after ? (
                                <MediaImage
                                    media={look.after}
                                    alt=""
                                    width={44}
                                    focus={look.focus}
                                    className={cn(
                                        'aspect-[4/5] w-10 rounded-[8px]',
                                        !look.is_published && 'opacity-50',
                                    )}
                                />
                            ) : null}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] text-bone">
                                    {look.title}
                                </span>
                                <span className="flex min-w-0 items-baseline gap-2.5">
                                    <span className="truncate text-[12px] text-smoke">
                                        {look.category.name} · {look.city}
                                    </span>
                                    <ArabicMissing
                                        fields={look.arabic_missing}
                                        labels={LOOK_FIELD_LABELS}
                                        className="shrink-0"
                                    />
                                </span>
                            </span>
                            <PublishedBadge
                                published={look.is_published}
                                className="max-sm:hidden"
                            />
                            <Link
                                href={LookController.edit.url(look.id)}
                                aria-label={`Edit “${look.title}”`}
                                className={button({
                                    variant: 'ghost',
                                    size: 'xs',
                                    className: 'size-8 px-0',
                                })}
                            >
                                <Pencil aria-hidden />
                            </Link>
                        </div>
                    )}
                />
            </Panel>

            <Panel
                kicker="On a wide screen"
                title="How the page deals them"
                description="Live looks only, beside the week's note. The third column starts lower, as on the page."
                className="lg:sticky lg:top-8 lg:col-span-5 xl:col-span-4"
            >
                <PageMap looks={current} />
            </Panel>
        </div>
    );
}

export default function LooksIndex({
    view,
    looks,
    order,
    categories,
    filters,
    counts,
}: LooksIndexProps) {
    const hidden = counts.total - counts.live;

    return (
        <>
            <Head title="Looks · Admin" />

            <PageHeader
                title={
                    <>
                        This week’s <em>edit.</em>
                    </>
                }
                description={
                    <>
                        The try-on photos in the landing page's lookbook, in
                        page order.{' '}
                        <span className="pointer-coarse:hidden">
                            Hover a photo to see its before.
                        </span>
                    </>
                }
                actions={
                    <>
                        <ViewOnSite href={`${home.url()}#lookbook`} />
                        <Link
                            href={LookController.create.url()}
                            className={button()}
                        >
                            <Plus aria-hidden /> Add a look
                        </Link>
                    </>
                }
            />

            <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-white/10">
                <Tabs
                    label="Looks views"
                    value={view}
                    className="border-b-0"
                    items={[
                        {
                            value: 'grid',
                            label: 'All looks',
                            count: counts.total,
                            href: LookController.index.url(),
                        },
                        {
                            value: 'order',
                            label: 'Page order',
                            href: LookController.index.url({
                                query: { view: 'order' },
                            }),
                        },
                    ]}
                />
                <p className="flex flex-wrap items-center gap-2 pb-2.5 text-[12.5px] text-smoke">
                    {hidden > 0 ? (
                        <Badge tone="muted">{hidden} hidden</Badge>
                    ) : null}
                    <Link
                        href={LookCategoryController.index.url()}
                        className="rounded-[6px] text-mist underline decoration-white/20 underline-offset-4 transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                    >
                        {plural(categories.length, 'category', 'categories')}
                    </Link>
                </p>
            </div>

            {view === 'order' && order ? (
                <OrderView order={order} />
            ) : looks ? (
                <GridView
                    looks={looks}
                    categories={categories}
                    filters={filters}
                    counts={counts}
                />
            ) : null}
        </>
    );
}
