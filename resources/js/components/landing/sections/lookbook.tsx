import { ArrowRight, Plus } from 'lucide-react';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { IMAGES } from '../images';
import type { LookbookCategory, LookbookImage } from '../images';
import { Photo } from '../photo';
import { Container, cta, Glow, SectionHeader, useInView } from '../primitives';
import { ScanOverlay } from '../tryon-ui';

// Placeholder content: replace before launch. -----------------------------

type Filter = 'all' | LookbookCategory;

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'abayas', label: 'Abayas' },
    { id: 'everyday', label: 'Everyday' },
    { id: 'evening', label: 'Evening' },
    { id: 'eyewear', label: 'Eyewear' },
];

/** The weekly trend note that opens the grid for each filter. */
const NOTES: Record<
    Filter,
    { kicker: string; figure: string; unit: string; line: string }
> = {
    all: {
        kicker: 'This week’s edit',
        figure: String(IMAGES.lookbook.length),
        unit: 'looks',
        line: 'Chosen from 71,400 try-ons across eight cities, from Riyadh to Muscat.',
    },
    abayas: {
        kicker: 'Abayas · this week',
        figure: '54',
        unit: 'most tried size',
        line: 'Sizes run 52 to 60. Navy and black satin led the week in Riyadh and Jeddah.',
    },
    everyday: {
        kicker: 'Everyday · this week',
        figure: '38%',
        unit: 'went into the bag',
        line: 'The best-converting edit of the week: a denim jacket, a camel coat, a navy suit.',
    },
    evening: {
        kicker: 'Evening · this week',
        figure: '11 pm',
        unit: 'peak try-on hour',
        line: 'Occasion wear is tried on late, and most of all in the fortnight before Eid.',
    },
    eyewear: {
        kicker: 'Eyewear · this week',
        figure: '41%',
        unit: 'tortoiseshell',
        line: 'Share of all frames tried this week. Clear acetate is climbing in Jeddah.',
    },
};

/*
 * The edit, in display order, with each look's render time in seconds.
 * The first row mirrors the lede (Riyadh abaya, Dubai silk, Doha frames);
 * the rest is sequenced so the masonry columns end at similar heights and
 * no column stacks two menswear looks.
 */
const EDIT: [id: string, seconds: number][] = [
    ['photo-1762605135318-f34a993cbcf0', 1.7], // Quilted abaya, Riyadh
    ['photo-1546190075-ed60eaed45e4', 1.9], // Silk gown, Dubai
    ['photo-1618077360395-f3068be8e001', 1.6], // Round acetate, Doha
    ['photo-1551537482-f2075a1d41f2', 1.5], // Denim jacket, Manama
    ['photo-1609357605129-26f69add5d6e', 1.8], // Chiffon maxi, Muscat
    ['photo-1739829417987-28d43f9a6b49', 1.7], // Satin abaya, Jeddah
    ['photo-1618244972963-dbee1a7edc95', 1.8], // Camel coat, Kuwait City
    ['photo-1583391733956-3750e0ff4e8b', 1.9], // Kurta and sharara, Dubai
    ['photo-1617137968427-85924c800a22', 1.6], // Navy suit, Doha
    ['photo-1531384441138-2736e62e0919', 1.8], // Clear frames, Jeddah
    ['photo-1756412066366-b46dafaca253', 1.7], // Bisht, Riyadh
    ['photo-1552942362-50ecec295033', 1.6], // Cat-eye optical, Abu Dhabi
];

// -------------------------------------------------------------------------

type Look = LookbookImage & { number: string; seconds: number };

const editOrder = new Map(EDIT.map(([id], index) => [id, index]));

// Photos missing from EDIT still appear, after the curated ones.
const LOOKS: Look[] = [...IMAGES.lookbook]
    .sort(
        (a, b) =>
            (editOrder.get(a.id) ?? EDIT.length) -
            (editOrder.get(b.id) ?? EDIT.length),
    )
    .map((image, index) => ({
        ...image,
        number: String(index + 1).padStart(2, '0'),
        seconds: EDIT[editOrder.get(image.id) ?? -1]?.[1] ?? 1.8,
    }));

/** On phones the "All" edit opens with this many looks, then a button. */
const MOBILE_PREVIEW = 5;

/** Fade-out time before the grid swaps its contents on a filter change. */
const OUT_MS = 260;

