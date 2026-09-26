/*
 * Props of the Lookbook admin pages (admin/looks/*, admin/look-categories/*),
 * as sent by Admin\LookController and Admin\LookCategoryController.
 * Visitor-facing texts come in two columns: the English (`title`) and its
 * Arabic twin (`title_ar`, empty until translated).
 */
import type { BilingualValue } from '@/components/admin/bilingual';
import type { FocusPoint, MediaRef, Paginated } from '@/types/admin';

/** A look's texts that have an Arabic column (English names). */
export type LookTextField = 'title' | 'city' | 'alt';

/** A category's texts that have an Arabic column (English names). */
export type CategoryTextField = 'name' | 'note' | 'stat_figure' | 'stat_unit';

/** A category as the look filter and the look form list it. */
export type LookCategoryOption = {
    id: number;
    name: string;
    slug: string;
    looks_count: number;
};

/** A look in the grid and in the page-order list. */
export type LookRow = {
    id: number;
    /** 1-based place in the page order (all looks, live or not). */
    position: number;
    title: string;
    city: string;
    seconds: number;
    category: { id: number; name: string; slug: string };
    /** Null only when the stored ref is broken. */
    after: MediaRef | null;
    before: MediaRef | null;
    alt: string;
    /** Width / height of the after image. */
    aspect: number;
    focus: FocusPoint;
    is_published: boolean;
    /** Written in English but not yet in Arabic (/ar shows the English). */
    arabic_missing: LookTextField[];
    updated_at: string | null;
};

export type LookFilters = {
    search: string | null;
    category: string | null;
    status: 'live' | 'hidden' | null;
};

export type LooksIndexProps = {
    view: 'grid' | 'order';
    /** The grid (null in the order view). */
    looks: Paginated<LookRow> | null;
    /** Every look in page order (only in the order view). */
    order: LookRow[] | null;
    categories: LookCategoryOption[];
    filters: LookFilters;
    counts: { total: number; live: number };
};

/** The look form's values (id null for a new look). */
export type LookFormData = {
    id: number | null;
    look_category_id: number | null;
    title: string;
    title_ar: string;
    city: string;
    city_ar: string;
    render_seconds: number;
    alt: string;
    alt_ar: string;
    after: MediaRef | null;
    before: MediaRef | null;
    aspect: number;
    focus: FocusPoint;
    is_published: boolean;
    updated_at: string | null;
};

export type LookFormProps = {
    look: LookFormData;
    categories: LookCategoryOption[];
    /** Where the look sits (or will sit) in the page order, 1-based. */
    position: number;
};

/** A small cover photo of a category (one of its first looks). */
export type CategoryCover = { media: MediaRef; focus: FocusPoint };

export type LookCategoryData = {
    id: number | null;
    name: string;
    name_ar: string;
    slug: string;
    note: string | null;
    note_ar: string | null;
    stat_figure: string | null;
    stat_figure_ar: string | null;
    stat_unit: string | null;
    stat_unit_ar: string | null;
    looks_count: number;
    live_count: number;
    covers: CategoryCover[];
};

export type LookCategoriesIndexProps = {
    categories: (LookCategoryData & {
        id: number;
        /** Written in English but not yet in Arabic (/ar shows the English). */
        arabic_missing: CategoryTextField[];
    })[];
    /**
     * The "All" filter's note as each page shows it (edited in Site
     * content), and the live look count.
     */
    all: {
        kicker: BilingualValue;
        line: BilingualValue;
        unit: BilingualValue;
        live: number;
    };
    /** Follows a category's name above its note: "Abayas · this week". */
    suffix: BilingualValue;
};

export type LookCategoryFormProps = {
    category: LookCategoryData;
    /** Every category in page order (for the filter-bar preview). */
    siblings: { id: number; name: string; name_ar: string | null }[];
    /** Follows the name above the note: "Abayas · this week". */
    suffix: BilingualValue;
};
