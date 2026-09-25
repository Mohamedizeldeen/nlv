import { Link } from '@inertiajs/react';
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
    CSSProperties,
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { IMAGES } from '../images';
import { useLandingLinks } from '../links';
import { Photo } from '../photo';
import { Arabic, Container, cta, Glow, Reveal } from '../primitives';
import { FitChip, LiveDot, ScanOverlay } from '../tryon-ui';

// Placeholder content: replace before launch.
const LIVE = { tryOnsToday: 10284, stores: 140, countries: 6 };
const LOOK = { number: '01', garment: 'Linen abaya, sand' };
const READINGS = { size: '54', fit: 96, drape: 'Relaxed', render: '1.8 s' };

const HERO = IMAGES.hero.main;
const HERO_WIDTHS = [640, 960, 1280, 1600, 2000, 2400];
// Rendered width of the photo plane (it overhangs the viewport below lg).
const HERO_SIZES = '(min-width: 1024px) 85vw, (min-width: 768px) 145vw, 150vw';
const formatCount = new Intl.NumberFormat('en-US');

/* Lens position along its track, 0 (left) to 1 (right). */
const LENS_START = 0.86;
const LENS_REST = 0.4;
const LENS_STEP = 0.04;

/*
 * Geometry shared by every layer of the stage. The photo sits on a "plane"
 * with the photo's exact aspect ratio, so the body map inside the lens can
 * be drawn in photo coordinates. The plane is placed so the model in sand
 * stands under the lens at its rest position, whatever the viewport.
 * React only sets --t (lens position) and --rest; everything else is CSS,
 * so the clipped duotone copy and the glass frame can never drift apart.
 *
 * cqw/cqh resolve against .hero-stage (a size container) inside the stage,
 * and against .hero-root (inline-size) for the headline panel.
 */
const HERO_CSS = `
.hero-root {
    container-type: inline-size;
    --edge: 20px;
    --panel: 100%;
    --tl: var(--edge);
    --tr: var(--edge);
    --lw: 44cqw;
    --lt: 148px;
    --lb: 104px;
    --run: calc(100cqw - var(--tl) - var(--tr) - var(--lw));
    --lx: calc(var(--tl) + var(--t) * var(--run));
    --lc: calc(var(--tl) + var(--rest) * var(--run) + var(--lw) / 2);
    --pw: max(150cqw, calc((100cqw - var(--lc)) / 0.39), calc(var(--lc) / 0.61));
    --ph: calc(var(--pw) / ${HERO.aspect});
    --pl: calc(var(--lc) - 0.61 * var(--pw));
    --pt: calc(var(--lt) + 18px - 0.417 * var(--ph));
}
.hero-stage { container-type: size; }
.hero-plane {
    position: absolute;
    left: var(--pl);
    top: var(--pt);
    width: var(--pw);
    height: var(--ph);
}
.hero-clip {
    clip-path: inset(var(--lt) calc(100cqw - var(--lx) - var(--lw)) var(--lb) var(--lx) round 32px);
    transition: clip-path var(--lens-ms) var(--lens-ease);
}
.hero-track {
    position: absolute;
    top: var(--lt);
    bottom: var(--lb);
    left: var(--tl);
    right: var(--tr);
}
.hero-lens {
    position: absolute;
    top: var(--lt);
    bottom: var(--lb);
    left: 0;
    width: var(--lw);
    transform: translate3d(var(--lx), 0, 0);
    transition: transform var(--lens-ms) var(--lens-ease);
}
.hero-root[data-dragging] .hero-lens,
.hero-root[data-dragging] .hero-clip {
    transition: none;
}
.hero-caption {
    left: calc(100cqw - var(--edge) + 14px);
    bottom: var(--lb);
}
.hero-fade {
    -webkit-mask-image: linear-gradient(180deg, #000 58%, transparent 99%);
    mask-image: linear-gradient(180deg, #000 58%, transparent 99%);
}
.hero-root .hero-chip {
    background: color-mix(in oklch, var(--color-ink-raised) 55%, transparent);
}
@media (width >= 40rem) {
    .hero-root { --edge: 32px; }
}
@media (width >= 48rem) {
    .hero-root { --lw: 30cqw; --pw: max(104cqw, calc((100cqw - var(--lc)) / 0.39), calc(var(--lc) / 0.61)); }
}
@media (width >= 64rem) {
    .hero-root {
        --edge: max(48px, 50cqw - 612px);
        --panel: clamp(460px, 44cqw, 600px);
        --tl: calc(var(--edge) + var(--panel) + 72px);
        --tr: calc(var(--edge) + 16px);
        --lw: clamp(240px, (100cqw - 2 * var(--edge)) * 0.26, 360px);
        --lt: 150px;
        --lb: 48px;
        --pw: max(75cqw, 115.5cqh, calc((100cqw - var(--lc)) / 0.39));
    }
    .hero-feather {
        -webkit-mask-image: linear-gradient(90deg, transparent, #000 30%);
        mask-image: linear-gradient(90deg, transparent, #000 30%);
    }
    .hero-fade {
        -webkit-mask-image: linear-gradient(180deg, #000 72%, transparent 100%);
        mask-image: linear-gradient(180deg, #000 72%, transparent 100%);
    }
}
`;

