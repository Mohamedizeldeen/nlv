/**
 * Curated Unsplash photos for the landing page's designed artwork (the
 * product mockups), grouped by section. The lookbook looks and the story
 * portraits are managed in the admin panel and arrive with `landing`.
 * `aspect` is the original width / height; `focus` is the subject's
 * position (0..1 from top-left) for cropping and object-position.
 */
export type ImageRef = {
    id: string;
    alt: string;
    aspect: number;
    focus: [number, number];
};

export type GarmentImage = ImageRef & {
    /** Short product label, e.g. "Abaya · Sand". */
    label: string;
    /** Focal zoom for detail crops (1 = none). */
    zoom?: number;
};

export const IMAGES = {
    hero: {
        main: {
            id: 'photo-1762605135376-ae5af70a5628',
            alt: 'Two women in tailored abayas, one taupe and one cream, standing under a white plaster arch hung with sheer curtains',
            aspect: 0.72,
            focus: [0.5, 0.62],
        },
    },
    howItWorks: {
        /** The same shopper appears as the captured photo and the result. */
        shopper: {
            id: 'photo-1752794673269-dc356838c5fd',
            alt: 'A woman in a lilac-grey abaya with a blush panel standing against a plain studio wall',
            aspect: 0.67,
            focus: [0.47, 0.5],
        },
    },
    features: {
        tryOnResult: {
            id: 'photo-1633450758429-f5d0ade72f97',
            alt: 'A woman in a caramel hijab, blush blazer and wide camel trousers carrying a pink handbag',
            aspect: 0.67,
            focus: [0.45, 0.4],
        },
        boutique: {
            id: 'photo-1545988779-3192ae1a44c3',
            alt: 'A couture salon under a crystal chandelier, with embroidered kaftans and brocade tunics on mannequins',
            aspect: 0.67,
            focus: [0.55, 0.45],
        },
        eyewear: {
            id: 'photo-1556015048-4d3aa10df74c',
            alt: 'A smiling woman framing her face with her hands, wearing oversized emerald-green square frames',
            aspect: 0.8,
            focus: [0.49, 0.4],
        },
    },
    kiosk: {
        interior: {
            id: 'photo-1618667158984-c0001c0eb1c6',
            alt: 'A bright, open fashion store with pastel long dresses on stands across a beige tiled floor',
            aspect: 1.5,
            focus: [0.5, 0.6],
        },
        screen: {
            id: 'photo-1485462537746-965f33f7f6a7',
            alt: 'A woman in a dusty-pink wool coat and paisley scarf standing in a vaulted stone arcade',
            aspect: 0.67,
            focus: [0.55, 0.45],
        },
    },
    /** Product thumbnails for garment rails and grids inside the mockups. */
    garments: [
        {
            // Detail crop of the How-it-works shopper's abaya, so step 2's
            // selection matches the step 3 result.
            id: 'photo-1752794673269-dc356838c5fd',
            alt: 'Lilac-grey abaya with a blush panel',
            aspect: 0.67,
            focus: [0.47, 0.5],
            zoom: 2.2,
            label: 'Abaya · Lilac',
        },
        {
            id: 'photo-1623609163859-ca93c959b98a',
            alt: 'Cream tulle dress with gold wheat embroidery on a mannequin',
            aspect: 0.66,
            focus: [0.5, 0.5],
            label: 'Tulle dress · Cream',
        },
        {
            id: 'photo-1631541909061-71e349d1f203',
            alt: 'Oatmeal rib-knit sweater on a white hanger',
            aspect: 0.7,
            focus: [0.42, 0.5],
            label: 'Rib knit · Oat',
        },
        {
            id: 'photo-1611312449408-fcece27cdbb7',
            alt: 'Raw indigo denim trucker jacket with a corduroy collar',
            aspect: 0.64,
            focus: [0.52, 0.47],
            label: 'Trucker · Indigo',
        },
        {
            id: 'photo-1596755094514-f87e34085b2c',
            alt: 'Chambray button-down shirt on a hanger',
            aspect: 0.67,
            focus: [0.5, 0.52],
            label: 'Chambray shirt',
        },
        {
            id: 'photo-1614179689702-355944cd0918',
            alt: 'Structured black leather tote with twin handles',
            aspect: 0.75,
            focus: [0.48, 0.65],
            label: 'Leather tote · Black',
        },
        {
            id: 'photo-1575032617751-6ddec2089882',
            alt: 'Burgundy croc-embossed mini bag with a gold clasp',
            aspect: 0.8,
            focus: [0.55, 0.65],
            label: 'Mini bag · Burgundy',
        },
        {
            id: 'photo-1614715838608-dd527c46231d',
            alt: 'Thin silver round wire-frame glasses',
            aspect: 0.67,
            focus: [0.55, 0.55],
            label: 'Round wire · Silver',
        },
        {
            id: 'photo-1574258495973-f010dfbb5371',
            alt: 'Tortoiseshell and gold browline glasses',
            aspect: 1.5,
            focus: [0.55, 0.55],
            label: 'Browline · Tortoise',
        },
        {
            id: 'photo-1560769629-975ec94e6a86',
            alt: 'Colour-block chunky sneakers on a white cube',
            aspect: 0.8,
            focus: [0.5, 0.5],
            label: 'Runner · Colour-block',
        },
        {
            id: 'photo-1521572163474-6864f9cf17ab',
            alt: 'Plain white crew-neck T-shirt worn against a soft grey background',
            aspect: 1.0,
            focus: [0.5, 0.45],
            label: 'Crew tee · White',
        },
        {
            id: 'photo-1508296695146-257a814070b4',
            alt: 'Cat-eye sunglasses with pale gold frames and gradient lenses on a white surface',
            aspect: 1.0,
            focus: [0.6, 0.45],
            label: 'Cat-eye · Gold',
        },
    ] satisfies GarmentImage[],
    /** Store interiors and rails for backdrops and secondary imagery. */
    store: {
        rail: {
            id: 'photo-1490481651871-ab68de25d43d',
            alt: 'Neutral blouses and knits on wooden hangers along a hanging branch rail',
            aspect: 1.5,
            focus: [0.5, 0.65],
        },
    },
    finalCta: {
        backdrop: {
            id: 'photo-1676696706907-0e04665b80bd',
            alt: '',
            aspect: 1.78,
            focus: [0.5, 0.5],
        },
        looks: [
            {
                id: 'photo-1545266241-3516e2a6e016',
                alt: 'A woman in a white hijab and blouse with large white earrings, lit against a dark backdrop',
                aspect: 0.67,
                focus: [0.38, 0.38],
            },
            {
                id: 'photo-1625987306773-8b9e554b25e2',
                alt: 'A woman in a navy patterned silk headscarf and black blazer, hand near her face',
                aspect: 0.8,
                focus: [0.47, 0.3],
            },
            {
                id: 'photo-1519244703995-f4e0f30006d5',
                alt: 'A man in thin round gold glasses and a pale yellow turtleneck',
                aspect: 0.56,
                focus: [0.46, 0.23],
            },
        ],
    },
} satisfies Record<
    string,
    Record<string, ImageRef | ImageRef[]> | GarmentImage[]
>;
