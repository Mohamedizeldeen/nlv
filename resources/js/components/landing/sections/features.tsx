import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { Translate } from '@/i18n';
import { cn } from '@/lib/utils';
import { Accent } from '../accent';
import { BRAND } from '../brand';
import { BrowserFrame } from '../devices';
import { IMAGES } from '../images';
import { useContent } from '../landing-data';
import { messageParts } from '../message-parts';
import { Photo } from '../photo';
import {
    Container,
    Glow,
    Reveal,
    SectionHeader,
    useInView,
} from '../primitives';
import { FitChip, ScanOverlay } from '../tryon-ui';

// Placeholder content: replace before launch.
// Metrics, the store ("Maison Rimal" and its branches), stock levels,
// try-on counts, prices and measurements are illustrative only. Their words
// are in the section's dictionary, i18n/sections/features.ts, in both
// languages.
type Capability = { label: string; detail: ReactNode };
type Metric = {
    value: string;
    unit: string;
    caption: string;
    /** Per-unit optical sizing: "%" and "mm" sit italic, "×" upright. */
    unitClassName: string;
    /**
     * A figure whose sign must stay put ("+24%", "3.2×"): kept left to right
     * inside Arabic text. A figure with a word unit ("62 mm") reads in the
     * page's direction instead.
     */
    ltr?: boolean;
};

type Row = {
    index: string;
    label: string;
    /** Title copy, its accent marked with *asterisks*. */
    title: string;
    body: string;
    items: Capability[];
};

function railRow(t: Translate): Row & { metric: Metric } {
    return {
        index: '01',
        label: t('features.railLabel'),
        title: t('features.railTitle'),
        body: t('features.railBody'),
        items: [
            {
                label: t('features.railItem1Label'),
                detail: t('features.railItem1Detail'),
            },
            {
                label: t('features.railItem2Label'),
                detail: t('features.railItem2Detail'),
            },
            {
                label: t('features.railItem3Label'),
                detail: t('features.railItem3Detail'),
            },
        ],
        metric: {
            value: '3.2',
            unit: '×',
            caption: t('features.railMetricCaption'),
            unitClassName: 'relative bottom-[0.06em] ms-1 text-[0.72em]',
            ltr: true,
        },
    };
}

function cloudRow(t: Translate): Row & { metric: Metric } {
    return {
        index: '02',
        label: t('features.cloudLabel'),
        title: t('features.cloudTitle'),
        body: t('features.cloudBody'),
        items: [
            {
                label: t('features.cloudItem1Label'),
                detail: t('features.cloudItem1Detail'),
            },
            {
                label: t('features.cloudItem2Label'),
                detail: t('features.cloudItem2Detail'),
            },
            {
                label: t('features.cloudItem3Label'),
                detail: t('features.cloudItem3Detail'),
            },
        ],
        metric: {
            value: '+24',
            unit: '%',
            caption: t('features.cloudMetricCaption'),
            unitClassName: 'text-[0.42em] italic',
            ltr: true,
        },
    };
}

function eyewearRow(t: Translate): Row & { metric: Metric } {
    return {
        index: '03',
        label: t('features.eyewearLabel'),
        title: t('features.eyewearTitle'),
        body: t('features.eyewearBody'),
        items: [
            {
                label: t('features.eyewearItem1Label'),
                detail: t('features.eyewearItem1Detail'),
            },
            {
                label: t('features.eyewearItem2Label'),
                detail: t('features.eyewearItem2Detail'),
            },
            {
                label: t('features.eyewearItem3Label'),
                detail: t('features.eyewearItem3Detail'),
            },
        ],
        metric: {
            value: '62',
            unit: t('features.millimetres'),
            caption: t('features.pdCaption'),
            unitClassName: 'ms-0.5 text-[0.36em] italic',
        },
    };
}

const STORE = {
    /** The store's wordmark in the mockups: Latin artwork on both pages. */
    wordmark: 'Maison Rimal',
    /** Path of the store's page in the cloud app (a URL: stays Latin). */
    slug: 'maison-rimal',
    catalogue: 1240,
    /** The morning's catalogue push, shown on the salon photo. */
    edit: { pieces: 86, live: '09:00' },
};

