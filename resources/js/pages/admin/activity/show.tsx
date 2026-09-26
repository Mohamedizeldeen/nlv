import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ActivityController from '@/actions/App/Http/Controllers/Admin/ActivityController';
import { button } from '@/components/admin/button';
import { describeEvent } from '@/components/admin/format';
import { KeyValue } from '@/components/admin/key-value';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import {
    ChangesBlock,
    EventLabel,
    metaItems,
    propertyItems,
} from './partials/entry-parts';
import type { ActivityShowProps } from './types';

export default function ActivityShow({
    entry,
    related,
    newerId,
    olderId,
    timezone,
}: ActivityShowProps) {
    const { subject, action } = describeEvent(entry.event);
    const properties = propertyItems(entry.properties);

    return (
        <>
            <Head title={`Entry ${entry.id} · Activity log · Admin`} />

            <PageHeader
                crumbs={[{ label: `Entry ${entry.id}` }]}
                title={
                    action ? (
                        <>
                            {subject} <em>{action}.</em>
                        </>
                    ) : (
                        // "New lead." accents its last word, like every title.
                        <>
                            {subject.split(' ').slice(0, -1).join(' ')}{' '}
                            <em>{subject.split(' ').at(-1)}.</em>
                        </>
                    )
                }
                description={entry.description}
                actions={
                    <nav
                        aria-label="Neighbouring entries"
                        className="flex flex-wrap gap-2"
                    >
                        {newerId ? (
                            <Link
                                href={ActivityController.show.url(newerId)}
                                className={button({ variant: 'glass' })}
                            >
                                <ArrowLeft aria-hidden /> Newer
                            </Link>
                        ) : null}
                        {olderId ? (
                            <Link
                                href={ActivityController.show.url(olderId)}
                                className={button({ variant: 'glass' })}
                            >
                                Older <ArrowRight aria-hidden />
                            </Link>
                        ) : null}
                    </nav>
                }
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-12 lg:items-start">
                <div className="grid gap-5 lg:col-span-8">
                    <Panel
                        title="What changed"
                        description={
                            entry.changes
                                ? 'Each field as it was before and after.'
                                : undefined
                        }
                        variant="strong"
                    >
                        <ChangesBlock entry={entry} />
                    </Panel>

                    {properties.length ? (
                        <Panel
                            title="Details"
                            description="Recorded with the entry."
                        >
                            <KeyValue
                                items={properties}
                                className="[&>div:first-child]:pt-0 sm:[&>div:nth-child(2)]:pt-0"
                            />
                        </Panel>
                    ) : null}
                </div>

                <div className="grid gap-5 lg:col-span-4">
                    <Panel title="The entry">
                        <KeyValue
                            columns={1}
                            items={metaItems(entry, timezone)}
                            className="[&>div:first-child]:pt-0 [&>div:last-child]:border-b-0 [&>div:last-child]:pb-0"
                        />
                    </Panel>

                    {entry.subject ? (
                        <Panel
                            title="Same record, other entries"
                            description={
                                related.length === 0
                                    ? undefined
                                    : related.length === 1
                                      ? `One more entry about this ${entry.subject.type}.`
                                      : related.length < 20
                                        ? `${related.length} more entries about this ${entry.subject.type}, newest first.`
                                        : `The 20 latest entries about this ${entry.subject.type}.`
                            }
                            padded={false}
                        >
                            {related.length ? (
                                <ol className="divide-y divide-white/[0.07]">
                                    {related.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                href={ActivityController.show.url(
                                                    item.id,
                                                )}
                                                className="grid gap-1 px-5 py-3 transition-colors duration-300 ease-glass hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none focus-visible:ring-inset sm:px-6"
                                            >
                                                <span className="flex items-baseline justify-between gap-3">
                                                    <EventLabel
                                                        event={item.event}
                                                        className="truncate"
                                                    />
                                                    <RelativeTime
                                                        value={item.createdAt}
                                                        className="shrink-0 text-[12px] text-smoke tabular-nums"
                                                    />
                                                </span>
                                                <span className="text-[13.5px] leading-snug text-pretty text-bone">
                                                    {item.description}
                                                </span>
                                                <span className="text-[12px] text-smoke">
                                                    {item.actor}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="px-5 py-4 text-[13.5px] text-smoke sm:px-6">
                                    This is the only entry about this{' '}
                                    {entry.subject.type}.
                                </p>
                            )}
                        </Panel>
                    ) : null}

                    <Link
                        href={ActivityController.index.url()}
                        className="group inline-flex items-center gap-1.5 justify-self-start rounded-[8px] text-[13px] text-mist transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                    >
                        <ArrowLeft
                            aria-hidden
                            className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:-translate-x-0.5 group-hover:text-mint"
                        />
                        The whole activity log
                    </Link>
                </div>
            </div>
        </>
    );
}
