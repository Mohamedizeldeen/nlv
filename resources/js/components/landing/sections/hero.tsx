import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type {
    CSSProperties,
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
} from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { Accent } from '../accent';
import { BRAND } from '../brand';
import { IMAGES } from '../images';
import { useContent, useLanding } from '../landing-data';
import { useOrderDialog } from '../order-dialog';
import { Photo } from '../photo';
import { Container, cta, Glow, Reveal } from '../primitives';
import { FitChip, ScanOverlay } from '../tryon-ui';

// Placeholder content: replace before launch. The copy and the live badge's
// figures come from the admin (landing.content, landing.stats); the lens
// readings below are part of the artwork (their words: i18n/sections/hero.ts).
const LOOK = { number: '17' };
const READINGS = { size: '54', fit: 96, render: '1.8' };

const HERO = IMAGES.hero.main;
const HERO_WIDTHS = [640, 960, 1280, 1600, 2000, 2400];
// Rendered width of the photo plane (it overhangs the viewport below lg).
const HERO_SIZES = '(min-width: 1024px) 85vw, (min-width: 768px) 145vw, 150vw';

/*
 * Lens position along its track, 0 (left) to 1 (right). It starts by the
 * outer edge and glides in towards the headline panel, so on the Arabic
 * page, where the panel sits on the right, both are mirrored.
 */
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
 *
 * Right to left, the composition mirrors: the panel takes the right, the
 * lens runs over the left half and the caption moves to the left margin.
 * The photograph is never flipped: the plane is placed by the same rule
 * (the model under the lens at rest, the photo reaching the outer edge),
 * at the same scale as on the English page. Positions inside the stage are
 * physical (left/right), so they mean the same thing in both directions.
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
[dir='rtl'] .hero-root {
    --pw: max(150cqw, calc(var(--lc) / 0.39), calc((100cqw - var(--lc)) / 0.61));
}
[dir='rtl'] .hero-caption {
    left: auto;
    right: calc(100cqw - var(--edge) + 14px);
}
@media (width >= 40rem) {
    .hero-root { --edge: 32px; }
}
@media (width >= 48rem) {
    .hero-root { --lw: 30cqw; --pw: max(104cqw, calc((100cqw - var(--lc)) / 0.39), calc(var(--lc) / 0.61)); }
    [dir='rtl'] .hero-root { --pw: max(104cqw, calc(var(--lc) / 0.39), calc((100cqw - var(--lc)) / 0.61)); }
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
    [dir='rtl'] .hero-root {
        --tl: calc(var(--edge) + 16px);
        --tr: calc(var(--edge) + var(--panel) + 72px);
        --pw: max(75cqw, 115.5cqh, calc(var(--lc) / 0.39));
    }
    [dir='rtl'] .hero-feather {
        -webkit-mask-image: linear-gradient(270deg, transparent, #000 30%);
        mask-image: linear-gradient(270deg, transparent, #000 30%);
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
    /** Readings in centimetres; `end` sets the label to the left of its point. */
    labels: {
        at: Point;
        kind: 'width' | 'length';
        cm: number;
        align?: 'start' | 'end';
    }[];
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
            { at: [0.646, 0.49], kind: 'width', cm: 41 },
            { at: [0.59, 0.665], kind: 'length', cm: 137 },
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
            { at: [0.398, 0.462], kind: 'width', cm: 39, align: 'end' },
            { at: [0.449, 0.745], kind: 'length', cm: 142 },
        ],
    },
];

const VB_W = 1000;
const VB_H = Math.round(VB_W / HERO.aspect);

const clamp01 = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (onChange: () => void) => {
    const media = window.matchMedia(REDUCED_MOTION);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
};
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const getServerReducedMotion = () => false;

export default function Hero() {
    const { t, isRtl } = useI18n();
    // The page's language comes from the URL, so this is the same on the
    // server and during hydration.
    const lensStart = isRtl ? 1 - LENS_START : LENS_START;
    const lensRest = isRtl ? 1 - LENS_REST : LENS_REST;
    const reducedMotion = useSyncExternalStore(
        subscribeReducedMotion,
        getReducedMotion,
        getServerReducedMotion,
    );
    const [lensState, setLens] = useState(lensStart);
    const [intro, setIntro] = useState(true);
    const [photoReady, setPhotoReady] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [touched, setTouched] = useState(false);
    // Reduced motion skips the intro glide and starts at rest. Derived rather
    // than used as the initial state, so the server render and hydration agree.
    const lens =
        reducedMotion && !touched && lensState === lensStart
            ? lensRest
            : lensState;
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
                    setLens(lensRest);
                }
            });
        });
        const settle = window.setTimeout(() => setIntro(false), 1900);

        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
            window.clearTimeout(settle);
        };
    }, [photoReady, lensRest]);

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
                    '--rest': lensRest,
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
                color="jade"
                className="-start-56 bottom-[-12rem] hidden size-[40rem] opacity-30 lg:block"
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
                            alt={t('hero.photoAlt')}
                            priority
                            widths={HERO_WIDTHS}
                            sizes={HERO_SIZES}
                            draggable={false}
                            onLoad={() => setPhotoReady(true)}
                            className="size-full brightness-[.86] saturate-[.92]"
                        />
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-mint-deep opacity-30 mix-blend-multiply"
                        />
                    </div>
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-linear-to-b from-ink/75 via-ink/0 via-24% to-transparent"
                    />
                    {/* Shade under the panel, and a little at the outer edge. */}
                    <div
                        aria-hidden
                        className="absolute inset-0 hidden bg-linear-to-r from-ink/85 via-ink/45 via-35% to-transparent to-60% lg:block rtl:bg-linear-to-l"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 hidden bg-linear-to-l from-ink/60 to-transparent to-14% lg:block rtl:bg-linear-to-r"
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
                        <div className="absolute inset-0 bg-[linear-gradient(172deg,var(--color-jade)_18%,var(--color-lagoon)_96%)] mix-blend-color" />
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
                    aria-label={t('hero.lensLabel')}
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
                        className="glass-rim absolute inset-0 rounded-[32px] border border-white/25 shadow-[0_44px_90px_-36px_oklch(0_0_0/0.8),inset_0_0_42px_oklch(1_0_0/0.07)] ring-1 ring-lagoon/20 transition-[border-color] duration-[380ms] ease-glass ring-inset group-hover/lens:border-white/40 group-has-[:focus-visible]/lens:border-mint/70"
                    >
                        <div className="absolute inset-0 overflow-hidden rounded-[32px]">
                            <ScanOverlay className="opacity-80" />
                            <div className="absolute inset-0 bg-[linear-gradient(118deg,oklch(1_0_0/0.16),oklch(1_0_0/0)_26%,oklch(1_0_0/0)_72%,oklch(1_0_0/0.07))]" />
                        </div>
                        <p className="absolute top-[4.2%] left-1/2 -translate-x-1/2 text-[10px] font-medium tracking-[0.24em] whitespace-nowrap text-bone/75 uppercase rtl:text-[11px] rtl:normal-case">
                            {t('hero.lensView', { brand: BRAND.name })}
                        </p>
                    </div>

                    {/* Badge and readings sit on the lens's outer and inner
                        sides; right to left they swap sides with it. */}
                    <LiveBadge className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+12px)] lg:right-5 lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 lg:rtl:right-auto lg:rtl:left-5" />

                    <FitChip
                        label={t('hero.size')}
                        value={
                            <>
                                {READINGS.size}
                                <span className="ms-1.5 text-mist">
                                    {t('hero.fit', { fit: READINGS.fit })}
                                </span>
                            </>
                        }
                        className="hero-chip absolute top-[58%] left-1/2 -translate-x-1/2 text-start whitespace-nowrap lg:top-[27%] lg:-left-14 lg:translate-x-0 lg:rtl:right-[-3.5rem] lg:rtl:left-auto"
                    />
                    <FitChip
                        label={t('hero.drape')}
                        value={t('hero.drapeValue')}
                        className="hero-chip absolute top-[44%] -right-11 hidden text-start lg:flex rtl:right-auto rtl:-left-11"
                    />
                    <FitChip
                        label={t('hero.render')}
                        value={t('hero.seconds', {
                            seconds: READINGS.render,
                        })}
                        className="hero-chip absolute top-[73%] -left-14 hidden text-start lg:flex rtl:right-[-3.5rem] rtl:left-auto"
                    />

                    <p
                        aria-hidden
                        className={cn(
                            'hero-chip pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap text-bone glass-thin transition-opacity duration-700 ease-glass',
                            touched && 'opacity-0',
                        )}
                    >
                        {t('hero.dragLens')}
                    </p>

                    {/* The arrows show the lens's physical travel: left to
                        right in both languages. */}
                    <div
                        role="slider"
                        dir="ltr"
                        tabIndex={0}
                        aria-label={t('hero.moveLens')}
                        aria-orientation="horizontal"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(lens * 100)}
                        onKeyDown={onKeyDown}
                        className="absolute bottom-0 left-1/2 flex h-9 w-[4.5rem] -translate-x-1/2 translate-y-1/2 items-center justify-center gap-1.5 rounded-full text-bone glass-thin transition-[background-color,box-shadow] duration-[380ms] ease-glass group-hover/lens:bg-white/[0.18] focus-visible:ring-2 focus-visible:ring-mint/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
                    >
                        <ChevronLeft aria-hidden className="size-4" />
                        <span aria-hidden className="h-3.5 w-px bg-white/30" />
                        <ChevronRight aria-hidden className="size-4" />
                    </div>
                </div>

                {/* Magazine caption, set in the outer margin, rule at the
                    foot. The rule's side is physical (dir="ltr"); the words
                    keep the page's direction. */}
                <p
                    dir="ltr"
                    className="hero-caption absolute hidden items-center gap-4 text-kicker font-medium text-mist uppercase [writing-mode:vertical-rl] lg:flex lg:rotate-180"
                >
                    <span aria-hidden className="h-14 w-px bg-white/35" />
                    <span dir={isRtl ? 'rtl' : 'ltr'}>
                        <span className="text-bone">
                            {t('hero.look', { number: LOOK.number })}
                        </span>
                        <span aria-hidden className="mx-2.5 text-white/35">
                            /
                        </span>
                        {t('hero.garment')}
                    </span>
                </p>
            </div>
        </section>
    );
}

