import { formatDateTime, formatRelative } from './format';
import { useNow } from './use-now';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * "12 min ago" in a <time> element, the exact date and time on hover.
 * Filled in after hydration (server and browser clocks and time zones
 * differ), and kept current every minute.
 */
export function RelativeTime({
    value,
    recentOnly = false,
    className,
}: {
    /** ISO 8601 */
    value: string;
    /**
     * Render nothing once the time is a week old (the label would only
     * repeat a date printed beside it).
     */
    recentOnly?: boolean;
    className?: string;
}) {
    const now = useNow();

    if (
        recentOnly &&
        (!now || now.getTime() - new Date(value).getTime() >= WEEK)
    ) {
        return null;
    }

    return (
        <time
            dateTime={value}
            title={now ? formatDateTime(value) : undefined}
            className={className}
        >
            {now ? formatRelative(value, now) : ' '}
        </time>
    );
}
