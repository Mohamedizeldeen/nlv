import { ChevronsLeftRight, ImageUp } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { localeProps } from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import { ScanOverlay } from '@/components/landing/tryon-ui';
import { cn } from '@/lib/utils';
import type { FocusPoint } from '@/types/admin';
import { lookbookChrome } from './lookbook-copy';

/*
 * The Lookbook's before/after card, rebuilt for the admin: the try-on
 * result in colour, and over its left part the "before" (the shopper's own
 * photo, or a grayscale scan of the result when there is none) behind the
 * scan frame, exactly as the landing card draws it. In Arabic the caption
 * reads right to left while the photo keeps its geometry (the pane still
 * opens from the left).
 */

const objectPosition = (focus: FocusPoint) =>
    `${focus[0] * 100}% ${focus[1] * 100}%`;

/** What the before pane shows: the real photo, or the scan of the result. */
function BeforeImage({
    after,
    before,
    focus,
}: {
    after: string | null;
    before: string | null;
    focus: FocusPoint;
}) {
    if (before) {
        return (
            <img
                src={before}
                alt=""
                draggable={false}
                className="absolute inset-0 size-full object-cover"
                style={{ objectPosition: objectPosition(focus) }}
            />
        );
    }

    return (
        <>
            {after ? (
                <img
                    src={after}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 size-full object-cover brightness-90 contrast-125 grayscale"
                    style={{ objectPosition: objectPosition(focus) }}
                />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(165deg,var(--color-jade),var(--color-lagoon))] opacity-55 mix-blend-color" />
            <div className="absolute inset-0 bg-ink/15" />
        </>
    );
}

function Chip({
    tone,
    className,
    style,
    children,
}: {
    tone: 'glass' | 'mint';
    className?: string;
    style?: CSSProperties;
    children: string;
}) {
    return (
        <span
            aria-hidden
            className={cn(
                'absolute top-3 rounded-[10px] px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] uppercase',
                tone === 'mint' ? 'bg-mint text-ink' : 'text-bone glass-strong',
                className,
            )}
            style={style}
        >
            {children}
        </span>
    );
}

export type LookCaption = {
    /** "04" */
    number: string;
    city: string;
    seconds: number | null;
    title: string;
};

/** An admin hint inside a card set in Arabic: kept English, left to right. */
function Hint({ children }: { children: string }) {
    return (
        <span lang="en" dir="ltr">
            {children}
        </span>
    );
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

const POSITIONS = [
    { label: 'Before', value: 1 },
    { label: 'Split', value: 0.5 },
    { label: 'After', value: 0 },
] as const;

/**
 * The live preview on the look form. Drag anywhere on the photo (or the
 * divider's knob with the arrow keys) to move the line between before and
 * after; the buttons jump to before, the landing's half-and-half hover
 * state, or after.
 */
export function BeforeAfterPreview({
    after,
    before,
    aspect,
    focus,
    alt,
    caption,
    locale = 'en',
    className,
    style,
}: {
    /** Image URLs (stored or a just-picked file). */
    after: string | null;
    before: string | null;
    aspect: number;
    focus: FocusPoint;
    /** In the card's language, like the caption. */
    alt: string;
    caption: LookCaption;
    /** The page the card is shown as: / (en) or /ar. */
    locale?: ContentLocale;
    className?: string;
    style?: CSSProperties & Record<`--${string}`, string>;
}) {
    const chrome = lookbookChrome(locale);
    const [lookBefore, lookAfter] = chrome.lookCity(caption.number);
    // Arabic reads small at the Latin caps' 10px: its labels go up a size.
    const arabic = locale === 'ar';
    const [reveal, setReveal] = useState(0.5);
    const [dragging, setDragging] = useState(false);
    const frame = useRef<HTMLDivElement>(null);
    const percent = Math.round(reveal * 100);

    const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
        const box = frame.current?.getBoundingClientRect();

        if (box && box.width > 0) {
            setReveal(clamp((event.clientX - box.left) / box.width));
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? 0.2 : 0.05;
        const moves: Record<string, number> = {
            ArrowLeft: reveal - step,
            ArrowDown: reveal - step,
            ArrowRight: reveal + step,
            ArrowUp: reveal + step,
            Home: 0,
            End: 1,
        };

        if (event.key in moves) {
            event.preventDefault();
            setReveal(clamp(moves[event.key]));
        }
    };

    return (
        <div className={cn('grid gap-4', className)} style={style}>
            <figure
                {...localeProps(locale)}
                data-preview-locale={locale}
                className="relative overflow-hidden rounded-[24px] bg-ink-raised"
            >
                <div
                    ref={frame}
                    dir="ltr"
                    className={cn(
                        'relative touch-pan-y select-none',
                        after &&
                            (dragging ? 'cursor-grabbing' : 'cursor-ew-resize'),
                    )}
                    style={{ aspectRatio: aspect }}
                    onPointerDown={(event) => {
                        if (!after || event.button !== 0) {
                            return;
                        }

                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDragging(true);
                        fromPointer(event);
                    }}
                    onPointerMove={(event) => {
                        if (dragging) {
                            fromPointer(event);
                        }
                    }}
                    onPointerUp={() => setDragging(false)}
                    onPointerCancel={() => setDragging(false)}
                >
                    {after ? (
                        <img
                            src={after}
                            alt={alt}
                            draggable={false}
                            className="absolute inset-0 size-full object-cover"
                            style={{ objectPosition: objectPosition(focus) }}
                        />
                    ) : (
                        <EmptyFrame />
                    )}

                    {after ? (
                        <>
                            {/* The before pane: everything left of the divider. */}
                            <div
                                aria-hidden
                                className={cn(
                                    'absolute inset-0 overflow-hidden',
                                    !dragging &&
                                        'transition-[clip-path] duration-[600ms] ease-glass',
                                )}
                                style={{
                                    clipPath: `inset(0 ${100 - reveal * 100}% 0 0)`,
                                }}
                            >
                                <BeforeImage
                                    after={after}
                                    before={before}
                                    focus={focus}
                                />
                                <div className="absolute inset-x-0 top-11 bottom-[5.25rem]">
                                    <ScanOverlay />
                                </div>
                                <div className="absolute inset-0 bg-[linear-gradient(100deg,oklch(1_0_0/0.07),transparent_40%)] shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]" />
                                <Chip
                                    tone="glass"
                                    className={cn(
                                        'left-3',
                                        arabic && 'py-0.5 text-[12px]',
                                    )}
                                >
                                    {chrome.before}
                                </Chip>
                            </div>

                            <Chip
                                tone="mint"
                                className={cn(
                                    'right-3 transition-opacity duration-500 ease-glass',
                                    arabic && 'py-0.5 text-[12px]',
                                )}
                                style={{ opacity: reveal > 0.9 ? 0 : 1 }}
                            >
                                {chrome.after}
                            </Chip>

                            {/* The divider: the glass edge of the pane, and its knob. */}
                            <div
                                className={cn(
                                    'pointer-events-none absolute inset-y-0 w-0',
                                    !dragging &&
                                        'transition-[left] duration-[600ms] ease-glass',
                                )}
                                style={{ left: `${reveal * 100}%` }}
                            >
                                <div
                                    aria-hidden
                                    className="absolute inset-y-0 right-0 w-5 bg-[linear-gradient(to_left,oklch(1_0_0/0.28),transparent)] shadow-[18px_0_32px_-18px_oklch(0_0_0/0.7)]"
                                    style={{ opacity: reveal > 0.02 ? 1 : 0 }}
                                />
                                <div
                                    aria-hidden
                                    className="absolute inset-y-0 -left-px w-px bg-white/70"
                                />
                                <div
                                    role="slider"
                                    lang="en"
                                    tabIndex={0}
                                    aria-label="Divider between before and after"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={percent}
                                    aria-valuetext={`Before covers ${percent}% of the photo`}
                                    onKeyDown={onKeyDown}
                                    className="pointer-events-auto absolute top-[38%] left-0 grid size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full text-bone ring-1 glass-strong ring-white/30 focus-visible:ring-2 focus-visible:ring-mint focus-visible:outline-none"
                                >
                                    <ChevronsLeftRight
                                        aria-hidden
                                        className="size-4"
                                    />
                                </div>
                            </div>
                        </>
                    ) : null}

                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(to_top,oklch(0.145_0.018_200/0.55),transparent)]"
                    />
                </div>

                <figcaption className="pointer-events-none absolute inset-x-2.5 bottom-2.5 rounded-[16px] px-3.5 pt-2.5 pb-3 glass-strong">
                    <span
                        className={cn(
                            'flex items-center justify-between gap-3 leading-4 font-medium tracking-[0.2em] text-smoke uppercase',
                            arabic ? 'text-[12px]' : 'text-[10px]',
                        )}
                    >
                        <span className="truncate">
                            {lookBefore}
                            {caption.city ? (
                                <bdi>{caption.city}</bdi>
                            ) : (
                                <Hint>City</Hint>
                            )}
                            {lookAfter}
                        </span>
                        <span className="shrink-0 tracking-[0.06em] normal-case tabular-nums">
                            {chrome.seconds(
                                caption.seconds === null
                                    ? '–'
                                    : caption.seconds.toFixed(1),
                            )}
                        </span>
                    </span>
                    <span
                        className={cn(
                            'mt-1 block truncate font-display text-[17px] leading-snug font-medium',
                            caption.title ? 'text-bone' : 'text-smoke',
                        )}
                    >
                        {caption.title ? (
                            <bdi>{caption.title}</bdi>
                        ) : (
                            <Hint>Title of the look</Hint>
                        )}
                    </span>
                </figcaption>

                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset"
                />
            </figure>

            <div
                role="group"
                aria-label="Show"
                hidden={!after}
                className="glass-rim flex rounded-[16px] p-1 glass"
            >
                {POSITIONS.map((position) => {
                    const active = Math.abs(reveal - position.value) < 0.005;

                    return (
                        <button
                            key={position.label}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setReveal(position.value)}
                            className={cn(
                                'h-9 flex-1 cursor-pointer rounded-[12px] text-[13px] font-medium transition-colors duration-300 ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                                active
                                    ? 'bg-mint text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.55)]'
                                    : 'text-mist hover:text-bone',
                            )}
                        >
                            {position.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** The frame before a try-on result has been chosen (an admin hint: English). */
function EmptyFrame() {
    return (
        <div
            lang="en"
            dir="ltr"
            className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_30%_20%,oklch(0.42_0.08_175/0.35),transparent_60%),radial-gradient(ellipse_at_80%_90%,oklch(0.4_0.07_210/0.3),transparent_55%)] px-8 text-center"
        >
            <span className="grid justify-items-center gap-2">
                <ImageUp aria-hidden className="size-5 text-mint" />
                <span className="max-w-[22ch] text-[13px] leading-relaxed text-mist">
                    Add the try-on result to see the look as shoppers will.
                </span>
            </span>
        </div>
    );
}

// The landing card's reveal: one custom property (--r: 0 or 1) moves the
// pane and counter-moves its photo, so the before stays pinned in place.
const paneStyle: CSSProperties = {
    transform: 'translateX(calc((var(--r) - 1) * 100%))',
};
const paneInnerStyle: CSSProperties = {
    transform: 'translateX(calc((1 - var(--r)) * 50%))',
};

/**
 * A look's thumbnail for the admin grid: cropped around its focal point,
 * and on hover (or keyboard focus inside the card) the before pane slides
 * over the left half, as on the landing page.
 */
export function BeforeAfterThumb({
    after,
    before,
    focus,
    alt,
    aspect = 4 / 5,
    className,
}: {
    after: string | null;
    before: string | null;
    focus: FocusPoint;
    alt: string;
    aspect?: number;
    className?: string;
}) {
    return (
        <div
            className={cn('relative overflow-hidden bg-ink-raised', className)}
            style={{ aspectRatio: aspect }}
        >
            {after ? (
                <img
                    src={after}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-glass group-hover/look:scale-[1.02]"
                    style={{ objectPosition: objectPosition(focus) }}
                />
            ) : (
                <EmptyFrame />
            )}
            <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/2 overflow-hidden shadow-[18px_0_32px_-18px_oklch(0_0_0/0.7)] transition-transform duration-[750ms] ease-glass"
                style={paneStyle}
            >
                <div
                    className="absolute inset-y-0 left-0 w-[200%] transition-transform duration-[750ms] ease-glass"
                    style={paneInnerStyle}
                >
                    <BeforeImage after={after} before={before} focus={focus} />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(100deg,oklch(1_0_0/0.07),transparent_40%)]" />
                <div className="absolute inset-y-0 right-0 w-4 bg-[linear-gradient(to_left,oklch(1_0_0/0.28),transparent)]" />
                <div className="absolute inset-y-0 right-0 w-px bg-white/70" />
                <Chip tone="glass" className="!top-2.5 left-2.5">
                    Before
                </Chip>
            </div>
        </div>
    );
}