type Where = 'rail' | 'stockroom' | 'branch';

/** The piece on the mirror in row 1. It tops the cloud app's list in row 2. */
const LOOK = {
    size: '40',
    left: 2,
    sizes: [
        { size: '36', where: 'rail' },
        { size: '38', where: 'rail' },
        { size: '40', where: 'stockroom' },
        { size: '42', where: 'branch' },
        { size: '44', where: 'rail' },
    ] satisfies { size: string; where: Where }[],
    /** Colourways, as swatches on the result. The first is on screen. */
    colours: [
        { name: 'Blush', swatch: 'bg-rose' },
        { name: 'Ivory', swatch: 'bg-bone' },
        { name: 'Emerald', swatch: 'bg-jade' },
        { name: 'Black', swatch: 'bg-ink' },
    ],
};

/** Stock marker under each size: filled bone, filled accent, hollow. */
const WHERE_MARK: Record<Where, string> = {
    rail: 'bg-bone/85',
    stockroom: 'bg-mint',
    branch: 'ring-1 ring-inset ring-mist/70',
};

type Tried = {
    id: string;
    focus: [number, number];
    zoom?: number;
    name: string;
    tried: number;
    sold: number;
};

/** "Most tried this week" in the cloud app. The first is row 1's blazer. */
function mostTried(t: Translate): Tried[] {
    return [
        {
            id: IMAGES.features.tryOnResult.id,
            focus: [0.42, 0.52],
            zoom: 2.1,
            name: t('features.pieceBlazer'),
            tried: 214,
            sold: 66,
        },
        {
            id: IMAGES.garments[6].id,
            focus: IMAGES.garments[6].focus,
            name: t('features.pieceBag'),
            tried: 171,
            sold: 49,
        },
        {
            id: IMAGES.garments[4].id,
            focus: IMAGES.garments[4].focus,
            name: t('features.pieceShirt'),
            tried: 126,
            sold: 27,
        },
        {
            id: IMAGES.garments[3].id,
            focus: IMAGES.garments[3].focus,
            name: t('features.pieceTrucker'),
            tried: 98,
            sold: 30,
        },
    ];
}

type Device = { name: string; place: string; online: boolean };

