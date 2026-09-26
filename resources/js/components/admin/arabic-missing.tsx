import { cn } from '@/lib/utils';

/**
 * The quiet "Arabic missing" note on an index row (or under a card) whose
 * English has no Arabic yet in some places: the Arabic page shows the
 * English there until they are translated. `fields` names those texts as
 * the admin knows them ("title", "alt text"); hover shows them and screen
 * readers read them. Renders nothing when the record is fully translated.
 * Pass layout classes only (`whitespace-nowrap`, `mt-1`, `md:truncate`):
 * size, colour and wording are the same in every list.
 */
export function ArabicMissing({
    fields,
    as: Tag = 'span',
    className,
}: {
    fields: readonly string[];
    /** `p` when the note sits on its own line under the row's title. */
    as?: 'span' | 'p';
    className?: string;
}) {
    if (fields.length === 0) {
        return null;
    }

    const list = fields.join(', ');

    return (
        <Tag
            title={`Not translated yet: ${list}`}
            className={cn(
                'text-[11.5px] leading-snug font-normal text-[oklch(0.8_0.09_195)]',
                className,
            )}
        >
            Arabic missing
            <span className="sr-only">: {list}</span>
        </Tag>
    );
}
