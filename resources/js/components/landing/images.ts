/**
 * Curated Unsplash photos for the landing page's designed artwork (the
 * product mockups), grouped by section. The lookbook looks and the story
 * portraits are managed in the admin panel and arrive with `landing`.
 * `aspect` is the original width / height; `focus` is the subject's
 * position (0..1 from top-left) for cropping and object-position.
 *
 * Alt text and product labels are copy: each section's dictionary
 * (i18n/sections/*.ts) has them in both languages, and photos inside a
 * mockup are decorative (alt=""), described by the mockup's own label.
 * The comments here only say what each photo shows.
 */
export type ImageRef = {
    id: string;
    aspect: number;
    focus: [number, number];
};

export type GarmentImage = ImageRef & {
    /** Focal zoom for detail crops (1 = none). */
    zoom?: number;
};

export const IMAGES = {
    hero: {
        // Two women in taupe and cream abayas under a white plaster arch.
        main: {
            id: 'photo-1762605135376-ae5af70a5628',
            aspect: 0.72,
            focus: [0.5, 0.62],
        },
    },
    howItWorks: {
        // The same shopper appears as the captured photo and the result: a
        // woman in a lilac-grey abaya with a blush panel, studio wall.
        shopper: {
            id: 'photo-1752794673269-dc356838c5fd',
            aspect: 0.67,
            focus: [0.47, 0.5],
        },
    },
    features: {
        // Caramel hijab, blush blazer, wide camel trousers, pink handbag.
        tryOnResult: {
            id: 'photo-1633450758429-f5d0ade72f97',
            aspect: 0.67,
            focus: [0.45, 0.4],
        },
        // A couture salon under a crystal chandelier, kaftans on mannequins.
        boutique: {
            id: 'photo-1545988779-3192ae1a44c3',
            aspect: 0.67,
            focus: [0.55, 0.45],
        },
        // A smiling woman in oversized emerald-green square frames.
        eyewear: {
            id: 'photo-1556015048-4d3aa10df74c',
            aspect: 0.8,
            focus: [0.49, 0.4],
        },
    },
    kiosk: {
        // A bright, open fashion store, pastel dresses on a beige floor.
        interior: {
            id: 'photo-1618667158984-c0001c0eb1c6',
            aspect: 1.5,
            focus: [0.5, 0.6],
        },
        // A woman in a dusty-pink wool coat in a vaulted stone arcade.
        screen: {
            id: 'photo-1485462537746-965f33f7f6a7',
            aspect: 0.67,
            focus: [0.55, 0.45],
        },
    },
    /** Product thumbnails for garment rails and grids inside the mockups. */
    garments: [
        {
            // Abaya, lilac: a detail crop of the How-it-works shopper's
            // abaya, so step 2's selection matches the step 3 result.
            id: 'photo-1752794673269-dc356838c5fd',
            aspect: 0.67,
            focus: [0.47, 0.5],
            zoom: 2.2,
        },
        {
            // Tulle dress, cream, gold wheat embroidery.
            id: 'photo-1623609163859-ca93c959b98a',
            aspect: 0.66,
            focus: [0.5, 0.5],
        },
        {
            // Rib-knit sweater, oatmeal.
            id: 'photo-1631541909061-71e349d1f203',
            aspect: 0.7,
            focus: [0.42, 0.5],
        },
        {
            // Denim trucker jacket, raw indigo.
            id: 'photo-1611312449408-fcece27cdbb7',
            aspect: 0.64,
            focus: [0.52, 0.47],
        },
        {
            // Chambray shirt.
            id: 'photo-1596755094514-f87e34085b2c',
            aspect: 0.67,
            focus: [0.5, 0.52],
        },
        {
            // Leather tote, black.
            id: 'photo-1614179689702-355944cd0918',
            aspect: 0.75,
            focus: [0.48, 0.65],
        },
        {
            // Croc-embossed mini bag, burgundy.
            id: 'photo-1575032617751-6ddec2089882',
            aspect: 0.8,
            focus: [0.55, 0.65],
        },
        {
            // Round wire glasses, silver.
            id: 'photo-1614715838608-dd527c46231d',
            aspect: 0.67,
            focus: [0.55, 0.55],
        },
        {
            // Browline glasses, tortoiseshell and gold.
            id: 'photo-1574258495973-f010dfbb5371',
            aspect: 1.5,
            focus: [0.55, 0.55],
        },
        {
            // Colour-block runners on a white cube.
            id: 'photo-1560769629-975ec94e6a86',
            aspect: 0.8,
            focus: [0.5, 0.5],
        },
        {
            // Crew-neck T-shirt, white.
            id: 'photo-1521572163474-6864f9cf17ab',
            aspect: 1.0,
            focus: [0.5, 0.45],
        },
        {
            // Cat-eye sunglasses, pale gold.
            id: 'photo-1508296695146-257a814070b4',
            aspect: 1.0,
            focus: [0.6, 0.45],
        },
    ] satisfies GarmentImage[],
    /** Store interiors and rails for backdrops and secondary imagery. */
    store: {
        // Neutral blouses and knits on wooden hangers along a branch rail.
        rail: {
            id: 'photo-1490481651871-ab68de25d43d',
            aspect: 1.5,
            focus: [0.5, 0.65],
        },
    },
    finalCta: {
        // Teal silk charmeuse, behind the order panel.
        backdrop: {
            id: 'photo-1676696706907-0e04665b80bd',
            aspect: 1.78,
            focus: [0.5, 0.5],
        },
        // Looks 14, 22 and 31 (final-cta.look14Alt…).
        looks: [
            {
                id: 'photo-1545266241-3516e2a6e016',
                aspect: 0.67,
                focus: [0.38, 0.38],
            },
            {
                id: 'photo-1625987306773-8b9e554b25e2',
                aspect: 0.8,
                focus: [0.47, 0.3],
            },
            {
                id: 'photo-1519244703995-f4e0f30006d5',
                aspect: 0.56,
                focus: [0.46, 0.23],
            },
        ],
    },
} satisfies Record<
    string,
    Record<string, ImageRef | ImageRef[]> | GarmentImage[]
>;
