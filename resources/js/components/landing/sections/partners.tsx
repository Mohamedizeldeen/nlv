import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { Accent } from '../accent';
import { BRAND } from '../brand';
import { useContent, useLanding } from '../landing-data';
import { Container, Reveal } from '../primitives';

// Placeholder content: replace before launch. -----------------------------
// Every retailer below is fictional. The kicker, title and figures come from
// the admin (landing.content, landing.stats); the wordmarks are artwork, so
// they stay Latin and left to right on the Arabic page, where only their
// cities are translated (i18n/sections/partners.ts).

type Retailer = {
    name: string;
    city: Extract<MessageKey, `partners.city${string}`>;
    /** The wordmark, typeset like the retailer's own logo. */
    mark: ReactNode;
};

const RETAILERS: Retailer[] = [
    {
        name: 'Maison Rimal',
        city: 'partners.cityJeddah',
        mark: (
            <span className="font-display text-[1.05em] font-medium tracking-[0.24em] uppercase">
                Maison Rimal
            </span>
        ),
    },
    {
        name: 'Hollis & Vane',
        city: 'partners.cityLondon',
        mark: (
            // A tailor's label: small caps, with the italic ampersand.
            <span className="font-display text-[1.5em] font-medium tracking-[0.07em] [font-variant-caps:small-caps]">
                Hollis{' '}
                <span className="text-[1.05em] font-normal tracking-normal italic">
                    &amp;
                </span>{' '}
                Vane
            </span>
        ),
    },
    {
        name: 'Layan Optics',
        city: 'partners.cityDubai',
        mark: (
            <span className="text-[0.875em] tracking-[0.42em] uppercase">
                <span className="font-semibold">Layan</span>{' '}
                <span className="font-normal">Optics</span>
            </span>
        ),
    },
    {
        name: 'Casa Lino',
        city: 'partners.cityMilan',
        mark: (
            // A stacked block: both words squeezed to one width, so the
            // lockup is the same square in every browser.
            <svg viewBox="0 0 44 47" className="h-[2.4em] w-auto" aria-hidden>
                <g className="fill-current font-sans text-[30px] font-bold">
                    <text
                        x="0"
                        y="22"
                        textLength="44"
                        lengthAdjust="spacingAndGlyphs"
                    >
                        CASA
                    </text>
                    <text
                        x="0"
                        y="46"
                        textLength="44"
                        lengthAdjust="spacingAndGlyphs"
                    >
                        LINO
                    </text>
                </g>
            </svg>
        ),
    },
    {
        name: 'Qasr Atelier',
        city: 'partners.cityDoha',
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
        name: 'Dune Eyewear',
        city: 'partners.cityCopenhagen',
        mark: (
            <span className="text-[1.45em] tracking-[-0.045em] lowercase">
                <span className="font-semibold">dune</span>
                <span className="font-normal opacity-80"> eyewear</span>
            </span>
        ),
    },
    {
        name: 'Sadu & Co.',
        city: 'partners.cityKuwait',
        mark: (
            <span className="font-display text-[1.85em] font-medium tracking-[-0.02em] italic">
                Sadu <span className="text-[1.12em] font-normal">&amp;</span>{' '}
                Co.
            </span>
        ),
    },
    {
        name: 'Atelier Verre',
        city: 'partners.cityParis',
        mark: (
            // An optician's two-tier sign: a spaced-caps line over the name.
            <span className="flex flex-col items-center leading-none">
                <span className="pl-[0.55em] text-[0.56em] font-medium tracking-[0.55em] uppercase">
                    Atelier
                </span>
                <span className="mt-[0.18em] font-display text-[1.65em] font-medium tracking-[0.01em]">
                    Verre
                </span>
            </span>
        ),
    },
    {
        name: 'Rimal',
        city: 'partners.cityRiyadh',
        mark: (
            <span className="font-display text-[1.75em] leading-none font-semibold tracking-[-0.03em]">
                Rimal<span className="opacity-60">.</span>
            </span>
        ),
    },
    {
        name: 'Oud & Linen',
        city: 'partners.cityIstanbul',
        mark: (
            <span className="font-display text-[1.4em] font-normal tracking-[0.1em] lowercase italic">
                oud &amp; linen
            </span>
        ),
    },
];

// --------------------------------------------------------------------------

