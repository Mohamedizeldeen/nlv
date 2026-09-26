import { useId, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { Accent } from '../accent';
import { BRAND } from '../brand';
import { KioskFrame } from '../devices';
import { IMAGES } from '../images';
import { useContent } from '../landing-data';
import { messageParts } from '../message-parts';
import { Photo } from '../photo';
import {
    Container,
    Glow,
    LogoMark,
    Reveal,
    SectionHeader,
} from '../primitives';
import { GarmentRail, QrGlyph, ScanOverlay } from '../tryon-ui';
import type { Garment } from '../tryon-ui';

// Placeholder content: replace before launch.
// The installation ("Casa Lino, Milan"), the look on screen and the
// hardware figures are illustrative only. Their words are in the section's
// dictionary, i18n/sections/kiosk.ts, in both languages.
const ON_SCREEN = { size: 'M', fit: 94 };

/** The kiosk's languages, a product code shown as-is on both pages. */
const LANGUAGES = ['EN', 'AR'] as const;

type HotspotKey = 'camera' | 'screen' | 'qr' | 'base';

type Hotspot = {
    key: HotspotKey;
    title: string;
    /** Label beside the dot below xl, where space is tight. */
    short: string;
    body: string;
    /** Dot position on the kiosk, as fractions of the kiosk box. */
    at: [number, number];
    /** Vertical centre of the callout card on the xl stage (fraction). */
    cardY: number;
};

type HotspotPlace = Pick<Hotspot, 'key' | 'at' | 'cardY'>;

/*
 * Hotspot geometry: the dots sit on the kiosk artwork and the stage keeps
 * its left-to-right layout on both pages, so only the words change.
 */
const HOTSPOTS: HotspotPlace[] = [
    { key: 'camera', at: [0.34, 0.032], cardY: 0.19 },
    { key: 'screen', at: [0.04, 0.3], cardY: 0.405 },
    { key: 'qr', at: [0.04, 0.796], cardY: 0.625 },
    { key: 'base', at: [0.28, 0.93], cardY: 0.84 },
];

/** Keeps a Latin product code ("55″ 4K") in one piece inside Arabic text. */
function isolate(code: string, rtl: boolean) {
    return rtl ? `\u2066${code}\u2069` : code;
}

/** The hotspots with their words, in the page's language. */
function useHotspots(): Hotspot[] {
    const { t, isRtl } = useI18n();
    const words: Record<
        HotspotKey,
        Pick<Hotspot, 'title' | 'short' | 'body'>
    > = {
        camera: {
            title: t('kiosk.cameraTitle'),
            short: t('kiosk.cameraShort'),
            body: t('kiosk.cameraBody'),
        },
        screen: {
            title: t('kiosk.screenTitle', {
                code: isolate('55″ 4K', isRtl),
            }),
            short: t('kiosk.screenShort'),
            body: t('kiosk.screenBody'),
        },
        qr: {
            title: t('kiosk.qrTitle'),
            short: t('kiosk.qrShort'),
            body: t('kiosk.qrBody'),
        },
        base: {
            title: t('kiosk.cloudTitle'),
            short: t('kiosk.cloudShort'),
            body: t('kiosk.cloudBody'),
        },
    };

    return HOTSPOTS.map((place) => ({ ...place, ...words[place.key] }));
}

/** A unit set smaller beside a display numeral, e.g. "1.8 s". */
function Unit({ children }: { children: ReactNode }) {
    return <span className="ms-1.5 text-[0.6em] text-mist">{children}</span>;
}

/** The hardware figures, in the page's language. */
function useSpecs(): { key: string; caption: string; value: ReactNode }[] {
    const { t } = useI18n();

    return [
        {
            key: 'screen',
            caption: t('kiosk.specScreen'),
            value: <span className="bidi-ltr">55″ 4K</span>,
        },
        {
            key: 'render',
            caption: t('kiosk.specRender'),
            value: (
                <>
                    1.8<Unit>{t('kiosk.seconds')}</Unit>
                </>
            ),
        },
        {
            key: 'languages',
            caption: t('kiosk.specLanguages'),
            value: (
                <span className="bidi-ltr">
                    {`${LANGUAGES[0]} `}
                    <span className="text-white/25">·</span>
                    {` ${LANGUAGES[1]}`}
                </span>
            ),
        },
        {
            key: 'footprint',
            caption: t('kiosk.specFootprint'),
            value: (
                <>
                    0.6
                    <Unit>
                        {t('kiosk.metres')}
                        <sup className="text-[0.6em]">2</sup>
                    </Unit>
                </>
            ),
        },
    ];
}

/*
 * Stage geometry. From md up the stage is exactly 16:9, so the kiosk, the
 * hotspots, the callout cards and the leader lines all share one
 * coordinate system (the SVG viewBox below) and stay attached at any width.
 * The kiosk's box keeps a fixed aspect ratio; hotspots are placed in it.
 */
const VIEW = { w: 1600, h: 900 };
/** Width / height of the rendered <KioskFrame> with our footer. */
const KIOSK_RATIO = 0.423;
/** Kiosk box on the 16:9 stage: centre x, floor line and height (fractions). */
const KIOSK = { cx: 0.635, floor: 0.94, height: 0.775 };
/** Callout cards on the xl stage: left edge and width (fractions). */
const CARD = { left: 0.035, width: 0.28 };

const kioskBox = (() => {
    const h = KIOSK.height * VIEW.h;
    const w = h * KIOSK_RATIO;

    return {
        x: KIOSK.cx * VIEW.w - w / 2,
        y: KIOSK.floor * VIEW.h - h,
        w,
        h,
    };
})();

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

function KioskScreen({ active }: { active: HotspotKey | null }) {
    const { t } = useI18n();
    const [fx, fy] = IMAGES.kiosk.screen.focus;
    /** A garment rail whose first item is a detail crop of the look on screen. */
    const rail: Garment[] = [
        {
            id: IMAGES.kiosk.screen.id,
            label: t('kiosk.railCoat'),
            focus: [0.57, 0.46],
            zoom: 2.6,
        },
        { ...IMAGES.garments[1], label: t('kiosk.railTulle') },
        { ...IMAGES.garments[2], label: t('kiosk.railKnit') },
        { ...IMAGES.garments[0], label: t('kiosk.railAbaya') },
    ];

    return (
        <>
            <Photo
                id={IMAGES.kiosk.screen.id}
                alt=""
                widths={[320, 480, 720]}
                sizes="(min-width: 768px) 240px, 150px"
                className={cn(
                    'absolute inset-0 size-full transition-[filter] duration-700 ease-glass',
                    active === 'screen' && 'brightness-110 saturate-[1.15]',
                )}
                style={{ objectPosition: `${fx * 100}% ${fy * 100}%` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.145_0.018_200/0.6),transparent_20%,transparent_55%,oklch(0.145_0.018_200/0.85))]" />
            <ScanOverlay className="opacity-55" />

            <div className="absolute inset-x-[5cqw] top-[4.5cqw] flex items-center justify-between">
                <span className="flex items-center gap-[1.4cqw] font-display text-[5cqw] leading-none font-medium text-bone">
                    <LogoMark className="h-[3.4cqw]" />
                    {BRAND.name}
                </span>
                <span className="flex items-center gap-[1.2cqw] rounded-full bg-black/35 px-[2.2cqw] py-[0.9cqw] text-[3.2cqw] leading-none text-bone ring-1 ring-white/15">
                    {LANGUAGES[0]}
                    <span className="text-white/30">/</span>
                    {LANGUAGES[1]}
                </span>
            </div>

            <div className="absolute top-[34%] right-[4cqw] flex flex-col rounded-[2.4cqw] bg-black/30 px-[2.4cqw] py-[1.6cqw] ring-1 ring-white/15 backdrop-blur-sm">
                <span className="text-[2.5cqw] leading-tight tracking-[0.16em] text-smoke uppercase">
                    {t('kiosk.fit')}
                </span>
                <span className="text-[3.6cqw] leading-tight font-medium text-bone tabular-nums">
                    {messageParts(t, 'kiosk.sizeFit', {
                        size: ON_SCREEN.size,
                        fit: ON_SCREEN.fit,
                    })}
                </span>
            </div>

            <div className="absolute inset-x-[3cqw] bottom-[3cqw] rounded-[3.4cqw] bg-[oklch(0.17_0.02_200/0.72)] p-[2.6cqw] ring-1 ring-white/12 backdrop-blur-md">
                <p className="flex items-baseline justify-between gap-[2cqw] text-[3.3cqw] leading-none">
                    <span className="font-medium text-bone">
                        {t('kiosk.look')}
                    </span>
                    <span className="text-mint tabular-nums">
                        {messageParts(t, 'kiosk.size', {
                            size: ON_SCREEN.size,
                        })}
                    </span>
                </p>
                <GarmentRail
                    items={rail}
                    active={0}
                    className="mt-[2.4cqw] gap-[1.8cqw]"
                    thumbClassName="w-[15cqw] rounded-[2cqw]"
                />
            </div>
        </>
    );
}

