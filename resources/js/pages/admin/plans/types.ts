/*
 * Props of the Plans & prices pages (App\Http\Controllers\Admin\PlanController).
 * Field names match the form inputs and the `plans` columns; every text
 * has an Arabic twin (`name` + `name_ar`), shown on /ar.
 */
import {
    bilingualValue,
    isBlank,
    localized,
} from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import type { PlanKey, PriceMode } from '@/types/landing';

export type Amounts = Record<string, number>;

export type CurrencyOption = { code: string; name: string };

/** The plan texts that come in both languages (English column names). */
export type PlanText =
    | 'name'
    | 'blurb'
    | 'price_caption'
    | 'detail_label'
    | 'detail_caption'
    | 'features_heading'
    | 'features'
    | 'cta_label'
    | 'badge'
    | 'badge_note';

export type AdminPlan = {
    id: number;
    key: PlanKey;
    name: string;
    blurb: string;
    price_mode: PriceMode;
    /** Whole amounts by currency code, hidden currencies included. */
    prices: Amounts | null;
    price_caption: string;
    detail_label: string | null;
    detail_prices: Amounts | null;
    detail_value: string | null;
    detail_caption: string | null;
    features_heading: string | null;
    /** `*emphasis*` markup allowed. */
    features: string[];
    cta_label: string;
    is_featured: boolean;
    badge: string | null;
    badge_note: string | null;
    name_ar: string | null;
    blurb_ar: string | null;
    price_caption_ar: string | null;
    detail_label_ar: string | null;
    detail_caption_ar: string | null;
    features_heading_ar: string | null;
    /** One Arabic line per English line, in the same order. */
    features_ar: string[] | null;
    cta_label_ar: string | null;
    badge_ar: string | null;
    badge_note_ar: string | null;
    /** Texts written in English with no Arabic yet (/ar shows the English). */
    missing_arabic: PlanText[];
    sort_order: number;
    /** ISO 8601 */
    updated_at: string | null;
};

/** Section copy the cards are shown with (Site content → Section headings). */
export type PricingCopy = {
    /** The section title, with `*accent*` markup. */
    title: string;
    lede: string;
    /** The kicker beside the questions under the plans. */
    faqTitle: string;
    /** "Prices per device, excluding VAT…" beside the currency switch. */
    note: string;
    /** "Let’s talk": the figure of a plan priced by quote. */
    customPrice: string;
};

/** A row of the currencies panel. */
export type CurrencyRow = CurrencyOption & {
    enabled: boolean;
    /** Its place in the site's list of currencies (config order), from 0. */
    position: number;
    /** Plans that show a figure but have no amount in this currency. */
    missing: string[];
};

export type PlansIndexProps = {
    plans: AdminPlan[];
    /** Enabled currencies, in display order. */
    currencies: CurrencyOption[];
    /** Every currency: enabled ones first in their order, then the rest. */
    currencyOptions: CurrencyRow[];
    /** The section copy on each page. */
    copy: Record<ContentLocale, PricingCopy>;
    /** Questions under the plans. */
    faqs: { total: number; live: number };
};

export type PlanEditProps = {
    plan: AdminPlan;
    currencies: CurrencyOption[];
    /** Codes switched off on the pricing section. */
    hiddenCurrencies: string[];
    /** Hidden codes this plan still has amounts for (kept on save). */
    storedHidden: string[];
    /** Name of the plan that is featured now, when it is another one. */
    featuredPlan: string | null;
    copy: Record<ContentLocale, PricingCopy>;
};

/** What the ruled line under the price shows. */
export type DetailKind = 'none' | 'prices' | 'value';

/** Everything the landing card needs, in the editor's terms, in one language. */
export type PlanCardData = {
    name: string;
    blurb: string;
    priceMode: PriceMode;
    prices: Partial<Record<string, number | null>> | null;
    priceCaption: string;
    detail: {
        kind: DetailKind;
        label: string;
        prices: Partial<Record<string, number | null>> | null;
        value: string;
        caption: string;
    };
    featuresHeading: string;
    features: string[];
    ctaLabel: string;
    featured: boolean;
    badge: string;
    badgeNote: string;
};

/** How the admin names each text (form labels, "Arabic missing" lists). */
export const PLAN_TEXT_LABELS: Record<PlanText, string> = {
    name: 'Name',
    blurb: 'One-line description',
    price_caption: 'Price caption',
    detail_label: 'Line label',
    detail_caption: 'Line caption',
    features_heading: 'List heading',
    features: 'Features',
    cta_label: 'Button label',
    badge: 'Badge',
    badge_note: 'Badge note',
};

export function detailKindOf(plan: AdminPlan): DetailKind {
    if (plan.detail_prices && Object.keys(plan.detail_prices).length > 0) {
        return 'prices';
    }

    if (plan.detail_value) {
        return 'value';
    }

    return 'none';
}

/**
 * The feature lines a page shows, as the server picks them: the Arabic
 * list once every line has its Arabic, otherwise the English list (a
 * half-translated list would mix languages). Rows blank in both
 * languages (a row just added) don't count.
 */
export function localizedLines(
    rows: readonly { en: string | null; ar: string | null }[],
    locale: ContentLocale,
): string[] {
    const written = rows.filter((row) => !isBlank(row.en) || !isBlank(row.ar));

    if (
        locale === 'ar' &&
        written.length > 0 &&
        written.every((row) => !isBlank(row.ar))
    ) {
        return written.map((row) => row.ar ?? '');
    }

    return rows.map((row) => row.en ?? '');
}

/** A stored plan as card data, in one language (untranslated texts in English). */
export function cardDataOf(
    plan: AdminPlan,
    locale: ContentLocale = 'en',
): PlanCardData {
    const text = (name: Exclude<PlanText, 'features'>) =>
        localized(bilingualValue(plan, name), locale);
    const english = plan.features;
    const arabic = plan.features_ar ?? [];

    return {
        name: text('name'),
        blurb: text('blurb'),
        priceMode: plan.price_mode,
        prices: plan.prices,
        priceCaption: text('price_caption'),
        detail: {
            kind: detailKindOf(plan),
            label: text('detail_label'),
            prices: plan.detail_prices,
            value: plan.detail_value ?? '',
            caption: text('detail_caption'),
        },
        featuresHeading: text('features_heading'),
        features: localizedLines(
            Array.from(
                { length: Math.max(english.length, arabic.length) },
                (_, index) => ({
                    en: english[index] ?? null,
                    ar: arabic[index] ?? null,
                }),
            ),
            locale,
        ),
        ctaLabel: text('cta_label'),
        featured: plan.is_featured,
        badge: text('badge'),
        badgeNote: text('badge_note'),
    };
}

export const PRICE_MODE_LABELS: Record<PriceMode, string> = {
    one_off: 'One-off payment',
    monthly: 'Monthly fee',
    custom: 'Custom quote',
};
