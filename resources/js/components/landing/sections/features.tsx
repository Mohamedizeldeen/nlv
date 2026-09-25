import { Check, ChevronLeft, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PhoneFrame, TabletFrame } from '../devices';
import { IMAGES } from '../images';
import { Photo } from '../photo';
import {
    Arabic,
    Container,
    Glow,
    Reveal,
    SectionHeader,
    useInView,
} from '../primitives';
import { FitChip, LiveDot, ScanOverlay } from '../tryon-ui';

// Placeholder content: replace before launch.
// Metrics, the store ("Maison Rimal", Tahlia Street), the shopper
// ("Noura A."), prices and measurements are illustrative only.
type Capability = { label: string; detail: ReactNode };
type Metric = {
    value: string;
    unit: string;
    caption: string;
    /** Per-unit optical sizing: "%" and "mm" sit italic, "×" upright. */
    unitClassName: string;
};

const ONLINE = {
    index: '01',
    label: 'Online store',
    body: 'A Try it on button on every product page. Shoppers see the piece on their own photo in under two seconds, with the size to order, so they stop buying three sizes to keep one.',
    items: [
        {
            label: 'Works from your existing product photos',
            detail: 'Packshots and model shots are enough. No 3D scans, no reshoots.',
        },
        {
            label: 'Size advice from a single photo',
            detail: '54 or 56? Answered from one photo and her height.',
        },
        {
            label: 'Arabic and English, right-to-left done properly',
            detail: (
                <>
                    Mirrored layouts, native Arabic type, and a button that
                    reads <Arabic className="text-[1.08em]">جرّبها</Arabic>.
                </>
            ),
        },
    ] satisfies Capability[],
    metric: {
        value: '−31',
        unit: '%',
        caption: 'size-related returns in the first 90 days',
        unitClassName: 'text-[0.42em] italic',
    } satisfies Metric,
};

const STORE = {
    index: '02',
    label: 'In store · Clienteling',
    body: 'When she walks in, her saved looks are already on the stylist’s tablet: the pieces, the sizes the engine recommended, and what is on the rail right now. The conversation starts where the website left off.',
    items: [
        {
            label: 'Looks saved from web to store',
            detail: 'Her shortlist travels with her account, or a QR code at the door.',
        },
        {
            label: 'Stylist tablet view',
            detail: 'Saved looks, sizes and notes on one screen, in Arabic or English.',
        },
        {
            label: 'Stock-aware: suggests what’s on the rail',
            detail: 'If the 54 is in the stockroom, the tablet says so before anyone goes looking.',
        },
    ] satisfies Capability[],
    metric: {
        value: '3.2',
        unit: '×',
        caption: 'more pieces tried per store visit',
        unitClassName: 'relative bottom-[0.06em] ml-1 text-[0.72em]',
    } satisfies Metric,
};

const EYEWEAR = {
    index: '03',
    label: 'Eyewear · Online and in store',
    body: 'From one selfie, TryOn finds the pupils, the bridge and the width of the face, then shows only the frames that will sit right. Your optician gets numbers they can work with.',
    items: [
        {
            label: 'Face-width matching',
            detail: 'Frames too wide or too narrow for her face drop out of the results.',
        },
        {
            label: 'Virtual lenses and tints',
            detail: 'Clear, gradient, polarised or photochromic, previewed on the chosen frame.',
        },
        {
            label: 'Prescription-ready handoff',
            detail: 'PD and fit notes travel with the order, not on a sticky note.',
        },
    ] satisfies Capability[],
    metric: {
        value: '62',
        unit: 'mm',
        caption: 'pupillary distance, measured from a selfie',
        unitClassName: 'ml-0.5 text-[0.36em] italic',
    } satisfies Metric,
};

type SavedLook = {
    id: string;
    focus: [number, number];
    zoom?: number;
    name: string;
    size: string;
    stock: string;
    /** Stock status dot: lagoon = on the rail, champagne = stockroom. */
    tone: string;
};

