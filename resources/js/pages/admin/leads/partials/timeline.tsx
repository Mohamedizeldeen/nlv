import { ChevronRight } from 'lucide-react';
import { DiffTable } from '@/components/admin/diff-table';
import { EmptyState } from '@/components/admin/empty-state';
import { describeEvent } from '@/components/admin/format';
import { RelativeTime } from '@/components/admin/relative-time';
import type { TimelineEntry } from '../types';
import { ExactTime } from './exact-time';

/** What happened, in the lead's own words (the subject is always this lead). */
const EVENT_LABELS: Record<string, string> = {
    'lead.submitted': 'Received',
    'lead.created': 'Created',
    'lead.status_changed': 'Status',
    'lead.note_added': 'Note',
    'lead.assigned': 'Assigned',
    'lead.unassigned': 'Unassigned',
    'lead.notes_updated': 'Team notes',
    'lead.updated': 'Edited',
    'lead.deleted': 'Deleted',
    'lead.restored': 'Restored',
};

const FIELD_LABELS: Record<string, string> = {
    admin_notes: 'Team notes',
    contacted_at: 'First contacted',
    assigned_to: 'Assigned to',
};

function label(event: string): string {
    const known = EVENT_LABELS[event];

    if (known) {
        return known;
    }

    const { subject, action } = describeEvent(event);

    return action ? action.charAt(0).toUpperCase() + action.slice(1) : subject;
}

/**
 * The lead's activity log as a ledger, newest first: when, what, who, the
 * note written with it, and (folded) the before/after of the fields.
 */
export function LeadTimeline({ entries }: { entries: TimelineEntry[] }) {
    if (entries.length === 0) {
        return (
            <EmptyState
                compact
                className="my-6"
                title={
                    <>
                        Nothing logged <em>yet.</em>
                    </>
                }
                description="Status changes, notes and assignments appear here as they happen."
            />
        );
    }

    return (
        <ol className="divide-y divide-white/[0.07]">
            {entries.map((entry) => (
                <li
                    key={entry.id}
                    className="grid gap-x-5 gap-y-1 px-5 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:px-6"
                >
                    <div className="flex items-baseline gap-2 text-[12px] text-smoke tabular-nums sm:grid sm:content-start sm:gap-0.5">
                        <RelativeTime
                            value={entry.createdAt}
                            className="text-mist"
                        />
                        <ExactTime
                            value={entry.createdAt}
                            className="max-sm:before:mr-2 max-sm:before:text-white/25 max-sm:before:content-['·']"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-medium tracking-[0.2em] text-smoke uppercase">
                            <span className="text-mist">
                                {label(entry.event)}
                            </span>{' '}
                            · {entry.user ?? 'visitor'}
                        </p>
                        <p className="mt-1 text-[14px] leading-snug text-pretty text-bone">
                            {entry.description}
                        </p>
                        {entry.note ? (
                            <p className="mt-2.5 border-l border-mint/40 pl-3 text-[14px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line text-mist">
                                {entry.note}
                            </p>
                        ) : null}
                        {entry.changes ? (
                            <details className="group mt-2">
                                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[6px] text-[12.5px] text-smoke transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                                    <ChevronRight
                                        aria-hidden
                                        className="size-3.5 transition-transform duration-300 group-open:rotate-90"
                                    />
                                    {Object.keys(entry.changes).length === 1
                                        ? 'Before and after'
                                        : `${Object.keys(entry.changes).length} fields, before and after`}
                                </summary>
                                <DiffTable
                                    changes={entry.changes}
                                    labels={FIELD_LABELS}
                                    className="mt-2"
                                />
                            </details>
                        ) : null}
                    </div>
                </li>
            ))}
        </ol>
    );
}