/*
 * Column count follows the Tailwind breakpoints (1 < sm, 2, 3 at lg,
 * 4 at xl). The masonry is laid out in JS rather than with CSS columns so
 * the columns can start at staggered heights and so a filter change never
 * reshuffles cards sideways mid-transition.
 */
const COLUMN_QUERIES = [
    [4, '(min-width: 80rem)'],
    [3, '(min-width: 64rem)'],
    [2, '(min-width: 40rem)'],
] as const;

function subscribeColumns(onChange: () => void) {
    const lists = COLUMN_QUERIES.map(([, query]) => window.matchMedia(query));
    lists.forEach((list) => list.addEventListener('change', onChange));

    return () =>
        lists.forEach((list) => list.removeEventListener('change', onChange));
}

function getColumns() {
    return (
        COLUMN_QUERIES.find(
            ([, query]) => window.matchMedia(query).matches,
        )?.[0] ?? 1
    );
}

function useColumns() {
    return useSyncExternalStore(subscribeColumns, getColumns, () => 1);
}

/*
 * Where each column starts, as a fraction of the column width. Columns sit
 * on the trend note's hairline, except the third, which drops to the top
 * of the note's big figure: one deliberate break in the line.
 */
const COLUMN_OFFSETS: Record<number, number[]> = {
    1: [0],
    2: [0, 0],
    3: [0, 0, 0.22],
    4: [0, 0, 0.22, 0],
};

type Tile =
    | { kind: 'note' }
    | { kind: 'slot' }
    | { kind: 'look'; look: Look; order: number };

/** Estimated tile heights, in column widths, for balancing the columns. */
const NOTE_HEIGHT = 0.93;
const SLOT_HEIGHT = 0.9;
const GAP_HEIGHT = 0.07;

/**
 * Deal the tiles into columns: the first row left to right (so short
 * edits fill from the left), then each tile to the shortest column. If
 * that leaves a hole deep enough, the open "next look" slot fills it.
 */
