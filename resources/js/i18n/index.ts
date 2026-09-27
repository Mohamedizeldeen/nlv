import type { Placeholders } from './define';
import { formatNumber } from './locales';
import type { Locale } from './locales';
import common from './sections/common';
import features from './sections/features';
import finalCta from './sections/final-cta';
import footer from './sections/footer';
import hero from './sections/hero';
import howItWorks from './sections/how-it-works';
import kiosk from './sections/kiosk';
import lookbook from './sections/lookbook';
import navbar from './sections/navbar';
import notFound from './sections/not-found';
import orderDialog from './sections/order-dialog';
import page from './sections/page';
import partners from './sections/partners';
import pricing from './sections/pricing';
import testimonials from './sections/testimonials';

export { defineMessages } from './define';
export type { Placeholders, SectionMessages, Translation } from './define';
export {
    DEFAULT_LOCALE,
    LOCALES,
    directionOf,
    formatNumber,
    isLocale,
    localePath,
    otherLocale,
} from './locales';
export type { Alternates, Direction, Locale } from './locales';

/**
 * Every dictionary, by the prefix its keys take: `t('how-it-works.<key>')`
 * reads `sections/how-it-works.ts`. A new section module is registered here.
 */
export const MESSAGES = {
    common,
    navbar,
    hero,
    'how-it-works': howItWorks,
    features,
    kiosk,
    lookbook,
    partners,
    testimonials,
    pricing,
    'final-cta': finalCta,
    footer,
    'order-dialog': orderDialog,
    page,
    'not-found': notFound,
} as const;

type Registry = typeof MESSAGES;

type Section = keyof Registry;

/** Every message key: 'common.otherLanguage', 'hero.<key>', … */
export type MessageKey = {
    [S in Section]: `${S}.${keyof Registry[S]['en'] & string}`;
}[Section];

/** The English text of a key, as a literal type. */
type EnglishMessage<Key extends MessageKey> =
    Key extends `${infer S extends Section}.${infer Name}`
        ? Name extends keyof Registry[S]['en']
            ? Registry[S]['en'][Name]
            : never
        : never;

/** The `{placeholders}` a message takes. */
export type MessageVars<Key extends MessageKey> =
    EnglishMessage<Key> extends string
        ? Placeholders<EnglishMessage<Key>>
        : never;

/** `t(key)` for plain messages, `t(key, { count: 3 })` for templated ones. */
export type TranslateArgs<Key extends MessageKey> = [MessageVars<Key>] extends [
    never,
]
    ? []
    : [vars: Record<MessageVars<Key>, string | number>];

export type Translate = <Key extends MessageKey>(
    key: Key,
    ...args: TranslateArgs<Key>
) => string;

const warned = new Set<string>();

function warnOnce(message: string) {
    if (import.meta.env.DEV && !warned.has(message)) {
        warned.add(message);
        console.warn(`[i18n] ${message}`);
    }
}

function lookup(locale: Locale, key: string): string | undefined {
    const dot = key.indexOf('.');
    const section = MESSAGES[key.slice(0, dot) as Section] as
        | { en: Record<string, string>; ar: Record<string, string> }
        | undefined;
    const name = key.slice(dot + 1);

    return section && Object.hasOwn(section[locale], name)
        ? section[locale][name]
        : undefined;
}

/**
 * A message in `locale`, with its `{placeholders}` filled in. Numbers are
 * formatted for the locale ("10,284" on both pages). The types make an
 * unknown key impossible; at runtime one falls back to English, then to the
 * key itself, and warns in dev.
 */
export function translate(
    locale: Locale,
    key: string,
    vars?: Record<string, string | number>,
): string {
    let message = lookup(locale, key);

    if (message === undefined) {
        message = lookup('en', key);
        warnOnce(
            message === undefined
                ? `Unknown message "${key}".`
                : `"${key}" has no ${locale} text; showing the English.`,
        );
    }

    if (message === undefined) {
        return key;
    }

    if (!vars) {
        return message;
    }

    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
        const value = vars[name];

        if (value === undefined) {
            warnOnce(`"${key}" needs a value for ${placeholder}.`);

            return placeholder;
        }

        return typeof value === 'number' ? formatNumber(locale, value) : value;
    });
}
