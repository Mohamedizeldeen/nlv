/*
 * The story's texts that are written in both languages: the English column
 * and its Arabic twin (`quote` + `quote_ar`), in form order.
 */

/** The story's texts that have an Arabic column, in form order. */
export const TRANSLATABLE_STORY_FIELDS = [
    'name',
    'role',
    'store',
    'city',
    'quote',
    'metric_label',
    'metric_note',
    'metric_short',
] as const;

export type TranslatableStoryField = (typeof TRANSLATABLE_STORY_FIELDS)[number];

/** How the form labels each text (the completeness badge and list reuse them). */
export const STORY_FIELD_LABELS: Record<TranslatableStoryField, string> = {
    name: 'Name',
    role: 'Role',
    store: 'Store',
    city: 'City',
    quote: 'Quote',
    metric_label: 'Label',
    metric_note: 'Note',
    metric_short: 'Short label',
};
