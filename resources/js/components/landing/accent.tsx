import type { AccentText } from '@/types/landing';

/**
 * Split copy marked up with *asterisks* around its accent phrase, exactly
 * like App\Support\LandingContent::splitAccent():
 * "Every screen is a *fitting room.*" becomes
 * { before: 'Every screen is a ', accent: 'fitting room.', after: '' }.
 * Without a starred phrase everything is in `before`.
 */
export function accentParts(text: string): AccentText {
    const match = /^(.*?)\*([^*]+)\*(.*)$/s.exec(text);

    if (!match) {
        return { before: text.replaceAll('*', ''), accent: '', after: '' };
    }

    return {
        before: match[1],
        accent: match[2],
        after: match[3].replaceAll('*', ''),
    };
}

/**
 * Renders `*accent*` copy with the phrase in an <em>, so the heading's own
 * em styling (italic mint) applies. `className` goes on the <em>.
 * Also takes copy the server already split (a story's `quote`).
 */
export function Accent({
    text,
    className,
}: {
    text: string | AccentText;
    className?: string;
}) {
    const { before, accent, after } =
        typeof text === 'string' ? accentParts(text) : text;

    return (
        <>
            {before}
            {accent ? <em className={className}>{accent}</em> : null}
            {after}
        </>
    );
}