/**
 * The QR code under the screen. It stays on the left on both pages: the
 * "qr" hotspot and its highlight ring are drawn there.
 */
function KioskFooter() {
    const { t, dir } = useI18n();

    return (
        <div
            dir="ltr"
            className="flex items-center gap-[3.6cqw] pr-[1cqw] pl-[7cqw]"
        >
            <QrGlyph className="size-[18cqw] shrink-0 rounded-[1.6cqw] p-[1.2cqw]" />
            <span dir={dir} className="flex min-w-0 flex-col gap-[1.2cqw]">
                <span className="text-[4.3cqw] leading-[1.15] font-medium text-bone">
                    {t('kiosk.scanTitle')}
                </span>
                <span className="text-[3.2cqw] leading-none text-smoke">
                    {t('kiosk.scanNote')}
                </span>
            </span>
        </div>
    );
}

export default function Kiosk() {
    const { t } = useI18n();
    const hotspots = useHotspots();
    const label = useContent('sections.kiosk.label');
    const title = useContent('sections.kiosk.title');
    const lede = useContent('sections.kiosk.lede');
    const [active, setActive] = useState<number | null>(null);
    const baseId = useId();
    const descId = (i: number) => `${baseId}-callout-${i}`;
    const activeKey = active === null ? null : hotspots[active].key;

    const hoverProps = (i: number) => ({
        onPointerEnter: (e: PointerEvent) => {
            if (e.pointerType === 'mouse') {
                setActive(i);
            }
        },
        onPointerLeave: (e: PointerEvent) => {
            if (e.pointerType === 'mouse') {
                setActive((current) => (current === i ? null : current));
            }
        },
    });

    const kioskVars = {
        '--k-left': pct(KIOSK.cx),
        '--k-bottom': pct(1 - KIOSK.floor),
        '--k-h': pct(KIOSK.height),
        aspectRatio: KIOSK_RATIO,
    } as CSSProperties;

    return (
        <section id="kiosk" className="relative isolate py-24 md:py-36">
            <Glow
                color="lagoon"
                className="-end-40 top-[42%] size-[34rem] opacity-25"
            />
            <Container>
                <SectionHeader
                    index="03"
                    label={label}
                    title={<Accent text={title} />}
                    lede={lede}
                />

                <Reveal className="relative mt-14 md:mt-20">
                    {/* The stage: the kiosk standing in a boutique. */}
                    <div className="relative isolate aspect-[4/5] overflow-hidden rounded-[28px] bg-ink-raised md:aspect-video md:rounded-[32px]">
                        <Photo
                            id={IMAGES.kiosk.interior.id}
                            alt={t('kiosk.interiorAlt')}
                            widths={[640, 960, 1280, 1600]}
                            sizes="(min-width: 1320px) 1224px, (min-width: 768px) 100vw, 220vw"
                            className="absolute inset-0 size-full origin-[50%_92%] scale-[1.32] object-[60%_100%] blur-[2px] md:scale-105 md:object-[50%_100%]"
                        />
                        {/* Evening light: darken, warm, and hold the edges. */}
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-[oklch(0.16_0.02_200/0.52)]"
                        />
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_62%_38%,transparent_35%,oklch(0.145_0.018_200/0.75))]"
                        />
                        <div
                            aria-hidden
                            className="absolute inset-0 hidden bg-[linear-gradient(90deg,oklch(0.145_0.018_200/0.7),oklch(0.145_0.018_200/0.2)_38%,transparent_55%)] xl:block"
                        />
                        <Glow
                            color="jade"
                            className="top-[18%] left-[48%] z-0 size-[34%] opacity-25 mix-blend-soft-light"
                        />

                        <p className="sr-only">
                            {t('kiosk.stage', { brand: BRAND.name })}
                        </p>

                        {/* Kiosk, grounded on the floor plane. */}
                        <div
                            className="@container absolute bottom-[5%] left-[60%] h-[78%] -translate-x-1/2 md:bottom-(--k-bottom) md:left-(--k-left) md:h-(--k-h)"
                            style={kioskVars}
                        >
                            <KioskScene active={activeKey} />

                            {hotspots.map((hotspot, i) => (
                                <HotspotButton
                                    key={hotspot.key}
                                    index={i}
                                    hotspot={hotspot}
                                    active={active === i}
                                    dimmed={active !== null && active !== i}
                                    describedBy={descId(i)}
                                    onActivate={() => setActive(i)}
                                    onDeactivate={() =>
                                        setActive((current) =>
                                            current === i ? null : current,
                                        )
                                    }
                                    {...hoverProps(i)}
                                />
                            ))}
                        </div>

                        <LeaderLines active={active} />

                        <p className="absolute top-4 left-4 flex items-center gap-2 rounded-[12px] px-3 py-1.5 text-[10px] font-medium tracking-[0.16em] text-bone uppercase glass-thin md:top-6 md:left-6 md:text-[11px] xl:right-6 xl:left-auto">
                            {messageParts(t, 'kiosk.storeCity', {
                                store: t('kiosk.store'),
                                city: t('kiosk.city'),
                            })}
                            <span className="hidden text-smoke sm:inline">
                                {messageParts(t, 'kiosk.unitAfter', {
                                    unit: t('kiosk.unit'),
                                })}
                            </span>
                        </p>

                        <p className="absolute bottom-6 left-6 hidden max-w-[13rem] border-t border-white/20 pt-2.5 text-[12px] leading-snug text-balance text-mist md:block xl:right-6 xl:left-auto xl:max-w-[15rem] xl:text-right">
                            <span className="block text-[10px] tracking-[0.2em] text-smoke uppercase">
                                {t('kiosk.onScreen')}
                            </span>
                            {messageParts(t, 'kiosk.onScreenNote', {
                                look: t('kiosk.look'),
                                size: ON_SCREEN.size,
                                fit: ON_SCREEN.fit,
                            })}
                        </p>
                    </div>

                    {/* Callouts: on the stage from xl, a numbered list below it. */}
                    <ol className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4 xl:pointer-events-none xl:absolute xl:inset-0 xl:mt-0 xl:block">
                        {hotspots.map((hotspot, i) => (
                            <li
                                key={hotspot.key}
                                className="xl:pointer-events-auto xl:absolute xl:top-(--card-top) xl:left-(--card-left) xl:w-(--card-w) xl:-translate-y-1/2"
                                style={
                                    {
                                        '--card-top': pct(hotspot.cardY),
                                        '--card-left': pct(CARD.left),
                                        '--card-w': pct(CARD.width),
                                    } as CSSProperties
                                }
                                {...hoverProps(i)}
                            >
                                <Callout
                                    index={i}
                                    hotspot={hotspot}
                                    id={descId(i)}
                                    active={active === i}
                                    dimmed={active !== null && active !== i}
                                />
                            </li>
                        ))}
                    </ol>
                </Reveal>

                <SpecStrip />
            </Container>
        </section>
    );
}

