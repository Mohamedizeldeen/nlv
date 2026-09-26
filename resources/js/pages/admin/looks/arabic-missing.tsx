import { ArabicMissing as ArabicMissingNote } from '@/components/admin/arabic-missing';
import { cn } from '@/lib/utils';

/**
 * The kit's "Arabic missing" note for a look or category row: `labels`
 * names each field for the tooltip and screen readers ("title, alt text").
 */
export function ArabicMissing<Field extends string>({
    fields,
    labels,
    className,
}: {
    fields: readonly Field[];
    labels: Record<Field, string>;
    className?: string;
}) {
    return (
        <ArabicMissingNote
            fields={fields.map((field) => labels[field])}
            className={cn('leading-none whitespace-nowrap', className)}
        />
    );
}

/** How the look fields are named in the marker. */
export const LOOK_FIELD_LABELS = {
    title: 'title',
    city: 'city',
    alt: 'alt text',
} as const;

/** How the category fields are named in the marker. */
export const CATEGORY_FIELD_LABELS = {
    name: 'name',
    note: 'note',
    stat_figure: 'figure',
    stat_unit: 'unit',
} as const;

/**
 * Under a preview shown in Arabic: which texts still show in English on
 * /ar because they are not translated yet (nothing when all are).
 */
export function PreviewFallbackNote({
    locale,
    missing,
    className,
}: {
    locale: 'en' | 'ar';
    /** Field names as the admin knows them, in form order. */
    missing: readonly string[];
    className?: string;
}) {
    if (locale !== 'ar' || missing.length === 0) {
        return null;
    }

    return (
        <p
            className={cn(
                'text-[12.5px] leading-relaxed text-pretty text-[oklch(0.8_0.09_195)]',
                className,
            )}
        >
            In English on /ar until translated: {missing.join(', ')}.
        </p>
    );
}