function RetailerList({ copy = false }: { copy?: boolean }) {
    const { t } = useI18n();

    return (
        <ul
            aria-hidden={copy || undefined}
            aria-label={
                copy
                    ? undefined
                    : t('partners.retailersLabel', { brand: BRAND.name })
            }
            className={cn(
                'flex shrink-0 items-start motion-safe:gap-x-16 motion-safe:pe-16 md:motion-safe:gap-x-20 md:motion-safe:pe-20',
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
                    {/* lang="en": the Latin artwork keeps its tracking
                        (Arabic text is set without letter-spacing). The
                        still five-column directory is narrowest below xl:
                        the phone size keeps the wide marks from touching. */}
                    <span
                        dir="ltr"
                        lang="en"
                        className="flex h-[2.5em] items-center text-[13px] whitespace-nowrap text-mist/70 transition-colors duration-[380ms] ease-glass group-hover/mark:text-bone md:text-base lg:max-xl:motion-reduce:text-[13px]"
                    >
                        {retailer.mark}
                    </span>
                    <span className="sr-only">
                        {t('partners.retailer', {
                            name: retailer.name,
                            city: t(retailer.city),
                        })}
                    </span>
                    <span
                        aria-hidden
                        className="text-[10px] leading-none font-medium tracking-[0.3em] text-smoke/80 uppercase transition-colors duration-[380ms] ease-glass group-hover/mark:text-mist rtl:text-xs"
                    >
                        {t(retailer.city)}
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
    const { t } = useI18n();

    return (
        <button
            type="button"
            aria-pressed={paused}
            aria-label={t('partners.pause')}
            onClick={onToggle}
            className={cn(
                'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-mist glass-thin transition-colors duration-[380ms] ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none motion-reduce:hidden',
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
    const { t } = useI18n();
    const { stats } = useLanding();
    const kicker = useContent('partners.kicker');
    const title = useContent('partners.title');
    const [paused, setPaused] = useState(false);
    const toggle = () => setPaused((value) => !value);
    // Figures are isolated so a sign keeps its side on the Arabic page
    // ("140+", not "+140"); "auto" lets the admin's "2.1 مليون" read right
    // to left and "2.1M" left to right.
    const figures = [
        {
            key: 'stores',
            figure: `${stats.stores}+`,
            dir: 'ltr',
            label: t('partners.stores'),
        },
        {
            key: 'countries',
            figure: String(stats.countries),
            dir: 'ltr',
            label: t('partners.countries'),
        },
        {
            key: 'year',
            figure: stats.tryOnsYear,
            dir: 'auto',
            label: t('partners.tryOnsYear'),
        },
    ] as const;

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
                                <p className="text-kicker font-medium text-balance text-smoke uppercase">
                                    {kicker}
                                </p>
                                <h2
                                    id="partners-title"
                                    className="mt-2 font-display text-[1.625rem] leading-tight text-bone/85"
                                >
                                    {/* Next to the phone pause button, wrap before the accent, not inside it.
                                        Arabic has no italic: its accent shows in mint. */}
                                    <Accent
                                        text={title}
                                        className="font-normal whitespace-nowrap [&:lang(ar)]:text-mint"
                                    />
                                </h2>
                            </div>
                            <PauseToggle
                                paused={paused}
                                onToggle={toggle}
                                className="md:hidden"
                            />
                        </div>

                        <ul className="flex divide-x divide-white/10 lg:col-span-7 lg:justify-end">
                            {figures.map((stat) => (
                                <li
                                    key={stat.key}
                                    className="flex min-w-0 flex-col gap-1.5 px-3 first:ps-0 last:pe-0 sm:flex-row sm:items-baseline sm:gap-2.5 sm:px-7 lg:px-4 xl:px-7"
                                >
                                    <span
                                        dir={stat.dir}
                                        className="font-display text-[1.75rem] leading-none font-medium text-bone tabular-nums md:text-[2rem]"
                                    >
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
                        {/* The fade at the far end runs out before the pause button, so no mark slides under it. */}
                        <div className="overflow-hidden motion-safe:[mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] motion-reduce:px-6 sm:motion-reduce:px-8 md:motion-safe:[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_calc(100%-9rem),transparent_calc(100%-3.75rem))] md:motion-reduce:px-10 md:rtl:motion-safe:[mask-image:linear-gradient(270deg,transparent,#000_8%,#000_calc(100%-9rem),transparent_calc(100%-3.75rem))]">
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
                            className="absolute end-4 top-1/2 -translate-y-1/2 max-md:hidden"
                        />
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}
