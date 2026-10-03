import { Pause, Play } from 'lucide-react';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FocusEvent, ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { Accent } from '../accent';
import { BRAND } from '../brand';
import { KioskFrame, PhoneFrame } from '../devices';
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
    useInView,
} from '../primitives';
import { QrGlyph, ScanOverlay, SizeScale } from '../tryon-ui';

// Placeholder content: replace before launch. The demo's words (the look,
// its price, the store's name in running text) are in the section's
// dictionary, i18n/sections/how-it-works.ts, in both languages.
const DEMO = {
    size: '54',
    sizes: ['52', '54', '56', '58'],
    colours: 3,
    confidence: 96,
    landmarks: 17,
    pieces: 412,
    /**
     * The store's wordmark on the mirror: Latin artwork on both pages, set
     * with lang="en" so the Arabic page keeps its tracking.
     */
    wordmark: 'Maison Rimal',
    /** Path of the saved-look page the QR code opens. */
    savedLook: '/l/7K2Q',
};

/** The mirror's languages, a product code shown as-is on both pages. */
const LANGUAGES = 'EN · AR';

/** How long each step stays on stage while the walkthrough plays. */
const STEP_MS = 3200;

/*
 * Section-local keyframes (the shared CSS has no equivalents). React 19
 * hoists this into <head> once. The global reduced-motion rule collapses
 * every one of them to its final frame, which is also the resting state.
 */
const KEYFRAMES = `
@keyframes hiw-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hiw-develop { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes hiw-sweep { from { transform: translateY(0); opacity: 1; } 90% { opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
@keyframes hiw-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes hiw-lift { from { opacity: 0; transform: translateY(56px); } to { opacity: 1; transform: none; } }
@keyframes hiw-select { from { opacity: 0; transform: scale(1.35); } to { opacity: 1; transform: none; } }
@keyframes hiw-pop { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: none; } }
@keyframes hiw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hiw-press { 0%, 100% { transform: none; } 40% { transform: scale(0.92); } }
@keyframes hiw-ring { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(1.45); } }
@keyframes hiw-tap { from { opacity: 0.8; transform: scale(0.3); } to { opacity: 0; transform: scale(1.6); } }
`;

/** Applies a one-shot animation only while a step is on stage. */
function play(on: boolean, className: string) {
    return on ? className : '';
}

function delay(ms: number): CSSProperties {
    return { animationDelay: `${ms}ms` };
}

/* ------------------------------------------------------------------------ */
/* The mirror                                                               */
/* ------------------------------------------------------------------------ */

/*
 * Every step happens at the same TryOn mirror, drawn at the same size and
 * standing on the card's floor line. Its screen is 9:16 portrait.
 */
const MIRROR_W = 184;
const SCREEN_W = Math.round(MIRROR_W * 0.92);
const SCREEN_RATIO = 16 / 9;

const shopper = IMAGES.howItWorks.shopper;

/**
 * The free-standing mirror: portrait touchscreen, camera bar, neck and
 * floor base. Pass a translate class to move it off centre.
 */
function Mirror({
    on,
    className,
    children,
}: {
    on: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                'absolute bottom-3 left-1/2 -translate-x-1/2',
                className,
            )}
            style={{ width: MIRROR_W }}
        >
            {/* The light the screen throws onto the glass behind it. */}
            <div
                aria-hidden
                className={cn(
                    'absolute inset-x-[6%] top-[5%] h-[70%] rounded-[24px] bg-bone blur-[38px] transition-opacity duration-[900ms] ease-glass',
                    on ? 'opacity-[0.13]' : 'opacity-[0.05]',
                )}
            />
            <KioskFrame className="w-full">{children}</KioskFrame>
        </div>
    );
}

/**
 * The mirror's own status bar: brand at the start, languages at the end (in
 * its Arabic UI the brand sits on the right).
 */
function ScreenBar() {
    return (
        <div className="absolute inset-x-0 top-0 z-10 flex h-[26px] items-center justify-between px-2.5">
            <span className="flex items-center gap-1 font-display text-[9.5px] leading-none font-medium text-bone">
                <LogoMark className="h-2" />
                {BRAND.name}
            </span>
            <span
                lang="en"
                className="text-[7px] leading-none tracking-[0.14em] text-mist"
            >
                {LANGUAGES}
            </span>
        </div>
    );
}

/**
 * A one-line status chip sized for the mirror's screen: it sits under the
 * status bar and clears her head.
 */
