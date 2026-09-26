/**
 * The `landing` prop of the `welcome` page (and of content pages), built by
 * App\Support\LandingContent. Only published records, in their sort order,
 * in the page's language (the English where no Arabic is filled in).
 */

/** The site's languages: English at `/`, Arabic at `/ar`. */
export type Locale = 'en' | 'ar';

/** Text direction of a language. */
export type Direction = 'ltr' | 'rtl';

/** The same public page in each language (absolute URLs). */
export type LocaleAlternates = Record<Locale, string>;

/** An image: seeded Unsplash stock, or an admin upload on the public disk. */
export type MediaRef =
    | { kind: 'unsplash'; id: string }
    | {
          kind: 'upload';
          url: string;
          width: number | null;
          height: number | null;
      };

/** Copy split around its *accent* phrase (the part set in italic mint). */
export type AccentText = { before: string; accent: string; after: string };

export type LandingStory = {
    id: number;
    name: string;
    role: string;
    store: string;
    city: string;
    coordinates: string | null;
    quote: AccentText;
    metric: {
        figure: string;
        label: string;
        note: string | null;
        /** Compact label for the story list (the full label when none is set). */
        short: string;
    };
    portrait: MediaRef;
    portraitAlt: string;
    /** Focal point, 0..1 from the top-left. */
    focus: [number, number];
    zoom: number;
};

export type LandingLookCategory = {
    id: number;
    slug: string;
    name: string;
    /** The filter's one-line "this week" note. */
    note: string | null;
    /** The figure set large in that note ("54" / "most tried size"); null when none is set. */
    stat: { figure: string; unit: string | null } | null;
};

export type LandingLook = {
    id: number;
    /** The category's slug. */
    category: string;
    title: string;
    city: string;
    seconds: number;
    after: MediaRef;
    /** Null: show a grayscale scan of `after` as the "before". */
    before: MediaRef | null;
    alt: string;
    /** Width / height of the after image. */
    aspect: number;
    focus: [number, number];
};

export type PlanKey = 'buy' | 'lease' | 'chain';

export type PriceMode = 'one_off' | 'monthly' | 'custom';

export type LandingPlan = {
    key: PlanKey;
    name: string;
    blurb: string;
    priceMode: PriceMode;
    /** Whole amounts by currency code; null for custom pricing. */
    prices: Record<string, number> | null;
    priceCaption: string;
    detail: {
        label: string | null;
        prices: Record<string, number> | null;
        value: string | null;
        caption: string | null;
    };
    featuresHeading: string | null;
    /** `*emphasis*` markup allowed. */
    features: string[];
    ctaLabel: string;
    featured: boolean;
    badge: string | null;
    badgeNote: string | null;
};

export type LandingFaq = { id: number; question: string; answer: string };

export type LandingPageLink = {
    title: string;
    slug: string;
    group: 'company' | 'legal';
    /** The page in the same language: `/pages/about` or `/ar/pages/about`. */
    url: string;
};

export type LandingData = {
    /** The language every text below is in. */
    locale: Locale;
    /** Settings by dot key (copy, contact, social): see config/landing.php. */
    content: Record<string, string>;
    stats: {
        stores: number;
        countries: number;
        tryOnsYear: string;
        tryOnsToday: number;
    };
    stories: LandingStory[];
    lookbook: {
        categories: LandingLookCategory[];
        looks: LandingLook[];
    };
    pricing: {
        /** `name` is read aloud, in the page's language. */
        currencies: { code: string; name: string }[];
        plans: LandingPlan[];
        faqs: LandingFaq[];
    };
    /** Footer links to published content pages. */
    pages: LandingPageLink[];
};

/** Flash data after an order request (`reference` is null for discarded spam). */
export type OrderRequestFlash = { reference: string | null };

/** Props of the public content page (`page`, served at /pages/{slug}). */
export type ContentPageProps = {
    page: { title: string; summary: string | null; html: string };
    landing: LandingData;
};
