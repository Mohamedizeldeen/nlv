import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { Locale } from '@/i18n';

const ARABIC = /\p{Script=Arabic}/u;
const LATIN = /\p{Script=Latin}/u;

/**
 * Whether admin-managed text is the English standing in for a missing
 * Arabic: on the Arabic page, a field left untranslated in the admin
 * arrives in English (App\Support\LandingContent). Latin letters and no
 * Arabic ones; figures ("+33%") and Arabic that quotes a Latin name
 * ("TryOn مرآة…") are not.
 */
export function isEnglishFallback(locale: Locale, text: string): boolean {
    return locale === 'ar' && LATIN.test(text) && !ARABIC.test(text);
}

/**
 * Admin-managed text (a story, a look, a plan, a question, a page title) as
 * the payload has it. On the Arabic page an untranslated value is set as an
 * English run, <bdi dir="ltr" lang="en">: isolated, so its punctuation stays
 * at its end ("Co." not ".Co") and the Arabic around it keeps its order,
 * and typeset as Latin (tracking, real italics). Anything else, and every
 * value on the English page, renders as it is. `children` replaces the text
 * when it carries markup (an *accent* phrase).
 */
export function Managed({
    text,
    children,
}: {
    text: string;
    children?: ReactNode;
}) {
    const { locale } = useI18n();
    const content = children ?? text;

    return isEnglishFallback(locale, text) ? (
        <bdi dir="ltr" lang="en">
            {content}
        </bdi>
    ) : (
        content
    );
}

/**
 * The same English run as attributes, for an element that holds one
 * managed value alone: `<span {...englishRun(locale, city)}>`. Use it when
 * the element cuts the value short (`truncate`, `line-clamp-*`: left to
 * right, the English ends in its ellipsis instead of losing its first
 * words) or tracks it (lang="en" on the element itself restores its
 * `tracking-*`, which Arabic text is set without). A single line can add
 * `rtl:text-right` to stay on the Arabic column's edge; a clamped block
 * cannot (its ellipsis would be clipped).
 */
export function englishRun(
    locale: Locale,
    text: string,
): { dir?: 'ltr'; lang?: 'en' } {
    return isEnglishFallback(locale, text) ? { dir: 'ltr', lang: 'en' } : {};
}
