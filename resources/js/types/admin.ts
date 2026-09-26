/*
 * Shared types for the admin panel (resources/js/pages/admin/*).
 * Backend contract: ADMIN.md sections 1, 3 and 9.
 */

/** Shared Inertia prop `admin`: set for admins, null for everyone else. */
export type AdminSharedProps = {
    /** Leads with status "new" (drives the sidebar count). */
    newLeads: number;
};

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

export type LeadPlan = 'buy' | 'lease' | 'chain' | 'unsure';

/** Where an image lives (Unsplash stock or an upload); defined with the landing payload. */
export type { MediaRef } from './landing';

/** A 0..1 focal point, from the top-left corner: [x, y]. */
export type FocusPoint = [number, number];

export type SortDirection = 'asc' | 'desc';

/** The active sort of an index page, echoed back by the controller. */
export type SortState = {
    column: string;
    direction: SortDirection;
};

/** One entry of a Laravel paginator's `links` array. */
export type PaginatorLink = {
    url: string | null;
    /** May contain HTML entities ("&laquo; Previous"). */
    label: string;
    active: boolean;
    page?: number | null;
};

/** `LengthAwarePaginator::toArray()` (what `->paginate()` sends to Inertia). */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    path: string;
    first_page_url: string;
    last_page_url: string;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: PaginatorLink[];
};

/** `{ field: [before, after] }`, as stored in activity_logs.properties.changes. */
export type ChangeSet = Record<string, [unknown, unknown]>;

export type DashboardStats = {
    newLeads: number;
    /** The last 7 days, today included. */
    leadsThisWeek: number;
    totalLeads: number;
    wonLeads: number;
    publishedStories: number;
    publishedLooks: number;
    publishedPages: number;
};

export type DailyCount = {
    /** YYYY-MM-DD */
    date: string;
    count: number;
};

export type RecentLead = {
    id: number;
    reference: string;
    name: string;
    company: string;
    country: string;
    devices: number;
    /** A LeadPlan value. */
    plan: string;
    /** A LeadStatus value. */
    status: string;
    /** ISO 8601 */
    createdAt: string;
};

export type RecentActivity = {
    id: number;
    /** e.g. "lead.submitted", "story.updated", "auth.login" */
    event: string;
    description: string;
    /** The acting user's name; null for guests and the system. */
    user: string | null;
    /** ISO 8601 */
    createdAt: string;
};

/** Props of the `admin/dashboard` page (ADMIN.md section 9). */
export type DashboardProps = {
    stats: DashboardStats;
    /** The last 30 days, zero-filled, oldest first. */
    leadsByDay: DailyCount[];
    /** The latest 6. */
    recentLeads: RecentLead[];
    /** The latest 8. */
    recentActivity: RecentActivity[];
};
