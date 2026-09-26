import { Link, router, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SortDirection, SortState } from '@/types/admin';
import { EmptyState } from './empty-state';

export type Column<T> = {
    /** Unique per table. */
    key: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    /**
     * Sortable: the `sort` query value the controller understands (true =
     * use `key`). The header becomes a link that toggles the direction.
     */
    sort?: string | true;
    /** Direction of the first click (default "asc"; use "desc" for dates and counts). */
    sortFirst?: SortDirection;
    align?: 'left' | 'right' | 'center';
    /** Extra classes for this column's cells, e.g. "w-32" or "tabular-nums". */
    className?: string;
    /** Hide in the table below a breakpoint (phones use cards anyway). */
    hideBelow?: 'lg' | 'xl';
    /** false: phone cards only (e.g. a value the table shows inside another cell). */
    inTable?: boolean;
    /**
     * Role in the phone card: `title` (one column, linked to the row),
     * `subtitle`, `aside` (top-right, e.g. a status badge), `row` (label and
     * value, the default) or `hidden`.
     */
    mobile?: 'title' | 'subtitle' | 'aside' | 'row' | 'hidden';
};

type DataTableProps<T> = {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string | number;
    /** Accessible name of the table (visually hidden), e.g. "Leads". */
    caption: string;
    /** The active sort, as echoed by the controller. */
    sort?: SortState | null;
    /** Query parameter names for sorting. */
    sortParams?: { column: string; direction: string };
    /** Makes rows open a page: the title cell links there, the row is clickable. */
    rowHref?: (row: T) => string;
    /** Buttons or links for a row, in a right-aligned last column. */
    actions?: (row: T) => ReactNode;
    /** Shown instead of the table when `rows` is empty. */
    empty?: ReactNode;
    /** Highlights one row (e.g. the one just saved). */
    highlightKey?: string | number | null;
    className?: string;
};

const ALIGN = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
} as const;

const HIDE = {
    lg: 'max-lg:hidden',
    xl: 'max-xl:hidden',
} as const;

/** The current URL with `changes` applied (null removes a parameter). */
export function useUrlWith() {
    const { url } = usePage();

    return (changes: Record<string, string | number | null | undefined>) => {
        const next = new URL(url, 'http://localhost');

        for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === undefined || value === '') {
                next.searchParams.delete(key);
            } else {
                next.searchParams.set(key, String(value));
            }
        }

        const query = next.searchParams.toString();

        return `${next.pathname}${query ? `?${query}` : ''}`;
    };
}

/** Ignore row clicks that land on links, buttons and form controls. */
function isInteractive(target: EventTarget | null): boolean {
    return (
        target instanceof Element &&
        Boolean(
            target.closest(
                'a, button, input, select, textarea, label, [role="menu"]',
            ),
        )
    );
}