function KioskScene({ active }: { active: HotspotKey | null }) {
    const gradientId = useId();
    const fillId = `${gradientId}-fov-fill`;
    const rayId = `${gradientId}-fov-ray`;

    return (
        <div aria-hidden className="absolute inset-0">
            {/*
             * Floor plane. The photo's camera sits about 1.4 m up, so a disc
             * on the floor here reads at roughly 0.38 depth-to-width. The
             * frame's own base is drawn for eye level, so a plate in the
             * photo's perspective is laid over it.
             */}
            <div className="absolute bottom-[calc(16cqw+0.3%)] left-1/2 h-[58cqw] w-[175cqw] -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0_0_0/0.5),transparent)] blur-lg" />
            <div className="absolute bottom-[calc(14.5cqw+0.3%)] left-1/2 h-[30cqw] w-[84cqw] -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0_0_0/0.72),oklch(0_0_0/0.28)_62%,transparent)] blur-[8px]" />
            <div className="absolute top-[99.4%] left-1/2 h-[9%] w-[18cqw] -translate-x-1/2 bg-[linear-gradient(180deg,oklch(0_0_0/0.45),transparent)] blur-[3px]" />
            <div
                className={cn(
                    'absolute top-full left-1/2 h-[80cqw] w-[300cqw] -translate-1/2 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.86_0.06_40/0.55),transparent)] mix-blend-soft-light transition-opacity duration-700 ease-glass',
                    active === 'screen' ? 'opacity-100' : 'opacity-45',
                )}
            />

            {/* Sync ripple across the polished floor. */}
            <div
                className={cn(
                    'absolute bottom-[calc(16cqw+0.3%)] left-1/2 transition-opacity duration-500 ease-glass',
                    active === 'base' ? 'opacity-100' : 'opacity-0',
                )}
            >
                {[0, 1].map((ring) => (
                    <span
                        key={ring}
                        className="absolute top-0 left-0 h-[34cqw] w-[90cqw] -translate-1/2 animate-pulse-ring rounded-[50%] border border-mint/80"
                        style={{ animationDelay: `${ring * 1.2}s` }}
                    />
                ))}
            </div>

            {/* The screen's light reaching the room around it. */}
            <div
                className={cn(
                    'absolute top-[4.2%] left-[4%] h-[69%] w-[92%] rounded-[3%/1.7%] transition-shadow duration-700 ease-glass',
                    active === 'screen'
                        ? 'shadow-[0_0_110px_30px_oklch(0.8_0.1_355/0.3)]'
                        : 'shadow-[0_0_90px_18px_oklch(0.8_0.1_355/0.16)]',
                )}
            />

            {/*
             * Clip the frame just above its eye-level base disc (bottom 3.75%
             * of the frame); the floor plate below replaces it.
             */}
            <KioskFrame
                className="w-full [clip-path:inset(-30%_-60%_4%_-60%)]"
                footer={<KioskFooter />}
            >
                <KioskScreen active={active} />
            </KioskFrame>

            {/* Rim light from the store, and warm bounce off the floor. */}
            <div className="absolute inset-x-0 top-0 h-[85.1%] rounded-[7%/4%] bg-[linear-gradient(180deg,oklch(1_0_0/0.1),transparent_5%,transparent_86%,oklch(0.84_0.12_160/0.08))] shadow-[inset_1.5px_0_0_oklch(1_0_0/0.14),inset_-1px_0_0_oklch(1_0_0/0.07),inset_0_1px_0_oklch(1_0_0/0.32)]" />

            {/* Floor plate: rim, top face, the neck meeting it, a collar. */}
            <div className="absolute bottom-[0.3%] left-1/2 h-[29cqw] w-[68cqw] -translate-x-1/2">
                <div className="absolute inset-x-0 bottom-0 h-[26cqw] rounded-[50%] bg-[linear-gradient(180deg,oklch(0.2_0.01_200),oklch(0.12_0.01_200))]" />
                <div className="absolute inset-x-0 top-0 h-[26cqw] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_30%,oklch(0.34_0.012_200),oklch(0.22_0.01_200)_55%,oklch(0.17_0.01_200))] shadow-[inset_0_1px_0_oklch(1_0_0/0.16)]" />
            </div>
            <div className="absolute top-[84%] bottom-[calc(16cqw+0.3%)] left-[44.5%] w-[11%] bg-[linear-gradient(90deg,oklch(0.16_0.01_200),oklch(0.3_0.01_200)_42%,oklch(0.15_0.01_200))]" />
            <div className="absolute bottom-[calc(16cqw+0.3%)] left-1/2 h-[6cqw] w-[17cqw] -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_35%,oklch(0.36_0.01_200),oklch(0.16_0.01_200)_75%)]" />

            {/* Glass sheen: the bright store reflected in the anti-glare glass. */}
            <div className="absolute top-[4.2%] left-[4%] h-[69%] w-[92%] rounded-[3%/1.7%] bg-[linear-gradient(118deg,oklch(1_0_0/0.13),oklch(1_0_0/0.03)_30%,transparent_44%,transparent_80%,oklch(1_0_0/0.05))]" />

            {/* Active-state marks on the device itself. */}
            <div
                className={cn(
                    'absolute top-[4.2%] left-[4%] h-[69%] w-[92%] rounded-[3%/1.7%] ring-1 ring-mint/80 transition-opacity duration-500 ease-glass',
                    active === 'screen' ? 'opacity-100' : 'opacity-0',
                )}
            />
            <div
                className={cn(
                    'absolute top-[75.2%] left-[10%] aspect-square w-[20cqw] rounded-[2.4cqw] ring-2 ring-mint transition-opacity duration-500 ease-glass',
                    active === 'qr' ? 'opacity-100' : 'opacity-0',
                )}
            />

            {/* The depth camera's field of view, reaching into the room. */}
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className={cn(
                    'absolute top-[4.1%] left-[47.9%] h-[122%] w-[210%] -translate-x-1/2 overflow-visible transition-opacity duration-700 ease-glass',
                    active === 'camera' ? 'opacity-100' : 'opacity-0',
                )}
            >
                <defs>
                    <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                        <stop
                            offset="0"
                            style={{
                                stopColor: 'var(--color-lagoon)',
                                stopOpacity: 0.02,
                            }}
                        />
                        <stop
                            offset="0.35"
                            style={{
                                stopColor: 'var(--color-lagoon)',
                                stopOpacity: 0.16,
                            }}
                        />
                        <stop
                            offset="1"
                            style={{
                                stopColor: 'var(--color-lagoon)',
                                stopOpacity: 0,
                            }}
                        />
                    </linearGradient>
                    <linearGradient id={rayId} x1="0" x2="0" y1="0" y2="1">
                        <stop
                            offset="0"
                            style={{
                                stopColor: 'var(--color-mint)',
                                stopOpacity: 0.95,
                            }}
                        />
                        <stop
                            offset="1"
                            style={{
                                stopColor: 'var(--color-mint)',
                                stopOpacity: 0,
                            }}
                        />
                    </linearGradient>
                </defs>
                <polygon points="50,0 100,100 0,100" fill={`url(#${fillId})`} />
                <polyline
                    points="0,100 50,0 100,100"
                    fill="none"
                    stroke={`url(#${rayId})`}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}

function HotspotButton({
    index,
    hotspot,
    active,
    dimmed,
    describedBy,
    onActivate,
    onDeactivate,
    onPointerEnter,
    onPointerLeave,
}: {
    index: number;
    hotspot: Hotspot;
    active: boolean;
    dimmed: boolean;
    describedBy: string;
    onActivate: () => void;
    onDeactivate: () => void;
    onPointerEnter: (e: PointerEvent) => void;
    onPointerLeave: (e: PointerEvent) => void;
}) {
    const { t } = useI18n();

    return (
        <button
            type="button"
            aria-label={t('kiosk.hotspot', {
                number: index + 1,
                title: hotspot.title,
            })}
            aria-describedby={describedBy}
            onClick={onActivate}
            onFocus={onActivate}
            onBlur={onDeactivate}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            className="group absolute z-10 grid size-10 -translate-1/2 cursor-pointer place-items-center rounded-full focus-visible:outline-none"
            style={{ left: pct(hotspot.at[0]), top: pct(hotspot.at[1]) }}
        >
            <span
                aria-hidden
                className={cn(
                    'absolute inset-[9px] animate-pulse-ring rounded-full bg-mint/60 transition-opacity duration-500',
                    dimmed && 'opacity-0',
                )}
                style={{ animationDelay: `${index * 0.45}s` }}
            />
            <span
                aria-hidden
                className={cn(
                    'relative grid size-[22px] place-items-center rounded-full text-[11px] leading-none font-semibold tabular-nums ring-1 transition-[background-color,color,box-shadow,transform] duration-300 ease-glass group-focus-visible:ring-2 group-focus-visible:ring-mint group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ink',
                    active
                        ? 'scale-110 bg-mint text-ink shadow-[0_0_0_6px_oklch(0.84_0.12_160/0.18)] ring-mint'
                        : 'bg-ink/80 text-mint ring-mint/80',
                )}
            >
                {index + 1}
            </span>
            {/* Below xl the callouts sit under the stage: name the dot here. */}
            <span
                aria-hidden
                className={cn(
                    'pointer-events-none absolute top-1/2 right-[calc(100%-2px)] -translate-y-1/2 rounded-[10px] px-2.5 py-1 text-[11px] leading-tight font-medium whitespace-nowrap text-bone glass-strong transition-[opacity,translate] duration-300 ease-glass xl:hidden',
                    active ? 'opacity-100' : 'translate-x-1 opacity-0',
                )}
            >
                {hotspot.short}
            </span>
        </button>
    );
}

function Callout({
    index,
    hotspot,
    id,
    active,
    dimmed,
}: {
    index: number;
    hotspot: Hotspot;
    id: string;
    active: boolean;
    dimmed: boolean;
}) {
    return (
        <div
            className={cn(
                'relative flex gap-4 border-t py-5 transition-[opacity,border-color,background-color,box-shadow] duration-500 ease-glass',
                'xl:rounded-[24px] xl:border xl:px-5 xl:py-4 xl:glass',
                active
                    ? 'border-mint/70 xl:border-mint/45 xl:bg-white/[0.1]'
                    : 'border-white/10 xl:border-white/15',
                dimmed && 'opacity-70',
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] leading-none font-semibold tabular-nums ring-1 transition-colors duration-300 xl:hidden',
                    active
                        ? 'bg-mint text-ink ring-mint'
                        : 'text-mint ring-mint/70',
                )}
            >
                {index + 1}
            </span>
            <span
                aria-hidden
                className={cn(
                    'hidden font-display text-[28px] leading-[0.9] font-normal italic tabular-nums transition-colors duration-300 xl:block',
                    active ? 'text-mint' : 'text-mint/70',
                )}
            >
                {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
                <h3 className="text-[15px] leading-snug font-medium text-bone">
                    {hotspot.title}
                </h3>
                <p
                    id={id}
                    className="mt-1 text-[14px] leading-relaxed text-pretty text-mist"
                >
                    {hotspot.body}
                </p>
            </div>
        </div>
    );
}

/** Hairline leaders from each callout card to its hotspot (xl only). */
function LeaderLines({ active }: { active: number | null }) {
    const startX = (CARD.left + CARD.width) * VIEW.w;
    const kneeX = startX + 150;

    return (
        <svg
            aria-hidden
            viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
            className="pointer-events-none absolute inset-0 hidden size-full xl:block"
        >
            {HOTSPOTS.map((hotspot, i) => {
                const y0 = hotspot.cardY * VIEW.h;
                const x1 = kioskBox.x + hotspot.at[0] * kioskBox.w;
                const y1 = kioskBox.y + hotspot.at[1] * kioskBox.h;
                const on = active === i;

                return (
                    <g
                        key={hotspot.key}
                        className={cn(
                            'transition-opacity duration-500 ease-glass',
                            active === null
                                ? 'opacity-60'
                                : on
                                  ? 'opacity-100'
                                  : 'opacity-25',
                        )}
                    >
                        <polyline
                            points={`${startX},${y0} ${kneeX},${y0} ${x1},${y1}`}
                            fill="none"
                            className="stroke-mint"
                            strokeWidth={on ? 1.5 : 1}
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={startX}
                            cy={y0}
                            r={3.5}
                            className="fill-mint"
                        />
                    </g>
                );
            })}
        </svg>
    );
}

function SpecStrip() {
    const { t } = useI18n();
    const specs = useSpecs();
    const installLine = useContent('sections.kiosk.install_line');

    return (
        <Reveal
            delay={120}
            className="mt-14 grid grid-cols-2 border-t border-white/10 md:mt-16 lg:grid-cols-12"
        >
            <div className="col-span-2 pt-6 pb-8 lg:col-span-3 lg:pe-8">
                <p className="text-kicker font-medium text-smoke uppercase">
                    {t('kiosk.model')}
                </p>
                <p className="mt-3 max-w-[22rem] text-[15px] leading-relaxed text-mist">
                    {installLine}
                </p>
            </div>
            <dl className="col-span-2 grid grid-cols-2 lg:col-span-9 lg:grid-cols-4">
                {specs.map((spec, i) => (
                    <div
                        key={spec.key}
                        className={cn(
                            'flex flex-col-reverse justify-end gap-2 border-white/10 py-6 lg:border-s lg:px-8',
                            i % 2 === 1 && 'border-s ps-5',
                            i < 2 && 'border-b lg:border-b-0',
                            i % 2 === 0 && 'pe-5',
                        )}
                    >
                        <dt className="text-[13px] leading-snug text-smoke">
                            {spec.caption}
                        </dt>
                        <dd className="font-display text-display-md font-medium whitespace-nowrap text-bone tabular-nums">
                            {spec.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </Reveal>
    );
}