function layout(tiles: Tile[], columns: number): Tile[][] {
    const offsets = COLUMN_OFFSETS[columns] ?? [];
    const stacks: Tile[][] = Array.from({ length: columns }, () => []);
    const heights = Array.from(
        { length: columns },
        (_, index) => offsets[index] ?? 0,
    );
    const shortest = () => heights.indexOf(Math.min(...heights));

    tiles.forEach((tile, index) => {
        const target = index < columns ? index : shortest();

        stacks[target].push(tile);
        heights[target] +=
            (tile.kind === 'look' ? 1 / tile.look.aspect : NOTE_HEIGHT) +
            GAP_HEIGHT;
    });

    if (
        columns > 1 &&
        Math.max(...heights) - Math.min(...heights) >= SLOT_HEIGHT * 0.8
    ) {
        stacks[shortest()].push({ kind: 'slot' });
    }

    return stacks;
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Lookbook() {
    const columns = useColumns();
    const [active, setActive] = useState<Filter>('all');
    const [shown, setShown] = useState<Filter>('all');
    const [leaving, setLeaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [demo, setDemo] = useState(false);
    const timers = useRef<number[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);
    const [gridRef, gridInView] = useInView({
        rootMargin: '0px 0px -35% 0px',
    });

    useEffect(() => {
        const pending = timers.current;

        return () => pending.forEach((timer) => window.clearTimeout(timer));
    }, []);

    // Once the grid is in view, the first look demonstrates the reveal.
    useEffect(() => {
        if (!gridInView || prefersReducedMotion()) {
            return;
        }

        const open = window.setTimeout(() => setDemo(true), 700);
        const close = window.setTimeout(() => setDemo(false), 3300);

        return () => {
            window.clearTimeout(open);
            window.clearTimeout(close);
        };
    }, [gridInView]);

    const select = (next: Filter) => {
        if (next === active) {
            return;
        }

        setActive(next);
        setDemo(false);
        // Mutate in place: the unmount cleanup holds this same array.
        timers.current.splice(0).forEach((timer) => window.clearTimeout(timer));

        if (prefersReducedMotion()) {
            setShown(next);

            return;
        }

        setLeaving(true);
        timers.current.push(
            window.setTimeout(() => {
                setShown(next);
                timers.current.push(
                    window.setTimeout(() => setLeaving(false), 40),
                );
            }, OUT_MS),
        );
    };

    const matching =
        shown === 'all'
            ? LOOKS
            : LOOKS.filter((look) => look.category === shown);
    const collapsed =
        columns === 1 &&
        shown === 'all' &&
        !expanded &&
        matching.length > MOBILE_PREVIEW;
    const visible = collapsed ? matching.slice(0, MOBILE_PREVIEW) : matching;
    const tiles: Tile[] = [
        { kind: 'note' },
        ...visible.map((look, order) => ({
            kind: 'look' as const,
            look,
            order,
        })),
    ];
    const stacks = layout(tiles, columns);
    const offsets = COLUMN_OFFSETS[columns] ?? [];
    const activeLabel = FILTERS.find((filter) => filter.id === active)?.label;
    const activeCount = LOOKS.filter(
        (look) => active === 'all' || look.category === active,
    ).length;

    // Reveal the rest of the edit and move focus to the first new look.
    const showAll = () => {
        setExpanded(true);
        timers.current.push(
            window.setTimeout(() => {
                panelRef.current
                    ?.querySelector<HTMLButtonElement>(
                        `[data-look-order="${MOBILE_PREVIEW}"] button`,
                    )
                    ?.focus({ preventScroll: true });
            }, 60),
        );
    };

    return (
        <section id="lookbook" className="relative isolate py-24 md:py-36">
            <Glow color="rose" className="top-[26rem] -left-48 size-[32rem]" />
            <Glow
                color="coral"
                className="-right-48 bottom-[18%] size-[30rem] opacity-25"
            />

            <Container>
                <SectionHeader
                    index="04"
                    label="Lookbook"
                    labelAr="معرض الإطلالات"
                    title={
                        <>
                            Looks our shoppers <em>tried on</em> this week.
                        </>
                    }
                    lede="Abayas in Riyadh, silk in Dubai, frames in Doha. A few of the ten thousand looks tried on today."
                />

                <div className="mt-14 grid gap-5 md:mt-20 md:grid-cols-12 md:items-center md:gap-x-8">
                    <FilterTabs
                        active={active}
                        onSelect={select}
                        className="md:col-span-7 lg:col-span-8"
                    />
                    <p className="flex items-center gap-3 text-[13px] leading-snug text-smoke md:col-span-5 lg:col-span-4">
                        <CompareGlyph />
                        <span className="pointer-coarse:hidden">
                            Hover a look for before and after.
                        </span>
                        <span className="hidden pointer-coarse:inline">
                            Tap a look for before and after.
                        </span>
                    </p>
                </div>

                <p aria-live="polite" className="sr-only">
                    {active === 'all'
                        ? `Showing all ${activeCount} looks`
                        : `Showing ${activeCount} ${activeLabel?.toLowerCase()} looks`}
                </p>

                <div
                    ref={(node) => {
                        panelRef.current = node;
                        gridRef(node);
                    }}
                    id="lookbook-panel"
                    role="tabpanel"
                    aria-labelledby={`lookbook-tab-${active}`}
                    className="mt-10 flex items-start gap-4 md:mt-12 lg:gap-5"
                >
                    {stacks.map((stack, column) => (
                        <div key={column} className="min-w-0 flex-1">
                            {/* Percentage padding resolves against this column's width. */}
                            <div
                                className="flex flex-col gap-4 lg:gap-5"
                                style={{
                                    paddingTop: `${(offsets[column] ?? 0) * 100}%`,
                                }}
                            >
                                {stack.map((tile, row) => {
                                    if (tile.kind === 'note') {
                                        return (
                                            <TrendNote
                                                key={`note-${shown}`}
                                                filter={shown}
                                                leaving={leaving}
                                            />
                                        );
                                    }

                                    if (tile.kind === 'slot') {
                                        return (
                                            <OpenSlot
                                                key={`slot-${shown}`}
                                                leaving={leaving}
                                            />
                                        );
                                    }

                                    return (
                                        <LookCard
                                            key={tile.look.id}
                                            look={tile.look}
                                            order={tile.order}
                                            delay={column * 90 + row * 60}
                                            leaving={leaving}
                                            demo={demo && tile.order === 0}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {collapsed ? (
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={showAll}
                            aria-controls="lookbook-panel"
                            aria-expanded={false}
                            className={cn(
                                cta({ variant: 'glass', size: 'md' }),
                                'w-full',
                            )}
                        >
                            <Plus aria-hidden className="size-4" />
                            Show {matching.length - MOBILE_PREVIEW} more looks
                        </button>
                    </div>
                ) : null}

                <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-smoke md:mt-20 md:flex-row md:items-baseline md:justify-between md:gap-8">
                    <p>
                        Photos shown with permission. Try-on renders are
                        generated in under two seconds.
                    </p>
                    <p className="shrink-0">New edit every Sunday</p>
                </div>
            </Container>
        </section>
    );
}

/**
 * Glass segmented control. The champagne indicator is a second copy of the
 * labels, set in ink and clipped to the selected tab, so the text changes
 * colour exactly where the indicator passes over it.
 */
function FilterTabs({
    active,
    onSelect,
    className,
}: {
    active: Filter;
    onSelect: (filter: Filter) => void;
    className?: string;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const activeIndex = FILTERS.findIndex((filter) => filter.id === active);

    useLayoutEffect(() => {
        const track = trackRef.current;
        const indicator = indicatorRef.current;

        if (!track || !indicator) {
            return;
        }

        const place = () => {
            const tab = tabRefs.current[activeIndex];

            if (!tab) {
                return;
            }

            const left = tab.offsetLeft;
            const right = track.offsetWidth - left - tab.offsetWidth;
            indicator.style.clipPath = `inset(0 ${right}px 0 ${left}px round 14px)`;
        };

        place();
        const observer = new ResizeObserver(place);
        observer.observe(track);

        return () => observer.disconnect();
    }, [activeIndex]);

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const last = FILTERS.length - 1;
        const moves: Record<string, number> = {
            ArrowRight: activeIndex === last ? 0 : activeIndex + 1,
            ArrowLeft: activeIndex === 0 ? last : activeIndex - 1,
            Home: 0,
            End: last,
        };
        const next = moves[event.key];

        if (next === undefined) {
            return;
        }

        event.preventDefault();
        tabRefs.current[next]?.focus();
        onSelect(FILTERS[next].id);
    };

    return (
        <div className={cn('min-w-0', className)}>
            <div className="glass-rim flex max-w-full [scrollbar-width:none] overflow-x-auto rounded-[20px] p-1 glass has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-champagne/70 sm:inline-flex [&::-webkit-scrollbar]:hidden">
                <div
                    ref={trackRef}
                    role="tablist"
                    aria-label="Filter looks"
                    className="relative flex flex-auto shrink-0 sm:flex-none"
                >
                    {FILTERS.map((filter, index) => {
                        const selected = filter.id === active;

                        return (
                            <button
                                key={filter.id}
                                ref={(node) => {
                                    tabRefs.current[index] = node;
                                }}
                                type="button"
                                role="tab"
                                id={`lookbook-tab-${filter.id}`}
                                aria-selected={selected}
                                aria-controls="lookbook-panel"
                                tabIndex={selected ? 0 : -1}
                                onClick={() => onSelect(filter.id)}
                                onKeyDown={onKeyDown}
                                className={cn(
                                    'h-10 flex-auto cursor-pointer rounded-[14px] px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 ease-glass focus-visible:outline-none sm:flex-none sm:px-5 sm:text-sm',
                                    selected
                                        ? 'text-bone'
                                        : 'text-mist hover:text-bone',
                                )}
                            >
                                {filter.label}
                            </button>
                        );
                    })}
                    <div
                        ref={indicatorRef}
                        aria-hidden
                        className="pointer-events-none absolute inset-0 flex bg-champagne shadow-[inset_0_1px_0_oklch(1_0_0/0.55)] transition-[clip-path] duration-500 ease-glass [clip-path:inset(0_100%_0_0_round_14px)]"
                    >
                        {FILTERS.map((filter) => (
                            <span
                                key={filter.id}
                                className="grid h-10 flex-auto place-items-center px-2.5 text-[13px] font-medium whitespace-nowrap text-ink sm:flex-none sm:px-5 sm:text-sm"
                            >
                                {filter.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Editorial text block at the head of the grid: this week's trend. */
function TrendNote({ filter, leaving }: { filter: Filter; leaving: boolean }) {
    const note = NOTES[filter];
    const [ref, inView] = useInView();
    const shown = inView && !leaving;

    return (
        <div
            ref={ref}
            className={cn(
                'grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-white/15 pt-4 pb-6 transition-[opacity,translate] ease-glass sm:block',
                shown
                    ? 'translate-y-0 opacity-100 duration-700'
                    : 'translate-y-3 opacity-0 duration-[260ms]',
            )}
        >
            <p className="col-span-2 text-kicker font-medium text-mist uppercase">
                {note.kicker}
            </p>
            <p className="row-span-2 mt-5 font-display text-[3.25rem] leading-[0.9] font-medium tracking-[-0.03em] text-bone sm:mt-7 sm:text-[4.25rem]">
                {note.figure}
            </p>
            <p className="mt-5 font-display text-xl leading-tight text-champagne italic sm:mt-2 sm:text-2xl">
                {note.unit}
            </p>
            <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-pretty text-mist sm:mt-5">
                {note.line}
            </p>
        </div>
    );
}

/**
 * The empty frame at the end of a short edit: look number thirteen,
 * reserved for the retailer reading this, with viewfinder brackets.
 */
function OpenSlot({ leaving }: { leaving: boolean }) {
    const [ref, inView] = useInView();
    const shown = inView && !leaving;

    return (
        <div
            ref={ref}
            className={cn(
                'relative flex aspect-[10/9] flex-col justify-between rounded-[24px] px-9 py-8 ring-1 ring-white/10 transition-[opacity,translate] ease-glass ring-inset',
                shown
                    ? 'translate-y-0 opacity-100 [transition-delay:240ms] duration-700'
                    : 'translate-y-3 opacity-0 duration-[260ms]',
            )}
        >
            {(
                [
                    'top-3.5 left-3.5 rounded-tl-[10px] border-t border-l',
                    'top-3.5 right-3.5 rounded-tr-[10px] border-t border-r',
                    'bottom-3.5 left-3.5 rounded-bl-[10px] border-b border-l',
                    'right-3.5 bottom-3.5 rounded-br-[10px] border-r border-b',
                ] as const
            ).map((corner) => (
                <span
                    key={corner}
                    aria-hidden
                    className={cn(
                        'absolute size-5 border-champagne/60',
                        corner,
                    )}
                />
            ))}
            <p className="text-kicker font-medium text-mist uppercase">
                Look {String(LOOKS.length + 1).padStart(2, '0')} · Your store
            </p>
            <div>
                <p className="font-display text-[1.625rem] leading-[1.15] font-medium text-balance text-bone">
                    Your pieces, on{' '}
                    <em className="font-normal text-champagne">your</em>{' '}
                    shoppers.
                </p>
                <a
                    href="#demo"
                    className="group/link mt-4 inline-flex items-center gap-2 rounded-[8px] text-sm font-medium text-champagne transition-colors duration-300 hover:text-bone focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none"
                >
                    Book a demo
                    <ArrowRight
                        aria-hidden
                        className="size-4 transition-transform duration-[380ms] ease-glass group-hover/link:translate-x-1"
                    />
                </a>
            </div>
        </div>
    );
}

// The reveal is driven by one custom property on the card (--r: 0 or 1);
// the pane and its counter-shifted photo copy both transition `transform`,
// so the grayscale copy stays pinned to the photo while the glass slides.
const paneStyle: CSSProperties = {
    transform: 'translateX(calc((var(--r) - 1) * 100%))',
};
const paneInnerStyle: CSSProperties = {
    transform: 'translateX(calc((1 - var(--r)) * 50%))',
};
const afterChipStyle: CSSProperties = {
    opacity: 'var(--r)',
    transitionDelay: 'calc(var(--r) * 280ms)',
};

function LookCard({
    look,
    order,
    delay,
    leaving,
    demo,
}: {
    look: Look;
    order: number;
    delay: number;
    leaving: boolean;
    demo: boolean;
}) {
    const [pressed, setPressed] = useState(false);
    const [ref, inView] = useInView();
    const shown = inView && !leaving;
    const sizes =
        '(min-width: 80rem) 300px, (min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 92vw';
    const photo = {
        id: look.id,
        widths: [360, 560, 760, 960],
        sizes,
        style: {
            objectPosition: `${look.focus[0] * 100}% ${look.focus[1] * 100}%`,
        },
        className: 'absolute inset-0 size-full',
    };

    return (
        <figure
            ref={ref}
            data-look-order={order}
            data-revealed={pressed || demo}
            className={cn(
                'group/look relative overflow-hidden rounded-[24px] bg-ink-raised transition-[opacity,translate,scale] ease-glass [--r:0] hover:[--r:1] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-champagne/70 has-[:focus-visible]:[--r:1] data-[revealed=true]:[--r:1]',
                shown
                    ? 'translate-y-0 scale-100 opacity-100 duration-700'
                    : 'translate-y-4 scale-[0.98] opacity-0 duration-[260ms]',
            )}
            style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
        >
            <div className="relative" style={{ aspectRatio: look.aspect }}>
                {/* After: the colour photo. */}
                <Photo {...photo} alt={look.alt} />

                {/* Before: a glass pane carrying the camera's view. */}
                <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1/2 overflow-hidden shadow-[18px_0_32px_-18px_oklch(0_0_0/0.7)] transition-transform duration-[750ms] ease-glass"
                    style={paneStyle}
                >
                    <div
                        className="absolute inset-y-0 left-0 w-[200%] transition-transform duration-[750ms] ease-glass"
                        style={paneInnerStyle}
                    >
                        <Photo
                            {...photo}
                            alt=""
                            className={cn(
                                photo.className,
                                'brightness-90 contrast-125 grayscale',
                            )}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(165deg,var(--color-amethyst),var(--color-lagoon))] opacity-55 mix-blend-color" />
                        <div className="absolute inset-0 bg-ink/15" />
                    </div>
                    {/* The scan frame sits between the chip and the caption. */}
                    <div className="absolute inset-x-0 top-11 bottom-[5.25rem]">
                        <ScanOverlay />
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(100deg,oklch(1_0_0/0.07),transparent_40%)] shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]" />
                    <div className="absolute inset-y-0 right-0 w-5 bg-[linear-gradient(to_left,oklch(1_0_0/0.28),transparent)]" />
                    <div className="absolute inset-y-0 right-0 w-px bg-white/70" />
                    <span className="absolute top-3 left-3 rounded-[10px] px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] text-bone uppercase glass-strong">
                        Before
                    </span>
                </div>

                <span
                    aria-hidden
                    className="absolute top-3 right-3 rounded-[10px] bg-champagne px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-opacity duration-500 ease-glass"
                    style={afterChipStyle}
                >
                    After
                </span>

                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(to_top,oklch(0.145_0.018_285/0.55),transparent)]"
                />
            </div>

            <figcaption className="pointer-events-none absolute inset-x-2.5 bottom-2.5 rounded-[16px] px-3.5 pt-2.5 pb-3 glass-strong">
                <span className="flex items-center justify-between gap-3 text-[10px] leading-4 font-medium tracking-[0.2em] text-smoke uppercase">
                    <span className="truncate">
                        Look {look.number} · {look.city}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 tracking-[0.06em] normal-case tabular-nums">
                        <span
                            aria-hidden
                            className="size-1 rounded-full bg-lagoon"
                        />
                        <span className="sr-only">Rendered in </span>
                        {look.seconds.toFixed(1)} s
                    </span>
                </span>
                <span className="mt-1 block font-display text-[17px] leading-snug font-medium text-bone">
                    {look.look}
                </span>
            </figcaption>

            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset"
            />

            <button
                type="button"
                aria-pressed={pressed}
                aria-label={`Before and after: look ${look.number}, ${look.look}, ${look.city}`}
                onClick={() => setPressed((value) => !value)}
                className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none"
            />
        </figure>
    );
}

/** Tiny before/after mark: a mirror, half scanned, half tried on. */
function CompareGlyph() {
    return (
        <svg
            viewBox="0 0 24 18"
            aria-hidden
            className="h-[18px] w-6 shrink-0"
            fill="none"
        >
            <rect
                x="0.5"
                y="0.5"
                width="23"
                height="17"
                rx="4.5"
                className="stroke-white/30"
            />
            <path
                d="M12 1h7.5A3.5 3.5 0 0 1 23 4.5v9a3.5 3.5 0 0 1-3.5 3.5H12z"
                className="fill-champagne/80"
            />
            <path
                d="M4.5 1v16M8.5 1v16M1 6h11M1 12h11"
                className="stroke-white/20"
                strokeWidth="0.75"
            />
        </svg>
    );
}
