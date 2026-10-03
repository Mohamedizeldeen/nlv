import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import type { LandingStory, MediaRef } from '@/types/landing';
import { Accent } from '../accent';
import { hasSection, useContent, useLanding } from '../landing-data';
import { Managed, englishRun } from '../managed';
import { messageParts } from '../message-parts';
import { Photo } from '../photo';
import {
    Container,
    cta,
    Glow,
    Reveal,
    SectionHeader,
    useInView,
} from '../primitives';

// The stories (people, stores, quotes, figures and portraits) come from the
// admin panel: `landing.stories`, published ones only, in their order.

const pad = (n: number) => String(n).padStart(2, '0');

const plainQuote = ({ quote }: LandingStory) =>
    `${quote.before}${quote.accent}${quote.after}`;

/**
 * A metric without letters ("+33%", "−45%", "×6") is isolated left to
 * right, so Arabic text doesn't move its sign to the other end.
 */
function Figure({ value }: { value: string }) {
    return /\p{L}/u.test(value) ? (
        value
    ) : (
        <span className="bidi-ltr">{value}</span>
    );
}

/** A figure with its degree sign, minutes and seconds: 24.71°, 51° 30′ 26″. */
const DEGREES = /([-−+]?\d[\d.,]*°(?:\s?\d[\d.,]*[′'](?:\s?\d[\d.,]*[″"])?)?)/;

/**
 * A story's coordinates. The Arabic page names the compass points in
 * Arabic ("24.71° شمالًا · 46.68° شرقًا"), and each figure is isolated
 * left to right: otherwise the bidi algorithm moves the second degree sign
 * to the other side of its figure ("°46.68"). Coordinates in another
 * format stay as the admin typed them (an English run on the Arabic page).
 */
function Coordinates({ value }: { value: string }) {
    if (!/\p{Script=Arabic}/u.test(value)) {
        return <Managed text={value} />;
    }

    return value.split(DEGREES).map((part, index) =>
        index % 2 ? (
            <span key={index} className="bidi-ltr">
                {part}
            </span>
        ) : (
            <Fragment key={index}>{part}</Fragment>
        ),
    );
}

/** The featured portrait's frame, width / height. */
const PORTRAIT_FRAME = 4 / 5;

/** A story and the two an arrow or a swipe reaches from it, wrapping round. */
const around = (index: number, count: number) => [
    (index + count - 1) % count,
    index,
    (index + 1) % count,
];

/**
 * The list's small avatar reuses the portrait's focal point, zoomed in
 * twice as far (as the admin's story preview shows it).
 */
const avatarZoom = (zoom: number) =>
    Math.min(4, Math.round(zoom * 2 * 100) / 100);

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

/**
 * The Unsplash CDN crops stock portraits around their focal point and zoom.
 * An upload is cropped the same way in CSS: sized to cover the frame, scaled
 * by `zoom` and shifted so the focal point sits mid-frame without showing
 * past the photo's edges. Undefined for stock photos, and for uploads whose
 * size is unknown (those fall back to object-position).
 */
function uploadCrop(
    media: MediaRef,
    frame: number,
    focus: [number, number],
    zoom: number,
): CSSProperties | undefined {
    if (media.kind !== 'upload' || !media.width || !media.height) {
        return undefined;
    }

    const aspect = media.width / media.height;
    const scale = Math.max(1, zoom);
    const width = (aspect > frame ? aspect / frame : 1) * scale;
    const height = (aspect > frame ? 1 : frame / aspect) * scale;

    return {
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        left: `${clamp(0.5 - focus[0] * width, 1 - width, 0) * 100}%`,
        top: `${clamp(0.5 - focus[1] * height, 1 - height, 0) * 100}%`,
        maxWidth: 'none',
    };
}

/** The 48px portrait in the story list. */
function Avatar({
    story,
    selected,
}: {
    story: LandingStory;
    selected: boolean;
}) {
    const zoom = avatarZoom(story.zoom);
    const tone = cn(
        'rounded-[14px] ring-1 ring-white/15 transition-[filter,opacity] duration-500 ease-glass',
        !selected &&
            'opacity-75 grayscale group-hover/tab:opacity-100 group-hover/tab:grayscale-0',
    );
    const crop = uploadCrop(story.portrait, 1, story.focus, zoom);

    if (crop) {
        // An upload is cropped in CSS, inside a frame of its own.
        return (
            <span className={cn('relative size-12 overflow-hidden', tone)}>
                <Photo
                    media={story.portrait}
                    alt=""
                    className="absolute"
                    style={crop}
                />
            </span>
        );
    }

    return (
        <Photo
            media={story.portrait}
            alt=""
            ratio={1}
            focus={story.focus}
            zoom={zoom}
            widths={[96, 160]}
            sizes="48px"
            className={cn('size-12', tone)}
        />
    );
}

export default function Testimonials() {
    const landing = useLanding();

    // Nothing published yet: no section (and no empty index).
    if (!hasSection(landing, 'stories')) {
        return null;
    }

    return <Stories stories={landing.stories} />;
}

function Stories({ stories }: { stories: LandingStory[] }) {
    const label = useContent('sections.stories.label');
    const title = useContent('sections.stories.title');
    const lede = useContent('sections.stories.lede');
    const footnote = useContent('sections.stories.footnote');
    const { isRtl, locale, t } = useI18n();
    // "Rimal Abayas, Riyadh": each value its own text node, as it was
    // typeset in JSX (Chromium shapes text nodes separately).
    const place = (story: LandingStory) =>
        messageParts(t, 'testimonials.place', {
            store: <Managed text={story.store} />,
            city: <Managed text={story.city} />,
        });
    const placeShort = (story: LandingStory) =>
        messageParts(t, 'testimonials.placeShort', {
            store: <Managed text={story.store} />,
            city: <Managed text={story.city} />,
        });
    const [chosen, setActive] = useState(0);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const swipe = useRef<{ x: number; y: number } | null>(null);
    const uid = useId();
    const panelId = `${uid}-panel`;
    const count = stories.length;
    // The list can shrink under a kept selection (a story unpublished).
    const active = Math.min(chosen, count - 1);
    // Portraits load as they come within reach: the current story's and its
    // neighbours', then every story's once the section has been seen and the
    // browser is idle, so jumping to any story fades into its photo. A
    // portrait stays mounted once added, so the one being left fades out.
    const [ready, setReady] = useState(() => new Set(around(active, count)));
    const [sectionRef, inView] = useInView();

    useEffect(() => {
        if (!inView) {
            return;
        }

        const addAll = () => setReady(new Set(stories.keys()));

        if (typeof window.requestIdleCallback === 'function') {
            const id = window.requestIdleCallback(addAll, { timeout: 1500 });

            return () => window.cancelIdleCallback(id);
        }

        const id = window.setTimeout(addAll, 1500);

        return () => window.clearTimeout(id);
    }, [inView, stories]);

    const select = (index: number, focusTab = false) => {
        const next = (index + count) % count;
        setActive(next);
        setReady((current) => new Set([...current, ...around(next, count)]));

        if (focusTab) {
            tabs.current[next]?.focus();
        }
    };

    const onTabKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ) => {
        // Left and right follow the reading direction: in Arabic the next
        // story is to the left.
        const target: Record<string, number> = {
            ArrowRight: isRtl ? index - 1 : index + 1,
            ArrowDown: index + 1,
            ArrowLeft: isRtl ? index + 1 : index - 1,
            ArrowUp: index - 1,
            Home: 0,
            End: count - 1,
        };

        if (event.key in target) {
            event.preventDefault();
            select(target[event.key], true);
        }
    };

    // Swipe the portrait to move between stories on touch screens: towards
    // the reading start for the next one (left in English, right in Arabic).
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
            select(active + (dx < 0 !== isRtl ? 1 : -1));
        }
    };

    const story = stories[active];

    return (
        <section
            ref={sectionRef}
            id="stories"
            className="relative isolate py-24 md:py-36"
        >
            <Glow
                color="jade"
                className="-end-56 top-[38%] size-[34rem] opacity-35"
            />
            <Glow
                color="lagoon"
                className="-start-40 bottom-[6%] size-[26rem] opacity-25"
            />

            <Container>
                <SectionHeader
                    index="05"
                    label={label}
                    title={<Accent text={title} />}
                    lede={lede}
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
                                {stories.map((item, index) =>
                                    ready.has(index) ? (
                                        <Photo
                                            key={item.id}
                                            media={item.portrait}
                                            alt={item.portraitAlt}
                                            aria-hidden={index !== active}
                                            draggable={false}
                                            ratio={1.25}
                                            focus={item.focus}
                                            zoom={item.zoom}
                                            style={uploadCrop(
                                                item.portrait,
                                                PORTRAIT_FRAME,
                                                item.focus,
                                                item.zoom,
                                            )}
                                            widths={[480, 800, 1200]}
                                            sizes="(min-width: 1320px) 480px, (min-width: 1024px) 37vw, (min-width: 768px) 72vw, 100vw"
                                            className={cn(
                                                'absolute inset-0 size-full transition-[opacity,scale] duration-[700ms] ease-glass select-none',
                                                index === active
                                                    ? 'scale-100 opacity-100'
                                                    : 'scale-[1.04] opacity-0',
                                            )}
                                        />
                                    ) : null,
                                )}
                                <div
                                    aria-hidden
                                    className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink/85 via-ink/35 to-transparent"
                                />

                                <div className="absolute start-4 top-4 grid rounded-[14px] px-3.5 py-2.5 glass-strong md:start-5 md:top-5">
                                    {stories.map((item, index) => (
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
                                            <span
                                                {...englishRun(
                                                    locale,
                                                    item.city,
                                                )}
                                                className="text-[10px] leading-none font-medium tracking-[0.28em] text-bone uppercase rtl:text-right rtl:text-xs rtl:leading-tight"
                                            >
                                                {item.city}
                                            </span>
                                            {item.coordinates ? (
                                                <span className="text-[11px] leading-none text-smoke tabular-nums rtl:leading-tight">
                                                    <Coordinates
                                                        value={item.coordinates}
                                                    />
                                                </span>
                                            ) : null}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-rim relative mx-3 -mt-16 rounded-[28px] px-6 pt-12 pb-6 glass-strong sm:mx-6 sm:px-8 sm:pb-8 md:mx-0 md:ms-[22%] md:-mt-44 lg:ms-[20%] lg:-mt-48 lg:px-11 lg:pt-14 lg:pb-9 xl:-me-16">
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute start-5 -top-7 font-display text-[6.5rem] leading-none text-mint select-none sm:start-7 lg:start-10 lg:-top-9 lg:text-[8rem] rtl:-top-12 rtl:text-[5rem] lg:rtl:-top-[3.75rem] lg:rtl:text-[6rem]"
                                >
                                    {t('testimonials.quoteMark')}
                                </span>

                                <div className="grid">
                                    {stories.map((item, index) => (
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
                                                        140
                                                        ? 'text-display-md max-sm:text-[1.625rem] rtl:leading-[1.5]'
                                                        : 'text-[clamp(1.875rem,1.1rem+2.2vw,2.875rem)] leading-[1.1] tracking-[-0.015em] rtl:leading-[1.45]',
                                                )}
                                            >
                                                <p>
                                                    <Managed
                                                        text={plainQuote(item)}
                                                    >
                                                        <Accent
                                                            text={item.quote}
                                                            className="text-mint not-italic"
                                                        />
                                                    </Managed>
                                                </p>
                                            </blockquote>

                                            <figcaption className="mt-auto flex flex-col items-start gap-5 pt-8 xl:flex-row xl:items-end xl:justify-between">
                                                <span className="flex flex-col gap-1 border-s border-mint/40 ps-4">
                                                    <span className="text-[17px] leading-snug font-medium text-bone">
                                                        <Managed
                                                            text={item.name}
                                                        />
                                                    </span>
                                                    <span className="text-sm leading-snug text-mist">
                                                        <Managed
                                                            text={item.role}
                                                        />
                                                    </span>
                                                    <span className="text-sm leading-snug text-smoke">
                                                        {place(item)}
                                                    </span>
                                                </span>
                                                <span className="inline-flex items-center gap-3 rounded-[14px] py-2.5 ps-3.5 pe-4 glass-thin">
                                                    <span className="font-display text-[1.625rem] leading-none font-medium text-mint tabular-nums">
                                                        <Figure
                                                            value={
                                                                item.metric
                                                                    .figure
                                                            }
                                                        />
                                                    </span>
                                                    <span className="flex flex-col gap-0.5">
                                                        <span className="text-[13px] leading-tight text-bone">
                                                            <Managed
                                                                text={
                                                                    item.metric
                                                                        .label
                                                                }
                                                            />
                                                        </span>
                                                        {item.metric.note ? (
                                                            <span className="text-xs leading-tight text-smoke">
                                                                <Managed
                                                                    text={
                                                                        item
                                                                            .metric
                                                                            .note
                                                                    }
                                                                />
                                                            </span>
                                                        ) : null}
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
                                    {t('testimonials.position', {
                                        number: active + 1,
                                        count,
                                        name: story.name,
                                    })}
                                </span>
                                <span aria-hidden>
                                    {pad(active + 1)}
                                    <span className="text-smoke">
                                        {' '}
                                        / {pad(count)}
                                    </span>
                                </span>
                            </p>
                            {count > 1 ? (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        aria-label={t('testimonials.previous')}
                                        aria-controls={panelId}
                                        onClick={() => select(active - 1)}
                                        className={cn(
                                            cta({
                                                variant: 'glass',
                                                size: 'sm',
                                            }),
                                            'size-11 px-0',
                                        )}
                                    >
                                        <ArrowLeft
                                            aria-hidden
                                            className="size-4 rtl:-scale-x-100"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={t('testimonials.next')}
                                        aria-controls={panelId}
                                        onClick={() => select(active + 1)}
                                        className={cn(
                                            cta({
                                                variant: 'glass',
                                                size: 'sm',
                                            }),
                                            'size-11 px-0',
                                        )}
                                    >
                                        <ArrowRight
                                            aria-hidden
                                            className="size-4 rtl:-scale-x-100"
                                        />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div
                            role="tablist"
                            aria-label={t('testimonials.listLabel')}
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
                                className="glass-rim pointer-events-none absolute inset-x-0 top-0 h-[calc(100%/var(--n))] translate-y-[calc(var(--i)*100%)] rounded-[22px] ring-1 glass-strong ring-mint/45 transition-transform duration-[560ms] ease-glass"
                            />
                            {stories.map((item, index) => {
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
                                        aria-label={t('testimonials.tabLabel', {
                                            name: item.name,
                                            store: item.store,
                                            city: item.city,
                                            label: item.metric.label,
                                            figure: item.metric.figure,
                                        })}
                                        aria-selected={selected}
                                        aria-controls={panelId}
                                        tabIndex={selected ? 0 : -1}
                                        onClick={() => select(index)}
                                        onKeyDown={(event) =>
                                            onTabKeyDown(event, index)
                                        }
                                        className={cn(
                                            'group/tab relative grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-[22px] px-4 py-4 text-start transition-colors duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-mint/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none md:px-5 md:py-5 xl:py-6',
                                            !selected &&
                                                'hover:bg-white/[0.04]',
                                        )}
                                    >
                                        <Avatar
                                            story={item}
                                            selected={selected}
                                        />
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <span
                                                {...englishRun(
                                                    locale,
                                                    item.name,
                                                )}
                                                className={cn(
                                                    'truncate text-[15px] font-medium transition-colors duration-[380ms] ease-glass rtl:text-right',
                                                    selected
                                                        ? 'text-bone'
                                                        : 'text-mist group-hover/tab:text-bone',
                                                )}
                                            >
                                                {item.name}
                                            </span>
                                            <span className="truncate text-[13px] text-smoke">
                                                {placeShort(item)}
                                            </span>
                                        </span>
                                        <span className="flex flex-col items-end gap-1.5">
                                            <span
                                                className={cn(
                                                    'font-display text-2xl leading-none font-medium tabular-nums transition-colors duration-[380ms] ease-glass',
                                                    selected
                                                        ? 'text-mint'
                                                        : 'text-bone/75',
                                                )}
                                            >
                                                <Figure
                                                    value={item.metric.figure}
                                                />
                                            </span>
                                            <span
                                                {...englishRun(
                                                    locale,
                                                    item.metric.short,
                                                )}
                                                className="text-[10px] leading-none tracking-[0.18em] text-smoke uppercase rtl:text-[11px] rtl:leading-tight"
                                            >
                                                {item.metric.short}
                                            </span>
                                        </span>
                                        <span
                                            {...englishRun(
                                                locale,
                                                plainQuote(item),
                                            )}
                                            className="col-span-3 mt-3.5 hidden font-display text-[15px] leading-snug text-mist italic md:line-clamp-2"
                                        >
                                            {plainQuote(item)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {footnote ? (
                            <p className="mt-6 text-[13px] leading-relaxed text-pretty text-smoke">
                                {footnote}
                            </p>
                        ) : null}
                    </Reveal>
                </div>
            </Container>
        </section>
    );
}