function ScreenChip({
    label,
    value,
    className,
    style,
}: {
    label: string;
    value: string;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <span
            className={cn(
                'absolute start-2.5 top-[29px] flex items-center gap-1.5 rounded-[8px] bg-ink/65 px-2 py-[5px] ring-1 ring-white/12 backdrop-blur-sm',
                className,
            )}
            style={style}
        >
            <span className="text-[6.5px] leading-none tracking-[0.18em] text-smoke uppercase rtl:text-[7.5px]">
                {label}
            </span>
            <span className="text-[9px] leading-none font-medium text-bone tabular-nums">
                {value}
            </span>
        </span>
    );
}

/*
 * Pose landmarks (COCO order) as fractions of the mirror's screen, measured
 * on the shopper photo cropped to SCREEN_RATIO at its focus point.
 */
const LANDMARKS: [number, number][] = [
    [0.524, 0.29],
    [0.508, 0.276],
    [0.542, 0.276],
    [0.486, 0.286],
    [0.567, 0.286],
    [0.421, 0.332],
    [0.626, 0.332],
    [0.285, 0.31],
    [0.658, 0.452],
    [0.441, 0.252],
    [0.694, 0.545],
    [0.446, 0.54],
    [0.611, 0.54],
    [0.468, 0.69],
    [0.579, 0.69],
    [0.47, 0.838],
    [0.544, 0.826],
];

const BONES: [number, number][] = [
    [5, 6],
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [5, 11],
    [6, 12],
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
];

/** SVG units: the viewBox matches the screen's 9:16 shape exactly. */
const VB_W = 100;
const VB_H = VB_W * SCREEN_RATIO;

/** The shopper as the mirror's camera sees her: mono with a cool tint. */
function MachineView() {
    return (
        <div className="absolute inset-0">
            <Photo
                id={shopper.id}
                alt=""
                ratio={SCREEN_RATIO}
                focus={shopper.focus}
                widths={[240, 400]}
                sizes={`${SCREEN_W}px`}
                className="absolute inset-0 size-full brightness-[0.62] contrast-125 grayscale"
            />
            <div className="absolute inset-0 bg-[linear-gradient(165deg,var(--color-jade),var(--color-lagoon))] opacity-70 mix-blend-color" />
        </div>
    );
}

/** The same shopper in full colour, as the rendered result. */
function ResultPhoto({ className }: { className?: string }) {
    return (
        <Photo
            id={shopper.id}
            alt=""
            ratio={SCREEN_RATIO}
            focus={shopper.focus}
            widths={[240, 400]}
            sizes={`${SCREEN_W}px`}
            className={cn('absolute inset-0 size-full', className)}
        />
    );
}

function PoseSkeleton({ on }: { on: boolean }) {
    return (
        <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            aria-hidden
            className="absolute inset-0 size-full"
        >
            <g
                className={play(
                    on,
                    'animate-[hiw-fade_700ms_var(--ease-glass)_both]',
                )}
                style={delay(450)}
            >
                {BONES.map(([a, b]) => (
                    <line
                        key={`${a}-${b}`}
                        x1={LANDMARKS[a][0] * VB_W}
                        y1={LANDMARKS[a][1] * VB_H}
                        x2={LANDMARKS[b][0] * VB_W}
                        y2={LANDMARKS[b][1] * VB_H}
                        vectorEffect="non-scaling-stroke"
                        className="stroke-mint/70"
                        strokeWidth="1"
                    />
                ))}
            </g>
            {LANDMARKS.map(([x, y], i) => (
                <circle
                    key={`${x}-${y}`}
                    cx={x * VB_W}
                    cy={y * VB_H}
                    r={i < 5 ? 0.9 : 1.5}
                    className={cn(
                        'origin-center fill-mint [transform-box:fill-box]',
                        play(
                            on,
                            'animate-[hiw-pop_420ms_var(--ease-glass)_both]',
                        ),
                    )}
                    style={delay(120 + i * 40)}
                />
            ))}
        </svg>
    );
}

/** Where her feet are, on the screen: the spot she was asked to stand on. */
const FLOOR_SPOT = { x: 0.507, y: 0.872, rx: 0.25, ry: 0.024 };

