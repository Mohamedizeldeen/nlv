import type { ContentLocale } from '@/components/admin/bilingual';
import { translate } from '@/i18n';
import type { MessageKey } from '@/i18n';

/*
 * The lookbook's own words around the admin-managed copy (the chips on a
 * card, its caption, the "All" filter), read from the landing's lookbook
 * dictionary (`@/i18n/sections/lookbook`), so the previews print exactly
 * what / and /ar print.
 */
const KEYS = {
    all: 'lookbook.filterAll',
    before: 'lookbook.before',
    after: 'lookbook.after',
    lookCity: 'lookbook.lookCity',
    seconds: 'lookbook.seconds',
} as const satisfies Record<string, MessageKey>;

/** Stands in for the city while the caption template is split around it. */
const CITY = '';

export type LookbookChrome = {
    all: string;
    before: string;
    after: string;
    /** "Look 04 · " and what follows the city, so the city can be isolated. */
    lookCity: (number: string) => [string, string];
    /** "1.8 s" */
    seconds: (seconds: string) => string;
};

export function lookbookChrome(locale: ContentLocale): LookbookChrome {
    return {
        all: translate(locale, KEYS.all),
        before: translate(locale, KEYS.before),
        after: translate(locale, KEYS.after),
        lookCity: (number) => {
            const [before = '', after = ''] = translate(locale, KEYS.lookCity, {
                number,
                city: CITY,
            }).split(CITY);

            return [before, after];
        },
        seconds: (seconds) => translate(locale, KEYS.seconds, { seconds }),
    };
}