/** The pieces on Noura's stylist tablet. The first is the blazer from row 1. */
const SAVED_LOOKS: SavedLook[] = [
    {
        id: IMAGES.features.onlineResult.id,
        focus: [0.42, 0.52],
        zoom: 2.1,
        name: 'Linen blazer, blush',
        size: 'M',
        stock: 'On the rail · B2',
        tone: 'bg-lagoon',
    },
    {
        id: IMAGES.garments[0].id,
        focus: IMAGES.garments[0].focus,
        zoom: IMAGES.garments[0].zoom,
        name: 'Abaya, lilac',
        size: '54',
        stock: 'Stockroom · 2 left',
        tone: 'bg-champagne',
    },
    {
        id: IMAGES.garments[6].id,
        focus: IMAGES.garments[6].focus,
        name: 'Mini bag, burgundy',
        size: 'One size',
        stock: 'On the rail · A4',
        tone: 'bg-lagoon',
    },
];

/*
 * Eyewear plate geometry, in percent of the 4:5 portrait (measured on the
 * original photo): outer frame edges, pupil centres and the bridge gap.
 */
const FRAME = { left: 27.5, right: 70.7, edgeY: 31 };
const PUPILS = { y: 35, left: 38.2, right: 60.8 };
const BRIDGE = { y: 41, left: 46.3, right: 52.9 };
const FRAME_MM = 138;

type MeasureKey = 'width' | 'bridge' | 'pd';

