/**
 * Single source of truth for brand strings on the landing page.
 * "TryOn" is a placeholder product name: change it here to rebrand.
 */
export const BRAND = {
    name: 'TryOn',
    company: 'NLV',
    domain: 'tryon.app',
    email: 'hello@tryon.app',
    tagline: 'Every screen is a fitting room.',
    /** Brand logo in public/img (vector; logo-nlv.png is the original): white on transparent, 406×233. */
    logo: { src: '/img/logo-nlv.svg', width: 406, height: 233 },
} as const;