/** Step 1: the mirror's camera view of her, from about two metres. */
function CameraScreen({ on }: { on: boolean }) {
    const { t } = useI18n();

    return (
        <>
            <MachineView />
            <ScanOverlay
                className="opacity-60"
                frameClassName="top-[13%] bottom-[4%]"
            />
            <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                aria-hidden
                className={cn(
                    'absolute inset-0 size-full',
                    play(on, 'animate-[hiw-fade_700ms_var(--ease-glass)_both]'),
                )}
                style={delay(700)}
            >
                <ellipse
                    cx={FLOOR_SPOT.x * VB_W}
                    cy={FLOOR_SPOT.y * VB_H}
                    rx={FLOOR_SPOT.rx * VB_W}
                    ry={FLOOR_SPOT.ry * VB_H}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="2 2.5"
                    className="fill-mint/10 stroke-mint/80"
                    strokeWidth="1"
                />
            </svg>
            <PoseSkeleton on={on} />
            <div className="absolute inset-x-0 top-0 h-[22%] bg-linear-to-b from-ink/80 to-transparent" />
            <ScreenBar />
            <ScreenChip
                label={t('how-it-works.poseDetected')}
                value={t('how-it-works.landmarks', { count: DEMO.landmarks })}
                className={play(
                    on,
                    'animate-[hiw-rise_600ms_var(--ease-glass)_both]',
                )}
                style={delay(900)}
            />
            <span
                className={cn(
                    'absolute right-2 rounded-[6px] bg-ink/70 px-1.5 py-[3px] text-[8px] leading-none font-medium text-mint tabular-nums',
                    play(on, 'animate-[hiw-fade_600ms_var(--ease-glass)_both]'),
                )}
                style={{
                    top: `${(FLOOR_SPOT.y - FLOOR_SPOT.ry) * 100}%`,
                    transform: 'translateY(-100%)',
                    ...delay(1100),
                }}
            >
                {t('how-it-works.distance')}
            </span>
        </>
    );
}

/** Catalogue order on the screen (indices into IMAGES.garments). */
const CATALOGUE = [1, 2, 3, 10, 0, 5, 4, 6, 11];
/** Slot of the abaya she picks: the centre of the grid. */
const PICKED = 4;

