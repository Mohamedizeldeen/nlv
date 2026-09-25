import { Pause, Play, SwitchCamera } from 'lucide-react';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FocusEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { KioskFrame, PhoneFrame, TabletFrame } from '../devices';
import { IMAGES } from '../images';
import { Photo } from '../photo';
import {
    Arabic,
    Container,
    Glow,
    LogoMark,
    Reveal,
    SectionHeader,
    useInView,
} from '../primitives';
import { FitChip, QrGlyph, ScanOverlay, SizeScale } from '../tryon-ui';

// Placeholder content: replace before launch.
const DEMO = {
    look: 'Look 07',
    garment: 'Abaya',
    colour: 'Lilac',
    size: '54',
    sizes: ['52', '54', '56', '58'],
    confidence: 96,
    price: 'SAR 1,450',
    render: '1.8 s',
    landmarks: 17,
    city: 'Jeddah',
    store: 'MAISON RIMAL',
    kioskCity: 'Doha',
};

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
@keyframes hiw-select { from { opacity: 0; transform: scale(1.35); } to { opacity: 1; transform: none; } }
@keyframes hiw-pop { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: none; } }
@keyframes hiw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hiw-flash { 0%, 100% { opacity: 0; } 25% { opacity: 0.7; } }
@keyframes hiw-press { 0%, 100% { transform: none; } 40% { transform: scale(0.78); } }
@keyframes hiw-thread { from { transform: scaleY(0); } to { transform: none; } }
@keyframes hiw-hang { from { opacity: 0; transform: translateY(-14px) rotate(-7deg); } to { opacity: 1; transform: none; } }
@keyframes hiw-ring { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(1.45); } }
`;

/** Applies a one-shot animation only while a step is on stage. */
function play(on: boolean, className: string) {
    return on ? className : '';
}

function delay(ms: number): CSSProperties {
    return { animationDelay: `${ms}ms` };
}

/* ------------------------------------------------------------------------ */
/* Device screens                                                           */
/* ------------------------------------------------------------------------ */

/** Phone screen height / width (PhoneFrame at any width). */
const PHONE_SCREEN_RATIO = 2.25;

const shopper = IMAGES.howItWorks.shopper;
const kioskShopper = IMAGES.howItWorks.kiosk;

/*
 * Pose landmarks (COCO order) as fractions of the phone screen, measured
 * on the shopper photo cropped to PHONE_SCREEN_RATIO at its focus point.
 */
const LANDMARKS: [number, number][] = [
    [0.53, 0.29],
    [0.51, 0.276],
    [0.553, 0.276],
    [0.482, 0.286],
    [0.585, 0.286],
    [0.4, 0.332],
    [0.66, 0.332],
    [0.228, 0.31],
    [0.7, 0.452],
    [0.425, 0.252],
    [0.745, 0.545],
    [0.432, 0.54],
    [0.64, 0.54],
    [0.46, 0.69],
    [0.6, 0.69],
    [0.462, 0.838],
    [0.556, 0.826],
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

/** The shopper photo as the camera model sees it: mono with a cool tint. */
function MachineView({ className }: { className?: string }) {
    return (
        <div className={cn('absolute inset-0', className)}>
            <Photo
                id={shopper.id}
                alt=""
                ratio={PHONE_SCREEN_RATIO}
                focus={shopper.focus}
                widths={[240, 400]}
                sizes="184px"
                className="absolute inset-0 size-full brightness-[0.62] contrast-125 grayscale"
            />
            <div className="absolute inset-0 bg-[linear-gradient(165deg,var(--color-amethyst),var(--color-lagoon))] opacity-70 mix-blend-color" />
        </div>
    );
}

function PoseSkeleton({ on }: { on: boolean }) {
    return (
        <svg
            viewBox="0 0 100 225"
            preserveAspectRatio="none"
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
                        x1={LANDMARKS[a][0] * 100}
                        y1={LANDMARKS[a][1] * 225}
                        x2={LANDMARKS[b][0] * 100}
                        y2={LANDMARKS[b][1] * 225}
                        vectorEffect="non-scaling-stroke"
                        className="stroke-champagne/70"
                        strokeWidth="1"
                    />
                ))}
            </g>
            {LANDMARKS.map(([x, y], i) => (
                <circle
                    key={`${x}-${y}`}
                    cx={x * 100}
                    cy={y * 225}
                    r={i < 5 ? 0.9 : 1.5}
                    className={cn(
                        'origin-center fill-champagne [transform-box:fill-box]',
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

/** Step 1: the camera viewfinder. */
function CaptureScreen({ on }: { on: boolean }) {
    return (
        <>
            <MachineView />
            <ScanOverlay className="opacity-70" />
            <PoseSkeleton on={on} />
            <div className="absolute inset-x-0 top-0 h-[22%] bg-[linear-gradient(to_bottom,oklch(0.145_0.018_285/0.75),transparent)]" />
            <div
                className={cn(
                    'absolute top-[7.5%] left-3',
                    play(on, 'animate-[hiw-rise_600ms_var(--ease-glass)_both]'),
                )}
                style={delay(900)}
            >
                <FitChip
                    label="Pose detected"
                    value={`${DEMO.landmarks} landmarks`}
                    className="bg-ink/60!"
                />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-[25%] flex-col items-center justify-end gap-2.5 bg-[linear-gradient(to_top,oklch(0.145_0.018_285/0.96)_45%,transparent)] pb-[9%]">
                <p className="flex gap-3 text-[8px] font-medium tracking-[0.2em] uppercase">
                    <span className="text-champagne">Photo</span>
                    <span className="text-mist">Upload</span>
                </p>
                <div className="flex w-full items-center justify-between px-5">
                    <span className="size-8 overflow-hidden rounded-[9px] ring-1 ring-white/30">
                        <Photo
                            id={kioskShopper.id}
                            alt=""
                            ratio={1}
                            focus={[0.5, 0.22]}
                            zoom={2}
                            widths={[96]}
                            sizes="32px"
                            className="size-full"
                        />
                    </span>
                    <span className="grid size-12 place-items-center rounded-full border-2 border-bone/90">
                        <span
                            className={cn(
                                'size-[38px] rounded-full bg-bone',
                                play(
                                    on,
                                    'animate-[hiw-press_520ms_var(--ease-glass)_both]',
                                ),
                            )}
                            style={delay(1500)}
                        />
                    </span>
                    <span className="grid size-8 place-items-center rounded-full bg-white/10 text-bone ring-1 ring-white/15">
                        <SwitchCamera className="size-4" strokeWidth={1.6} />
                    </span>
                </div>
            </div>
            <div
                className={cn(
                    'pointer-events-none absolute inset-0 bg-bone opacity-0',
                    play(on, 'animate-[hiw-flash_700ms_ease-out_both]'),
                )}
                style={delay(1580)}
            />
        </>
    );
}

/*
 * Step 2: a landscape tablet with a product grid. The selected piece has a
 * swing tag hanging from it on a thread that leaves the screen. Geometry is
 * in px so the thread lines up with the selected thumbnail.
 */
const TABLET_W = 236;
const TABLET_H = (TABLET_W * 3) / 4;
const BEZEL = TABLET_W * 0.026;
const GRID_PAD = 7;
const GRID_GAP = 4;
const GRID_COLS = 4;
const THUMB_W =
    (TABLET_W - BEZEL * 2 - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) /
    GRID_COLS;
/** Grid order (indices into IMAGES.garments); the abaya sits at slot 6. */
const GRID_ORDER = [1, 2, 3, 4, 6, 5, 0, 7];
const SELECTED_SLOT = 6;
const THREAD_X =
    BEZEL +
    GRID_PAD +
    (SELECTED_SLOT % GRID_COLS) * (THUMB_W + GRID_GAP) +
    THUMB_W / 2;
const TAG_TOP = TABLET_H + 26;

function PickStage({ on }: { on: boolean }) {
    return (
        <div
            className="relative"
            style={{ width: TABLET_W, height: TAG_TOP + 132 }}
        >
            <TabletFrame orientation="landscape" className="w-full">
                <div
                    className="flex h-full flex-col"
                    style={{ padding: GRID_PAD }}
                >
                    <div className="flex h-[18px] items-center justify-between">
                        <span className="font-display text-[9px] font-medium tracking-[0.24em] text-bone">
                            {DEMO.store}
                        </span>
                        <span className="flex items-center gap-1.5 text-[7.5px] text-mist">
                            <span>New in</span>
                            <span className="rounded-full bg-white/10 px-1.5 py-px text-bone ring-1 ring-white/15">
                                Size {DEMO.size}
                            </span>
                        </span>
                    </div>
                    <ul
                        className="mt-[5px] grid grid-cols-4"
                        style={{ gap: GRID_GAP }}
                    >
                        {GRID_ORDER.map((garmentIndex, slot) => {
                            const garment = IMAGES.garments[garmentIndex];
                            const selected = slot === SELECTED_SLOT;

                            return (
                                <li key={garment.id} className="relative">
                                    <div
                                        className={cn(
                                            'aspect-[4/5] overflow-hidden rounded-[6px] bg-white/5',
                                            !selected &&
                                                'opacity-75 ring-1 ring-white/10',
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
                                    {selected ? (
                                        <span
                                            className={cn(
                                                'pointer-events-none absolute inset-0 rounded-[6px] ring-[1.5px] ring-champagne',
                                                play(
                                                    on,
                                                    'animate-[hiw-select_600ms_var(--ease-glass)_both]',
                                                ),
                                            )}
                                            style={delay(150)}
                                        />
                                    ) : null}
                                    {selected ? (
                                        <span
                                            className={cn(
                                                'absolute top-full left-1/2 h-4 w-px origin-top bg-champagne',
                                                play(
                                                    on,
                                                    'animate-[hiw-thread_260ms_ease-in_both]',
                                                ),
                                            )}
                                            style={delay(500)}
                                        />
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </TabletFrame>
            <span
                className={cn(
                    'absolute w-px origin-top bg-champagne',
                    play(on, 'animate-[hiw-thread_380ms_ease-out_both]'),
                )}
                style={{
                    left: THREAD_X,
                    top: TABLET_H - BEZEL,
                    height: TAG_TOP - TABLET_H + BEZEL + 9,
                    ...delay(700),
                }}
            />
            <SwingTag on={on} />
        </div>
    );
}

/** A paper swing tag, chamfered like the real thing, hanging from its hole. */
function SwingTag({ on }: { on: boolean }) {
    return (
        <div
            className="absolute -translate-x-1/2 -rotate-[4deg] drop-shadow-[0_14px_18px_oklch(0_0_0/0.45)]"
            style={{ left: THREAD_X, top: TAG_TOP, transformOrigin: '50% 9px' }}
        >
            <div
                className={cn(
                    'origin-[50%_9px]',
                    play(on, 'animate-[hiw-hang_900ms_var(--ease-glass)_both]'),
                )}
                style={delay(950)}
            >
                <div className="w-[104px] bg-bone px-3 pt-6 pb-3 text-ink [clip-path:polygon(22%_0,78%_0,100%_14%,100%_100%,0_100%,0_14%)]">
                    <span className="absolute top-[5px] left-1/2 size-2 -translate-x-1/2 rounded-full bg-ink/85 ring-2 ring-champagne/60" />
                    <p className="text-[7px] font-medium tracking-[0.26em] text-ink/60 uppercase">
                        Try-on
                    </p>
                    <p className="mt-1 font-display text-[19px] leading-none font-normal italic">
                        {DEMO.garment}
                    </p>
                    <p className="mt-1 text-[10px] leading-tight text-ink/75">
                        {DEMO.colour} · {DEMO.size}
                    </p>
                    <div className="mt-2.5 flex items-baseline justify-between border-t border-ink/15 pt-1.5 text-[9px] tabular-nums">
                        <span>{DEMO.price}</span>
                        <Arabic className="text-[11px] leading-none">
                            جرّبها
                        </Arabic>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Step 3: the rendered result develops out of the machine view. */
function ResultScreen({ on }: { on: boolean }) {
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
                <Photo
                    id={shopper.id}
                    alt=""
                    ratio={PHONE_SCREEN_RATIO}
                    focus={shopper.focus}
                    widths={[240, 400]}
                    sizes="184px"
                    className="size-full"
                />
            </div>
            {on ? (
                <div
                    className="pointer-events-none absolute inset-0 animate-[hiw-sweep_1500ms_linear_both]"
                    style={delay(150)}
                >
                    <div className="relative">
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,oklch(0.86_0.075_82/0.4),transparent)]" />
                        <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-1/2 bg-champagne shadow-[0_0_14px_2px_oklch(0.86_0.075_82/0.75)]" />
                        <span className="absolute top-2 right-2 rounded-full bg-ink/75 px-1.5 py-[3px] text-[7.5px] leading-none font-medium tracking-[0.22em] text-champagne uppercase">
                            Draping · {DEMO.size}
                        </span>
                    </div>
                </div>
            ) : null}
            <div className="absolute inset-x-0 top-0 h-[20%] bg-[linear-gradient(to_bottom,oklch(0.145_0.018_285/0.7),transparent)]" />
            <div
                className={cn(
                    'absolute top-[7.5%] left-3',
                    play(on, 'animate-[hiw-rise_600ms_var(--ease-glass)_both]'),
                )}
                style={delay(1450)}
            >
                <FitChip
                    label="Rendered in"
                    value={DEMO.render}
                    className="bg-ink/60!"
                />
            </div>
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 rounded-t-[18px] bg-ink/88 px-3 pt-3 pb-[10%] ring-1 ring-white/10 backdrop-blur-md',
                    play(on, 'animate-[hiw-rise_700ms_var(--ease-glass)_both]'),
                )}
                style={delay(1650)}
            >
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                    <span className="font-display text-[13px] leading-none text-bone">
                        {DEMO.garment} · {DEMO.colour}
                    </span>
                    <span className="text-[9.5px] text-mist tabular-nums">
                        {DEMO.price}
                    </span>
                </div>
                <SizeScale
                    sizes={DEMO.sizes}
                    recommended={DEMO.size}
                    confidence={DEMO.confidence}
                />
            </div>
        </>
    );
}

/** Step 4: the kiosk hands the look over to her phone. */
function KioskStage({ on }: { on: boolean }) {
    return (
        <KioskFrame className="w-[188px] self-end">
            <Photo
                id={kioskShopper.id}
                alt=""
                ratio={16 / 9}
                focus={kioskShopper.focus}
                widths={[240, 400]}
                sizes="160px"
                className="absolute inset-0 size-full"
            />
            <div className="absolute inset-x-0 top-0 flex h-[16%] items-start justify-between bg-[linear-gradient(to_bottom,oklch(0.145_0.018_285/0.8),transparent)] px-2.5 pt-2 text-bone">
                <span className="flex items-center gap-1">
                    <LogoMark className="size-3.5" />
                    <span className="font-display text-[10px] leading-none font-medium">
                        TryOn
                    </span>
                </span>
                <span className="text-[8px] text-mist">
                    EN · <Arabic>ع</Arabic>
                </span>
            </div>
            <div
                className={cn(
                    'absolute inset-x-[5%] bottom-[3.5%] flex items-center gap-2 rounded-[12px] bg-ink/85 p-2 ring-1 ring-white/12 backdrop-blur-md',
                    play(on, 'animate-[hiw-rise_700ms_var(--ease-glass)_both]'),
                )}
                style={delay(200)}
            >
                <span className="relative shrink-0">
                    <QrGlyph className="size-[50px] rounded-[6px] p-1" />
                    {on ? (
                        <span
                            className="absolute -inset-1 animate-[hiw-ring_1100ms_ease-out_both] rounded-[9px] border border-champagne"
                            style={delay(800)}
                        />
                    ) : null}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[10px] leading-tight font-medium text-bone">
                        Continue on your phone
                    </span>
                    <span className="text-[8px] leading-tight text-smoke">
                        Scan to save the look
                    </span>
                </span>
            </div>
        </KioskFrame>
    );
}

/* ------------------------------------------------------------------------ */
/* Steps                                                                    */
/* ------------------------------------------------------------------------ */

type Step = {
    title: string;
    body: string;
    meta: string;
    numeralAr: string;
    /** Spoken description of the device mockup. */
    device: string;
    stage: (on: boolean) => ReactNode;
};

const STEPS: Step[] = [
    {
        title: 'Snap or upload',
        body: 'A selfie or a full-length photo. TryOn reads her pose and proportions, nothing more.',
        meta: '≈ 3 seconds',
        numeralAr: '١',
        device: `A phone camera framing the shopper full length, pose detected with ${DEMO.landmarks} landmarks.`,
        stage: (on) => (
            <PhoneFrame className="w-[184px]">
                <CaptureScreen on={on} />
            </PhoneFrame>
        ),
    },
    {
        title: 'Pick a piece',
        body: 'Any product with a photo can be tried on, in every size you stock. No 3D models to commission.',
        meta: 'Sizes 52 to 60',
        numeralAr: '٢',
        device: `A tablet showing a grid of eight products with the ${DEMO.colour.toLowerCase()} abaya selected, size ${DEMO.size}, ${DEMO.price}.`,
        stage: (on) => <PickStage on={on} />,
    },
    {
        title: 'See it on you',
        body: 'The abaya is draped on her own photo, with the size to order and how sure we are of it.',
        meta: `${DEMO.render} per render`,
        numeralAr: '٣',
        device: `A phone showing the shopper wearing the ${DEMO.colour.toLowerCase()} abaya, rendered in ${DEMO.render}, size ${DEMO.size} recommended with ${DEMO.confidence}% fit confidence.`,
        stage: (on) => (
            <PhoneFrame className="w-[184px]">
                <ResultScreen on={on} />
            </PhoneFrame>
        ),
    },
    {
        title: 'Buy, or scan at the kiosk',
        body: 'Add to bag on the spot. In store, a QR code sends the look to her phone for later.',
        meta: 'Web or in store',
        numeralAr: '٤',
        device: 'An in-store kiosk showing a shopper in a beaded black abaya, with a QR code to continue on her phone.',
        stage: (on) => <KioskStage on={on} />,
    },
];

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
        'linear-gradient(150deg, oklch(0.86 0.075 82 / 0.95), oklch(0.86 0.075 82 / 0.2) 32%, oklch(0.86 0.075 82 / 0.06) 62%, oklch(0.86 0.075 82 / 0.7))',
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

    const scrollToStep = (index: number) => {
        const list = listRef.current;
        const item = list?.children[index];

        if (!list || !(item instanceof HTMLElement)) {
            return;
        }

        const inset = parseFloat(getComputedStyle(list).paddingLeft) || 0;
        list.scrollTo({
            left: item.offsetLeft - inset,
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

    // Carousel: the step whose left edge is closest to the start wins.
    const onScroll = () => {
        const list = listRef.current;

        if (!list || isStaircase) {
            return;
        }

        const items = Array.from(list.children) as HTMLElement[];
        const inset = parseFloat(getComputedStyle(list).paddingLeft) || 0;

        if (list.scrollLeft >= list.scrollWidth - list.clientWidth - 4) {
            setActive(items.length - 1);

            return;
        }

        let nearest = 0;
        let distance = Infinity;

        items.forEach((item, index) => {
            const d = Math.abs(item.offsetLeft - inset - list.scrollLeft);

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
                className="top-[38%] -right-48 size-[34rem] opacity-30"
            />
            <Container>
                <SectionHeader
                    index="01"
                    label="How it works"
                    labelAr="كيف يعمل"
                    title={
                        <>
                            From a selfie to <em>“it&nbsp;fits”</em> in four
                            steps.
                        </>
                    }
                    lede="No app to install and no measuring tape. Shoppers use the phone in their hand, or the mirror in your store."
                />

                <div ref={viewRef} className="relative mt-14 md:mt-16">
                    {/* Warm light that follows the step on stage, so the glass has something to refract. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute top-[6%] left-0 -z-10 hidden h-[62%] w-1/4 transition-transform duration-[1400ms] ease-glass xl:block"
                        style={{
                            transform: `translate(${active * 100}%, ${active * 56}px)`,
                        }}
                    >
                        <div className="absolute inset-[8%] rounded-full bg-champagne opacity-25 blur-[90px]" />
                    </div>

                    <div className="absolute top-0 right-0 z-10 hidden w-[calc((100%-6rem)/4)] items-center gap-4 border-t border-white/10 pt-4 xl:flex">
                        {timed ? (
                            <button
                                type="button"
                                onClick={() => setUserPaused((p) => !p)}
                                aria-label={
                                    userPaused
                                        ? 'Play the walkthrough'
                                        : 'Pause the walkthrough'
                                }
                                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-bone glass-thin transition-[background-color] duration-[380ms] ease-glass hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
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
                                Step {pad(active + 1)}
                            </span>{' '}
                            of {pad(STEPS.length)}
                            <span className="block">
                                {!timed
                                    ? 'Select any step'
                                    : playing
                                      ? 'Playing on its own'
                                      : 'Paused'}
                            </span>
                        </p>
                    </div>

                    <ol
                        ref={listRef}
                        onScroll={onScroll}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        className="relative -mx-5 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain px-5 pt-2 pb-14 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12 xl:mx-0 xl:grid xl:grid-cols-4 xl:gap-8 xl:overflow-visible xl:px-0 xl:pt-0 xl:pb-[184px] [&::-webkit-scrollbar]:hidden"
                    >
                        {STEPS.map((step, index) => {
                            const isActive = index === active;
                            const on = isActive && inView;

                            return (
                                <li
                                    key={step.title}
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
                                                className="relative flex h-[420px] items-center justify-center rounded-t-[27px] bg-[radial-gradient(85%_60%_at_50%_0%,oklch(1_0_0/0.09),transparent_72%)] xl:h-[440px]"
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
                                                                    STEPS.length,
                                                            );
                                                        }
                                                    }}
                                                    className={cn(
                                                        'absolute inset-0 origin-left bg-champagne',
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
                                                                ? 'text-champagne'
                                                                : 'text-bone',
                                                        )}
                                                    >
                                                        {pad(index + 1)}
                                                    </span>
                                                    <Arabic className="text-[1.625rem] leading-none text-mist/80">
                                                        {step.numeralAr}
                                                    </Arabic>
                                                    <span className="ml-auto text-[13px] text-mist tabular-nums">
                                                        {step.meta}
                                                    </span>
                                                </div>
                                                <h3 className="mt-5 font-display text-[1.5rem] leading-[1.15] font-medium text-balance text-bone">
                                                    {step.title}
                                                </h3>
                                                <p className="mt-2.5 text-[15px] leading-relaxed text-pretty text-mist">
                                                    {step.body}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => select(index)}
                                                aria-label={`Step ${index + 1} of ${STEPS.length}: ${step.title}`}
                                                aria-current={
                                                    isActive
                                                        ? 'step'
                                                        : undefined
                                                }
                                                className="absolute inset-0 z-10 cursor-pointer rounded-[28px] focus-visible:ring-2 focus-visible:ring-champagne/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
                                            />
                                        </article>
                                    </Reveal>
                                </li>
                            );
                        })}
                    </ol>

                    <p className="absolute bottom-0 left-0 z-10 hidden w-[calc((100%-6rem)/4)] border-t border-white/10 pt-4 text-[13px] leading-relaxed text-smoke xl:block">
                        <span className="mb-1 block text-kicker font-medium text-mist uppercase">
                            Shown
                        </span>
                        {DEMO.look}: {DEMO.colour.toLowerCase()} abaya with a
                        blush panel, size {DEMO.size}. Tried on in {DEMO.city};
                        the kiosk look was saved in {DEMO.kioskCity}.
                    </p>
                </div>

                <div className="flex flex-col gap-6 xl:hidden">
                    <div
                        role="group"
                        aria-label="Choose a step"
                        className="flex items-center gap-1 border-t border-white/10"
                    >
                        {STEPS.map((step, index) => {
                            const isActive = index === active;

                            return (
                                <button
                                    key={step.title}
                                    type="button"
                                    onClick={() => select(index)}
                                    aria-label={`Step ${index + 1}: ${step.title}`}
                                    aria-current={isActive ? 'step' : undefined}
                                    className="group relative flex h-12 min-w-12 cursor-pointer items-center justify-center rounded-[12px] px-3 focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                                >
                                    <span
                                        className={cn(
                                            'font-display text-lg tabular-nums transition-colors duration-[380ms] ease-glass',
                                            isActive
                                                ? 'text-champagne'
                                                : 'text-smoke group-hover:text-mist',
                                        )}
                                    >
                                        {pad(index + 1)}
                                    </span>
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-x-3 -top-px h-px origin-left bg-champagne transition-transform duration-[600ms] ease-glass',
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
                            Shown
                        </span>
                        {DEMO.look}: {DEMO.colour.toLowerCase()} abaya with a
                        blush panel, size {DEMO.size}. Tried on in {DEMO.city};
                        the kiosk look was saved in {DEMO.kioskCity}.
                    </p>
                </div>
            </Container>
        </section>
    );
}
