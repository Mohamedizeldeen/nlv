import {
    formatDate,
    formatDateTime,
    formatRelative,
} from '@/components/admin/format';
import { useNow } from '@/components/admin/use-now';

/**
 * "26 Sep 2026, 14:05" in the viewer's time zone. Filled in after
 * hydration (the server renders in UTC), like RelativeTime.
 */
export function ExactTime({
    value,
    dateOnly = false,
    className,
}: {
    /** ISO 8601 */
    value: string;
    dateOnly?: boolean;
    className?: string;
}) {
    const now = useNow();

    return (
        <time dateTime={value} className={className}>
            {now
                ? dateOnly
                    ? formatDate(value, { weekday: true })
                    : formatDateTime(value)
                : ' '}
        </time>
    );
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * " (2 h ago)" after an exact time, only while it says more than the date
 * beside it (within the last week). Nothing on the server or later on.
 */
export function RecentAgo({
    value,
    className,
}: {
    /** ISO 8601 */
    value: string;
    className?: string;
}) {
    const now = useNow();

    if (!now || now.getTime() - new Date(value).getTime() >= WEEK) {
        return null;
    }

    return (
        <span className={className}>
            {' '}
            (<time dateTime={value}>{formatRelative(value, now)}</time>)
        </span>
    );
}
