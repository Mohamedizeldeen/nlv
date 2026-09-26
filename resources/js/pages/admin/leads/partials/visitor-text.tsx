import type { ContentLocale } from '@/components/admin/bilingual';
import { LOCALE_META } from '@/components/admin/bilingual';

/*
 * What the visitor typed, inside the English admin. A lead from the Arabic
 * page usually arrives in Arabic script (name, company, city, message), so
 * each value is its own bidi island: an Arabic name keeps its order without
 * dragging the English punctuation around it along, and Arabic text gets
 * lang="ar" (the Arabic faces, no letter-spacing, no slanted glyphs).
 */

const FIRST_LETTER = /\p{L}/u;
const ARABIC_LETTER = /\p{Script=Arabic}/u;

/** Whether the text starts with an Arabic letter (its first letter decides, like dir="auto"). */
export function isArabicText(text: string | null | undefined): boolean {
    const letter = text?.match(FIRST_LETTER)?.[0];

    return letter !== undefined && ARABIC_LETTER.test(letter);
}

/**
 * The text wrapped in Unicode isolates (FSI … PDI), for plain strings such
 * as dialog lines and aria-labels, where a <bdi> can't go.
 */
export function isolate(text: string): string {
    return `⁨${text}⁩`;
}

/** One visitor-typed value in a line of admin text. */
export function VisitorText({
    text,
    className,
}: {
    text: string;
    className?: string;
}) {
    return (
        <bdi lang={isArabicText(text) ? 'ar' : undefined} className={className}>
            {text}
        </bdi>
    );
}

/** "English" / "Arabic": the language of the page a lead was sent from. */
export function languageName(locale: ContentLocale): string {
    return LOCALE_META[locale].name;
}