function HeadlinePanel() {
    const order = useOrderDialog();
    const kicker = useContent('hero.kicker');
    const title = useContent('hero.title');
    const lede = useContent('hero.lede');
    const primary = useContent('hero.cta_primary');
    const secondary = useContent('hero.cta_secondary');
    const points = [
        useContent('hero.point_1'),
        useContent('hero.point_2'),
        useContent('hero.point_3'),
    ].filter(Boolean);

    return (
        <div className="glass-rim pointer-events-auto relative w-full rounded-[32px] p-6 glass-strong sm:p-9 lg:w-[var(--panel)] lg:p-10">
            <Reveal delay={80}>
                <p className="text-kicker font-medium text-smoke uppercase">
                    {kicker}
                </p>
            </Reveal>

            <Reveal delay={160}>
                <h1
                    id="hero-title"
                    className="mt-6 font-display text-display-xl font-medium text-balance text-bone"
                >
                    <Accent text={title} className="font-normal text-mint" />
                </h1>
            </Reveal>

            <Reveal delay={240}>
                <p className="mt-6 max-w-[33rem] text-[17px] leading-relaxed text-pretty text-mist">
                    {lede}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <a
                        {...order.link({ source: 'hero' })}
                        className={cn(
                            cta({ variant: 'primary', size: 'lg' }),
                            'group/cta',
                        )}
                    >
                        {primary}
                        <ArrowRight
                            aria-hidden
                            className="size-4 transition-transform duration-[380ms] ease-glass group-hover/cta:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/cta:-translate-x-0.5"
                        />
                    </a>
                    <a
                        href="#how-it-works"
                        className={cta({ variant: 'glass', size: 'lg' })}
                    >
                        <Play aria-hidden className="size-4" />
                        {secondary}
                    </a>
                </div>

                {points.length ? (
                    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-smoke">
                        {points.map((point) => (
                            <li key={point} className="whitespace-nowrap">
                                {point}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </Reveal>
        </div>
    );
}

/** "10,284 try-ons today", ticking up while the page is open. */
function LiveBadge({ className }: { className?: string }) {
    const { t, formatNumber } = useI18n();
    const { stats } = useLanding();
    const [count, setCount] = useState(stats.tryOnsToday);

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
                'hero-chip flex items-center rounded-[14px] px-3.5 py-2 whitespace-nowrap glass-thin',
                className,
            )}
        >
            <span className="flex flex-col">
                <span className="text-[13px] leading-snug text-bone">
                    <span className="font-medium tabular-nums">
                        {formatNumber(count)}
                    </span>{' '}
                    {t('hero.tryOnsToday')}
                </span>
                <span className="text-[11px] leading-snug text-smoke">
                    {t('hero.reach', {
                        stores: stats.stores,
                        countries: stats.countries,
                    })}
                </span>
            </span>
        </div>
    );
}

/** Landmarks, shoulder width and centre-front length, per model. */
function BodyMap() {
    const { t } = useI18n();
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
                            className="stroke-mint"
                        />
                        <line
                            x1={x(figure.length.x)}
                            y1={y(figure.length.from)}
                            x2={x(figure.length.x)}
                            y2={y(figure.length.to)}
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={1}
                            strokeDasharray="4 5"
                            className="stroke-mint"
                        />
                    </g>
                ))}
            </svg>

            {FIGURES.map((figure) => (
                <div key={figure.key}>
                    {figure.joints.map((joint) => (
                        <span
                            key={joint.join()}
                            className="absolute size-[7px] -translate-1/2 rounded-full border border-mint bg-ink/70"
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
                            className="absolute h-2.5 w-px -translate-1/2 bg-mint"
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
                            className="absolute h-px w-2.5 -translate-1/2 bg-mint"
                            style={at(tick)}
                        />
                    ))}
                    {figure.labels.map((label) => (
                        <span
                            key={label.kind}
                            data-lens-label
                            className={cn(
                                'absolute hidden -translate-y-1/2 rounded-[6px] bg-ink/60 px-1.5 py-0.5 text-[10px] leading-4 font-medium tracking-[0.14em] whitespace-nowrap text-mint uppercase tabular-nums transition-opacity duration-300 ease-glass lg:block',
                                label.align === 'end' && '-translate-x-full',
                            )}
                            style={at(label.at)}
                        >
                            {t(
                                label.kind === 'width'
                                    ? 'hero.width'
                                    : 'hero.length',
                                { cm: label.cm },
                            )}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
