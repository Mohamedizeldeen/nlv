import { isValidElement } from 'react';
import type { Locale } from '@/i18n/locales';

/**
 * Shared pieces of the bilingual kit (BilingualField, BilingualTextarea,
 * BilingualAccentInput, BilingualMarkdownField, BilingualList,
 * CompletenessBadge, PreviewLocaleToggle).
 *
 * Content is stored in two columns: the existing one is English (`title`)
 * and its Arabic twin carries an `_ar` suffix (`title_ar`).
 */

/** The two languages of the public site (`Locale` from `@/i18n/locales`). */
export type ContentLocale = Locale;

/** In the order the columns appear: English first (left), Arabic second. */
export const CONTENT_LOCALES: readonly ContentLocale[] = ['en', 'ar'];

/** One piece of copy in both languages. */
export type BilingualValue = { en: string; ar: string };

/** A prop that can differ per language, e.g. `{ en: 'Riyadh', ar: 'الرياض' }`. */
export type PerLocale<T> = Partial<Record<ContentLocale, T>>;

/** Inertia's error bag (`errors` from `<Form>`'s slot props). */
export type ErrorBag = Partial<Record<string, string>>;

export const LOCALE_META: Record<
    ContentLocale,
    { marker: string; name: string; native: string; dir: 'ltr' | 'rtl' }
> = {
    en: { marker: 'EN', name: 'English', native: 'English', dir: 'ltr' },
    ar: { marker: 'AR', name: 'Arabic', native: 'العربية', dir: 'rtl' },
};

/**
 * Arabic text in the admin (on an element with `lang="ar"`). The font
 * stacks already hand Arabic glyphs to IBM Plex Sans Arabic (`--font-sans`)
 * and Amiri (`--font-display`) behind the Latin faces, so Latin brand
 * names keep theirs, and `:lang(ar)` in landing.css turns letter-spacing
 * and synthetic italics off. What is left: Arabic reads small beside
 * Latin at the same size, so controls take it a size up.
 */
export const arabicControl = 'font-sans text-[16px]';

/** Arabic display copy (titles, quotes) in previews: Amiri, never slanted. */
export const arabicDisplay = 'font-display not-italic';

/** `title` → `title_ar`. */
export function arabicName(name: string): string {
    return `${name}_ar`;
}

/** `lang` and `dir` for an element that shows copy in `locale`. */
export function localeProps(locale: ContentLocale): {
    lang: ContentLocale;
    dir: 'ltr' | 'rtl';
} {
    return { lang: locale, dir: LOCALE_META[locale].dir };
}

/** True for null, undefined, whitespace, and lists without a filled item. */
export function isBlank(
    value: string | readonly (string | null)[] | null | undefined,
): boolean {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === 'string') {
        return value.trim() === '';
    }

    return value.every((item) => item === null || item.trim() === '');
}

/**
 * What a visitor on `locale` sees: the Arabic when it is filled, the
 * English otherwise (the server's `localized()` falls back the same way).
 */
export function localized(
    value: BilingualValue,
    locale: ContentLocale,
): string {
    return locale === 'ar' && !isBlank(value.ar) ? value.ar : value.en;
}

/**
 * Reads a column and its Arabic twin from a record:
 * `bilingualValue(story, 'city')` → `{ en: story.city, ar: story.city_ar }`
 * (null and missing values become '').
 */
export function bilingualValue<T extends object>(
    record: T,
    name: keyof T & string,
    nameAr: string = arabicName(name),
): BilingualValue {
    const source = record as Record<string, unknown>;
    const text = (value: unknown): string =>
        typeof value === 'string'
            ? value
            : typeof value === 'number'
              ? String(value)
              : '';

    return { en: text(source[name]), ar: text(source[nameAr]) };
}

/**
 * The opposite of `bilingualValue`: `{ city: 'Riyadh', city_ar: 'الرياض' }`,
 * to spread into a form's state.
 */
export function bilingualColumns(
    name: string,
    value: BilingualValue,
    nameAr: string = arabicName(name),
): Record<string, string> {
    return { [name]: value.en, [nameAr]: value.ar };
}

/** Picks one language out of a value that may or may not be per-language. */
export function perLocale<T>(
    value: T | PerLocale<T> | undefined,
    locale: ContentLocale,
): T | undefined {
    if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !isValidElement(value) &&
        ('en' in value || 'ar' in value)
    ) {
        return (value as PerLocale<T>)[locale];
    }

    return value as T | undefined;
}

/**
 * The event the completeness badge sends to an Arabic control before
 * focusing it, so a component that hides it (a tab, a collapsed row) can
 * show it first. It bubbles from the control.
 */
export const REVEAL_EVENT = 'bilingual:reveal';
