import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { IMAGES } from '../images';
import type { ImageRef } from '../images';
import { Photo } from '../photo';
import { Container, cta, Glow, Reveal, SectionHeader } from '../primitives';

// Placeholder content: replace before launch. -----------------------------
// The people, stores and figures below are fictional.

type Story = {
    id: string;
    name: string;
    role: string;
    store: string;
    city: string;
    /** Printed on the portrait like a lookbook caption. */
    coords: string;
    photo: ImageRef;
    /** Focal zoom for the featured 4:5 crop (1 = none). */
    zoom: number;
    /** Face position and zoom for the 48px avatar crop. */
    avatar: { focus: [number, number]; zoom: number };
    /** The quote in three parts; `accent` is the phrase set in champagne. */
    quote: { before: string; accent: string; after: string };
    metric: { figure: string; label: string; note: string; short: string };
};

const STORIES: Story[] = [
    {
        id: 'noura',
        name: 'Noura Al-Harbi',
        role: 'Founder',
        store: 'Rimal Abayas',
        city: 'Riyadh',
        coords: '24.71° N · 46.68° E',
        photo: IMAGES.testimonials.noura,
        zoom: 1.35,
        avatar: { focus: [0.47, 0.4], zoom: 2.6 },
        quote: {
            before: 'Our customers used to order the same abaya in three sizes and send two back. Now they try it on first. Returns on abayas ',
            accent: 'fell by a third',
            after: ' in one season.',
        },
        metric: {
            figure: '−33%',
            label: 'Abaya returns',
            note: 'in one season',
            short: 'returns',
        },
    },
    {
        id: 'khalid',
        name: 'Khalid Mansour',
        role: 'Head of E-commerce',
        store: 'Layan Optics',
        city: 'Dubai',
        coords: '25.20° N · 55.27° E',
        photo: IMAGES.testimonials.khalid,
        zoom: 1.1,
        avatar: { focus: [0.45, 0.25], zoom: 3 },
        quote: {
            before: 'We put the kiosk next to the frame wall. People who would have tried three frames now ',
            accent: 'try twenty',
            after: ', and they leave with a photo to show their family.',
        },
        metric: {
            figure: '×6',
            label: 'Frames tried per visit',
            note: 'at the frame wall',
            short: 'frames tried',
        },
    },
    {
        id: 'maryam',
        name: 'Maryam Al-Kuwari',
        role: 'Store Manager',
        store: 'Qasr Atelier',
        city: 'Doha',
        coords: '25.29° N · 51.53° E',
        photo: IMAGES.testimonials.maryam,
        zoom: 1,
        avatar: { focus: [0.53, 0.33], zoom: 2.2 },
        quote: {
            before: 'It speaks Arabic properly, ',
            accent: 'right to left',
            after: ', not a translation bolted on. That alone won over our older clients.',
        },
        metric: {
            figure: '71%',
            label: 'Kiosk sessions in Arabic',
            note: 'first quarter',
            short: 'in Arabic',
        },
    },
    {
        id: 'faisal',
        name: 'Faisal Al-Rashidi',
        role: 'Owner',
        store: 'Dune & Co.',
        city: 'Muscat',
        coords: '23.59° N · 58.38° E',
        photo: IMAGES.testimonials.faisal,
        zoom: 1.1,
        avatar: { focus: [0.52, 0.36], zoom: 2.5 },
        quote: {
            before: 'Installation took an afternoon. By the weekend the kiosk was ',
            accent: 'the busiest corner of the shop',
            after: '.',
        },
        metric: {
            figure: '+24%',
            label: 'Conversion on tried items',
            note: 'first month',
            short: 'conversion',
        },
    },
];

// --------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

const plainQuote = ({ quote }: Story) =>
    `${quote.before}${quote.accent}${quote.after}`;

