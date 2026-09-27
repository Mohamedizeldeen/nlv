/*
 * The public site's two languages. English is the default at `/` and
 * `/pages/{slug}`; Arabic lives at `/ar` and `/ar/pages/{slug}`. The admin
 * panel, the auth pages and the account pages stay English. These helpers are
 * plain functions (no React), so they also work in event handlers, tests
 * and the dev harness; components use `useI18n()` instead.
 */

export const LOCALES = ['en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export type Direction = 'ltr' | 'rtl';

/** The same page in each language (the shared `alternates` prop). */
export type Alternates = Record<Locale, string>;

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
    return LOCALES.includes(value as Locale);
}

export function directionOf(locale: Locale): Direction {
    return locale === 'ar' ? 'rtl' : 'ltr';
}

/** The language the switch offers from `locale`. */
export function otherLocale(locale: Locale): Locale {
    return locale === 'ar' ? 'en' : 'ar';
}

/*
 * Numbers: Western digits in Arabic too (the Gulf marketing norm), so both
 * pages print "10,284". Formatters are cached; building one is not free.
 */
const formatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(
    locale: Locale,
    value: number,
    options?: Intl.NumberFormatOptions,
): string {
    const tag = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
    const key = `${tag}|${options ? JSON.stringify(options) : ''}`;
    let formatter = formatters.get(key);

    if (!formatter) {
        formatter = new Intl.NumberFormat(tag, options);
        formatters.set(key, formatter);
    }

    return formatter.format(value);
}

/** `/`, `/pages/{slug}` and their Arabic twins: the pages that have both. */
const LOCALIZED_PATH = /^\/(?:pages\/[^/]+\/?)?$/;

/** Splits "/pages/privacy?x=1#terms" into the path and the rest. */
function splitPath(href: string): [path: string, rest: string] {
    const at = href.search(/[?#]/);

    return at === -1 ? [href, ''] : [href.slice(0, at), href.slice(at)];
}

/** "/ar/pages/privacy" → "/pages/privacy", "/ar" → "/". */
function stripLocale(path: string): string {
    if (path === '/ar' || path === '/ar/') {
        return '/';
    }

    return path.startsWith('/ar/') ? path.slice(3) : path;
}

/**
 * The URL of a public page in `locale`: `localePath('/pages/privacy', 'ar')`
 * is "/ar/pages/privacy", `localePath('/#pricing', 'ar')` is "/ar#pricing".
 * Accepts either language's form (it is idempotent), keeps the query and
 * the hash, and leaves everything that has no Arabic page alone: external
 * URLs, `mailto:`/`tel:`, bare `#anchors`, /login, /admin, /settings…
 */
export function localePath(href: string, locale: Locale): string {
    if (!href.startsWith('/') || href.startsWith('//')) {
        return href;
    }

    const [path, rest] = splitPath(href);
    const base = stripLocale(path);

    if (!LOCALIZED_PATH.test(base)) {
        return href;
    }

    if (locale === 'en') {
        return base + rest;
    }

    return (base === '/' ? '/ar' : `/ar${base}`) + rest;
}