export default function Features() {
    return (
        <section id="features" className="relative isolate py-24 md:py-36">
            <Container>
                <SectionHeader
                    index="02"
                    label="Online & in store"
                    labelAr="عبر الإنترنت وفي المتجر"
                    title={
                        <>
                            One fitting room. <em>Two doors.</em>
                        </>
                    }
                    lede="The same try-on engine runs in your online store and on your shop floor, so the customer who tried it on last night can find it in store today."
                />

                <div className="mt-20 space-y-28 md:mt-28 lg:space-y-40">
                    <OnlineRow />
                    <StoreRow />
                    <EyewearRow />
                </div>
            </Container>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Row 1: online store                                                 */
/* ------------------------------------------------------------------ */

function OnlineRow() {
    const photo = IMAGES.features.online;

    return (
        <article className="relative isolate grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
            <Glow
                color="coral"
                className="top-[18%] left-[38%] size-[26rem] opacity-30"
            />
            <Reveal
                as="figure"
                className="relative pb-[26%] sm:pb-[18%] lg:col-span-7 lg:pb-[84px]"
            >
                {/* Bleeds off the left edge of the viewport on desktop. */}
                <div className="relative mr-[22%] aspect-[4/5] overflow-hidden rounded-[28px] sm:aspect-[5/4] lg:mr-[118px] lg:ml-[calc((min(100vw,1320px)-100vw)/2-3rem)] lg:aspect-auto lg:h-[560px] lg:rounded-l-none lg:rounded-r-[32px]">
                    <Photo
                        id={photo.id}
                        alt={photo.alt}
                        sizes="(min-width: 1024px) 720px, 80vw"
                        widths={[480, 800, 1200]}
                        className="absolute inset-0 size-full"
                        style={{ objectPosition: '40% 40%' }}
                    />
                </div>

                <figcaption className="absolute bottom-0 left-0 w-[46%] text-[13px] leading-snug text-smoke sm:w-[52%] lg:top-[584px] lg:bottom-auto lg:w-[44%]">
                    <span className="mr-2 text-kicker font-medium whitespace-nowrap text-bone uppercase">
                        Fig. 1
                    </span>
                    One phone photo. Her camera, her light, no studio.
                </figcaption>

                <div className="absolute right-0 bottom-0 w-[50%] max-w-[250px] rotate-[-3deg] sm:w-[36%] lg:top-[88px] lg:right-[-8px] lg:bottom-auto lg:w-[250px]">
                    <PhoneFrame
                        className="w-full"
                        screenClassName="@container bg-[oklch(0.16_0.015_285)]"
                    >
                        <ProductScreen />
                    </PhoneFrame>
                    <FitChip
                        label="Size"
                        value="M · 94% fit"
                        className="absolute top-[22%] right-[82%] rotate-[3deg] whitespace-nowrap lg:top-[30%] lg:right-[90%]"
                    />
                </div>
            </Reveal>

            <Reveal
                delay={120}
                className="lg:col-span-4 lg:col-start-9 lg:self-end"
            >
                <RowText
                    index={ONLINE.index}
                    label={ONLINE.label}
                    title={
                        <>
                            Fewer returns. More <em>“add to bag”.</em>
                        </>
                    }
                    body={ONLINE.body}
                    items={ONLINE.items}
                    metric={ONLINE.metric}
                />
            </Reveal>
        </article>
    );
}

/**
 * The retailer's product page inside the phone, mid try-on. Sized in
 * container units so it scales with the phone instead of reflowing.
 */
function ProductScreen() {
    const result = IMAGES.features.onlineResult;

    return (
        <div
            role="img"
            aria-label="A product page for a blush linen blazer showing the try-on result, size M recommended at 94% fit, and a Try it on button"
            className="absolute inset-0 flex flex-col text-bone"
        >
            <div className="flex h-[6.5%] shrink-0 items-end justify-between px-[9%] text-[length:3.9cqw] font-medium tabular-nums">
                <span>21:40</span>
                <span className="flex items-end gap-[1.2cqw]">
                    <span className="h-[2cqw] w-[0.9cqw] rounded-full bg-bone/80" />
                    <span className="h-[2.8cqw] w-[0.9cqw] rounded-full bg-bone/80" />
                    <span className="h-[3.6cqw] w-[0.9cqw] rounded-full bg-bone/80" />
                    <span className="ml-[1.4cqw] h-[3.4cqw] w-[6.4cqw] rounded-[1.2cqw] border border-bone/60 p-px">
                        <span className="block h-full w-[70%] rounded-[0.6cqw] bg-bone/80" />
                    </span>
                </span>
            </div>
            <div className="flex shrink-0 items-center justify-between px-[7%] pt-[4.5cqw] pb-[3.5cqw]">
                <ChevronLeft className="size-[6cqw] text-mist" />
                <span className="font-display text-[length:3.9cqw] tracking-[0.34em] text-bone uppercase">
                    Maison Rimal
                </span>
                <ShoppingBag className="size-[6cqw] text-mist" />
            </div>
            <div className="relative mx-[5%] min-h-0 flex-1 overflow-hidden rounded-[6cqw]">
                <Photo
                    id={result.id}
                    alt=""
                    sizes="240px"
                    widths={[320, 480]}
                    className="absolute inset-0 size-full"
                    style={{ objectPosition: '45% 30%' }}
                />
                <ScanOverlay className="opacity-50" />
                <span className="absolute top-[3.5cqw] left-[3.5cqw] flex items-center gap-[2cqw] rounded-full bg-ink/65 px-[3cqw] py-[1.3cqw] text-[length:3.5cqw] font-medium tracking-[0.12em] text-bone uppercase backdrop-blur-md">
                    <MockDot className="size-[2.2cqw]" />
                    On you
                </span>
                <span className="absolute right-[3.5cqw] bottom-[3.5cqw] rounded-full bg-ink/65 px-[3cqw] py-[1.3cqw] text-[length:3.5cqw] text-bone tabular-nums backdrop-blur-md">
                    1.8 s
                </span>
            </div>
            <div className="shrink-0 px-[7%] pt-[5cqw] pb-[9%]">
                <div className="flex items-baseline justify-between gap-[2cqw]">
                    <p className="font-display text-[length:5.6cqw] leading-tight font-medium whitespace-nowrap">
                        Linen blazer, blush
                    </p>
                    <p className="text-[length:4cqw] whitespace-nowrap text-mist tabular-nums">
                        SAR 640
                    </p>
                </div>
                <div className="mt-[3.5cqw] flex items-center gap-[1.8cqw]">
                    {['XS', 'S', 'M', 'L'].map((size) => (
                        <span
                            key={size}
                            className={cn(
                                'grid h-[8.5cqw] min-w-[8.5cqw] place-items-center rounded-[2.6cqw] px-[1.6cqw] text-[length:3.6cqw] font-medium',
                                size === 'M'
                                    ? 'bg-champagne/15 text-champagne ring-1 ring-champagne'
                                    : 'text-mist ring-1 ring-white/12',
                            )}
                        >
                            {size}
                        </span>
                    ))}
                    <span className="ml-auto flex items-center gap-[1.4cqw] text-[length:3.6cqw] whitespace-nowrap text-mist">
                        <Check className="size-[4cqw] text-lagoon" />
                        94% fit
                    </span>
                </div>
                <div className="mt-[5cqw] flex h-[13.5cqw] items-center justify-between rounded-[4cqw] bg-champagne px-[5cqw] text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]">
                    <span className="text-[length:4.4cqw] font-semibold">
                        Try it on
                    </span>
                    <Arabic className="text-[length:5.2cqw] leading-none font-bold">
                        جرّبها
                    </Arabic>
                </div>
            </div>
        </div>
    );
}

/** Status dot for the mockups, sized in the device's container units. */
function MockDot({ className }: { className?: string }) {
    return (
        <span
            aria-hidden
            className={cn(
                'relative inline-block shrink-0 rounded-full bg-lagoon',
                className,
            )}
        >
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-lagoon" />
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Row 2: in store, clienteling                                        */
/* ------------------------------------------------------------------ */

function StoreRow() {
    const photo = IMAGES.features.boutique;

    return (
        <article className="relative isolate grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
            <Glow
                color="lagoon"
                className="top-[4%] right-[4%] size-[30rem] opacity-35"
            />
            <Reveal
                as="figure"
                className="relative pb-[30%] sm:pb-[16%] lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:self-start lg:pb-[72px]"
            >
                <div className="glass-rim relative ml-auto w-[80%] rounded-[32px] p-2 glass sm:w-[64%] lg:w-[70%]">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[24px]">
                        <Photo
                            id={photo.id}
                            alt={photo.alt}
                            ratio={1.25}
                            focus={photo.focus}
                            sizes="(min-width: 1024px) 500px, 80vw"
                            widths={[480, 800, 1200]}
                            className="absolute inset-0 size-full"
                        />
                    </div>
                    <div className="absolute top-5 right-5 flex max-w-[15rem] items-start gap-2.5 rounded-[16px] px-3.5 py-3 glass-strong sm:top-7 sm:right-7">
                        <LiveDot className="mt-1 shrink-0" />
                        <p className="text-[12.5px] leading-snug text-bone">
                            Noura A. just walked in
                            <span className="block text-[11px] text-mist">
                                3 saved looks · Tahlia Street
                            </span>
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-[4%] left-0 w-[88%] sm:w-[68%] lg:bottom-0 lg:w-[62%]">
                    <TabletFrame
                        orientation="landscape"
                        className="w-full"
                        screenClassName="@container bg-[oklch(0.17_0.015_285)]"
                    >
                        <StylistScreen />
                    </TabletFrame>
                </div>

                <figcaption className="absolute right-0 bottom-0 hidden w-[30%] text-right text-[13px] leading-snug text-smoke lg:block">
                    <span className="mr-2 text-kicker font-medium whitespace-nowrap text-bone uppercase">
                        Fig. 2
                    </span>
                    The salon on Tahlia Street, Jeddah. Thursday, 11:05.
                </figcaption>
            </Reveal>

            <Reveal
                delay={120}
                className="lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:self-start lg:pt-4"
            >
                <RowText
                    index={STORE.index}
                    label={STORE.label}
                    title={
                        <>
                            Your staff see what she tried on{' '}
                            <em>last night.</em>
                        </>
                    }
                    body={STORE.body}
                    items={STORE.items}
                    metric={STORE.metric}
                    metricFirst
                />
            </Reveal>
        </article>
    );
}

/** Stylist tablet: the shopper's saved looks with sizes and stock. */
function StylistScreen() {
    return (
        <div
            role="img"
            aria-label="Stylist tablet showing Noura A.'s three saved looks: a blush linen blazer in M on the rail, a lilac abaya in 54 in the stockroom, and a burgundy mini bag on the rail"
            className="absolute inset-0 flex flex-col p-[4%] text-bone"
        >
            <div className="flex items-center gap-[2.4cqw]">
                <span className="grid size-[6.8cqw] shrink-0 place-items-center rounded-full bg-champagne/15 font-display text-[length:2.4cqw] text-champagne ring-1 ring-champagne/40">
                    NA
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[length:3.1cqw] leading-tight font-medium">
                        Saved looks · Noura A.
                    </p>
                    <p className="truncate text-[length:2.2cqw] text-smoke">
                        Tried on last night, 21:40 · website
                    </p>
                </div>
                <span className="flex shrink-0 items-center gap-[1.4cqw] rounded-full bg-lagoon/15 px-[2cqw] py-[1cqw] text-[length:2cqw] font-medium tracking-[0.12em] text-bone uppercase">
                    <MockDot className="size-[1.5cqw]" />
                    In store
                </span>
            </div>

            <div className="mt-[3.5%] grid min-h-0 flex-1 grid-cols-3 gap-[3%]">
                {SAVED_LOOKS.map((look) => (
                    <div key={look.name} className="flex min-h-0 flex-col">
                        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2cqw] ring-1 ring-white/10">
                            <Photo
                                id={look.id}
                                alt=""
                                ratio={1.2}
                                focus={look.focus}
                                zoom={look.zoom}
                                sizes="140px"
                                widths={[200, 320]}
                                className="absolute inset-0 size-full"
                            />
                            <span className="absolute top-[1.5cqw] left-[1.5cqw] grid h-[4cqw] min-w-[4cqw] place-items-center rounded-[1.2cqw] bg-ink/70 px-[1cqw] text-[length:2cqw] font-medium text-bone tabular-nums">
                                {look.size}
                            </span>
                        </div>
                        <p className="mt-[1.5cqw] truncate text-[length:2.3cqw] font-medium">
                            {look.name}
                        </p>
                        <p className="flex items-center gap-[1cqw] truncate text-[length:2cqw] text-smoke">
                            <span
                                className={cn(
                                    'size-[1.4cqw] shrink-0 rounded-full',
                                    look.tone,
                                )}
                            />
                            {look.stock}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-[3.5%] flex items-center justify-between gap-[2cqw] border-t border-white/10 pt-[3%]">
                <p className="truncate text-[length:2.2cqw] text-mist">
                    On the rail, same size: Linen abaya, sand · 54
                </p>
                <span className="shrink-0 rounded-[2cqw] bg-champagne px-[2.6cqw] py-[1.5cqw] text-[length:2.2cqw] font-semibold text-ink">
                    Send to fitting room 3
                </span>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Row 3: eyewear, the measured plate                                  */
/* ------------------------------------------------------------------ */

function EyewearRow() {
    return (
        <article className="relative isolate grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
            <Glow
                color="amethyst"
                className="top-[10%] left-[8%] size-[32rem] opacity-40"
            />
            <Reveal className="lg:col-span-7">
                <EyewearPlate />
            </Reveal>
            <Reveal
                delay={120}
                className="lg:col-span-4 lg:col-start-9 lg:self-center"
            >
                <RowText
                    index={EYEWEAR.index}
                    label={EYEWEAR.label}
                    title={
                        <>
                            Frames, measured to <em>the millimetre.</em>
                        </>
                    }
                    body={EYEWEAR.body}
                    items={EYEWEAR.items}
                />
            </Reveal>
        </article>
    );
}

const CHIPS: {
    key: Exclude<MeasureKey, 'pd'>;
    label: string;
    value: string;
    /** Desktop placement, relative to the plate. */
    place: string;
}[] = [
    {
        key: 'width',
        label: 'Frame width',
        value: `${FRAME_MM} mm`,
        place: 'lg:bottom-[calc(100%+22px)] lg:left-[calc(70.7%+18px)]',
    },
    {
        key: 'bridge',
        label: 'Bridge',
        value: '18 mm',
        place: 'lg:top-[41%] lg:right-[calc(100%-28px)] lg:-translate-y-1/2',
    },
];

/**
 * The section's signature: the eyewear portrait drawn up as a technical
 * plate. Dimension lines draw in when it scrolls into view; each reading is
 * a toggle that isolates its measurement on the face.
 */
function EyewearPlate() {
    const photo = IMAGES.features.eyewear;
    const [ref, drawn] = useInView({ rootMargin: '0px 0px -25% 0px' });
    const [pinned, setPinned] = useState<MeasureKey | null>(null);
    const [previewed, setPreviewed] = useState<MeasureKey | null>(null);
    const active = previewed ?? pinned;

    const tone = (key: MeasureKey) =>
        cn(
            'transition-opacity duration-[380ms] ease-glass',
            active === null || active === key ? 'opacity-100' : 'opacity-15',
        );

    const control = (key: MeasureKey) => ({
        pressed: pinned === key,
        lit: active === key,
        dimmed: active !== null && active !== key,
        onToggle: () => setPinned(pinned === key ? null : key),
        onPreview: (on: boolean) => setPreviewed(on ? key : null),
    });

    return (
        <figure
            ref={ref}
            className="relative max-w-[34rem] pt-12 lg:max-w-none lg:pr-[72px] lg:pl-[112px] xl:pl-[124px]"
        >
            <div className="relative">
                <div className="relative aspect-[4/5]">
                    {/* Ruler: the frame width as a millimetre scale. */}
                    <div
                        aria-hidden
                        className={cn(
                            'absolute bottom-[calc(100%+14px)] h-3',
                            tone('width'),
                        )}
                        style={{
                            left: `${FRAME.left}%`,
                            width: `${FRAME.right - FRAME.left}%`,
                        }}
                    >
                        <Ruler drawn={drawn} />
                    </div>

                    <div className="absolute inset-0 overflow-hidden rounded-[28px]">
                        <Photo
                            id={photo.id}
                            alt={photo.alt}
                            ratio={1.25}
                            sizes="(min-width: 1024px) 520px, 92vw"
                            widths={[480, 800, 1200]}
                            className="absolute inset-0 size-full"
                        />
                    </div>

                    {/* Drawn over the photo, deliberately not clipped by its radius. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 [filter:drop-shadow(0_0_1.5px_oklch(0.145_0.018_285/0.9))]"
                    >
                        <div className={tone('width')}>
                            {[FRAME.left, FRAME.right].map((x, i) => (
                                <span
                                    key={x}
                                    className={cn(
                                        'absolute top-[-14px] w-px origin-top bg-[repeating-linear-gradient(to_bottom,var(--color-champagne)_0_3px,transparent_3px_6px)] transition-transform duration-[900ms] ease-glass',
                                        drawn ? 'scale-y-100' : 'scale-y-0',
                                    )}
                                    style={{
                                        left: `${x}%`,
                                        height: `calc(${FRAME.edgeY}% + 14px)`,
                                        transitionDelay: `${200 + i * 120}ms`,
                                    }}
                                />
                            ))}
                        </div>

                        <div className={tone('pd')}>
                            <DimLine
                                from={PUPILS.left}
                                to={PUPILS.right}
                                y={PUPILS.y}
                                drawn={drawn}
                                delay={500}
                            />
                            {[PUPILS.left, PUPILS.right].map((x) => (
                                <Reticle
                                    key={x}
                                    x={x}
                                    y={PUPILS.y}
                                    drawn={drawn}
                                />
                            ))}
                            <Leader
                                from={PUPILS.right}
                                to={100}
                                y={PUPILS.y}
                                drawn={drawn}
                                delay={900}
                            />
                        </div>

                        <div className={tone('bridge')}>
                            <DimLine
                                from={BRIDGE.left}
                                to={BRIDGE.right}
                                y={BRIDGE.y}
                                drawn={drawn}
                                delay={700}
                            />
                            <Leader
                                from={0}
                                to={BRIDGE.left}
                                y={BRIDGE.y}
                                drawn={drawn}
                                delay={1000}
                                reverse
                            />
                        </div>
                    </div>
                </div>

                {/*
                 * The readings. On desktop they pin beside the plate (this
                 * wrapper stays unpositioned so they place against it); on
                 * phones they fall into a row under it.
                 */}
                <div className="mt-5 flex flex-wrap gap-2 lg:mt-0 lg:block">
                    {CHIPS.map((chip) => (
                        <MeasureButton
                            key={chip.key}
                            label={`Highlight ${chip.label}, ${chip.value}`}
                            className={cn('lg:absolute', chip.place)}
                            {...control(chip.key)}
                        >
                            <FitChip
                                label={chip.label}
                                value={chip.value}
                                className="pointer-events-none whitespace-nowrap"
                            />
                        </MeasureButton>
                    ))}
                </div>

                {/* PD: the leader ends in the headline figure itself. */}
                <MeasureButton
                    label={`Highlight pupillary distance, ${EYEWEAR.metric.value} mm`}
                    className="mt-9 block w-full text-left lg:absolute lg:top-[calc(35%-84px)] lg:left-[calc(100%-22px)] lg:mt-0 lg:w-[176px]"
                    ring={false}
                    {...control('pd')}
                >
                    <MetricFigure
                        metric={EYEWEAR.metric}
                        lit={active === 'pd'}
                        split
                    />
                </MeasureButton>
            </div>

            <figcaption className="mt-8 flex items-baseline gap-3 text-[13px] leading-snug text-smoke lg:mt-6">
                <span className="text-kicker font-medium whitespace-nowrap text-bone uppercase">
                    Fig. 3
                </span>
                Square acetate, emerald. Measured from one selfie in 0.9 s.
            </figcaption>
        </figure>
    );
}

function MeasureButton({
    label,
    pressed,
    lit,
    dimmed,
    onToggle,
    onPreview,
    ring = true,
    className,
    children,
}: {
    label: string;
    pressed: boolean;
    lit: boolean;
    dimmed: boolean;
    onToggle: () => void;
    onPreview: (on: boolean) => void;
    /** Ring the control while its measurement is lit. */
    ring?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            aria-label={label}
            onClick={onToggle}
            onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') {
                    onPreview(true);
                }
            }}
            onPointerLeave={() => onPreview(false)}
            onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) {
                    onPreview(true);
                }
            }}
            onBlur={() => onPreview(false)}
            className={cn(
                'cursor-pointer rounded-[14px] transition-[scale,box-shadow,opacity] duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-champagne/80 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none active:scale-[0.97]',
                lit && ring && 'ring-1 ring-champagne/70',
                dimmed && 'opacity-50',
                className,
            )}
        >
            {children}
        </button>
    );
}

/** Millimetre scale: a tick every 5 mm, longer every 10 mm. */
function Ruler({ drawn }: { drawn: boolean }) {
    const at = (mm: number) => `${(mm / FRAME_MM) * 100}%`;

    return (
        <div
            className={cn(
                'relative size-full origin-left transition-transform duration-[1100ms] ease-glass',
                drawn ? 'scale-x-100' : 'scale-x-0',
            )}
        >
            <span className="absolute inset-x-0 bottom-0 h-px bg-champagne/80" />
            <span
                className="absolute inset-x-0 bottom-0 h-[7px]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, oklch(0.86 0.075 82 / 0.7) 1px, transparent 1px)',
                    backgroundSize: `${at(10)} 100%`,
                }}
            />
            <span
                className="absolute inset-x-0 bottom-0 h-1"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, oklch(0.86 0.075 82 / 0.45) 1px, transparent 1px)',
                    backgroundSize: `${at(5)} 100%`,
                }}
            />
            <span className="absolute bottom-0 left-0 h-3 w-px bg-champagne" />
            <span className="absolute right-0 bottom-0 h-3 w-px bg-champagne" />
            {[0, 50, 100].map((mm) => (
                <span
                    key={mm}
                    className="absolute bottom-[calc(100%+4px)] -translate-x-1/2 text-[10px] leading-none text-smoke tabular-nums"
                    style={{ left: at(mm) }}
                >
                    {mm}
                </span>
            ))}
        </div>
    );
}