/** Step 2: the store's whole catalogue on the touchscreen. */
function CatalogueScreen({ on }: { on: boolean }) {
    const { t } = useI18n();

    return (
        <div className="absolute inset-0 bg-ink-raised">
            <ScreenBar />
            <div className="absolute inset-x-0 top-[26px] px-2.5">
                <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
                    <span
                        lang="en"
                        className="text-[7.5px] font-medium tracking-[0.24em] text-bone uppercase"
                    >
                        {DEMO.wordmark}
                    </span>
                    <span className="text-[7px] text-smoke tabular-nums">
                        {messageParts(t, 'how-it-works.pieces', {
                            count: DEMO.pieces,
                        })}
                    </span>
                </div>
                <p className="mt-1.5 flex gap-2.5 text-[7px] text-smoke">
                    <span className="text-bone underline decoration-mint underline-offset-[3px]">
                        {t('how-it-works.tabAll')}
                    </span>
                    <span>{t('how-it-works.tabAbayas')}</span>
                    <span>{t('how-it-works.tabDresses')}</span>
                    <span>{t('how-it-works.tabKnits')}</span>
                    <span>{t('how-it-works.tabBags')}</span>
                </p>
                <ul className="mt-2 grid grid-cols-3 gap-[5px]">
                    {CATALOGUE.map((garmentIndex, slot) => {
                        const garment = IMAGES.garments[garmentIndex];
                        const picked = slot === PICKED;

                        return (
                            <li key={garment.id} className="relative">
                                <div
                                    className={cn(
                                        'aspect-[4/5] overflow-hidden rounded-[6px] bg-white/5',
                                        !picked &&
                                            'opacity-70 ring-1 ring-white/10',
                                    )}
                                >
                                    <Photo
                                        id={garment.id}
                                        alt=""
                                        widths={[120, 200]}
                                        sizes="50px"
                                        ratio={1.25}
                                        focus={garment.focus}
                                        zoom={
                                            'zoom' in garment
                                                ? garment.zoom
                                                : undefined
                                        }
                                        className="size-full"
                                    />
                                </div>
                                {picked ? (
                                    <>
                                        <span
                                            className={cn(
                                                'pointer-events-none absolute inset-0 rounded-[6px] ring-[1.5px] ring-mint',
                                                play(
                                                    on,
                                                    'animate-[hiw-select_600ms_var(--ease-glass)_both]',
                                                ),
                                            )}
                                            style={delay(420)}
                                        />
                                        {on ? (
                                            <span
                                                className="pointer-events-none absolute top-[58%] left-[56%] size-7 -translate-x-1/2 -translate-y-1/2 animate-[hiw-tap_700ms_ease-out_both] rounded-full bg-bone/60"
                                                style={delay(250)}
                                            />
                                        ) : null}
                                    </>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 rounded-t-[14px] bg-ink px-2.5 pt-2.5 pb-3 ring-1 ring-white/10',
                    play(on, 'animate-[hiw-rise_700ms_var(--ease-glass)_both]'),
                )}
                style={delay(700)}
            >
                <div className="pointer-events-none absolute inset-x-0 bottom-full h-9 bg-linear-to-t from-ink-raised to-transparent" />
                <p className="font-display text-[12px] leading-none text-bone">
                    {messageParts(t, 'how-it-works.pieceWithSize', {
                        garment: t('how-it-works.garment'),
                        colour: t('how-it-works.colour'),
                        size: DEMO.size,
                    })}
                </p>
                <p className="mt-1.5 text-[7.5px] leading-none text-smoke">
                    {messageParts(t, 'how-it-works.pieceOptions', {
                        count: DEMO.colours,
                        range: t('how-it-works.sizeRange'),
                    })}
                </p>
                <span
                    className={cn(
                        'mt-2.5 grid h-7 place-items-center rounded-[8px] bg-mint text-[9px] font-medium text-ink',
                        play(
                            on,
                            'animate-[hiw-press_420ms_var(--ease-glass)_both]',
                        ),
                    )}
                    style={delay(1700)}
                >
                    {t('how-it-works.tryItOn')}
                </span>
            </div>
        </div>
    );
}

/** Step 3: the rendered result develops out of the camera view. */
function ResultScreen({ on }: { on: boolean }) {
    const { t } = useI18n();

    return (
        <>
            <MachineView />
            <div
                className={cn(
                    'absolute inset-0',
                    play(on, 'animate-[hiw-develop_1500ms_linear_both]'),
                )}
                style={delay(150)}
            >
                <ResultPhoto />
            </div>
            {on ? (
                <div
                    className="pointer-events-none absolute inset-0 animate-[hiw-sweep_1500ms_linear_both]"
                    style={delay(150)}
                >
                    <div className="relative">
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-mint/40 to-transparent" />
                        <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-1/2 bg-mint shadow-[0_0_14px_2px_var(--color-mint)]" />
                        <span className="absolute end-2 top-2 rounded-[6px] bg-ink/75 px-1.5 py-[3px] text-[7.5px] leading-none font-medium tracking-[0.22em] text-mint uppercase">
                            {messageParts(t, 'how-it-works.draping', {
                                size: DEMO.size,
                            })}
                        </span>
                    </div>
                </div>
            ) : null}
            <div className="absolute inset-x-0 top-0 h-[22%] bg-linear-to-b from-ink/75 to-transparent" />
            <ScreenBar />
            <ScreenChip
                label={t('how-it-works.renderedIn')}
                value={t('how-it-works.render')}
                className={play(
                    on,
                    'animate-[hiw-rise_600ms_var(--ease-glass)_both]',
                )}
                style={delay(1450)}
            />
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 rounded-t-[14px] bg-ink/90 px-2.5 pt-2.5 pb-3 ring-1 ring-white/10 backdrop-blur-md',
                    play(on, 'animate-[hiw-rise_700ms_var(--ease-glass)_both]'),
                )}
                style={delay(1650)}
            >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="font-display text-[12px] leading-none text-bone">
                        {messageParts(t, 'how-it-works.piece', {
                            garment: t('how-it-works.garment'),
                            colour: t('how-it-works.colour'),
                        })}
                    </span>
                    <span className="text-[8px] text-mist tabular-nums">
                        {t('how-it-works.price')}
                    </span>
                </div>
                <SizeScale
                    sizes={DEMO.sizes}
                    recommended={DEMO.size}
                    note={messageParts(t, 'how-it-works.fitConfidence', {
                        confidence: DEMO.confidence,
                    })}
                />
            </div>
        </>
    );
}

/** Step 4, on the mirror: the look, with a QR code to take it home. */
function SaveScreen({ on }: { on: boolean }) {
    const { t } = useI18n();

    return (
        <>
            <ResultPhoto className="brightness-[0.8]" />
            <div className="absolute inset-x-0 top-0 h-[22%] bg-linear-to-b from-ink/75 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/80 to-transparent" />
            <ScreenBar />
            <div
                className={cn(
                    'absolute start-2.5 bottom-2.5 flex w-[104px] flex-col gap-2 rounded-[12px] bg-ink/85 p-2.5 ring-1 ring-white/12 backdrop-blur-md',
                    play(on, 'animate-[hiw-rise_700ms_var(--ease-glass)_both]'),
                )}
                style={delay(150)}
            >
                <span className="text-[9px] leading-tight font-medium text-bone">
                    {t('how-it-works.takeHome')}
                </span>
                <span className="relative self-start">
                    <QrGlyph className="size-[52px] rounded-[6px] p-1" />
                    {on ? (
                        <span
                            className="absolute -inset-1 animate-[hiw-ring_1100ms_ease-out_both] rounded-[9px] border border-mint"
                            style={delay(700)}
                        />
                    ) : null}
                </span>
                <span className="text-[7px] leading-snug text-smoke">
                    {t('how-it-works.scanHint')}
                </span>
            </div>
        </>
    );
}

/** Step 4, on her phone: the saved-look page the QR code opens. */
function SavedLookPage({ on }: { on: boolean }) {
    const { t } = useI18n();

    return (
        <div className="absolute inset-0 bg-ink">
            <div className="absolute inset-x-0 top-0 h-[62%]">
                <Photo
                    id={shopper.id}
                    alt=""
                    ratio={1.25}
                    focus={[0.47, 0.4]}
                    zoom={1.25}
                    widths={[200, 320]}
                    sizes="112px"
                    className={cn(
                        'size-full',
                        play(
                            on,
                            'animate-[hiw-fade_900ms_var(--ease-glass)_both]',
                        ),
                    )}
                    style={delay(1350)}
                />
                <div className="absolute inset-x-0 -bottom-px h-1/2 bg-linear-to-t from-ink to-transparent" />
            </div>
            <div className="absolute inset-x-0 top-[55%] bottom-0 flex flex-col px-2 pb-2">
                <span className="text-[6px] leading-none tracking-[0.22em] text-mint uppercase rtl:text-[7px]">
                    {t('how-it-works.savedLook')}
                </span>
                <span className="mt-1 font-display text-[11px] leading-none text-bone">
                    {messageParts(t, 'how-it-works.piece', {
                        garment: t('how-it-works.garment'),
                        colour: t('how-it-works.colour'),
                    })}
                </span>
                <span className="mt-1 text-[7px] leading-none text-mist">
                    {messageParts(t, 'how-it-works.savedSize', {
                        size: DEMO.size,
                        store: t('how-it-works.store'),
                    })}
                </span>
                <span className="mt-auto grid h-[18px] place-items-center rounded-[6px] bg-mint text-[7px] font-medium text-ink">
                    {t('how-it-works.share')}
                </span>
                <span
                    dir="ltr"
                    className="mt-1.5 truncate rounded-full bg-white/10 px-2 py-[3px] text-center text-[6px] leading-none text-mist"
                >
                    {BRAND.domain}
                    {DEMO.savedLook}
                </span>
            </div>
        </div>
    );
}

/**
 * Step 4: the mirror hands the look over to her phone. Right to left, the
 * pair mirrors: the mirror moves right and the phone leans in from the left.
 */
function HandoffStage({ on }: { on: boolean }) {
    return (
        <>
            <Mirror
                on={on}
                className="-translate-x-[64%] rtl:-translate-x-[36%]"
            >
                <SaveScreen on={on} />
            </Mirror>
            <div className="absolute end-[5%] bottom-5 w-[112px] rotate-[4deg] rtl:-rotate-[4deg]">
                <div
                    className={play(
                        on,
                        'animate-[hiw-lift_900ms_var(--ease-glass)_both]',
                    )}
                    style={delay(900)}
                >
                    <PhoneFrame className="w-full">
                        <SavedLookPage on={on} />
                    </PhoneFrame>
                </div>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------------ */
/* Steps                                                                    */
/* ------------------------------------------------------------------------ */

type Step = {
    key: string;
    title: string;
    body: string;
    meta: string;
    /** Spoken description of the device mockup. */
    device: string;
    stage: (on: boolean) => ReactNode;
};

/** The four steps, in the page's language. */
function useSteps(): Step[] {
    const { t } = useI18n();
    const distance = t('how-it-works.distance');
    const render = t('how-it-works.render');

    return [
        {
            key: 'camera',
            title: t('how-it-works.step1Title'),
            body: t('how-it-works.step1Body'),
            meta: t('how-it-works.step1Meta', { distance }),
            device: t('how-it-works.step1Device', {
                distance,
                count: DEMO.landmarks,
            }),
            stage: (on) => (
                <Mirror on={on}>
                    <CameraScreen on={on} />
                </Mirror>
            ),
        },
        {
            key: 'catalogue',
            title: t('how-it-works.step2Title'),
            body: t('how-it-works.step2Body'),
            meta: t('how-it-works.pieces', { count: DEMO.pieces }),
            device: t('how-it-works.step2Device', {
                store: t('how-it-works.store'),
                size: DEMO.size,
            }),
            stage: (on) => (
                <Mirror on={on}>
                    <CatalogueScreen on={on} />
                </Mirror>
            ),
        },
        {
            key: 'result',
            title: t('how-it-works.step3Title'),
            body: t('how-it-works.step3Body'),
            meta: t('how-it-works.step3Meta', { render }),
            device: t('how-it-works.step3Device', {
                render,
                size: DEMO.size,
                confidence: DEMO.confidence,
            }),
            stage: (on) => (
                <Mirror on={on}>
                    <ResultScreen on={on} />
                </Mirror>
            ),
        },
        {
            key: 'handoff',
            title: t('how-it-works.step4Title'),
            body: t('how-it-works.step4Body'),
            meta: t('how-it-works.step4Meta'),
            device: t('how-it-works.step4Device', { size: DEMO.size }),
            stage: (on) => <HandoffStage on={on} />,
        },
    ];
}

/* ------------------------------------------------------------------------ */
/* Behaviour helpers                                                        */
/* ------------------------------------------------------------------------ */

function useMediaQuery(query: string) {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);

            return () => list.removeEventListener('change', onChange);
        },
        [query],
    );

    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(query).matches,
        () => false,
    );
}