function devices(t: Translate): Device[] {
    return [
        {
            name: t('features.mirror', { number: 1 }),
            place: t('features.tahliaStreet'),
            online: true,
        },
        {
            name: t('features.mirror', { number: 2 }),
            place: t('features.redSeaMall'),
            online: true,
        },
        {
            name: t('features.mirror', { number: 3 }),
            place: t('features.olayaRiyadh'),
            online: false,
        },
    ];
}

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
    const label = useContent('sections.features.label');
    const title = useContent('sections.features.title');
    const lede = useContent('sections.features.lede');

    return (
        <section id="features" className="relative isolate py-24 md:py-36">
            <Container>
                <SectionHeader
                    index="02"
                    label={label}
                    title={<Accent text={title} />}
                    lede={lede}
                />

                <div className="mt-20 space-y-28 md:mt-28 lg:space-y-40">
                    <RailRow />
                    <CloudRow />
                    <EyewearRow />
                </div>
            </Container>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Row 1: the endless rail                                             */
/* ------------------------------------------------------------------ */

function RailRow() {
    const { t } = useI18n();
    const photo = IMAGES.store.rail;
    const row = railRow(t);

    return (
        <article className="relative isolate grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
            <Glow
                color="mint"
                className="start-[36%] top-[22%] size-[26rem] opacity-[0.16]"
            />
            <Reveal
                as="figure"
                className="relative pb-[30%] sm:pb-[14%] lg:col-span-7 lg:pb-[84px]"
            >
                {/* Bleeds off the viewport's start edge on desktop (the right in Arabic). */}
                <div className="relative me-[24%] aspect-[4/5] overflow-hidden rounded-[28px] sm:aspect-[5/4] lg:ms-[calc((min(100vw,1320px)-100vw)/2-3rem)] lg:me-[118px] lg:aspect-auto lg:h-[560px] lg:rounded-s-none lg:rounded-e-[32px]">
                    <Photo
                        id={photo.id}
                        alt={t('features.railPhotoAlt')}
                        sizes="(min-width: 1024px) 720px, 80vw"
                        widths={[480, 800, 1200]}
                        className="absolute inset-0 size-full"
                        style={{ objectPosition: '34% 62%' }}
                    />
                </div>

                <figcaption className="absolute start-0 bottom-0 w-[44%] text-[13px] leading-snug text-smoke sm:w-[52%] lg:top-[584px] lg:bottom-auto lg:w-[46%]">
                    <span className="me-2 text-kicker font-medium whitespace-nowrap text-bone uppercase">
                        {t('features.fig', { number: 1 })}
                    </span>
                    {t('features.fig1')}
                </figcaption>

                <div className="absolute end-0 bottom-0 w-[54%] max-w-[250px] sm:w-[34%] lg:end-[-8px] lg:top-[56px] lg:bottom-auto lg:w-[256px]">
                    <MirrorPanel>
                        <RailScreen />
                    </MirrorPanel>
                    <FitChip
                        tone="dark"
                        label={t('features.onTheMirror')}
                        value={t('features.pieces', {
                            count: STORE.catalogue,
                        })}
                        className="absolute end-[86%] top-[10%] whitespace-nowrap lg:end-[92%] lg:top-[14%]"
                    />
                </div>
            </Reveal>

            <Reveal
                delay={120}
                className="lg:col-span-4 lg:col-start-9 lg:self-end"
            >
                <RowText
                    index={row.index}
                    label={row.label}
                    title={<Accent text={row.title} />}
                    body={row.body}
                    items={row.items}
                    metric={row.metric}
                />
            </Reveal>
        </article>
    );
}

/**
 * A close crop of the device itself: the same bezel and camera bar as the
 * kiosk, cut off above the stand. The screen is a size container.
 */
function MirrorPanel({ children }: { children: ReactNode }) {
    return (
        <div className="relative w-full rounded-[9%/5.4%] bg-[oklch(0.2_0.01_200)] p-[4%] pt-[10%] shadow-[0_50px_90px_-40px_oklch(0_0_0/0.85),inset_0_0_0_1px_oklch(1_0_0/0.16),inset_0_2px_0_oklch(1_0_0/0.12)]">
            <div
                aria-hidden
                className="absolute top-[2.6%] left-1/2 flex h-[2.6%] w-[24%] -translate-x-1/2 items-center justify-center gap-[12%] rounded-full bg-black/80"
            >
                <span className="aspect-square h-[46%] rounded-full bg-[radial-gradient(circle_at_35%_35%,oklch(0.7_0.06_200),oklch(0.2_0.02_210)_60%)] shadow-[0_0_0_2px_oklch(0.3_0.01_200)]" />
                <span className="aspect-square h-[22%] rounded-full bg-lagoon/80" />
            </div>
            <div className="@container relative aspect-[9/16] w-full overflow-hidden rounded-[4%/2.3%] bg-[oklch(0.16_0.012_200)]">
                {children}
            </div>
        </div>
    );
}

/**
 * The device mid try-on: the blazer on her, every size with where it is,
 * and the one she picked waiting in the stockroom. Sized in container
 * units so it scales with the panel instead of reflowing.
 */
function RailScreen() {
    const { t, locale } = useI18n();
    const result = IMAGES.features.tryOnResult;
    const stock = (where: Where) =>
        ({
            rail: t('features.onTheRail'),
            stockroom: t('features.inTheStockroom'),
            branch: t('features.atAnotherBranch'),
        })[where];

    return (
        <div
            role="img"
            aria-label={t('features.railScreen', {
                brand: BRAND.name,
                sizes: LOOK.sizes
                    .map(({ size, where }) =>
                        t('features.railScreenSize', {
                            size,
                            where: stock(where),
                        }),
                    )
                    .join(t('features.listComma')),
                size: LOOK.size,
            })}
            className="absolute inset-0 flex flex-col px-[5.5%] pt-[5%] pb-[5.5%] text-bone"
        >
            <div className="flex shrink-0 items-center justify-between pb-[3.6cqw]">
                <span className="font-display text-[length:3.6cqw] tracking-[0.32em] uppercase">
                    {STORE.wordmark}
                </span>
                {/* The UI's languages (product codes); the page's own is lit. */}
                <span className="flex gap-[2.4cqw] text-[length:3.2cqw] font-medium tracking-[0.14em]">
                    {(['en', 'ar'] as const).map((code) => (
                        <span
                            key={code}
                            className={
                                code === locale ? 'text-bone' : 'text-smoke'
                            }
                        >
                            {code.toUpperCase()}
                        </span>
                    ))}
                </span>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[4.5cqw]">
                <Photo
                    id={result.id}
                    alt=""
                    sizes="240px"
                    widths={[320, 480]}
                    className="absolute inset-0 size-full"
                    style={{ objectPosition: '45% 34%' }}
                />
                <ScanOverlay className="opacity-40" />
                <span className="absolute start-[3.5cqw] top-[3.5cqw] flex items-center gap-[1.8cqw] rounded-full bg-ink/65 px-[3cqw] py-[1.3cqw] text-[length:3.3cqw] font-medium tracking-[0.12em] text-bone uppercase backdrop-blur-md">
                    {t('features.onYou')}
                </span>
                <span className="absolute end-[3.5cqw] top-[3.5cqw] flex flex-col gap-[2cqw] rounded-full bg-ink/55 p-[1.6cqw] backdrop-blur-md">
                    {LOOK.colours.map((colour, i) => (
                        <span
                            key={colour.name}
                            className={cn(
                                'block size-[4.4cqw] rounded-full ring-1 ring-white/25',
                                colour.swatch,
                                i === 0 &&
                                    'ring-2 ring-mint ring-offset-[0.8cqw] ring-offset-ink',
                            )}
                        />
                    ))}
                </span>
            </div>

            <div className="shrink-0 pt-[4.4cqw]">
                <div className="flex items-baseline justify-between gap-[2cqw]">
                    <p className="font-display text-[length:5.4cqw] leading-tight font-medium whitespace-nowrap">
                        {t('features.lookName')}
                    </p>
                    <p className="text-[length:3.6cqw] whitespace-nowrap text-mist tabular-nums">
                        {t('features.lookPrice')}
                    </p>
                </div>
                <div className="mt-[3.2cqw] flex gap-[1.8cqw]">
                    {LOOK.sizes.map(({ size, where }) => (
                        <span
                            key={size}
                            className="flex flex-1 flex-col items-center gap-[1.8cqw]"
                        >
                            <span
                                className={cn(
                                    'grid h-[8.4cqw] w-full place-items-center rounded-[2.4cqw] text-[length:3.6cqw] font-medium tabular-nums',
                                    size === LOOK.size
                                        ? 'bg-mint/15 text-mint ring-1 ring-mint'
                                        : 'text-mist ring-1 ring-white/12',
                                )}
                            >
                                {size}
                            </span>
                            <span
                                className={cn(
                                    'size-[1.8cqw] rounded-full',
                                    WHERE_MARK[where],
                                )}
                            />
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-[4cqw] shrink-0 rounded-[4cqw] bg-white/[0.06] p-[3.6cqw] ring-1 ring-white/10">
                <p className="text-[length:3.6cqw] leading-tight font-medium text-bone">
                    {t('features.stockLine', {
                        size: LOOK.size,
                        where: stock('stockroom'),
                    })}
                </p>
                <p className="mt-[1.2cqw] text-[length:3.3cqw] leading-snug text-smoke">
                    {messageParts(t, 'features.stockLeft', {
                        count: LOOK.left,
                    })}
                </p>
                <div className="mt-[3.2cqw] flex h-[10.5cqw] items-center justify-between rounded-[3cqw] bg-mint px-[4cqw] text-ink">
                    <span className="text-[length:3.8cqw] font-semibold whitespace-nowrap">
                        {t('features.bringIt')}
                    </span>
                    <ArrowRight
                        aria-hidden
                        className="size-[4.2cqw] rtl:-scale-x-100"
                    />
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Row 2: run it from the cloud                                        */
/* ------------------------------------------------------------------ */

function CloudRow() {
    const { t } = useI18n();
    const photo = IMAGES.features.boutique;
    const row = cloudRow(t);
    const [first] = devices(t);

    return (
        <article className="relative isolate grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
            <Glow
                color="lagoon"
                className="end-[4%] top-[4%] size-[30rem] opacity-35"
            />
            <Reveal
                as="figure"
                className="relative lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:self-start"
            >
                <div className="glass-rim relative ms-auto w-[80%] rounded-[32px] p-2 glass sm:w-[60%] lg:w-[64%]">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[24px]">
                        <Photo
                            id={photo.id}
                            alt={t('features.boutiqueAlt')}
                            ratio={1.25}
                            focus={photo.focus}
                            sizes="(min-width: 1024px) 460px, 80vw"
                            widths={[480, 800, 1200]}
                            className="absolute inset-0 size-full"
                        />
                    </div>
                    <div className="absolute end-4 top-4 max-w-[15rem] rounded-[16px] px-3.5 py-3 glass-strong sm:end-7 sm:top-7">
                        <p className="text-[12.5px] leading-snug text-bone">
                            {messageParts(t, 'features.mirrorAt', {
                                mirror: first.name,
                                place: first.place,
                            })}
                            <span className="block text-[11px] text-mist">
                                {messageParts(t, 'features.editLiveSince', {
                                    edit: t('features.autumnEdit'),
                                    time: STORE.edit.live,
                                })}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Rides up over the photo; its height follows its content. */}
                <div className="relative z-10 -mt-[38%] w-full sm:-mt-[34%] sm:w-[78%] lg:-mt-[46%] lg:w-[76%]">
                    <BrowserFrame
                        url={`cloud.${BRAND.domain}/${STORE.slug}`}
                        className="w-full"
                        screenClassName="@container bg-[oklch(0.16_0.012_200/0.74)]"
                    >
                        <CloudScreen />
                    </BrowserFrame>
                </div>

                <figcaption className="mt-6 flex items-baseline gap-3 text-[13px] leading-snug text-smoke">
                    <span className="text-kicker font-medium whitespace-nowrap text-bone uppercase">
                        {t('features.fig', { number: 2 })}
                    </span>
                    {t('features.fig2')}
                </figcaption>
            </Reveal>

            <Reveal
                delay={120}
                className="lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:self-start lg:pt-4"
            >
                <RowText
                    index={row.index}
                    label={row.label}
                    title={<Accent text={row.title} />}
                    body={row.body}
                    items={row.items}
                    metric={row.metric}
                    metricFirst
                />
            </Reveal>
        </article>
    );
}

/**
 * The cloud app's weekly view: most tried pieces, and the devices. Every
 * size is a multiple of --u (1% of the mock browser window), boosted in
 * narrow windows, where the devices column drops out so the table stays legible.
 */
function CloudScreen() {
    const { t } = useI18n();
    const pieces = mostTried(t);
    const mirrors = devices(t);
    const top = pieces[0];
    const status = (device: Device) =>
        device.online ? t('features.online') : t('features.updating');
    const row =
        'grid grid-cols-[1fr_calc(var(--u)*7)_calc(var(--u)*7)_calc(var(--u)*6.4)] items-center gap-x-[calc(var(--u)*1.6)]';

    return (
        <div
            role="img"
            aria-label={t('features.cloudScreen', {
                brand: BRAND.name,
                store: t('features.store'),
                pieces: pieces
                    .map((piece) =>
                        t('features.cloudScreenPiece', {
                            name: piece.name,
                            tried: piece.tried,
                            sold: piece.sold,
                        }),
                    )
                    .join(t('features.listSemicolon')),
                devices: mirrors
                    .map((device) =>
                        t('features.cloudScreenDevice', {
                            mirror: device.name,
                            place: device.place,
                            status: status(device).toLowerCase(),
                        }),
                    )
                    .join(t('features.listSemicolon')),
            })}
            className="flex flex-col px-[calc(var(--u)*4.5)] pt-[calc(var(--u)*3.2)] pb-[calc(var(--u)*4)] text-bone [--u:1.42cqw] @md:[--u:1cqw]"
        >
            <div className="flex items-center gap-[calc(var(--u)*3.4)] border-b border-white/10 pb-[calc(var(--u)*2.6)]">
                <span className="font-display text-[length:calc(var(--u)*2.5)] tracking-[0.3em] whitespace-nowrap uppercase">
                    {STORE.wordmark}
                </span>
                <span className="flex gap-[calc(var(--u)*2.6)] text-[length:calc(var(--u)*2.2)] text-smoke">
                    <span className="hidden @md:inline">
                        {t('features.tabCatalogue')}
                    </span>
                    <span className="hidden @md:inline">
                        {t('features.tabDevices')}
                    </span>
                    <span className="relative text-bone after:absolute after:inset-x-0 after:-bottom-[calc(var(--u)*2.7)] after:h-px after:bg-mint">
                        {t('features.tabInsights')}
                    </span>
                </span>
                <span className="ms-auto rounded-[calc(var(--u)*1.4)] px-[calc(var(--u)*1.8)] py-[calc(var(--u)*0.7)] text-[length:calc(var(--u)*2)] whitespace-nowrap text-mist ring-1 ring-white/12">
                    {t('features.thisWeek')}
                </span>
            </div>

            <div className="mt-[calc(var(--u)*3.4)] grid grid-cols-1 gap-[calc(var(--u)*4)] @md:grid-cols-[1.7fr_1fr]">
                <div>
                    <p className="font-display text-[length:calc(var(--u)*3.2)] leading-tight font-medium">
                        {t('features.mostTried')}
                    </p>
                    <div
                        className={cn(
                            row,
                            'mt-[calc(var(--u)*2.2)] border-b border-white/10 pb-[calc(var(--u)*1.2)] text-[length:calc(var(--u)*1.8)] tracking-[0.14em] text-smoke uppercase',
                        )}
                    >
                        <span>{t('features.colPiece')}</span>
                        <span className="text-end">
                            {t('features.colTried')}
                        </span>
                        <span className="text-end">
                            {t('features.colSold')}
                        </span>
                        <span className="text-end">
                            {t('features.colRate')}
                        </span>
                    </div>
                    <ul className="space-y-[calc(var(--u)*1.7)] pt-[calc(var(--u)*1.8)]">
                        {pieces.map((piece) => (
                            <li
                                key={piece.name}
                                className={cn(
                                    row,
                                    'text-[length:calc(var(--u)*2.2)] tabular-nums',
                                )}
                            >
                                <span className="flex min-w-0 items-center gap-[calc(var(--u)*1.8)]">
                                    <span className="relative aspect-[4/5] w-[calc(var(--u)*5.2)] shrink-0 overflow-hidden rounded-[calc(var(--u)*1)] ring-1 ring-white/10">
                                        <Photo
                                            id={piece.id}
                                            alt=""
                                            ratio={1.25}
                                            focus={piece.focus}
                                            zoom={piece.zoom}
                                            sizes="40px"
                                            widths={[80, 120]}
                                            className="absolute inset-0 size-full"
                                        />
                                    </span>
                                    <span
                                        className={cn(
                                            'truncate',
                                            piece === top
                                                ? 'text-bone'
                                                : 'text-mist',
                                        )}
                                    >
                                        {piece.name}
                                    </span>
                                </span>
                                <span className="text-end text-bone">
                                    {piece.tried}
                                </span>
                                <span className="text-end text-mist">
                                    {piece.sold}
                                </span>
                                <span className="text-end text-mint">
                                    {Math.round(
                                        (piece.sold / piece.tried) * 100,
                                    )}
                                    %
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="hidden flex-col border-s border-white/10 ps-[calc(var(--u)*3.4)] @md:flex">
                    <p className="font-display text-[length:calc(var(--u)*3.2)] leading-tight font-medium">
                        {t('features.devices')}
                    </p>
                    {/* Status in words, no status dots. */}
                    <ul className="mt-[calc(var(--u)*2.4)] space-y-[calc(var(--u)*2.2)]">
                        {mirrors.map((device) => (
                            <li
                                key={device.name}
                                className="min-w-0 leading-tight"
                            >
                                <span className="block truncate text-[length:calc(var(--u)*2.2)]">
                                    {device.name}
                                </span>
                                <span className="block truncate text-[length:calc(var(--u)*1.9)] text-smoke">
                                    {messageParts(t, 'features.placeStatus', {
                                        place: device.place,
                                        status: status(device),
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-auto border-t border-white/10 pt-[calc(var(--u)*1.8)] text-[length:calc(var(--u)*1.9)] leading-snug text-smoke">
                        <span className="block text-mist">
                            {messageParts(t, 'features.editPieces', {
                                edit: t('features.autumnEdit'),
                                count: STORE.edit.pieces,
                            })}
                        </span>
                        {messageParts(t, 'features.onEveryMirror', {
                            time: STORE.edit.live,
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Row 3: eyewear, the measured plate                                  */
/* ------------------------------------------------------------------ */

function EyewearRow() {
    const { t } = useI18n();
    const row = eyewearRow(t);

    return (
        <article className="relative isolate grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
            <Glow
                color="jade"
                className="start-[8%] top-[10%] size-[32rem] opacity-40"
            />
            <Reveal className="lg:col-span-7">
                <EyewearPlate metric={row.metric} />
            </Reveal>
            <Reveal
                delay={120}
                className="lg:col-span-4 lg:col-start-9 lg:self-center"
            >
                <RowText
                    index={row.index}
                    label={row.label}
                    title={<Accent text={row.title} />}
                    body={row.body}
                    items={row.items}
                />
            </Reveal>
        </article>
    );
}

type Chip = {
    key: Exclude<MeasureKey, 'pd'>;
    label: string;
    value: string;
    /** Desktop placement, relative to the plate. */
    place: string;
};

/*
 * Leaders from a measurement out to its reading, in percent of the plate.
 * Left to right the PD figure sits on the plate's right and the bridge
 * reading on its left; right to left the readings swap sides (the plate
 * itself, a photo with lines on it, is never mirrored).
 */
const LEADERS = {
    ltr: {
        pd: { from: PUPILS.right, to: 100, reverse: false },
        bridge: { from: 0, to: BRIDGE.left, reverse: true },
    },
    rtl: {
        pd: { from: 0, to: PUPILS.left, reverse: true },
        bridge: { from: BRIDGE.right, to: 100, reverse: false },
    },
};

/**
 * The section's signature: the eyewear portrait drawn up as a technical
 * plate. Dimension lines draw in when it scrolls into view; each reading is
 * a toggle that isolates its measurement on the face.
 */
function EyewearPlate({ metric }: { metric: Metric }) {
    const { t, dir } = useI18n();
    const photo = IMAGES.features.eyewear;
    const leaders = LEADERS[dir];
    const chips: Chip[] = [
        {
            key: 'width',
            label: t('features.frameWidth'),
            value: t('features.measure', { value: FRAME_MM }),
            place: 'lg:bottom-[calc(100%+22px)] lg:left-[calc(70.7%+18px)]',
        },
        {
            key: 'bridge',
            label: t('features.bridge'),
            value: t('features.measure', { value: 18 }),
            place: 'lg:end-[calc(100%-28px)] lg:top-[41%] lg:-translate-y-1/2',
        },
    ];
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
            className="relative max-w-[34rem] pt-12 lg:max-w-none lg:ps-[112px] lg:pe-[72px] xl:ps-[124px]"
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
                            alt={t('features.eyewearAlt')}
                            ratio={1.25}
                            sizes="(min-width: 1024px) 520px, 92vw"
                            widths={[480, 800, 1200]}
                            className="absolute inset-0 size-full"
                        />
                    </div>

                    {/* Drawn over the photo, deliberately not clipped by its radius. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 [filter:drop-shadow(0_0_1.5px_oklch(0.145_0.014_200/0.9))]"
                    >
                        <div className={tone('width')}>
                            {[FRAME.left, FRAME.right].map((x, i) => (
                                <span
                                    key={x}
                                    className={cn(
                                        'absolute top-[-14px] w-px origin-top bg-[repeating-linear-gradient(to_bottom,var(--color-mint)_0_3px,transparent_3px_6px)] transition-transform duration-[900ms] ease-glass',
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
                                {...leaders.pd}
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
                                {...leaders.bridge}
                                y={BRIDGE.y}
                                drawn={drawn}
                                delay={1000}
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
                    {chips.map((chip) => (
                        <MeasureButton
                            key={chip.key}
                            label={t('features.highlight', {
                                label: chip.label,
                                value: chip.value,
                            })}
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
                    label={t('features.highlightPd', { value: metric.value })}
                    className="mt-9 block w-full text-start lg:absolute lg:start-[calc(100%-22px)] lg:top-[calc(35%-84px)] lg:mt-0 lg:w-[176px]"
                    ring={false}
                    {...control('pd')}
                >
                    <MetricFigure metric={metric} lit={active === 'pd'} split />
                </MeasureButton>
            </div>

            <figcaption className="mt-8 flex items-baseline gap-3 text-[13px] leading-snug text-smoke lg:mt-6">
                <span className="text-kicker font-medium whitespace-nowrap text-bone uppercase">
                    {t('features.fig', { number: 3 })}
                </span>
                {t('features.fig3')}
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
                'cursor-pointer rounded-[14px] transition-[scale,box-shadow,opacity] duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-mint/80 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none active:scale-[0.97]',
                lit && ring && 'ring-1 ring-mint/70',
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
            <span className="absolute inset-x-0 bottom-0 h-px bg-mint/80" />
            <span
                className="absolute inset-x-0 bottom-0 h-[7px]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, oklch(0.84 0.12 160 / 0.7) 1px, transparent 1px)',
                    backgroundSize: `${at(10)} 100%`,
                }}
            />
            <span
                className="absolute inset-x-0 bottom-0 h-1"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, oklch(0.84 0.12 160 / 0.45) 1px, transparent 1px)',
                    backgroundSize: `${at(5)} 100%`,
                }}
            />
            <span className="absolute bottom-0 left-0 h-3 w-px bg-mint" />
            <span className="absolute right-0 bottom-0 h-3 w-px bg-mint" />
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
                'absolute h-px origin-left bg-mint transition-transform duration-[900ms] ease-glass',
                drawn ? 'scale-x-100' : 'scale-x-0',
            )}
            style={{
                left: `${from}%`,
                width: `${to - from}%`,
                top: `${y}%`,
                transitionDelay: `${delay}ms`,
            }}
        >
            <span className="absolute top-1/2 left-0 h-2.5 w-px -translate-y-1/2 bg-mint" />
            <span className="absolute top-1/2 right-0 h-2.5 w-px -translate-y-1/2 bg-mint" />
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
                'absolute hidden h-px bg-mint/60 transition-transform duration-[700ms] ease-glass lg:block',
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
                'absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-mint transition-[scale,opacity] duration-[600ms] ease-glass',
                drawn ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
            style={{ left: `${x}%`, top: `${y}%`, transitionDelay: '400ms' }}
        >
            <span className="absolute top-1/2 left-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint" />
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
                lit ? 'text-mint' : 'text-bone',
                metric.ltr && 'bidi-ltr',
                split && 'lg:text-[length:5.5rem] lg:leading-[72px]',
            )}
        >
            {metric.value}
            <span
                className={cn(
                    'font-normal tracking-normal text-mint',
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
        <span className="block max-w-[16ch] pb-1 text-[13.5px] leading-snug text-balance text-smoke lg:pb-0">
            {metric.caption}
        </span>
    );

    if (split) {
        return (
            <span className="flex items-end gap-5 lg:block">
                {figure}
                <span className="hidden h-px bg-mint/60 lg:mt-3 lg:mb-3 lg:block" />
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
                <span className="text-mint tabular-nums">{index}</span>
                <span aria-hidden className="mx-2.5 text-white/25">
                    ·
                </span>
                {label}
            </p>
            <h3 className="mt-5 font-display text-display-md font-medium text-balance text-bone [&_em]:font-normal [&_em]:text-mint [&_em]:italic">
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
