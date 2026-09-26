/*
 * Props of the leads pages (Admin\LeadController). Module-local on purpose:
 * types/admin.ts is shared by every module.
 */
import type { ContentLocale } from '@/components/admin/bilingual';
import type { LeadPlan, LeadStatus, Paginated, SortState } from '@/types/admin';

/** "deleted" lists the soft-deleted leads. */
export type LeadTab = LeadStatus | 'all' | 'deleted';

export type LeadFilters = {
    search: string | null;
    /** A LeadStatus or "deleted"; null = every lead that isn't deleted. */
    status: Exclude<LeadTab, 'all'> | null;
    plan: LeadPlan | null;
    country: string | null;
    /** The language of the page the request was sent from. */
    locale: ContentLocale | null;
    /** YYYY-MM-DD, received on or after. */
    from: string | null;
    /** YYYY-MM-DD, received on or before. */
    to: string | null;
};

export type LeadRow = {
    id: number;
    reference: string;
    name: string;
    company: string;
    email: string;
    country: string;
    city: string;
    devices: number;
    plan: LeadPlan;
    status: LeadStatus;
    /** The language of the page it was sent from: reply in it. */
    locale: ContentLocale;
    /** The assigned admin's name. */
    assignee: string | null;
    /** ISO 8601 */
    createdAt: string;
    deletedAt: string | null;
};

export type Option = { value: string; label: string };

export type LeadsIndexProps = {
    leads: Paginated<LeadRow>;
    filters: LeadFilters;
    sort: SortState;
    /** Per tab, under the other filters (search, plan, country, dates). */
    counts: Record<LeadTab, number>;
    options: {
        plans: Option[];
        /** Every country a lead came from, as typed, A to Z. */
        countries: string[];
    };
};

export type LeadDetail = {
    id: number;
    reference: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    /** Digits for wa.me; null when the phone has no country code. */
    whatsapp: string | null;
    country: string;
    city: string;
    devices: number;
    plan: LeadPlan;
    planLabel: string;
    /** The visitor's own words: render as text, never as HTML or Markdown. */
    message: string;
    status: LeadStatus;
    source: string | null;
    sourceLabel: string | null;
    /** The language of the page it was sent from: reply in it. */
    locale: ContentLocale;
    ipAddress: string | null;
    userAgent: string | null;
    adminNotes: string | null;
    assignedTo: number | null;
    assignee: string | null;
    consentAt: string | null;
    contactedAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type TimelineEntry = {
    id: number;
    /** lead.submitted, lead.status_changed, lead.note_added, lead.assigned… */
    event: string;
    description: string;
    user: string | null;
    createdAt: string;
    /** A note written with a status change. */
    note: string | null;
    changes: Record<string, [unknown, unknown]> | null;
};

export type LeadShowProps = {
    lead: LeadDetail;
    statuses: Option[];
    /** Admins a lead can be assigned to (value = user id). */
    admins: Option[];
    /** Newest first. */
    timeline: TimelineEntry[];
    limits: { note: number; notes: number };
};