export default function Testimonials() {
    const [active, setActive] = useState(0);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const swipe = useRef<{ x: number; y: number } | null>(null);
    const uid = useId();
    const panelId = `${uid}-panel`;
    const count = STORIES.length;

    const select = (index: number, focusTab = false) => {
        const next = (index + count) % count;
        setActive(next);

        if (focusTab) {
            tabs.current[next]?.focus();
        }
    };

    const onTabKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ) => {
        const target: Record<string, number> = {
            ArrowRight: index + 1,
            ArrowDown: index + 1,
            ArrowLeft: index - 1,
            ArrowUp: index - 1,
            Home: 0,
            End: count - 1,
        };

        if (event.key in target) {
            event.preventDefault();
            select(target[event.key], true);
        }
    };

    // Swipe the portrait to move between stories on touch screens.
    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        swipe.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const start = swipe.current;
        swipe.current = null;

        if (!start) {
            return;
        }

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            select(active + (dx < 0 ? 1 : -1));
        }
    };

    const story = STORIES[active];

    return (
        <section id="stories" className="relative isolate py-24 md:py-36">
            <Glow
                color="amethyst"
                className="top-[38%] -right-56 size-[34rem] opacity-35"
            />
            <Glow
                color="lagoon"
                className="bottom-[6%] -left-40 size-[26rem] opacity-25"
            />

            <Container>
                <SectionHeader
                    index="05"
                    label="Stories"
                    labelAr="قصص عملائنا"
                    title={
                        <>
                            Store owners, <em>in their own words.</em>
                        </>
                    }
                    lede={`An abaya house in Riyadh, an optician in Dubai, an atelier in Doha and an outfitter in Muscat, on their first season with ${BRAND.name}.`}
                />

                <div className="mt-14 grid md:mt-24 lg:grid-cols-12 lg:gap-x-8">
                    {/* Featured story: the glass stays put, the portrait behind it changes. */}
                    <Reveal className="lg:col-span-7">
                        <div
                            id={panelId}
                            role="tabpanel"
                            aria-labelledby={`${uid}-tab-${active}`}
                            className="relative"
                        >
                            <div
                                onPointerDown={onPointerDown}
                                onPointerUp={onPointerUp}
                                onPointerCancel={() => {
                                    swipe.current = null;
                                }}
                                className="relative aspect-[4/5] touch-pan-y overflow-hidden rounded-[28px] bg-ink-raised md:w-[72%] lg:w-[68%]"
                            >
                                {STORIES.map((item, index) => (
                                    <Photo
                                        key={item.id}
                                        id={item.photo.id}
                                        alt={item.photo.alt}
                                        aria-hidden={index !== active}
                                        draggable={false}
                                        ratio={1.25}
                                        focus={item.photo.focus}
                                        zoom={item.zoom}
                                        widths={[480, 800, 1200]}
                                        sizes="(min-width: 1320px) 480px, (min-width: 1024px) 37vw, (min-width: 768px) 72vw, 100vw"
                                        className={cn(
                                            'absolute inset-0 size-full transition-[opacity,scale] duration-[700ms] ease-glass select-none',
                                            index === active
                                                ? 'scale-100 opacity-100'
                                                : 'scale-[1.04] opacity-0',
                                        )}
                                    />
                                ))}
                                <div
                                    aria-hidden
                                    className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink/85 via-ink/35 to-transparent"
                                />

                                <div className="absolute top-4 left-4 grid rounded-[14px] px-3.5 py-2.5 glass-strong md:top-5 md:left-5">
                                    {STORIES.map((item, index) => (
                                        <p
                                            key={item.id}
                                            aria-hidden={index !== active}
                                            className={cn(
                                                'flex flex-col gap-1 transition-opacity duration-500 ease-glass [grid-area:1/1]',
                                                index === active
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        >
                                            <span className="text-[10px] leading-none font-medium tracking-[0.28em] text-bone uppercase">
                                                {item.city}
                                            </span>
                                            <span className="text-[11px] leading-none text-smoke tabular-nums">
                                                {item.coords}
                                            </span>
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-rim relative mx-3 -mt-16 rounded-[28px] px-6 pt-12 pb-6 glass-strong sm:mx-6 sm:px-8 sm:pb-8 md:mx-0 md:-mt-44 md:ml-[22%] lg:-mt-48 lg:ml-[20%] lg:px-11 lg:pt-14 lg:pb-9 xl:-mr-16">
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute -top-7 left-5 font-display text-[6.5rem] leading-none text-champagne select-none sm:left-7 lg:-top-9 lg:left-10 lg:text-[8rem]"
                                >
                                    “
                                </span>

                                <div className="grid">
                                    {STORIES.map((item, index) => (
                                        <figure
                                            key={item.id}
                                            inert={index !== active}
                                            aria-hidden={index !== active}
                                            className={cn(
                                                'flex flex-col transition-[opacity,translate] ease-glass [grid-area:1/1]',
                                                // Out first, then in: two quotes never overlap mid-fade.
                                                index === active
                                                    ? 'translate-y-0 opacity-100 delay-200 duration-500'
                                                    : 'translate-y-1.5 opacity-0 duration-200',
                                            )}
                                        >
                                            <blockquote
                                                className={cn(
                                                    'font-display font-normal text-pretty text-bone italic',
                                                    // Short quotes are set a size up so every one fills the same mirror.
                                                    plainQuote(item).length >
                                                        100
                                                        ? 'text-display-md max-sm:text-[1.625rem]'
                                                        : 'text-[clamp(1.875rem,1.1rem+2.2vw,2.875rem)] leading-[1.1] tracking-[-0.015em]',
                                                )}
                                            >
                                                <p>
                                                    {item.quote.before}
                                                    <em className="text-champagne not-italic">
                                                        {item.quote.accent}
                                                    </em>
                                                    {item.quote.after}
                                                </p>
                                            </blockquote>

                                            <figcaption className="mt-auto flex flex-col items-start gap-5 pt-8 xl:flex-row xl:items-end xl:justify-between">
                                                <span className="flex flex-col gap-1 border-l border-champagne/40 pl-4">
                                                    <span className="text-[17px] leading-snug font-medium text-bone">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-sm leading-snug text-mist">
                                                        {item.role}
                                                    </span>
                                                    <span className="text-sm leading-snug text-smoke">
                                                        {item.store},{' '}
                                                        {item.city}
                                                    </span>
                                                </span>
                                                <span className="inline-flex items-center gap-3 rounded-[14px] py-2.5 pr-4 pl-3.5 glass-thin">
                                                    <span className="font-display text-[1.625rem] leading-none font-medium text-champagne tabular-nums">
                                                        {item.metric.figure}
                                                    </span>
                                                    <span className="flex flex-col gap-0.5">
                                                        <span className="text-[13px] leading-tight text-bone">
                                                            {item.metric.label}
                                                        </span>
                                                        <span className="text-xs leading-tight text-smoke">
                                                            {item.metric.note}
                                                        </span>
                                                    </span>
                                                </span>
                                            </figcaption>
                                        </figure>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* The index: every story, the current one marked. */}
                    <Reveal
                        delay={120}
                        className="mt-12 flex flex-col lg:col-span-5 lg:col-start-8 lg:mt-0 lg:justify-end xl:col-span-4 xl:col-start-9"
                    >
                        <div className="flex items-center justify-between border-t border-white/10 pt-5">
                            <p className="font-display text-[1.75rem] leading-none font-medium text-bone tabular-nums">
                                <span className="sr-only" aria-live="polite">
                                    Story {active + 1} of {count}: {story.name}
                                </span>
                                <span aria-hidden>
                                    {pad(active + 1)}
                                    <span className="text-smoke">
                                        {' '}
                                        / {pad(count)}
                                    </span>
                                </span>
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    aria-label="Previous story"
                                    aria-controls={panelId}
                                    onClick={() => select(active - 1)}
                                    className={cn(
                                        cta({ variant: 'glass', size: 'sm' }),
                                        'size-11 px-0',
                                    )}
                                >
                                    <ArrowLeft aria-hidden className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next story"
                                    aria-controls={panelId}
                                    onClick={() => select(active + 1)}
                                    className={cn(
                                        cta({ variant: 'glass', size: 'sm' }),
                                        'size-11 px-0',
                                    )}
                                >
                                    <ArrowRight
                                        aria-hidden
                                        className="size-4"
                                    />
                                </button>
                            </div>
                        </div>

                        <div
                            role="tablist"
                            aria-label="Retailer stories"
                            style={
                                {
                                    '--i': active,
                                    '--n': count,
                                } as CSSProperties
                            }
                            className="relative mt-5 grid auto-rows-fr divide-y divide-white/10"
                        >
                            {/* One glass pane glides to the selected row, like the mirror moving. */}
                            <span
                                aria-hidden
                                className="glass-rim pointer-events-none absolute inset-x-0 top-0 h-[calc(100%/var(--n))] translate-y-[calc(var(--i)*100%)] rounded-[22px] ring-1 glass-strong ring-champagne/45 transition-transform duration-[560ms] ease-glass"
                            />
                            {STORIES.map((item, index) => {
                                const selected = index === active;

                                return (
                                    <button
                                        key={item.id}
                                        ref={(node) => {
                                            tabs.current[index] = node;
                                        }}
                                        id={`${uid}-tab-${index}`}
                                        type="button"
                                        role="tab"
                                        aria-label={`${item.name}, ${item.store}, ${item.city}: ${item.metric.label} ${item.metric.figure}`}
                                        aria-selected={selected}
                                        aria-controls={panelId}
                                        tabIndex={selected ? 0 : -1}
                                        onClick={() => select(index)}
                                        onKeyDown={(event) =>
                                            onTabKeyDown(event, index)
                                        }
                                        className={cn(
                                            'group/tab relative grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-[22px] px-4 py-4 text-left transition-colors duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-champagne/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none md:px-5 md:py-5 xl:py-6',
                                            !selected &&
                                                'hover:bg-white/[0.04]',
                                        )}
                                    >
                                        <Photo
                                            id={item.photo.id}
                                            alt=""
                                            ratio={1}
                                            focus={item.avatar.focus}
                                            zoom={item.avatar.zoom}
                                            widths={[96, 160]}
                                            sizes="48px"
                                            className={cn(
                                                'size-12 rounded-[14px] ring-1 ring-white/15 transition-[filter,opacity] duration-500 ease-glass',
                                                !selected &&
                                                    'opacity-75 grayscale group-hover/tab:opacity-100 group-hover/tab:grayscale-0',
                                            )}
                                        />
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <span
                                                className={cn(
                                                    'truncate text-[15px] font-medium transition-colors duration-[380ms] ease-glass',
                                                    selected
                                                        ? 'text-bone'
                                                        : 'text-mist group-hover/tab:text-bone',
                                                )}
                                            >
                                                {item.name}
                                            </span>
                                            <span className="truncate text-[13px] text-smoke">
                                                {item.store} · {item.city}
                                            </span>
                                        </span>
                                        <span className="flex flex-col items-end gap-1.5">
                                            <span
                                                className={cn(
                                                    'font-display text-2xl leading-none font-medium tabular-nums transition-colors duration-[380ms] ease-glass',
                                                    selected
                                                        ? 'text-champagne'
                                                        : 'text-bone/75',
                                                )}
                                            >
                                                {item.metric.figure}
                                            </span>
                                            <span className="text-[10px] leading-none tracking-[0.18em] text-smoke uppercase">
                                                {item.metric.short}
                                            </span>
                                        </span>
                                        <span className="col-span-3 mt-3.5 hidden font-display text-[15px] leading-snug text-mist italic md:line-clamp-2">
                                            {plainQuote(item)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-6 text-[13px] leading-relaxed text-pretty text-smoke">
                            Figures reported by each retailer for their first
                            season on {BRAND.name}.
                        </p>
                    </Reveal>
                </div>
            </Container>
        </section>
    );
}
