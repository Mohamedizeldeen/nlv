/*
 * Display formatting for the admin panel. English only, en-GB day-first
 * dates ("26 Sep 2026"), thousands with commas.
 */

const numberFormat = new Intl.NumberFormat('en-US');

/** 1284 → "1,284". */
export function formatNumber(value: number): string {
    return numberFormat.format(value);
}

function toDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
}

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * "26 Sep 2026" (or "26 Sep" with `{ year: false }`, "Sat 26 Sep" with
 * `{ weekday: true }`). Month names are fixed three-letter English, not
 * the browser's locale data ("Sept" in some).
 */
export function formatDate(
    value: string | Date,
    {
        year = true,
        weekday = false,
    }: { year?: boolean; weekday?: boolean } = {},
): string {
    const date = toDate(value);

    return [
        weekday ? WEEKDAYS[date.getDay()] : null,
        date.getDate(),
        MONTHS[date.getMonth()],
        year ? date.getFullYear() : null,
    ]
        .filter((part) => part !== null)
        .join(' ');
}

/** "2026-09-26" (a date without a time) as a local date, with no UTC shift. */
export function parseDay(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);

    return new Date(y, m - 1, d);
}

/** "26 Sep 2026, 14:05". */
export function formatDateTime(value: string | Date): string {
    const date = toDate(value);

    return `${formatDate(date)}, ${date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}

/** "Friday 26 September". */
export function formatLongDate(value: string | Date): string {
    return toDate(value).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

/**
 * "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago", then the
 * date. Pass `now` to keep a list consistent within one render.
 */
export function formatRelative(
    value: string | Date,
    now: Date = new Date(),
): string {
    const date = toDate(value);
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (seconds < 45) {
        return 'just now';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
        return `${hours} h ago`;
    }

    const days = Math.round(hours / 24);

    if (days === 1) {
        return 'yesterday';
    }

    if (days < 7) {
        return `${days} days ago`;
    }

    return formatDate(date, { year: date.getFullYear() !== now.getFullYear() });
}

/** "4 leads" / "1 lead". */
export function plural(count: number, one: string, many = `${one}s`): string {
    return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

const EVENT_SUBJECTS: Record<string, string> = {
    auth: 'Account',
    lead: 'Lead',
    story: 'Story',
    look: 'Look',
    look_category: 'Category',
    plan: 'Plan',
    pricing: 'Pricing',
    faq: 'FAQ',
    page: 'Page',
    setting: 'Setting',
    settings: 'Site content',
    user: 'User',
};

/** Whole events that read better with their own wording. */
const EVENT_NAMES: Record<string, { subject: string; action: string }> = {
    'auth.login': { subject: 'Sign-in', action: '' },
    'auth.logout': { subject: 'Sign-out', action: '' },
    'auth.login_failed': { subject: 'Sign-in', action: 'failed' },
    'auth.password_reset': { subject: 'Password', action: 'reset' },
    'auth.two_factor_enabled': { subject: 'Two-factor', action: 'turned on' },
    'auth.two_factor_disabled': { subject: 'Two-factor', action: 'turned off' },
    'lead.submitted': { subject: 'New lead', action: '' },
    'user.admin_granted': { subject: 'User', action: 'made admin' },
    'user.admin_revoked': { subject: 'User', action: 'admin removed' },
};

/**
 * An activity event split for display: "look_category.updated" →
 * { subject: "Category", action: "updated" }; "auth.login" → { subject:
 * "Sign-in", action: "" }.
 */
export function describeEvent(event: string): {
    subject: string;
    action: string;
} {
    const named = EVENT_NAMES[event];

    if (named) {
        return named;
    }

    const [group, ...rest] = event.split('.');
    const action = rest.join(' ').replaceAll('_', ' ');
    const subject =
        EVENT_SUBJECTS[group] ??
        group.charAt(0).toUpperCase() + group.slice(1).replaceAll('_', ' ');

    return { subject, action };
}

/** Plan keys (LeadPlan) to their labels. */
export const PLAN_LABELS: Record<string, string> = {
    buy: 'Buy',
    lease: 'Lease',
    chain: 'Chain',
    unsure: 'Not sure yet',
};
