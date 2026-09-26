import { cn } from '@/lib/utils';
import type { ChangeSet } from '@/types/admin';

/** Whether a logged field is an Arabic twin (`title_ar`, `hero.kicker_ar`, `features_ar.2`). */
export function isArabicField(field: string): boolean {
    return field.split('.').some((part) => /^\w+_ar$/.test(part));
}

/**
 * "portrait_focus_x" → "Portrait focus x"; dots become " · ". An Arabic
 * twin is named after its English field: "title_ar" → "Arabic title",
 * "hero.kicker_ar" → "Hero · Arabic kicker".
 */
export function humanizeField(field: string): string {
    const text = field
        .split('.')
        .map((part) =>
            /^\w+_ar$/.test(part)
                ? `Arabic ${part.slice(0, -3).replaceAll('_', ' ')}`
                : part.replaceAll('_', ' '),
        )
        .join(' · ');

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function Value({ value, arabic }: { value: unknown; arabic?: boolean }) {
    if (value === null || value === undefined || value === '') {
        return <span className="text-smoke italic">empty</span>;
    }

    if (typeof value === 'boolean') {
        return <span>{value ? 'Yes' : 'No'}</span>;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        // dir="auto": Arabic (or any right-to-left text) keeps its own order.
        return (
            <span
                lang={arabic ? 'ar' : undefined}
                dir="auto"
                className="whitespace-pre-line"
            >
                {String(value)}
            </span>
        );
    }

    return (
        <code className="block font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(value, null, 1)}
        </code>
    );
}

/**
 * Before/after of a change set (`properties.changes` of an activity log
 * entry): one row per field, the old value muted, the new one bright.
 */
export function DiffTable({
    changes,
    labels = {},
    className,
}: {
    changes: ChangeSet;
    /** Friendlier names for fields: { metric_figure: 'Figure' }. */
    labels?: Record<string, string>;
    className?: string;
}) {
    const fields = Object.keys(changes);

    if (fields.length === 0) {
        return (
            <p className={cn('text-[13px] text-smoke', className)}>
                No field changes were recorded.
            </p>
        );
    }

    return (
        <table
            className={cn(
                'w-full border-collapse text-left text-[13.5px] max-sm:block',
                className,
            )}
        >
            <thead className="max-sm:sr-only">
                <tr className="border-b border-white/10">
                    <th
                        scope="col"
                        className="w-[22%] py-2 pr-4 text-[10px] font-medium tracking-[0.2em] text-smoke uppercase"
                    >
                        Field
                    </th>
                    <th
                        scope="col"
                        className="py-2 pr-4 text-[10px] font-medium tracking-[0.2em] text-smoke uppercase"
                    >
                        Before
                    </th>
                    <th
                        scope="col"
                        className="py-2 text-[10px] font-medium tracking-[0.2em] text-smoke uppercase"
                    >
                        After
                    </th>
                </tr>
            </thead>
            <tbody className="max-sm:block">
                {fields.map((field) => {
                    const [before, after] = changes[field];
                    const arabic = isArabicField(field);

                    return (
                        <tr
                            key={field}
                            className="border-b border-white/[0.07] align-top last:border-b-0 max-sm:grid max-sm:gap-1.5 max-sm:py-3"
                        >
                            <th
                                scope="row"
                                className="py-2.5 pr-4 font-medium text-mist max-sm:p-0"
                            >
                                {labels[field] ?? humanizeField(field)}
                            </th>
                            <td className="py-2.5 pr-4 [overflow-wrap:anywhere] text-smoke max-sm:p-0">
                                <span className="text-[9.5px] tracking-[0.2em] text-smoke/80 uppercase sm:hidden">
                                    Before{' '}
                                </span>
                                <Value value={before} arabic={arabic} />
                            </td>
                            <td className="py-2.5 [overflow-wrap:anywhere] text-bone max-sm:p-0">
                                <span className="text-[9.5px] tracking-[0.2em] text-mint/80 uppercase sm:hidden">
                                    After{' '}
                                </span>
                                <Value value={after} arabic={arabic} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