/** A horizontal dimension line with end ticks, drawn left to right. */
function DimLine({
    from,
    to,
    y,
    drawn,
    delay,
}: {
    from: number;
    to: number;
    y: number;
    drawn: boolean;
    delay: number;
}) {
    return (
        <span
            className={cn(
                'absolute h-px origin-left bg-champagne transition-transform duration-[900ms] ease-glass',
                drawn ? 'scale-x-100' : 'scale-x-0',
            )}
            style={{
                left: `${from}%`,
                width: `${to - from}%`,
                top: `${y}%`,
                transitionDelay: `${delay}ms`,
            }}
        >
            <span className="absolute top-1/2 left-0 h-2.5 w-px -translate-y-1/2 bg-champagne" />
            <span className="absolute top-1/2 right-0 h-2.5 w-px -translate-y-1/2 bg-champagne" />
        </span>
    );
}

/** A thin leader from a measurement out to its reading (desktop only). */
function Leader({
    from,
    to,
    y,
    drawn,
    delay,
    reverse = false,
}: {
    from: number;
    to: number;
    y: number;
    drawn: boolean;
    delay: number;
    reverse?: boolean;
}) {
    return (
        <span
            className={cn(
                'absolute hidden h-px bg-champagne/60 transition-transform duration-[700ms] ease-glass lg:block',
                reverse ? 'origin-right' : 'origin-left',
                drawn ? 'scale-x-100' : 'scale-x-0',
            )}
            style={{
                left: `${from}%`,
                width: `${to - from}%`,
                top: `${y}%`,
                transitionDelay: `${delay}ms`,
            }}
        />
    );
}

