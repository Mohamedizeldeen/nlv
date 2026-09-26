import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import LookCategoryController from '@/actions/App/Http/Controllers/Admin/LookCategoryController';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { isBlank, localeProps } from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import { button } from '@/components/admin/button';
import { EmptyState } from '@/components/admin/empty-state';
import { plural } from '@/components/admin/format';
import { MediaImage } from '@/components/admin/media';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { SortableList } from '@/components/admin/sortable-list';
import { Badge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import {
    ArabicMissing,
    CATEGORY_FIELD_LABELS,
    PreviewFallbackNote,
} from '../looks/arabic-missing';
import { CategoryKicker } from '../looks/category-kicker';
import { lookbookChrome } from '../looks/lookbook-copy';
import type { LookCategoriesIndexProps } from '../looks/types';
import { DeleteCategory } from './delete-category';
import { FilterTabs, TrendNote } from './trend-note';

type Category = LookCategoriesIndexProps['categories'][number];

const pad = (n: number) => String(n).padStart(2, '0');

/** Up to three of the category's looks, fanned like prints on a table. */
function Covers({ category }: { category: Category }) {
    if (category.covers.length === 0) {
        return (
            <span
                aria-hidden
                className="grid h-11 w-9 shrink-0 place-items-center rounded-[8px] border border-dashed border-white/15 text-[10px] text-smoke"
            >
                0
            </span>
        );
    }

    return (
        <span aria-hidden className="flex shrink-0 items-center">
            {category.covers.map((cover, index) => (
                <MediaImage
                    key={index}
                    media={cover.media}
                    focus={cover.focus}
                    alt=""
                    width={40}
                    className={cn(
                        'h-11 w-9 rounded-[8px] ring-2 ring-[oklch(0.2_0.018_195)]',
                        index > 0 && '-ml-4',
                    )}
                    style={{
                        rotate: `${(index - 1) * 5}deg`,
                        zIndex: 3 - index,
                    }}
                />
            ))}
        </span>
    );
}

function CategoryRow({
    category,
    handle,
    index,
}: {
    category: Category;
    handle: ReactNode;
    index: number;
}) {
    const edit = LookCategoryController.edit.url(category.id);
    const onPage = category.live_count > 0;

    return (
        <div className="flex items-center gap-3 py-2.5 pr-2 pl-1.5 sm:pr-3">
            {handle}
            <span className="w-6 shrink-0 text-[11px] text-smoke tabular-nums max-sm:hidden">
                {pad(index + 1)}
            </span>
            <span className="max-sm:hidden">
                <Covers category={category} />
            </span>
            <div className="min-w-0 flex-1 sm:pl-1">
                <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <Link
                        href={edit}
                        className="rounded-[6px] font-display text-[19px] leading-tight font-medium text-bone transition-colors duration-300 ease-glass hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                    >
                        {category.name}
                    </Link>
                    <span className="font-mono text-[11.5px] text-smoke">
                        {category.slug}
                    </span>
                    {onPage ? null : (
                        <Badge tone="muted" className="h-5 px-1.5 text-[9px]">
                            Not on the page
                        </Badge>
                    )}
                    <ArabicMissing
                        fields={category.arabic_missing}
                        labels={CATEGORY_FIELD_LABELS}
                    />
                </p>
                <p className="mt-1 truncate text-[13px] text-smoke">
                    {category.stat_figure ? (
                        <>
                            <span className="text-bone">
                                {category.stat_figure}
                            </span>{' '}
                            {category.stat_unit ? (
                                <span className="font-display text-mint italic">
                                    {category.stat_unit}
                                </span>
                            ) : null}
                            <span aria-hidden className="mx-1.5 text-white/25">
                                ·
                            </span>
                        </>
                    ) : null}
                    {category.note ?? (
                        <span className="italic">No note for the week.</span>
                    )}
                </p>
            </div>
            <Link
                href={LookController.index.url({
                    query: { category: category.slug },
                })}
                className="shrink-0 rounded-[8px] text-right text-[12px] leading-snug text-smoke tabular-nums transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none max-sm:hidden"
            >
                <span className="block text-[13px] text-bone">
                    {plural(category.looks_count, 'look')}
                </span>
                {category.live_count} live
            </Link>
            <div className="flex shrink-0 items-center gap-1">
                <Link
                    href={edit}
                    aria-label={`Edit “${category.name}”`}
                    className={button({
                        variant: 'ghost',
                        size: 'xs',
                        className: 'size-8 px-0',
                    })}
                >
                    <Pencil aria-hidden />
                </Link>
                <DeleteCategory category={category} />
            </div>
        </div>
    );
}

/**
 * A category's text as the page in `locale` shows it: the Arabic when it
 * is written, else the English (the server's fallback).
 */
function shown(
    category: Category,
    field: 'name' | 'note' | 'stat_figure' | 'stat_unit',
    locale: ContentLocale,
): string | null {
    const arabic = category[`${field}_ar`];
    const text = locale === 'ar' && !isBlank(arabic) ? arabic : category[field];

    return isBlank(text) ? null : (text ?? null);
}

/** The filter bar and the note it opens, switchable, as on the page. */
function PagePreview({
    categories,
    all,
    suffix,
    locale,
}: {
    categories: Category[];
    all: LookCategoriesIndexProps['all'];
    suffix: LookCategoriesIndexProps['suffix'];
    locale: ContentLocale;
}) {
    const [active, setActive] = useState('all');
    const live = categories.filter((category) => category.live_count > 0);
    const offPage = categories.filter((category) => category.live_count === 0);
    const selected = live.find((category) => String(category.id) === active);

    return (
        <div className="grid gap-6">
            <div
                {...localeProps(locale)}
                data-preview-locale={locale}
                className="grid gap-6"
            >
                <FilterTabs
                    label="Preview a filter"
                    active={selected ? active : 'all'}
                    onSelect={setActive}
                    tabs={[
                        { key: 'all', label: lookbookChrome(locale).all },
                        ...live.map((category) => ({
                            key: String(category.id),
                            label: shown(category, 'name', locale) ?? '',
                        })),
                    ]}
                />
                {selected ? (
                    <TrendNote
                        compact
                        kicker={
                            <CategoryKicker
                                name={shown(selected, 'name', locale) ?? ''}
                                suffix={suffix[locale]}
                            />
                        }
                        figure={shown(selected, 'stat_figure', locale)}
                        unit={shown(selected, 'stat_unit', locale)}
                        line={shown(selected, 'note', locale)}
                    />
                ) : (
                    <TrendNote
                        compact
                        kicker={all.kicker[locale]}
                        figure={String(all.live)}
                        unit={all.unit[locale] || null}
                        line={all.line[locale] || null}
                    />
                )}
            </div>
            <PreviewFallbackNote
                locale={locale}
                missing={(selected?.arabic_missing ?? []).map(
                    (field) => CATEGORY_FIELD_LABELS[field],
                )}
            />
            {offPage.length ? (
                <p className="border-t border-white/10 pt-4 text-[12.5px] leading-relaxed text-smoke">
                    Not on the page, no live looks:{' '}
                    {offPage.map((category, index) => (
                        <span key={category.id}>
                            {index > 0 ? ', ' : null}
                            <span className="text-mist">{category.name}</span>
                        </span>
                    ))}
                    .
                </p>
            ) : null}
            <p className="text-[12.5px] leading-relaxed text-smoke">
                The “All” note is edited in{' '}
                <Link
                    href="/admin/content?group=sections"
                    className="rounded-[6px] text-mist underline decoration-white/25 underline-offset-4 hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                >
                    Site content
                </Link>
                .
            </p>
        </div>
    );
}

export default function LookCategoriesIndex({
    categories,
    all,
    suffix,
}: LookCategoriesIndexProps) {
    const [source, setSource] = useState(categories);
    const [current, setCurrent] = useState(categories);
    const [locale, setLocale] = useState<ContentLocale>('en');

    // New props after a save replace the local order.
    if (categories !== source) {
        setSource(categories);
        setCurrent(categories);
    }

    const save = (next: Category[]) => {
        setCurrent(next);
        router.post(
            LookCategoryController.reorder.url(),
            { ids: next.map((category) => category.id) },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <>
            <Head title="Categories · Lookbook · Admin" />

            <PageHeader
                title={
                    <>
                        The lookbook’s <em>filters.</em>
                    </>
                }
                description="The tabs above the lookbook grid, in page order. Each one opens the grid with its own note for the week."
                actions={
                    <>
                        <Link
                            href={LookController.index.url()}
                            className={button({ variant: 'glass' })}
                        >
                            All looks
                        </Link>
                        <Link
                            href={LookCategoryController.create.url()}
                            className={button()}
                        >
                            <Plus aria-hidden /> Add a category
                        </Link>
                    </>
                }
            />

            {current.length === 0 ? (
                <Panel className="mt-8">
                    <EmptyState
                        title={
                            <>
                                No filters <em>yet.</em>
                            </>
                        }
                        description="Categories are the tabs above the lookbook: Abayas, Everyday, Evening. Every look belongs to one."
                        action={
                            <Link
                                href={LookCategoryController.create.url()}
                                className={button()}
                            >
                                <Plus aria-hidden /> Add the first category
                            </Link>
                        }
                    />
                </Panel>
            ) : (
                <div className="mt-8 grid gap-5 lg:grid-cols-12 lg:items-start">
                    <Panel
                        title="In page order"
                        description="Drag a handle, or focus one and press ↑ or ↓. Each move is saved at once."
                        className="lg:col-span-7"
                    >
                        <SortableList
                            label="Categories in page order"
                            items={current}
                            getKey={(category) => category.id}
                            getLabel={(category) => category.name}
                            onReorder={save}
                            itemClassName="min-w-0 rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
                            renderItem={(category, { handle, index }) => (
                                <CategoryRow
                                    category={category}
                                    handle={handle}
                                    index={index}
                                />
                            )}
                        />
                    </Panel>

                    <Panel
                        kicker="Preview"
                        title="On the landing page"
                        description="Pick a filter to read its note as shoppers will."
                        className="lg:sticky lg:top-8 lg:col-span-5"
                        actions={
                            <PreviewLocaleToggle
                                value={locale}
                                onValueChange={setLocale}
                            />
                        }
                    >
                        <PagePreview
                            categories={current}
                            all={all}
                            suffix={suffix}
                            locale={locale}
                        />
                    </Panel>
                </div>
            )}
        </>
    );
}