type Point = readonly [number, number];

type Figure = {
    key: string;
    /** Pose landmarks: neck, shoulders, elbows, wrists, hips. */
    joints: Point[];
    /** Faint links between landmarks (indices into `joints`). */
    links: [number, number][];
    /** Shoulder width, drawn just above the shoulders. */
    shoulder: { y: number; from: number; to: number };
    /** Centre-front garment length, neckline to hem. */
    length: { x: number; from: number; to: number };
    labels: { at: Point; text: string; align?: 'start' | 'end' }[];
};

/*
 * Body landmarks for the two models, as fractions of the photograph
 * (x from the left, y from the top). They are drawn on the duotone copy,
 * so they only show through the lens and stay pinned to the models while
 * it moves. Abaya sizes are lengths in inches: 54 in is 137 cm.
 */
const FIGURES: Figure[] = [
    {
        key: 'sand',
        joints: [
            [0.579, 0.498],
            [0.523, 0.508],
            [0.638, 0.513],
            [0.479, 0.594],
            [0.494, 0.672],
            [0.712, 0.558],
            [0.622, 0.612],
            [0.538, 0.632],
            [0.626, 0.632],
        ],
        links: [
            [0, 1],
            [0, 2],
            [1, 3],
            [3, 4],
            [2, 5],
            [5, 6],
            [1, 7],
            [2, 8],
            [7, 8],
        ],
        shoulder: { y: 0.49, from: 0.523, to: 0.638 },
        length: { x: 0.578, from: 0.51, to: 0.872 },
        labels: [
            { at: [0.646, 0.49], text: '41 cm' },
            { at: [0.59, 0.665], text: 'Length 137 cm' },
        ],
    },
    {
        key: 'taupe',
        joints: [
            [0.465, 0.472],
            [0.405, 0.478],
            [0.525, 0.483],
            [0.385, 0.585],
            [0.428, 0.642],
            [0.422, 0.612],
            [0.49, 0.612],
        ],
        links: [
            [0, 1],
            [0, 2],
            [1, 3],
            [3, 4],
            [1, 5],
            [2, 6],
            [5, 6],
        ],
        shoulder: { y: 0.462, from: 0.405, to: 0.525 },
        length: { x: 0.438, from: 0.49, to: 0.83 },
        labels: [
            { at: [0.398, 0.462], text: '39 cm', align: 'end' },
            { at: [0.449, 0.745], text: 'Length 142 cm' },
        ],
    },
];

const VB_W = 1000;
const VB_H = Math.round(VB_W / HERO.aspect);