/**
 * A dense, sortable table on glass. On phones every row becomes a small
 * card (see `Column.mobile`). Sorting is server-side through links:
 * `?sort=<column>&direction=asc|desc`, resetting `page`.
 */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    caption,
    sort = null,
    sortParams = { column: 'sort', direction: 'direction' },
    rowHref,
    actions,
    empty,
    highlightKey = null,
    className,
}: DataTableProps<T>) {
    const urlWith = useUrlWith();

    if (rows.length === 0) {
        return (
            <div className={className}>
                {empty ?? (
                    <EmptyState
                        compact
                        title="Nothing to show."
                        description="Nothing matches these filters."
                    />
                )}
            </div>
        );
    }

    const titleColumn =
        columns.find((column) => column.mobile === 'title') ?? columns[0];
    const tableColumns = columns.filter((column) => column.inTable !== false);

    const sortHref = (column: Column<T>) => {
        const key =
            column.sort === true ? column.key : (column.sort ?? column.key);
        const first = column.sortFirst ?? 'asc';
        const direction: SortDirection =
            sort?.column === key
                ? sort.direction === 'asc'
                    ? 'desc'
                    : 'asc'
                : first;

        return urlWith({
            [sortParams.column]: key,
            [sortParams.direction]: direction,
            page: null,
        });
    };

    const openRow = (event: MouseEvent, row: T) => {
        if (!rowHref || isInteractive(event.target) || event.defaultPrevented) {
            return;
        }

        // React bubbles events from portals through the component tree, so
        // a click inside a dialog opened from this row (its text, its
        // backdrop) reaches this handler too. Only clicks on the row count.
        if (
            !(event.target instanceof Node) ||
            !event.currentTarget.contains(event.target)
        ) {
            return;
        }

        // Respect selection: a drag to copy text is not a click.
        if (window.getSelection()?.toString()) {
            return;
        }

        router.visit(rowHref(row));
    };

    const titleCell = (row: T) =>
        rowHref ? (
            <Link
                href={rowHref(row)}
                className="rounded-[6px] text-bone transition-colors duration-300 ease-glass hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
            >
                {titleColumn.cell(row)}
            </Link>
        ) : (
            titleColumn.cell(row)
        );

    return (
        <div className={cn('min-w-0', className)}>
            {/* Tablets and up: a real table. A table wider than its panel
                (the leads table at 1280px) scrolls inside it rather than
                running out of the glass. */}
            <div className="overflow-x-auto max-md:hidden">
                <table className="w-full border-collapse text-left text-[14px]">
                    <caption className="sr-only">{caption}</caption>
                    <thead>
                        <tr className="border-b border-white/10">
                            {tableColumns.map((column) => {
                                const key =
                                    column.sort === true
                                        ? column.key
                                        : (column.sort ?? null);
                                const active =
                                    key !== null && sort?.column === key;

                                return (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        aria-sort={
                                            active
                                                ? sort?.direction === 'asc'
                                                    ? 'ascending'
                                                    : 'descending'
                                                : undefined
                                        }
                                        className={cn(
                                            'px-3 py-3 text-[10px] font-medium tracking-[0.2em] whitespace-nowrap text-smoke uppercase first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
                                            ALIGN[column.align ?? 'left'],
                                            column.hideBelow &&
                                                HIDE[column.hideBelow],
                                        )}
                                    >
                                        {key !== null ? (
                                            <Link
                                                href={sortHref(column)}
                                                preserveScroll
                                                preserveState
                                                className={cn(
                                                    'group/sort -mx-1 inline-flex items-center gap-1.5 rounded-[6px] px-1 uppercase transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                                                    active && 'text-bone',
                                                    column.align === 'right' &&
                                                        'flex-row-reverse',
                                                )}
                                            >
                                                {column.header}
                                                {active ? (
                                                    sort?.direction ===
                                                    'asc' ? (
                                                        <ArrowUp
                                                            aria-hidden
                                                            className="size-3 text-mint"
                                                        />
                                                    ) : (
                                                        <ArrowDown
                                                            aria-hidden
                                                            className="size-3 text-mint"
                                                        />
                                                    )
                                                ) : (
                                                    <ArrowUpDown
                                                        aria-hidden
                                                        className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-70 group-focus-visible/sort:opacity-70"
                                                    />
                                                )}
                                            </Link>
                                        ) : (
                                            column.header
                                        )}
                                    </th>
                                );
                            })}
                            {actions ? (
                                <th
                                    scope="col"
                                    className="w-px px-3 py-3 pr-5 sm:pr-6"
                                >
                                    <span className="sr-only">Actions</span>
                                </th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const key = rowKey(row);

                            return (
                                <tr
                                    key={key}
                                    onClick={
                                        rowHref
                                            ? (event) => openRow(event, row)
                                            : undefined
                                    }
                                    className={cn(
                                        'border-b border-white/[0.07] transition-colors duration-300 ease-glass last:border-b-0',
                                        rowHref &&
                                            'cursor-pointer hover:bg-white/[0.035]',
                                        highlightKey === key &&
                                            'bg-mint/[0.06]',
                                    )}
                                >
                                    {tableColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={cn(
                                                'px-3 py-3.5 align-middle text-mist first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
                                                ALIGN[column.align ?? 'left'],
                                                column === titleColumn &&
                                                    'text-bone',
                                                column.hideBelow &&
                                                    HIDE[column.hideBelow],
                                                column.className,
                                            )}
                                        >
                                            {column === titleColumn
                                                ? titleCell(row)
                                                : column.cell(row)}
                                        </td>
                                    ))}
                                    {actions ? (
                                        <td className="px-3 py-2 pr-5 text-right align-middle whitespace-nowrap sm:pr-6">
                                            <div className="inline-flex items-center gap-1">
                                                {actions(row)}
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Phones: one card per row. */}
            <ul
                aria-label={caption}
                className="divide-y divide-white/[0.08] md:hidden"
            >
                {rows.map((row) => {
                    const key = rowKey(row);
                    const subtitle = columns.filter(
                        (c) => c.mobile === 'subtitle',
                    );
                    const aside = columns.filter((c) => c.mobile === 'aside');
                    const details = columns.filter(
                        (c) =>
                            c !== titleColumn &&
                            (c.mobile === undefined || c.mobile === 'row'),
                    );

                    return (
                        <li
                            key={key}
                            onClick={
                                rowHref
                                    ? (event) => openRow(event, row)
                                    : undefined
                            }
                            className={cn(
                                'px-5 py-4',
                                rowHref &&
                                    'cursor-pointer active:bg-white/[0.04]',
                                highlightKey === key && 'bg-mint/[0.06]',
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[15px] leading-snug font-medium text-bone">
                                        {titleCell(row)}
                                    </p>
                                    {subtitle.map((column) => (
                                        <div
                                            key={column.key}
                                            className="mt-0.5 text-[13px] text-smoke"
                                        >
                                            {column.cell(row)}
                                        </div>
                                    ))}
                                </div>
                                {aside.length ? (
                                    <div className="flex shrink-0 items-center gap-2">
                                        {aside.map((column) => (
                                            <div key={column.key}>
                                                {column.cell(row)}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            {details.length ? (
                                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                    {details.map((column) => (
                                        <div
                                            key={column.key}
                                            className="min-w-0"
                                        >
                                            <dt className="text-[9.5px] font-medium tracking-[0.2em] text-smoke uppercase">
                                                {column.header}
                                            </dt>
                                            <dd className="mt-0.5 truncate text-[13.5px] text-mist">
                                                {column.cell(row)}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            ) : null}
                            {actions ? (
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    {actions(row)}
                                </div>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