function Reticle({ x, y, drawn }: { x: number; y: number; drawn: boolean }) {
    return (
        <span
            className={cn(
                'absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne transition-[scale,opacity] duration-[600ms] ease-glass',
                drawn ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
            style={{ left: `${x}%`, top: `${y}%`, transitionDelay: '400ms' }}
        >
            <span className="absolute top-1/2 left-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne" />
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Shared row text                                                      */
/* ------------------------------------------------------------------ */

/**
 * An oversized Bodoni figure. `split` stacks number / rule / caption (the
 * rule continues the PD leader); otherwise the caption sits beside it.
 */
function MetricFigure({
    metric,
    split = false,
    lit = false,
}: {
    metric: Metric;
    split?: boolean;
    /** Tints the figure while its measurement is highlighted. */
    lit?: boolean;
}) {
    const figure = (
        <span
            className={cn(
                'block font-display text-[clamp(4.25rem,2.5rem+4.4vw,7rem)] leading-[0.8] font-medium tracking-[-0.04em] whitespace-nowrap tabular-nums transition-colors duration-[380ms] ease-glass',
                lit ? 'text-champagne' : 'text-bone',
                split && 'lg:text-[length:5.5rem] lg:leading-[72px]',
            )}
        >
            {metric.value}
            <span
                className={cn(
                    'font-normal tracking-normal text-champagne',
                    metric.unitClassName,
                    // After the size: tailwind-merge drops leading set before it.
                    'leading-none',
                )}
            >
                {metric.unit}
            </span>
        </span>
    );
    const caption = (
        <span className="block max-w-[16ch] pb-1 text-[13.5px] leading-snug text-smoke lg:pb-0">
            {metric.caption}
        </span>
    );

    if (split) {
        return (
            <span className="flex items-end gap-5 lg:block">
                {figure}
                <span className="hidden h-px bg-champagne/60 lg:mt-3 lg:mb-3 lg:block" />
                {caption}
            </span>
        );
    }

    return (
        <span className="flex items-end gap-5">
            {figure}
            {caption}
        </span>
    );
}

function RowText({
    index,
    label,
    title,
    body,
    items,
    metric,
    metricFirst = false,
}: {
    index: string;
    label: string;
    title: ReactNode;
    body: string;
    items: Capability[];
    metric?: Metric;
    /** Lead with the figure visually (reading order stays heading-first). */
    metricFirst?: boolean;
}) {
    return (
        <div className="flex max-w-[34rem] flex-col lg:max-w-none">
            <p className="text-kicker font-medium text-smoke uppercase">
                <span className="text-champagne tabular-nums">{index}</span>
                <span aria-hidden className="mx-2.5 text-white/25">
                    ·
                </span>
                {label}
            </p>
            <h3 className="mt-5 font-display text-display-md font-medium text-balance text-bone [&_em]:font-normal [&_em]:text-champagne [&_em]:italic">
                {title}
            </h3>
            <p className="mt-5 text-[16.5px] leading-relaxed text-pretty text-mist">
                {body}
            </p>

            <ul className="mt-8 border-b border-white/10">
                {items.map((item) => (
                    <li
                        key={item.label}
                        className="border-t border-white/10 py-4"
                    >
                        <p className="text-[15px] leading-snug font-medium text-bone">
                            {item.label}
                        </p>
                        <p className="mt-1 text-[14.5px] leading-snug text-smoke">
                            {item.detail}
                        </p>
                    </li>
                ))}
            </ul>

            {metric ? (
                <p
                    className={cn(
                        metricFirst
                            ? '-order-1 mb-10 border-b border-white/10 pb-8'
                            : 'mt-10',
                    )}
                >
                    <MetricFigure metric={metric} />
                </p>
            ) : null}
        </div>
    );
}