const ACTIVE_RIM: CSSProperties = {
    padding: 1,
    background:
        'linear-gradient(150deg, oklch(0.84 0.12 160 / 0.95), oklch(0.84 0.12 160 / 0.2) 32%, oklch(0.84 0.12 160 / 0.06) 62%, oklch(0.84 0.12 160 / 0.7))',
    WebkitMask:
        'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
};

const pad = (n: number) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------------ */
/* Section                                                                  */
/* ------------------------------------------------------------------------ */

export default function HowItWorks() {
    const { t, isRtl } = useI18n();
    const steps = useSteps();
    const label = useContent('sections.how_it_works.label');
    const title = useContent('sections.how_it_works.title');
    const lede = useContent('sections.how_it_works.lede');
    const shown = messageParts(t, 'how-it-works.shown', {
        look: t('how-it-works.look'),
        colour: t('how-it-works.shownColour'),
        size: DEMO.size,
        store: t('how-it-works.store'),
        city: t('how-it-works.city'),
    });
    const [active, setActive] = useState(0);
    const [userPaused, setUserPaused] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [keyboardFocus, setKeyboardFocus] = useState(false);
    const listRef = useRef<HTMLOListElement>(null);
    const [viewRef, inView] = useInView({
        once: false,
        threshold: 0.2,
        rootMargin: '0px',
    });

    const isStaircase = useMediaQuery('(min-width: 80rem)');
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const timed = isStaircase && !reducedMotion;
    const playing =
        timed && inView && !userPaused && !hovering && !keyboardFocus;

    /*
     * The carousel in either direction: offsets are measured from the list's
     * inline start (its right edge in Arabic, where scrollLeft runs from 0
     * down to negative values).
     */
    const inlineStart = (list: HTMLElement, item: HTMLElement) =>
        isRtl
            ? list.clientWidth - item.offsetLeft - item.offsetWidth
            : item.offsetLeft;
    const insetOf = (list: HTMLElement) =>
        parseFloat(getComputedStyle(list).paddingInlineStart) || 0;

    const scrollToStep = (index: number) => {
        const list = listRef.current;
        const item = list?.children[index];

        if (!list || !(item instanceof HTMLElement)) {
            return;
        }

        const offset = inlineStart(list, item) - insetOf(list);
        list.scrollTo({
            left: isRtl ? -offset : offset,
            behavior: reducedMotion ? 'auto' : 'smooth',
        });
    };

    const select = (index: number) => {
        if (index === active) {
            // Same step again: replay its animations and restart its timer.
            // Seeking (rather than play()) keeps CSS in charge of pausing.
            listRef.current?.children[index]
                ?.getAnimations({ subtree: true })
                .forEach((animation) => {
                    animation.currentTime = 0;
                });
        }

        setActive(index);

        if (!isStaircase) {
            scrollToStep(index);
        }
    };

    // Carousel: the step whose leading edge is closest to the start wins.
    const onScroll = () => {
        const list = listRef.current;

        if (!list || isStaircase) {
            return;
        }

        const items = Array.from(list.children) as HTMLElement[];
        const inset = insetOf(list);
        const scrolled = Math.abs(list.scrollLeft);

        if (scrolled >= list.scrollWidth - list.clientWidth - 4) {
            setActive(items.length - 1);

            return;
        }

        let nearest = 0;
        let distance = Infinity;

        items.forEach((item, index) => {
            const d = Math.abs(inlineStart(list, item) - inset - scrolled);

            if (d < distance) {
                distance = d;
                nearest = index;
            }
        });

        setActive(nearest);
    };

    const onFocus = (event: FocusEvent<HTMLOListElement>) => {
        if (event.target.matches(':focus-visible')) {
            setKeyboardFocus(true);
        }
    };

    const onBlur = (event: FocusEvent<HTMLOListElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setKeyboardFocus(false);
        }
    };

    return (
        <section id="how-it-works" className="relative isolate py-24 md:py-36">
            <style href="landing-how-it-works" precedence="default">
                {KEYFRAMES}
            </style>
            <Glow
                color="lagoon"
                className="-end-48 top-[38%] size-[34rem] opacity-30"
            />
            <Container>
                <SectionHeader
                    index="01"
                    label={label}
                    title={<Accent text={title} />}
                    lede={lede}
                />

                <div ref={viewRef} className="relative mt-14 md:mt-16">
                    {/* Warm light that follows the step on stage, so the glass has something to refract. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute start-0 top-[6%] -z-10 hidden h-[62%] w-1/4 transition-transform duration-[1400ms] ease-glass xl:block"
                        style={{
                            transform: `translate(${(isRtl ? -active : active) * 100}%, ${active * 56}px)`,
                        }}
                    >
                        <div className="absolute inset-[8%] rounded-full bg-mint opacity-25 blur-[90px]" />
                    </div>

                    <div className="absolute end-0 top-0 z-10 hidden w-[calc((100%-6rem)/4)] items-center gap-4 border-t border-white/10 pt-4 xl:flex">
                        {timed ? (
                            <button
                                type="button"
                                onClick={() => setUserPaused((p) => !p)}
                                aria-label={
                                    userPaused
                                        ? t('how-it-works.play')
                                        : t('how-it-works.pause')
                                }
                                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-bone glass-thin transition-[background-color] duration-[380ms] ease-glass hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
                            >
                                {userPaused ? (
                                    <Play
                                        aria-hidden
                                        className="size-4 translate-x-px"
                                    />
                                ) : (
                                    <Pause aria-hidden className="size-4" />
                                )}
                            </button>
                        ) : null}
                        <p className="text-[13px] leading-snug text-smoke">
                            <span className="text-bone tabular-nums">
                                {messageParts(t, 'how-it-works.stepCurrent', {
                                    number: pad(active + 1),
                                })}
                            </span>{' '}
                            {messageParts(t, 'how-it-works.stepTotal', {
                                total: pad(steps.length),
                            })}
                            <span className="block">
                                {!timed
                                    ? t('how-it-works.selectAny')
                                    : playing
                                      ? t('how-it-works.playing')
                                      : t('how-it-works.paused')}
                            </span>
                        </p>
                    </div>

                    <ol
                        ref={listRef}
                        onScroll={onScroll}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        className="relative -mx-5 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain px-5 pt-2 pb-14 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12 xl:mx-0 xl:grid xl:grid-cols-4 xl:gap-8 xl:overflow-visible xl:px-0 xl:pt-0 xl:pb-[184px] [&::-webkit-scrollbar]:hidden"
                    >
                        {steps.map((step, index) => {
                            const isActive = index === active;
                            const on = isActive && inView;

                            return (
                                <li
                                    key={step.key}
                                    className="w-[82%] max-w-[360px] shrink-0 translate-y-[calc(var(--step)*14px)] snap-start sm:w-[58%] md:w-[44%] lg:w-[34%] xl:w-auto xl:max-w-none xl:translate-y-[calc(var(--step)*56px)]"
                                    style={{ '--step': index } as CSSProperties}
                                >
                                    <Reveal
                                        delay={index * 90}
                                        className="h-full"
                                    >
                                        <article
                                            onPointerEnter={(event) => {
                                                if (
                                                    event.pointerType ===
                                                    'mouse'
                                                ) {
                                                    setHovering(true);
                                                }
                                            }}
                                            onPointerLeave={() =>
                                                setHovering(false)
                                            }
                                            className={cn(
                                                'glass-rim relative flex h-full flex-col rounded-[28px] glass transition-[translate,opacity] duration-[600ms] ease-glass',
                                                isActive
                                                    ? 'xl:-translate-y-2'
                                                    : 'opacity-85 hover:-translate-y-1 hover:opacity-100',
                                            )}
                                        >
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'pointer-events-none absolute -inset-px rounded-[29px] transition-opacity duration-[600ms] ease-glass',
                                                    isActive
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                                style={ACTIVE_RIM}
                                            />

                                            <div
                                                role="img"
                                                aria-label={step.device}
                                                className="relative h-[440px] rounded-t-[27px] bg-[radial-gradient(85%_60%_at_50%_0%,oklch(1_0_0/0.09),transparent_72%)]"
                                            >
                                                {step.stage(on)}
                                            </div>

                                            <div
                                                aria-hidden
                                                className="relative h-px overflow-hidden bg-white/10"
                                            >
                                                <span
                                                    onAnimationEnd={(event) => {
                                                        if (
                                                            event.animationName ===
                                                            'hiw-progress'
                                                        ) {
                                                            setActive(
                                                                (a) =>
                                                                    (a + 1) %
                                                                    steps.length,
                                                            );
                                                        }
                                                    }}
                                                    className={cn(
                                                        'absolute inset-0 origin-left bg-mint rtl:origin-right',
                                                        !isActive &&
                                                            'scale-x-0',
                                                        isActive &&
                                                            !timed &&
                                                            'scale-x-100',
                                                        isActive &&
                                                            timed &&
                                                            'animate-[hiw-progress_var(--step-ms)_linear_both]',
                                                        isActive &&
                                                            timed &&
                                                            !playing &&
                                                            '[animation-play-state:paused]',
                                                    )}
                                                    style={
                                                        {
                                                            '--step-ms': `${STEP_MS}ms`,
                                                        } as CSSProperties
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-1 flex-col rounded-b-[27px] bg-ink/40 px-6 pt-5 pb-7">
                                                <div className="flex items-baseline gap-2.5">
                                                    <span
                                                        className={cn(
                                                            'font-display text-[3.25rem] leading-[0.9] font-medium tracking-[-0.02em] tabular-nums transition-colors duration-[600ms] ease-glass',
                                                            isActive
                                                                ? 'text-mint'
                                                                : 'text-bone',
                                                        )}
                                                    >
                                                        {pad(index + 1)}
                                                    </span>
                                                    <span className="ms-auto text-[13px] text-mist tabular-nums">
                                                        {step.meta}
                                                    </span>
                                                </div>
                                                <h3 className="mt-5 font-display text-[1.5rem] leading-[1.15] font-medium text-balance text-bone rtl:leading-[1.4]">
                                                    {step.title}
                                                </h3>
                                                <p className="mt-2.5 text-[15px] leading-relaxed text-pretty text-mist">
                                                    {step.body}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => select(index)}
                                                aria-label={t(
                                                    'how-it-works.stepButton',
                                                    {
                                                        number: index + 1,
                                                        total: steps.length,
                                                        title: step.title,
                                                    },
                                                )}
                                                aria-current={
                                                    isActive
                                                        ? 'step'
                                                        : undefined
                                                }
                                                className="absolute inset-0 z-10 cursor-pointer rounded-[28px] focus-visible:ring-2 focus-visible:ring-mint/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
                                            />
                                        </article>
                                    </Reveal>
                                </li>
                            );
                        })}
                    </ol>

                    <p className="absolute start-0 bottom-0 z-10 hidden w-[calc((100%-6rem)/4)] border-t border-white/10 pt-4 text-[13px] leading-relaxed text-smoke xl:block">
                        <span className="mb-1 block text-kicker font-medium text-mist uppercase">
                            {t('how-it-works.shownLabel')}
                        </span>
                        {shown}
                    </p>
                </div>

                <div className="flex flex-col gap-6 xl:hidden">
                    <div
                        role="group"
                        aria-label={t('how-it-works.chooseStep')}
                        className="flex items-center gap-1 border-t border-white/10"
                    >
                        {steps.map((step, index) => {
                            const isActive = index === active;

                            return (
                                <button
                                    key={step.key}
                                    type="button"
                                    onClick={() => select(index)}
                                    aria-label={t('how-it-works.stepPick', {
                                        number: index + 1,
                                        title: step.title,
                                    })}
                                    aria-current={isActive ? 'step' : undefined}
                                    className="group relative flex h-12 min-w-12 cursor-pointer items-center justify-center rounded-[12px] px-3 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                >
                                    <span
                                        className={cn(
                                            'font-display text-lg tabular-nums transition-colors duration-[380ms] ease-glass',
                                            isActive
                                                ? 'text-mint'
                                                : 'text-smoke group-hover:text-mist',
                                        )}
                                    >
                                        {pad(index + 1)}
                                    </span>
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-x-3 -top-px h-px origin-left bg-mint transition-transform duration-[600ms] ease-glass rtl:origin-right',
                                            isActive
                                                ? 'scale-x-100'
                                                : 'scale-x-0',
                                        )}
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <p className="max-w-md text-[13px] leading-relaxed text-smoke">
                        <span className="mb-1 block text-kicker font-medium text-mist uppercase">
                            {t('how-it-works.shownLabel')}
                        </span>
                        {shown}
                    </p>
                </div>
            </Container>
        </section>
    );
}
