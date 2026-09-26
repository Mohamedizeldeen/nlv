import { Head, Link } from '@inertiajs/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import ActivityController from '@/actions/App/Http/Controllers/Admin/ActivityController';
import { Button } from '@/components/admin/button';
import { DailyChart } from '@/components/admin/daily-chart';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import {
    formatDate,
    formatNumber,
    parseDay,
    plural,
} from '@/components/admin/format';
import { KeyValue } from '@/components/admin/key-value';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Panel } from '@/components/admin/panel';
import { Select } from '@/components/admin/select';
import { TextInput } from '@/components/admin/text-input';
import { cn } from '@/lib/utils';
import {
    ChangesBlock,
    EventLabel,
    formatDay,
    metaItems,
    propertyItems,
} from './partials/entry-parts';
import type { ActivityEntry, ActivityIndexProps } from './types';

/** Consecutive entries of the same day, in page order. */
function byDay(entries: ActivityEntry[]) {
    const days: { day: string; entries: ActivityEntry[] }[] = [];

    for (const entry of entries) {
        const last = days.at(-1);

        if (last && last.day === entry.day) {
            last.entries.push(entry);
        } else {
            days.push({ day: entry.day, entries: [entry] });
        }
    }

    return days;
}

function EntryRow({
    entry,
    open,
    onToggle,
    timezone,
}: {
    entry: ActivityEntry;
    open: boolean;
    onToggle: () => void;
    timezone: string;
}) {
    const panelId = `entry-${entry.id}`;
    const properties = propertyItems(entry.properties);
    // "Dev Admin signed in" already says who.
    const actorInText =
        entry.user !== null && entry.description.startsWith(entry.user.name);

    return (
        <li className={cn(open && 'bg-white/[0.03]')}>
            <h4>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={onToggle}
                    className="group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors duration-300 ease-glass hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none focus-visible:ring-inset sm:px-6 md:grid-cols-[3.5rem_minmax(0,1fr)_11rem_1.25rem]"
                >
                    {/* Phones: [what | time ⌄] then who; md+: time | what | who | ⌄. */}
                    <span className="grid min-w-0 gap-1 md:order-2">
                        <EventLabel event={entry.event} />
                        <span
                            className={cn(
                                'text-[14px] leading-snug text-pretty text-bone',
                                !open && 'line-clamp-2',
                            )}
                        >
                            {entry.description}
                        </span>
                    </span>
                    <span className="flex items-center gap-2 md:contents">
                        <span className="pt-px text-[13px] text-smoke tabular-nums md:order-1 md:self-start">
                            {entry.time}
                        </span>
                        <ChevronDown
                            aria-hidden
                            className={cn(
                                'size-4 shrink-0 text-smoke transition-[rotate,color] duration-300 ease-glass group-hover:text-bone md:order-4 md:mt-0.5 md:justify-self-end',
                                open && 'rotate-180 text-mint',
                            )}
                        />
                    </span>
                    <span
                        className={cn(
                            'min-w-0 truncate pt-px text-[13px] md:order-3 md:text-right',
                            entry.user ? 'text-mist' : 'text-smoke',
                            actorInText && 'max-md:hidden',
                        )}
                    >
                        {entry.actor}
                    </span>
                </button>
            </h4>

            <div
                id={panelId}
                role="region"
                aria-label={`Details of: ${entry.description}`}
                hidden={!open}
                className="px-5 pb-6 sm:px-6 md:pl-[calc(1.5rem+3.5rem+1rem)]"
            >
                <div className="grid gap-x-10 gap-y-6 border-t border-white/[0.08] pt-5 lg:grid-cols-12">
                    <div className="grid min-w-0 content-start gap-6 lg:col-span-7">
                        <section aria-label="What changed">
                            <p className="mb-2 text-[10px] font-medium tracking-[0.22em] text-smoke uppercase">
                                What changed
                            </p>
                            <ChangesBlock entry={entry} />
                        </section>
                        {properties.length ? (
                            <section aria-label="Details">
                                <p className="text-[10px] font-medium tracking-[0.22em] text-smoke uppercase">
                                    Details
                                </p>
                                <KeyValue items={properties} />
                            </section>
                        ) : null}
                    </div>
                    <div className="min-w-0 lg:col-span-5">
                        <KeyValue
                            columns={1}
                            items={metaItems(entry, timezone)}
                            className="[&>div:first-child]:pt-0"
                        />
                        <Link
                            href={ActivityController.show.url(entry.id)}
                            className="group mt-4 inline-flex items-center gap-1.5 rounded-[8px] text-[13px] text-mist transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                        >
                            Open this entry
                            <ArrowRight
                                aria-hidden
                                className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-mint"
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </li>
    );
}

