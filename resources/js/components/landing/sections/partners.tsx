import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { Arabic, Container, Reveal } from '../primitives';

// Placeholder content: replace before launch. -----------------------------
// Every retailer below is fictional; the figures are illustrative.

const STATS = [
    { figure: '140+', label: 'stores' },
    { figure: '6', label: 'countries' },
    { figure: '2.1M', label: 'try-ons this year' },
] as const;

type Retailer = {
    name: string;
    city: string;
    /** The wordmark, typeset like the retailer's own logo. */
    mark: ReactNode;
};

const RETAILERS: Retailer[] = [
    {
        name: 'Maison Rimal',
        city: 'Jeddah',
        mark: (
            <span className="font-display text-[1.05em] font-medium tracking-[0.24em] uppercase">
                Maison Rimal
            </span>
        ),
    },
    {
        name: 'Sadu & Co.',
        city: 'Kuwait City',
        mark: (
            <span className="font-display text-[1.85em] font-medium tracking-[-0.02em] italic">
                Sadu <span className="text-[1.12em] font-normal">&amp;</span>{' '}
                Co.
            </span>
        ),
    },
    {
        name: 'Layan Optics',
        city: 'Dubai',
        mark: (
            <span className="text-[0.875em] tracking-[0.42em] uppercase">
                <span className="font-semibold">Layan</span>{' '}
                <span className="font-normal">Optics</span>
            </span>
        ),
    },
    {
        name: 'Qasr Atelier',
        city: 'Doha',
        mark: (
            <span className="font-display leading-none">
                <span className="text-[1.75em] font-semibold tracking-[-0.03em]">
                    Qasr
                </span>{' '}
                <span className="text-[1.25em] font-normal italic">
                    Atelier
                </span>
            </span>
        ),
    },
    {
        name: 'Noor',
        city: 'Riyadh',
        mark: (
            <span className="flex items-center gap-[0.75em]">
                <span className="text-[1em] font-semibold tracking-[0.24em] uppercase">
                    Noor
                </span>
                <span
                    aria-hidden
                    className="h-[1.5em] w-px bg-current opacity-40"
                />
                <Arabic className="text-[1.75em] leading-none font-bold">
                    نور
                </Arabic>
            </span>
        ),
    },
    {
        name: 'Dune Eyewear',
        city: 'Muscat',
        mark: (
            <span className="text-[1.45em] tracking-[-0.045em] lowercase">
                <span className="font-semibold">dune</span>
                <span className="font-normal opacity-80"> eyewear</span>
            </span>
        ),
    },
    {
        name: 'Bayt al Moda',
        city: 'Manama',
        mark: (
            <span className="font-display text-[1.55em] font-medium tracking-[0.05em] [font-variant-caps:small-caps]">
                Bayt al Moda
            </span>
        ),
    },
    {
        name: 'Oud & Linen',
        city: 'Abu Dhabi',
        mark: (
            <span className="font-display text-[1.4em] font-normal tracking-[0.1em] lowercase italic">
                oud &amp; linen
            </span>
        ),
    },
    {
        name: 'Al Waha',
        city: 'Dubai',
        mark: (
            // Condensed by squeezing the glyphs to a fixed length, the way a
            // logo would be drawn, so it looks the same in every browser.
            <svg viewBox="0 0 104 30" className="h-[1.6em] w-auto" aria-hidden>
                <text
                    x="0"
                    y="26"
                    textLength="104"
                    lengthAdjust="spacingAndGlyphs"
                    className="fill-current font-sans text-[34px] font-semibold"
                >
                    AL WAHA
                </text>
            </svg>
        ),
    },
    {
        name: 'Rimal',
        city: 'Riyadh',
        mark: (
            <Arabic className="text-[2.25em] leading-none font-bold">
                رمال
            </Arabic>
        ),
    },
];

// --------------------------------------------------------------------------