const clamp01 = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Hero() {
    const [lens, setLens] = useState(() =>
        prefersReducedMotion() ? LENS_REST : LENS_START,
    );
    const [intro, setIntro] = useState(true);
    const [photoReady, setPhotoReady] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [touched, setTouched] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; from: number; run: number } | null>(null);
    const interacted = useRef(false);
    const stageRef = useRef<HTMLDivElement>(null);
    const lensRef = useRef<HTMLDivElement>(null);

    // Measurement labels only show once they sit wholly inside the lens,
    // so none is ever cut in half by its edge. Uses where the lens is
    // heading (not where a transition currently has it).
    useEffect(() => {
        const stage = stageRef.current;
        const track = trackRef.current;
        const lensEl = lensRef.current;

        if (!stage || !track || !lensEl) {
            return;
        }

        const update = () => {
            const bounds = track.getBoundingClientRect();
            const width = lensEl.offsetWidth;
            const left = bounds.left + lens * (bounds.width - width);

            stage
                .querySelectorAll<HTMLElement>('[data-lens-label]')
                .forEach((label) => {
                    const box = label.getBoundingClientRect();
                    const inside =
                        box.left >= left + 12 &&
                        box.right <= left + width - 12 &&
                        box.top >= bounds.top + 12 &&
                        box.bottom <= bounds.bottom - 12;

                    label.style.opacity = inside ? '1' : '0';
                });
        };

        update();
        window.addEventListener('resize', update);

        return () => window.removeEventListener('resize', update);
    }, [lens]);

    // Don't wait forever for the photograph before the intro glide.
    useEffect(() => {
        const id = window.setTimeout(() => setPhotoReady(true), 1400);

        return () => window.clearTimeout(id);
    }, []);

    // Once the photo is in, the lens glides from the right to rest over
    // the model (instant under reduced motion; skipped if already moved).
    useEffect(() => {
        if (!photoReady) {
            return;
        }

        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => {
                if (!interacted.current) {
                    setLens(LENS_REST);
                }
            });
        });
        const settle = window.setTimeout(() => setIntro(false), 1900);

        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
            window.clearTimeout(settle);
        };
    }, [photoReady]);

    const handleInteraction = () => {
        interacted.current = true;
        setTouched(true);
        setIntro(false);
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const track = trackRef.current;

        if (!track) {
            return;
        }

        const run =
            track.getBoundingClientRect().width -
            event.currentTarget.getBoundingClientRect().width;

        if (run <= 0) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, from: lens, run };
        setDragging(true);
        handleInteraction();
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const current = drag.current;

        if (!current) {
            return;
        }

        setLens(
            clamp01(current.from + (event.clientX - current.x) / current.run),
        );
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current) {
            return;
        }

        drag.current = null;
        setDragging(false);

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const next: Record<string, number> = {
            ArrowLeft: lens - LENS_STEP,
            ArrowDown: lens - LENS_STEP,
            ArrowRight: lens + LENS_STEP,
            ArrowUp: lens + LENS_STEP,
            PageDown: lens - LENS_STEP * 5,
            PageUp: lens + LENS_STEP * 5,
            Home: 0,
            End: 1,
        };

        if (!(event.key in next)) {
            return;
        }

        event.preventDefault();
        handleInteraction();
        setLens(clamp01(next[event.key]));
    };

    return (
        <section
            id="top"
            aria-labelledby="hero-title"
            data-dragging={dragging || undefined}
            className="hero-root relative isolate flex flex-col lg:h-[min(100svh,960px)] lg:min-h-[680px] lg:justify-end"
            style={
                {
                    '--t': lens,
                    '--rest': LENS_REST,
                    '--lens-ms': intro ? '1700ms' : '520ms',
                    '--lens-ease': intro
                        ? 'cubic-bezier(0.6, 0, 0.3, 1)'
                        : 'var(--ease-glass)',
                } as CSSProperties
            }
        >
            <style href="tryon-hero-lens" precedence="default">
                {HERO_CSS}
            </style>

            <Glow
                color="coral"
                className="bottom-[-12rem] left-[-14rem] hidden size-[40rem] opacity-30 lg:block"
            />

            {/*
             * The panel comes first in the DOM so the h1 and CTAs are read
             * and tabbed to before the lens; on phones the photo is still
             * shown above it (flex order).
             */}
            <Container className="pointer-events-none relative z-20 order-2 -mt-20 pb-16 sm:-mt-16 lg:order-none lg:mt-0 lg:pb-12">
                <HeadlinePanel />
            </Container>

            <div
                ref={stageRef}
                className="hero-stage relative order-1 h-[66svh] max-h-[780px] min-h-[480px] w-full overflow-hidden lg:absolute lg:inset-0 lg:h-auto lg:max-h-none lg:min-h-0"
            >
                {/*
                 * The campaign photograph, graded warm and a little low so it
                 * sits in the dark page. The whole group fades out at the
                 * bottom (a mask, not an ink gradient) so it melts into the
                 * page's colour field without a seam.
                 */}
                <div className="hero-fade pointer-events-none absolute inset-0">
                    <div className="hero-plane hero-feather">
                        <Photo
                            id={HERO.id}
                            alt={HERO.alt}
                            priority
                            widths={HERO_WIDTHS}
                            sizes={HERO_SIZES}
                            draggable={false}
                            onLoad={() => setPhotoReady(true)}
                            className="size-full brightness-[.86] saturate-[.92]"
                        />
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-champagne-deep opacity-30 mix-blend-multiply"
                        />
                    </div>
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-linear-to-b from-ink/75 via-ink/0 via-24% to-transparent"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 hidden bg-linear-to-r from-ink/85 via-ink/45 via-35% to-transparent to-60% lg:block"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 hidden bg-linear-to-l from-ink/60 to-transparent to-14% lg:block"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-linear-to-t from-ink/60 to-transparent to-40%"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 grain opacity-[0.07] mix-blend-overlay"
                    />
                </div>

                {/* The same photograph as TryOn sees it, clipped to the lens. */}
                <div aria-hidden className="hero-clip absolute inset-0">
                    <div className="hero-plane">
                        <Photo
                            id={HERO.id}
                            alt=""
                            priority
                            widths={HERO_WIDTHS}
                            sizes={HERO_SIZES}
                            draggable={false}
                            className="size-full brightness-[.62] contrast-[1.5] grayscale"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(172deg,var(--color-amethyst)_18%,var(--color-lagoon)_96%)] mix-blend-color" />
                        <div className="absolute inset-0 bg-ink opacity-45 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-linear-to-b from-transparent from-58% to-ink/55" />
                        <BodyMap />
                    </div>
                </div>

                <div ref={trackRef} aria-hidden className="hero-track" />

                {/* The lens: a clear glass pane with its readings. */}
                <div
                    ref={lensRef}
                    role="group"
                    aria-label="Try-on lens"
                    className={cn(
                        'hero-lens group/lens z-10 touch-pan-y select-none',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    )}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onLostPointerCapture={endDrag}
                >
                    <div
                        aria-hidden
                        className="glass-rim absolute inset-0 rounded-[32px] border border-white/25 shadow-[0_44px_90px_-36px_oklch(0_0_0/0.8),inset_0_0_42px_oklch(1_0_0/0.07)] ring-1 ring-lagoon/20 transition-[border-color] duration-[380ms] ease-glass ring-inset group-hover/lens:border-white/40 group-has-[:focus-visible]/lens:border-champagne/70"
                    >
                        <div className="absolute inset-0 overflow-hidden rounded-[32px]">
                            <ScanOverlay className="opacity-80" />
                            <div className="absolute inset-0 bg-[linear-gradient(118deg,oklch(1_0_0/0.16),oklch(1_0_0/0)_26%,oklch(1_0_0/0)_72%,oklch(1_0_0/0.07))]" />
                        </div>
                        <p className="absolute top-[4.2%] left-1/2 -translate-x-1/2 text-[10px] font-medium tracking-[0.24em] whitespace-nowrap text-bone/75 uppercase">
                            {BRAND.name} view
                        </p>
                    </div>

                    <LiveBadge className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+12px)] lg:right-5 lg:left-auto lg:translate-x-0 lg:-translate-y-1/2" />

                    <FitChip
                        label="Size"
                        value={
                            <>
                                {READINGS.size}
                                <span className="ml-1.5 text-mist">
                                    ({READINGS.fit}% fit)
                                </span>
                            </>
                        }
                        className="hero-chip absolute top-[58%] left-1/2 -translate-x-1/2 whitespace-nowrap lg:top-[27%] lg:-left-14 lg:translate-x-0"
                    />
                    <FitChip
                        label="Drape"
                        value={READINGS.drape}
                        className="hero-chip absolute top-[44%] -right-11 hidden lg:flex"
                    />
                    <FitChip
                        label="Render"
                        value={READINGS.render}
                        className="hero-chip absolute top-[73%] -left-14 hidden lg:flex"
                    />

                    <p
                        aria-hidden
                        className={cn(
                            'hero-chip pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap text-bone glass-thin transition-opacity duration-700 ease-glass',
                            touched && 'opacity-0',
                        )}
                    >
                        Drag the lens
                    </p>

                    <div
                        role="slider"
                        tabIndex={0}
                        aria-label="Move the try-on lens"
                        aria-orientation="horizontal"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(lens * 100)}
                        onKeyDown={onKeyDown}
                        className="absolute bottom-0 left-1/2 flex h-9 w-[4.5rem] -translate-x-1/2 translate-y-1/2 items-center justify-center gap-1.5 rounded-full text-bone glass-thin transition-[background-color,box-shadow] duration-[380ms] ease-glass group-hover/lens:bg-white/[0.18] focus-visible:ring-2 focus-visible:ring-champagne/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
                    >
                        <ChevronLeft aria-hidden className="size-4" />
                        <span aria-hidden className="h-3.5 w-px bg-white/30" />
                        <ChevronRight aria-hidden className="size-4" />
                    </div>
                </div>

                {/* Magazine caption, set in the right margin. */}
                <p className="hero-caption absolute hidden items-center gap-4 text-kicker font-medium text-mist uppercase [writing-mode:vertical-rl] lg:flex lg:rotate-180">
                    <span aria-hidden className="h-14 w-px bg-white/35" />
                    <span>
                        <span className="text-bone">Look {LOOK.number}</span>
                        <span aria-hidden className="mx-2.5 text-white/35">
                            /
                        </span>
                        {LOOK.garment}
                    </span>
                </p>
            </div>
        </section>
    );
}

