import { usePage } from '@inertiajs/react';
import { use, useLayoutEffect, useMemo } from 'react';
import {
    DEFAULT_LOCALE,
    directionOf,
    formatNumber,
    isLocale,
    localePath,
    translate,
} from '@/i18n';
import type { Alternates, Direction, Locale, Translate } from '@/i18n';
import { LocaleOverrideContext } from '@/i18n/locale-provider';

export type I18n = {
    locale: Locale;
    dir: Direction;
    isRtl: boolean;
    /** The same page in each language; null where the page has no twin. */
    alternates: Alternates | null;
    /** A static string: `t('common.otherLanguage')`, `t('hero.x', { count })`. */
    t: Translate;
    /** Western digits in both languages: 10284 → "10,284". */
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    /** A public page's URL in this language: '/pages/privacy' → '/ar/pages/privacy'. */
    localePath: (href: string) => string;
};

type SharedLocale = { locale: Locale; alternates: Alternates | null };

function parseAlternates(value: unknown): Alternates | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }

    const { en, ar } = value as Record<string, unknown>;

    return typeof en === 'string' && typeof ar === 'string' ? { en, ar } : null;
}

/** Both URLs of a page that exists in both languages, from its own URL. */
function alternatesOf(url: string): Alternates | null {
    const en = localePath(url, 'en');
    const ar = localePath(url, 'ar');

    return en === ar ? null : { en, ar };
}

/**
 * The `locale` and `alternates` shared props (HandleInertiaRequests). Outside
 * an Inertia page (the landing-preview harness) usePage() throws: the
 * harness passes the language through <LocaleProvider> instead.
 */
function useSharedLocale(): SharedLocale {
    const override = use(LocaleOverrideContext);
    let page: { props: Record<string, unknown>; url: string } | null = null;

    try {
        page = usePage();
    } catch {
        page = null;
    }

    if (override) {
        return {
            locale: override.locale,
            alternates: override.alternates ?? null,
        };
    }

    if (!page) {
        return { locale: DEFAULT_LOCALE, alternates: null };
    }

    const { props, url } = page;

    return {
        locale: isLocale(props.locale) ? props.locale : DEFAULT_LOCALE,
        // null from the server means "no twin"; a missing prop (an older
        // server) falls back to the page's own URL.
        alternates:
            'alternates' in props
                ? parseAlternates(props.alternates)
                : alternatesOf(url),
    };
}

/**
 * The page's language and everything that depends on it. The locale comes
 * from the URL (the server shares it), so it is the same during SSR and
 * hydration.
 */
export function useI18n(): I18n {
    const { locale, alternates } = useSharedLocale();
    const alternateEn = alternates?.en;
    const alternateAr = alternates?.ar;

    return useMemo(() => {
        const dir = directionOf(locale);

        return {
            locale,
            dir,
            isRtl: dir === 'rtl',
            alternates:
                alternateEn !== undefined && alternateAr !== undefined
                    ? { en: alternateEn, ar: alternateAr }
                    : null,
            t: ((key: string, vars?: Record<string, string | number>) =>
                translate(locale, key, vars)) as Translate,
            formatNumber: (value, options) =>
                formatNumber(locale, value, options),
            localePath: (href) => localePath(href, locale),
        };
    }, [locale, alternateEn, alternateAr]);
}

/**
 * Points <html lang dir> at `locale`, writing only what differs: assigning
 * even the same `lang` makes the browser restyle the whole document.
 */
function applyDocumentLocale(locale: Locale): void {
    const root = document.documentElement;
    const dir = directionOf(locale);

    if (root.lang !== locale) {
        root.lang = locale;
    }

    if (root.dir !== dir) {
        root.dir = dir;
    }
}

/**
 * Keeps <html lang dir> in step with the page. The server renders them for
 * the first visit; this covers Inertia visits between an Arabic page and an
 * English-only one (/ar → /login). Call it once in each public page
 * (welcome.tsx, page.tsx); leaving the page restores English.
 */
export function useDocumentLocale(): void {
    const { locale } = useI18n();

    useLayoutEffect(() => {
        applyDocumentLocale(locale);

        return () => applyDocumentLocale(DEFAULT_LOCALE);
    }, [locale]);
}
