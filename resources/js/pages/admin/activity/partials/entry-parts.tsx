import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { DiffTable, humanizeField } from '@/components/admin/diff-table';
import {
    describeEvent,
    formatDate,
    formatLongDate,
    parseDay,
} from '@/components/admin/format';
import type { KeyValueItem } from '@/components/admin/key-value';
import { RelativeTime } from '@/components/admin/relative-time';
import { cn } from '@/lib/utils';
import type { ActivityEntry, ActivitySubject } from '../types';

/** "Saturday 26 September 2026" for a YYYY-MM-DD day (no time zone shift). */
export function formatDay(day: string): string {
    const date = parseDay(day);

    return `${formatLongDate(date)} ${date.getFullYear()}`;
}

/** Events that went wrong (failed sign-ins, lockouts) read in coral. */
export function isWarning(event: string): boolean {
    return /(_failed|\.lockout)$/.test(event);
}

/** "STORY · UPDATED" in spaced caps, tinted for warnings and new leads. */
export function EventLabel({
    event,
    className,
}: {
    event: string;
    className?: string;
}) {
    const { subject, action } = describeEvent(event);
    const tone = isWarning(event)
        ? 'text-coral'
        : event === 'lead.submitted'
          ? 'text-mint'
          : 'text-mist';

    return (
        <span
            className={cn(
                'text-[10px] font-medium tracking-[0.2em] text-smoke uppercase',
                className,
            )}
        >
            <span className={tone}>{subject}</span>
            {action ? <> · {action}</> : null}
        </span>
    );
}

const BROWSERS: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
    [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
    [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Android/, 'Android'],
    [/Windows/, 'Windows'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/CrOS/, 'ChromeOS'],
    [/Linux/, 'Linux'],
];

/**
 * A readable summary of a user agent: "Chrome 141 on macOS". Unknown
 * agents (scripts, the console) come back as null.
 */
export function describeAgent(agent: string | null): string | null {
    if (!agent) {
        return null;
    }

    const browser = BROWSERS.find(([pattern]) => pattern.test(agent));
    const system = SYSTEMS.find(([pattern]) => pattern.test(agent));
    const name = browser
        ? `${browser[1]} ${agent.match(browser[0])?.[1] ?? ''}`.trim()
        : null;

    if (name && system) {
        return `${name} on ${system[1]}`;
    }

    return name ?? (system ? system[1] : null);
}

/** The record an entry is about, linked when it still exists. */
export function SubjectLink({ subject }: { subject: ActivitySubject }) {
    const label = subject.label ?? `#${subject.id ?? '?'}`;
    const type = subject.type.charAt(0).toUpperCase() + subject.type.slice(1);

    if (!subject.exists) {
        return (
            <span>
                {type} #{subject.id}{' '}
                <span className="text-smoke">(deleted since)</span>
            </span>
        );
    }

    if (!subject.href) {
        return (
            <span>
                {type} · {label}
            </span>
        );
    }

    return (
        <Link
            href={subject.href}
            className="group inline-flex items-baseline gap-1 rounded-[6px] text-bone underline decoration-white/25 underline-offset-4 transition-colors hover:text-mint hover:decoration-mint/50 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
        >
            {type} · {label}
            <ArrowUpRight
                aria-hidden
                className="size-3.5 self-center text-smoke transition-colors group-hover:text-mint"
            />
        </Link>
    );
}

function PropertyValue({ value }: { value: unknown }): ReactNode {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    return (
        <code className="block font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-mist">
            {JSON.stringify(value, null, 1)}
        </code>
    );
}

/** The entry's extra properties (source, plan, via, email…) as label / value. */
export function propertyItems(
    properties: Record<string, unknown> | null,
): KeyValueItem[] {
    return Object.entries(properties ?? {}).map(([key, value]) => ({
        label: humanizeField(key),
        value: <PropertyValue value={value} />,
        wide: typeof value === 'object' && value !== null,
    }));
}

/**
 * Entries written by the console carry artisan's placeholder request
 * (127.0.0.1, "Symfony"): not worth showing as an address and a browser.
 */
function fromConsole(entry: ActivityEntry): boolean {
    return entry.actorKind === 'system' && entry.userAgent === 'Symfony';
}

/** When, who, what record, and where from. */
export function metaItems(
    entry: ActivityEntry,
    timezone: string,
): KeyValueItem[] {
    const viaConsole = fromConsole(entry);
    const agent = viaConsole ? null : describeAgent(entry.userAgent);

    return [
        {
            label: 'When',
            value: (
                <span className="grid">
                    <span>
                        {formatDate(parseDay(entry.day), { weekday: true })},{' '}
                        {entry.time}{' '}
                        <span className="text-smoke">{timezone}</span>
                    </span>
                    <RelativeTime
                        recentOnly
                        value={entry.createdAt}
                        className="text-[13px] text-smoke"
                    />
                </span>
            ),
        },
        {
            label: 'Who',
            value: entry.user ? (
                <span className="grid">
                    <span>{entry.user.name}</span>
                    <span className="text-[13px] text-smoke">
                        {entry.user.email}
                    </span>
                </span>
            ) : entry.actorKind === 'deleted' ? (
                <span className="grid">
                    <span>{entry.causerName}</span>
                    <span className="text-[13px] text-smoke">
                        This account has since been deleted
                    </span>
                </span>
            ) : (
                <span className="text-mist">
                    {entry.actorKind === 'system'
                        ? 'System (console or scheduled task)'
                        : 'A visitor, not signed in'}
                </span>
            ),
        },
        {
            label: 'Record',
            value: entry.subject ? (
                <SubjectLink subject={entry.subject} />
            ) : null,
        },
        {
            label: 'Event',
            value: (
                <code className="font-mono text-[13px] text-mist">
                    {entry.event}
                </code>
            ),
        },
        {
            label: 'IP address',
            value: viaConsole ? (
                <span className="text-smoke">None (run from the console)</span>
            ) : entry.ip ? (
                <span className="font-mono text-[13px] tabular-nums">
                    {entry.ip}
                </span>
            ) : null,
        },
        {
            label: 'Browser',
            value: viaConsole ? null : entry.userAgent ? (
                <span className="grid gap-1">
                    {agent ? <span>{agent}</span> : null}
                    <span className="font-mono text-[11.5px] leading-relaxed break-all text-smoke">
                        {entry.userAgent}
                    </span>
                </span>
            ) : null,
            wide: true,
        },
    ];
}

/** Deep equality where object keys may come back in any order (JSON columns). */
function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
        return (
            Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((item, index) => sameValue(item, b[index]))
        );
    }

    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
        return false;
    }

    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);

    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => key in right && sameValue(left[key], right[key]))
    );
}

/**
 * The before/after table, or a plain line when the entry records no field
 * changes (sign-ins, order requests, exports). Fields whose values only
 * came back in another order (price lists) are pointed out, since their
 * before and after look identical.
 */
export function ChangesBlock({ entry }: { entry: ActivityEntry }) {
    if (!entry.changes) {
        return (
            <p className="text-[13.5px] leading-relaxed text-smoke">
                No fields changed: this entry records an action, not an edit.
            </p>
        );
    }

    const reordered = Object.entries(entry.changes)
        .filter(([, [before, after]]) => sameValue(before, after))
        .map(([field]) => humanizeField(field));

    return (
        <div className="grid gap-3">
            <DiffTable changes={entry.changes} />
            {reordered.length ? (
                <p className="text-[12.5px] leading-relaxed text-pretty text-smoke">
                    {reordered.join(', ')}: same values as before, saved in a
                    different order. Nothing actually changed there.
                </p>
            ) : null}
        </div>
    );
}