function HeadlinePanel() {
    const links = useLandingLinks();

    return (
        <div className="glass-rim pointer-events-auto relative w-full rounded-[32px] p-6 glass-strong sm:p-9 lg:w-[var(--panel)] lg:p-10">
            <Reveal delay={80}>
                <p className="flex items-start gap-3 text-kicker font-medium text-smoke uppercase">
                    <LiveDot className="mt-1 shrink-0" />
                    <span className="flex flex-col gap-y-1 sm:flex-row sm:gap-x-2">
                        <span>
                            AI virtual try-on
                            <span
                                aria-hidden
                                className="ml-2 hidden text-white/25 sm:inline"
                            >
                                ·
                            </span>
                        </span>
                        <span>Online &amp; in store</span>
                    </span>
                </p>
            </Reveal>

            <Reveal delay={160}>
                <h1
                    id="hero-title"
                    className="mt-6 font-display text-display-xl font-medium text-balance text-bone"
                >
                    Every screen is a{' '}
                    <em className="font-normal text-champagne">
                        fitting room.
                    </em>
                </h1>
                <div className="mt-4 flex items-center gap-4">
                    <span aria-hidden className="h-px flex-1 bg-white/12" />
                    <Arabic className="text-xl leading-none text-champagne/85">
                        {BRAND.taglineAr}
                    </Arabic>
                </div>
            </Reveal>

            <Reveal delay={240}>
                <p className="mt-6 max-w-[33rem] text-[17px] leading-relaxed text-pretty text-mist">
                    {BRAND.name} shows shoppers the abaya, the frames and the
                    fit on themselves, before they buy. On your website, and on
                    a touchscreen mirror in your store.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                        href={links.start}
                        className={cn(
                            cta({ variant: 'gold', size: 'lg' }),
                            'group/cta',
                        )}
                    >
                        Start free trial
                        <ArrowRight
                            aria-hidden
                            className="size-4 transition-transform duration-[380ms] ease-glass group-hover/cta:translate-x-0.5"
                        />
                    </Link>
                    <a
                        href="#how-it-works"
                        className={cta({ variant: 'glass', size: 'lg' })}
                    >
                        <Play aria-hidden className="size-4" />
                        Watch demo
                    </a>
                </div>

                <p className="mt-5 flex flex-col gap-y-1 text-[13px] text-smoke sm:flex-row sm:flex-wrap">
                    <span className="whitespace-nowrap">
                        14-day trial
                        <Dot />
                        No card required
                        <Dot className="hidden sm:inline" />
                    </span>
                    <span className="whitespace-nowrap">
                        Live on Shopify in 10 minutes
                    </span>
                </p>
            </Reveal>
        </div>
    );
}

