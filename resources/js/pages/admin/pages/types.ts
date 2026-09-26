/*
 * Props of the /admin/pages screens (Admin\PageController). A page is
 * written in English and Arabic: every text column has an `_ar` twin
 * (served at /pages/{slug} and /ar/pages/{slug}; the slug is shared).
 */
import type { Paginated, SortState } from '@/types/admin';

export type FooterGroup = 'company' | 'legal';

export type Option = { value: string; label: string };

/** The page columns that have an Arabic twin (`title_ar`, …). */
export type TranslatableColumn = 'title' | 'summary' | 'body';

/** One row of the pages table. */
export type PageRow = {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    footer_group: FooterGroup | null;
    is_published: boolean;
    /** The English or Arabic text still carries the seeded "Placeholder page." note. */
    placeholder: boolean;
    /** Written in English but not in Arabic yet: /ar/pages/{slug} shows the English there. */
    missing_arabic: TranslatableColumn[];
    /** ISO 8601 */
    updated_at: string;
};

/** A page in one of the footer columns, in link order. */
export type FooterLink = {
    id: number;
    title: string;
    slug: string;
    is_published: boolean;
};

export type PagesIndexProps = {
    pages: Paginated<PageRow>;
    filters: {
        search: string | null;
        /** A FooterGroup, or "none" for pages outside the footer. */
        group: string | null;
        status: 'live' | 'hidden' | null;
    };
    sort: SortState | null;
    footer: Record<FooterGroup, FooterLink[]>;
    footerGroups: Option[];
    /** Every page, whatever the filters. */
    total: number;
};

/** The page being edited (id null on the create form). */
export type EditablePage = {
    id: number | null;
    title: string;
    slug: string;
    summary: string;
    /** Markdown. */
    body: string;
    /** The Arabic versions ('' when not written yet). */
    title_ar: string;
    summary_ar: string;
    /** Markdown. */
    body_ar: string;
    footer_group: FooterGroup | null;
    is_published: boolean;
    /** ISO 8601; null until saved. */
    updated_at: string | null;
    created_at: string | null;
};

export type PageFormProps = {
    page: EditablePage;
    /** The body rendered by the server (what /pages/{slug} shows). */
    html: string;
    /** The Arabic body rendered by the server ('' until it is written). */
    htmlAr: string;
    footerGroups: Option[];
};
