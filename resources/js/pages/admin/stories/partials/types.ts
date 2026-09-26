/*
 * Props of the admin Stories pages (App\Http\Controllers\Admin\StoryController).
 * Module-specific, so they live beside the pages rather than in types/admin.ts.
 * The existing columns are the English; each has an Arabic twin (`name_ar`).
 */
import type { FocusPoint, MediaRef } from '@/types/admin';
import type { TranslatableStoryField } from './fields';

/** One row of the stories list (`admin/stories/index`), in page order. */
export type StoryListItem = {
    id: number;
    name: string;
    role: string;
    store: string;
    city: string;
    /** Raw copy with the highlighted phrase in *asterisks*. */
    quote: string;
    metric: {
        figure: string;
        label: string;
        /** The compact label (falls back to `label` on the server). */
        short: string;
    };
    /** Null only when the stored ref is unusable. */
    portrait: MediaRef | null;
    focus: FocusPoint;
    zoom: number;
    is_published: boolean;
    /** Texts written in English but not yet in Arabic (English column names). */
    arabic_missing: TranslatableStoryField[];
};

export type StoriesIndexProps = {
    stories: StoryListItem[];
};

/** The story as the form edits it: keys match the input names. */
export type StoryForm = {
    /** Null for a new story. */
    id: number | null;
    name: string;
    role: string;
    store: string;
    city: string;
    coordinates: string | null;
    quote: string;
    metric_figure: string;
    metric_label: string;
    metric_short: string | null;
    metric_note: string | null;
    name_ar: string | null;
    role_ar: string | null;
    store_ar: string | null;
    city_ar: string | null;
    quote_ar: string | null;
    metric_label_ar: string | null;
    metric_short_ar: string | null;
    metric_note_ar: string | null;
    portrait: MediaRef | null;
    portrait_focus: FocusPoint;
    portrait_zoom: number;
    is_published: boolean;
    /** ISO 8601; null for a new story. */
    updated_at: string | null;
};

/** Server-side bounds, so the form checks the same ones. */
export type StoryLimits = {
    quote: number;
    zoomMin: number;
    zoomMax: number;
};

export type StoryHistoryEntry = {
    id: number;
    event: string;
    description: string;
    user: string | null;
    /** ISO 8601 */
    createdAt: string;
};

export type StoryCreateProps = {
    story: StoryForm;
    /** Where the new story will appear (it is added last). */
    position: number;
    total: number;
    limits: StoryLimits;
};

export type StoryEditProps = StoryCreateProps & {
    story: StoryForm & { id: number };
    /** The latest activity-log entries about this story, newest first. */
    history: StoryHistoryEntry[];
};