function Dot({ className }: { className?: string }) {
    return (
        <span aria-hidden className={cn('mx-2 text-white/25', className)}>
            ·
        </span>
    );
}

/** "10,284 try-ons today", ticking up while the page is open. */
function LiveBadge({ className }: { className?: string }) {
    const [count, setCount] = useState(LIVE.tryOnsToday);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const id = window.setInterval(() => {
            setCount((value) => value + 1 + Math.floor(Math.random() * 3));
        }, 2500);

        return () => window.clearInterval(id);
    }, []);

    return (
        <div
            aria-live="off"
            className={cn(
                'hero-chip flex items-center gap-2.5 rounded-[14px] px-3.5 py-2 whitespace-nowrap glass-thin',
                className,
            )}
        >
            <LiveDot />
            <span className="flex flex-col">
                <span className="text-[13px] leading-snug text-bone">
                    <span className="font-medium tabular-nums">
                        {formatCount.format(count)}
                    </span>{' '}
                    try-ons today
                </span>
                <span className="hidden text-[11px] leading-snug text-smoke lg:block">
                    across {LIVE.stores} stores in {LIVE.countries} countries
                </span>
            </span>
        </div>
    );
}

/** Landmarks, shoulder width and centre-front length, per model. */
function BodyMap() {
    const x = (value: number) => value * VB_W;
    const y = (value: number) => value * VB_H;
    const at = ([px, py]: Point): CSSProperties => ({
        left: `${px * 100}%`,
        top: `${py * 100}%`,
    });

    return (
        <div className="absolute inset-0">
            <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full"
            >
                {FIGURES.map((figure) => (
                    <g key={figure.key}>
                        {figure.links.map(([a, b]) => (
                            <line
                                key={`${a}-${b}`}
                                x1={x(figure.joints[a][0])}
                                y1={y(figure.joints[a][1])}
                                x2={x(figure.joints[b][0])}
                                y2={y(figure.joints[b][1])}
                                vectorEffect="non-scaling-stroke"
                                strokeWidth={1}
                                className="stroke-bone/20"
                            />
                        ))}
                        <line
                            x1={x(figure.shoulder.from)}
                            y1={y(figure.shoulder.y)}
                            x2={x(figure.shoulder.to)}
                            y2={y(figure.shoulder.y)}
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={1}
                            className="stroke-champagne"
                        />
                        <line
                            x1={x(figure.length.x)}
                            y1={y(figure.length.from)}
                            x2={x(figure.length.x)}
                            y2={y(figure.length.to)}
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={1}
                            strokeDasharray="4 5"
                            className="stroke-champagne"
                        />
                    </g>
                ))}
            </svg>

            {FIGURES.map((figure) => (
                <div key={figure.key}>
                    {figure.joints.map((joint) => (
                        <span
                            key={joint.join()}
                            className="absolute size-[7px] -translate-1/2 rounded-full border border-champagne bg-ink/70"
                            style={at(joint)}
                        />
                    ))}
                    {(
                        [
                            [figure.shoulder.from, figure.shoulder.y],
                            [figure.shoulder.to, figure.shoulder.y],
                        ] as const
                    ).map((tick) => (
                        <span
                            key={tick.join()}
                            className="absolute h-2.5 w-px -translate-1/2 bg-champagne"
                            style={at(tick)}
                        />
                    ))}
                    {(
                        [
                            [figure.length.x, figure.length.from],
                            [figure.length.x, figure.length.to],
                        ] as const
                    ).map((tick) => (
                        <span
                            key={tick.join()}
                            className="absolute h-px w-2.5 -translate-1/2 bg-champagne"
                            style={at(tick)}
                        />
                    ))}
                    {figure.labels.map((label) => (
                        <span
                            key={label.text}
                            data-lens-label
                            className={cn(
                                'absolute hidden -translate-y-1/2 rounded-[6px] bg-ink/60 px-1.5 py-0.5 text-[10px] leading-4 font-medium tracking-[0.14em] whitespace-nowrap text-champagne uppercase tabular-nums transition-opacity duration-300 ease-glass lg:block',
                                label.align === 'end' && '-translate-x-full',
                            )}
                            style={at(label.at)}
                        >
                            {label.text}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
