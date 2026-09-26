/*
 * Props of the activity log pages (Admin\ActivityController).
 */
import type { ChangeSet, DailyCount, Paginated } from '@/types/admin';

/** The filter groups, plus "other" for events outside them. */
export type ActivityGroup =
    | 'auth'
    | 'lead'
    | 'content'
    | 'settings'
    | 'users'
    | 'other';

/** The record an entry is about. */
export type ActivitySubject = {
    /** "story", "look category", "user"… */
    type: string;
    id: number | null;
    /** Its current name, when it still exists. */
    label: string | null;
    /** Its admin page, when it still exists and has one. */
    href: string | null;
    exists: boolean;
};

export type ActivityEntry = {
    id: number;
    /** e.g. "story.updated", "auth.login", "lead.submitted" */
    event: string;
    group: ActivityGroup;
    description: string;
    user: { id: number; name: string; email: string } | null;
    /** The user's name, or "Visitor" / "System". */
    actor: string;
    subject: ActivitySubject | null;
    /** properties.changes: { field: [before, after] }. */
    changes: ChangeSet | null;
    /** Every other property (source, plan, via, email…). */
    properties: Record<string, unknown> | null;
    ip: string | null;
    userAgent: string | null;
    /** ISO 8601 */
    createdAt: string;
    /** YYYY-MM-DD in the app's time zone. */
    day: string;
    /** HH:mm in the app's time zone. */
    time: string;
};

export type ActivityFilters = {
    group: string | null;
    /** A user id, or "none" for visitors and the system. */
    user: string | null;
    /** YYYY-MM-DD */
    from: string | null;
    /** YYYY-MM-DD */
    to: string | null;
    search: string | null;
};

export type FilterOption = { value: string; label: string };

export type ActivityIndexProps = {
    entries: Paginated<ActivityEntry>;
    filters: ActivityFilters;
    groups: FilterOption[];
    users: FilterOption[];
    /** Entries per day, last 30 days (every filter but the dates). */
    perDay: DailyCount[];
    /** The app's time zone ("UTC"): days and times are shown in it. */
    timezone: string;
};

export type RelatedEntry = {
    id: number;
    event: string;
    description: string;
    actor: string;
    createdAt: string;
};

export type ActivityShowProps = {
    entry: ActivityEntry;
    /** The latest 20 other entries about the same record. */
    related: RelatedEntry[];
    newerId: number | null;
    olderId: number | null;
    timezone: string;
};