export default function ActivityIndex({
    entries,
    filters,
    groups,
    users,
    perDay,
    timezone,
}: ActivityIndexProps) {
    const [open, setOpen] = useState<Set<number>>(() => new Set());
    const filtered = Object.values(filters).some((value) => value !== null);
    const allOpen =
        entries.data.length > 0 &&
        entries.data.every((entry) => open.has(entry.id));
    const monthTotal = perDay.reduce((sum, day) => sum + day.count, 0);

    const toggle = (id: number) =>
        setOpen((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });

    return (
        <>
            <Head title="Activity log · Admin" />

            <PageHeader
                title={
                    <>
                        Who did what, <em>and when.</em>
                    </>
                }
                description="Sign-ins, order requests and every change to the landing page, newest first. The log is read-only: entries can't be edited or removed."
            />

            <div className="mt-8 grid gap-5">
                <Panel
                    kicker="Last 30 days"
                    title={
                        filtered
                            ? 'Matching entries per day'
                            : 'Entries per day'
                    }
                    description={
                        filters.from || filters.to
                            ? 'The chart ignores the date range; the list below uses it.'
                            : undefined
                    }
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
                        data={perDay}
                        noun="event"
                        height={72}
                        emptyMessage={
                            filtered
                                ? 'Nothing matching in the last 30 days.'
                                : 'Nothing recorded in the last 30 days.'
                        }
                    />
                </Panel>

                <FilterBar>
                    <SearchInput
                        name="search"
                        defaultValue={filters.search ?? ''}
                        placeholder="Search descriptions"
                        className="sm:w-60"
                    />
                    <Select
                        size="sm"
                        name="group"
                        aria-label="Kind of activity"
                        placeholder="All activity"
                        options={groups}
                        defaultValue={filters.group ?? ''}
                        className="w-full sm:w-64"
                    />
                    <Select
                        size="sm"
                        name="user"
                        aria-label="Done by"
                        placeholder="Anyone"
                        options={users}
                        defaultValue={filters.user ?? ''}
                        className="w-full sm:w-44"
                    />
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <TextInput
                            size="sm"
                            type="date"
                            name="from"
                            aria-label="From"
                            max={filters.to ?? undefined}
                            defaultValue={filters.from ?? ''}
                            className="min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none"
                        />
                        <span aria-hidden className="text-smoke">
                            –
                        </span>
                        <TextInput
                            size="sm"
                            type="date"
                            name="to"
                            aria-label="To"
                            min={filters.from ?? undefined}
                            defaultValue={filters.to ?? ''}
                            className="min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none"
                        />
                    </div>
                </FilterBar>

                <Panel
                    padded={false}
                    variant="strong"
                    title={
                        filtered
                            ? `${plural(entries.total, 'entry', 'entries')} match`
                            : plural(entries.total, 'entry', 'entries')
                    }
                    description={
                        entries.total > 0
                            ? `Newest first, times in ${timezone}. Select an entry for what changed, who did it and from where.`
                            : undefined
                    }
                    actions={
                        entries.data.length ? (
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() =>
                                    setOpen(
                                        allOpen
                                            ? new Set()
                                            : new Set(
                                                  entries.data.map(
                                                      (entry) => entry.id,
                                                  ),
                                              ),
                                    )
                                }
                            >
                                {allOpen ? 'Collapse all' : 'Expand all'}
                            </Button>
                        ) : null
                    }
                >
                    {entries.data.length === 0 ? (
                        filtered ? (
                            <NoMatches
                                noun="entries"
                                clearHref={ActivityController.index.url()}
                                description="Try a wider date range, another kind of activity, or fewer words; or clear the filters to see every entry."
                            />
                        ) : (
                            <EmptyState
                                compact
                                className="my-6"
                                title={
                                    <>
                                        Nothing recorded <em>yet.</em>
                                    </>
                                }
                                description="Sign-ins, order requests and every edit made in this panel are written here as they happen."
                            />
                        )
                    ) : (
                        <div>
                            {byDay(entries.data).map((group) => (
                                <section
                                    key={group.day}
                                    aria-label={formatDay(group.day)}
                                >
                                    <h3 className="sticky top-[4.75rem] z-10 flex items-baseline justify-between gap-4 border-b border-white/[0.08] bg-[oklch(0.2_0.014_200/0.92)] px-5 py-2.5 text-[10px] font-medium tracking-[0.22em] text-smoke uppercase backdrop-blur-md sm:px-6 lg:top-0">
                                        <span className="text-mist">
                                            <span className="sm:hidden">
                                                {formatDate(
                                                    parseDay(group.day),
                                                    { weekday: true },
                                                )}
                                            </span>
                                            <span className="max-sm:hidden">
                                                {formatDay(group.day)}
                                            </span>
                                        </span>
                                        <span className="tabular-nums">
                                            {formatNumber(group.entries.length)}
                                            {group.entries.length === 1
                                                ? ' entry'
                                                : ' entries'}
                                            {entries.last_page > 1 ? (
                                                <span className="max-sm:hidden">
                                                    {' '}
                                                    on this page
                                                </span>
                                            ) : null}
                                        </span>
                                    </h3>
                                    <ol className="divide-y divide-white/[0.07]">
                                        {group.entries.map((entry) => (
                                            <EntryRow
                                                key={entry.id}
                                                entry={entry}
                                                open={open.has(entry.id)}
                                                onToggle={() =>
                                                    toggle(entry.id)
                                                }
                                                timezone={timezone}
                                            />
                                        ))}
                                    </ol>
                                </section>
                            ))}
                        </div>
                    )}
                </Panel>

                <Pagination paginator={entries} noun="entries" />
            </div>
        </>
    );
}