function RetailerList({ copy = false }: { copy?: boolean }) {
    return (
        <ul
            aria-hidden={copy || undefined}
            aria-label={copy ? undefined : `Retailers using ${BRAND.name}`}
            className={cn(
                'flex shrink-0 items-start motion-safe:gap-x-16 motion-safe:pr-16 md:motion-safe:gap-x-20 md:motion-safe:pr-20',
                copy
                    ? 'motion-reduce:hidden'
                    : // Reduced motion: a still directory instead of a moving line.
                      'motion-reduce:grid motion-reduce:w-full motion-reduce:grid-cols-2 motion-reduce:gap-x-6 motion-reduce:gap-y-8 sm:motion-reduce:flex sm:motion-reduce:flex-wrap sm:motion-reduce:justify-center sm:motion-reduce:gap-x-14 lg:motion-reduce:grid lg:motion-reduce:grid-cols-5 lg:motion-reduce:gap-x-6',
            )}
        >
            {RETAILERS.map((retailer) => (
                <li
                    key={retailer.name}
                    className="group/mark flex shrink-0 flex-col items-center gap-3 text-center"
                >
                    <span className="flex h-[2.5em] items-center text-[13px] whitespace-nowrap text-mist/70 transition-colors duration-[380ms] ease-glass group-hover/mark:text-bone md:text-base">
                        {retailer.mark}
                    </span>
                    <span className="sr-only">
                        {retailer.name}, {retailer.city}
                    </span>
                    <span
                        aria-hidden
                        className="text-[10px] leading-none font-medium tracking-[0.3em] text-smoke/80 uppercase transition-colors duration-[380ms] ease-glass group-hover/mark:text-mist"
                    >
                        {retailer.city}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** WCAG 2.2.2: moving content needs a pause control, not just hover. */
function PauseToggle({
    paused,
    onToggle,
    className,
}: {
    paused: boolean;
    onToggle: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            aria-pressed={paused}
            aria-label="Pause the retailer list"
            onClick={onToggle}
            className={cn(
                'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-mist glass-thin transition-colors duration-[380ms] ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none motion-reduce:hidden',
                className,
            )}
        >
            {paused ? (
                <Play aria-hidden className="size-3.5" />
            ) : (
                <Pause aria-hidden className="size-3.5" />
            )}
        </button>
    );
}

export default function Partners() {
    const [paused, setPaused] = useState(false);
    const toggle = () => setPaused((value) => !value);

    return (
        <section
            id="partners"
            aria-labelledby="partners-title"
            className="relative isolate py-12 md:py-16"
        >
            <Container>
                <Reveal className="glass-rim relative overflow-hidden rounded-[28px] glass">
                    <div className="grid gap-y-7 px-6 pt-7 pb-7 sm:px-8 md:px-10 md:pt-9 lg:grid-cols-12 lg:items-end lg:gap-x-8">
                        <div className="flex items-start justify-between gap-4 lg:col-span-5">
                            <div>
                                <h2
                                    id="partners-title"
                                    className="text-kicker font-medium text-balance text-smoke uppercase"
                                >
                                    In boutiques from Riyadh to Muscat
                                </h2>
                                <p className="mt-2">
                                    <Arabic className="text-[1.625rem] leading-tight text-bone/85">
                                        من الرياض إلى مسقط
                                    </Arabic>
                                </p>
                            </div>
                            <PauseToggle
                                paused={paused}
                                onToggle={toggle}
                                className="md:hidden"
                            />
                        </div>

                        <ul className="flex divide-x divide-white/10 lg:col-span-7 lg:justify-end">
                            {STATS.map((stat) => (
                                <li
                                    key={stat.label}
                                    className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0 sm:flex-row sm:items-baseline sm:gap-2.5 sm:px-7"
                                >
                                    <span className="font-display text-[1.75rem] leading-none font-medium text-bone tabular-nums md:text-[2rem]">
                                        {stat.figure}
                                    </span>
                                    <span className="text-[13px] leading-tight text-smoke">
                                        {stat.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative border-t border-white/10 py-8 md:py-9">
                        {/* The right fade runs out before the pause button, so no mark slides under it. */}
                        <div className="overflow-hidden motion-safe:[mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] motion-reduce:px-6 sm:motion-reduce:px-8 md:motion-safe:[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_calc(100%-9rem),transparent_calc(100%-3.75rem))] md:motion-reduce:px-10">
                            <div
                                className={cn(
                                    'flex w-max animate-marquee [animation-duration:70s] hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none',
                                    paused && '[animation-play-state:paused]',
                                )}
                            >
                                <RetailerList />
                                <RetailerList copy />
                            </div>
                        </div>

                        <PauseToggle
                            paused={paused}
                            onToggle={toggle}
                            className="absolute top-1/2 right-4 -translate-y-1/2 max-md:hidden"
                        />
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}
