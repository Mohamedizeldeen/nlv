import { ArrowRight, Check } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import type { LandingPlan } from '@/types/landing';
import { Accent } from '../accent';
import { hasSection, useContent, useLanding } from '../landing-data';
import { Managed, englishRun } from '../managed';
import { useOrderDialog } from '../order-dialog';
import { Container, cta, Glow, Reveal, SectionHeader } from '../primitives';

// Plans, their prices per currency, the currencies on offer and the
// questions come from the admin panel (`landing.pricing`). Prices are whole
// amounts set by hand in every currency, never converted at a live rate.
// Figures use Western digits in both languages ("3,900"). On the Arabic page
// the code follows the figure ("3,900 USD"): the figure takes `rtl:-order-1`.

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Text whose changed characters roll into place: up when the number grows,
 * down when it shrinks. Visual only; pair it with a screen-reader string.
 */
function Rolling({ text, className }: { text: string; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const previous = useRef(text);

    useEffect(() => {
        const before = previous.current;
        previous.current = text;
        const node = ref.current;

        if (!node || before === text || prefersReducedMotion()) {
            return;
        }

        const toNumber = (value: string) =>
            Number(value.replace(/[^0-9.]/g, ''));
        const direction = toNumber(text) >= toNumber(before) ? 1 : -1;
        const glyphs = Array.from(node.children) as HTMLElement[];
        const animations: Animation[] = [];

        glyphs.forEach((glyph, index) => {
            const fromEnd = glyphs.length - 1 - index;

            if (before[before.length - 1 - fromEnd] === text[index]) {
                return;
            }

            animations.push(
                glyph.animate(
                    [
                        {
                            opacity: 0,
                            transform: `translateY(${direction * 0.42}em)`,
                        },
                        { opacity: 1, transform: 'translateY(0)' },
                    ],
                    {
                        duration: 640,
                        delay: index * 45,
                        easing: 'cubic-bezier(0.22, 0.8, 0.26, 1)',
                        fill: 'backwards',
                    },
                ),
            );
        });

        return () => animations.forEach((animation) => animation.cancel());
    }, [text]);

    return (
        // One inline-block per character: without dir="ltr" an Arabic line
        // would lay them out right to left ("009,3" for 3,900). Figures and
        // currency codes are Latin artwork: lang="en" keeps their tracking
        // on the Arabic page.
        <span
            ref={ref}
            aria-hidden
            dir="ltr"
            lang="en"
            className={cn('inline-block whitespace-nowrap', className)}
        >
            {Array.from(text).map((char, index) => (
                <span key={text.length - index} className="inline-block">
                    {char}
                </span>
            ))}
        </span>
    );
}

type Option<T extends string> = { value: T; label: string };

/**
 * Glass segmented control with a sliding mint indicator. It is a
 * radio group: arrow keys move the choice, Tab leaves the group.
 * The label sits beside the control where the row is wide (sm, xl) and
 * above it where it is not (phones, the three-card row at lg), so five
 * options keep cells wide enough to tap.
 */
function Segmented<T extends string>({
    label,
    options,
    value,
    onChange,
    className,
}: {
    label: string;
    options: readonly Option<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}) {
    const { isRtl } = useI18n();
    const labelId = useId();
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const count = options.length;
    const active = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const last = count - 1;
        const forward = active === last ? 0 : active + 1;
        const back = active === 0 ? last : active - 1;
        // Right to left, the next option sits to the left.
        const moves: Record<string, number> = {
            ArrowRight: isRtl ? back : forward,
            ArrowDown: forward,
            ArrowLeft: isRtl ? forward : back,
            ArrowUp: back,
            Home: 0,
            End: last,
        };
        const next = moves[event.key];

        if (next === undefined) {
            return;
        }

        event.preventDefault();
        onChange(options[next].value);
        buttons.current[next]?.focus();
    };

    const columns: CSSProperties = {
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    };
    // The indicator is clipped from the physical edges; the options run
    // from the right on the Arabic page.
    const before = (active / count) * 100;
    const after = ((count - 1 - active) / count) * 100;
    const left = isRtl ? after : before;
    const right = isRtl ? before : after;

    return (
        <div
            className={cn(
                'grid gap-y-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-center sm:gap-x-3 lg:grid-cols-1 xl:grid-cols-[5.5rem_minmax(0,1fr)]',
                className,
            )}
        >
            <span
                id={labelId}
                className="text-kicker font-medium text-mist uppercase"
            >
                {label}
            </span>
            <div className="relative w-full max-w-[20rem] rounded-[16px] p-1 glass-thin has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-mint/70">
                <div
                    role="radiogroup"
                    aria-labelledby={labelId}
                    className="relative grid"
                    style={columns}
                >
                    {options.map((option, index) => {
                        const selected = index === active;

                        return (
                            <button
                                key={option.value}
                                ref={(node) => {
                                    buttons.current[index] = node;
                                }}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => onChange(option.value)}
                                onKeyDown={onKeyDown}
                                className={cn(
                                    'h-10 cursor-pointer rounded-[12px] px-1 text-sm font-medium tracking-[0.01em] transition-colors duration-300 ease-glass focus-visible:outline-none',
                                    selected
                                        ? 'text-bone'
                                        : 'text-mist hover:bg-white/[0.06] hover:text-bone',
                                )}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 grid rounded-[12px] bg-mint shadow-[inset_0_1px_0_oklch(1_0_0/0.55)] transition-[clip-path] duration-500 ease-glass"
                        style={{
                            ...columns,
                            clipPath: `inset(0 ${right}% 0 ${left}% round 12px)`,
                        }}
                    >
                        {options.map((option) => (
                            <span
                                key={option.value}
                                className="grid h-10 place-items-center px-1 text-sm font-medium tracking-[0.01em] text-ink"
                            >
                                {option.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * A price set like a couture ticket: small currency code, Bodoni figure.
 * Without an amount the figure becomes an invitation to talk.
 */
function Price({
    amount,
    currency,
    per,
    className,
}: {
    amount: number | null;
    currency: string;
    per: string;
    className?: string;
}) {
    const { t, formatNumber } = useI18n();
    const custom = useContent('sections.pricing.custom_price');
    // Steps down while three cards share a 1024px row, back up from xl.
    const figure =
        'font-display text-[3.5rem] leading-[0.9] font-medium tracking-[-0.02em] whitespace-nowrap text-bone sm:text-[3.75rem] lg:text-[2.75rem] xl:text-[3.75rem]';

    if (amount === null) {
        return (
            <p className={className}>
                <span className={cn(figure, 'block font-normal italic')}>
                    {custom}
                </span>
                <span className="sr-only">
                    {t('pricing.customPrice', { per })}
                </span>
            </p>
        );
    }

    return (
        <p className={cn('flex items-start gap-2.5', className)}>
            <Rolling
                text={currency}
                className="mt-[0.3rem] text-[12px] font-medium tracking-[0.22em] text-mist"
            />
            <Rolling
                text={formatNumber(amount)}
                className={cn(figure, 'tabular-nums rtl:-order-1')}
            />
            <span className="sr-only">
                {t('pricing.price', {
                    currency,
                    amount: formatNumber(amount),
                    per,
                })}
            </span>
        </p>
    );
}

/**
 * The ruled line under each price, like the second line of a price
 * ticket: Buy's monthly app fee, Lease's term, Chain's device count.
 * Nothing when the plan has no second line (or no amount in this currency).
 */
function Ledger({
    detail,
    currency,
}: {
    detail: LandingPlan['detail'];
    currency: string;
}) {
    const { locale, t, formatNumber } = useI18n();
    const amount = detail.prices?.[currency];
    const money = amount !== undefined;
    const figure = money ? formatNumber(amount) : (detail.value ?? '');

    if (!figure) {
        return null;
    }

    return (
        // Label and value share a line, except in the narrow three-card
        // row at lg, where every card stacks them so the buttons stay level.
        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-white/10 pt-4 lg:flex-col lg:items-start lg:gap-2.5 xl:flex-row xl:items-baseline xl:gap-4">
            <dt
                {...englishRun(locale, detail.label ?? '')}
                className="text-kicker font-medium text-smoke uppercase"
            >
                {detail.label}
            </dt>
            <dd className="flex items-baseline gap-1.5 text-[14px] text-mist">
                <span className="sr-only">
                    {money
                        ? t('pricing.money', { currency, amount: figure })
                        : figure}
                </span>
                {money ? (
                    <Rolling
                        text={currency}
                        className="text-[11px] font-medium tracking-[0.2em] text-mist"
                    />
                ) : null}
                <Rolling
                    text={figure}
                    className="font-display text-[1.625rem] leading-none font-medium text-bone tabular-nums rtl:-order-1"
                />
                {detail.caption ? (
                    <span>
                        <Managed text={detail.caption} />
                    </span>
                ) : null}
            </dd>
        </div>
    );
}

/**
 * A feature line: `*starred*` phrases (the figures: "*12-month* warranty")
 * are set in medium bone. The space after a figure is set in its weight,
 * so the words that follow sit exactly where the typeset list had them.
 */
function Feature({ text }: { text: string }) {
    const parts = text.split(/\*([^*]+)\*/);

    return parts.map((part, index) => {
        if (index % 2) {
            const spaced = parts[index + 1]?.startsWith(' ');

            return (
                <span
                    key={index}
                    className="font-medium text-bone tabular-nums"
                >
                    {part}
                    {spaced ? ' ' : null}
                </span>
            );
        }

        return index > 0 && part.startsWith(' ') ? part.slice(1) : part;
    });
}

/** One plan. The featured one is drawn as the arched fitting-room mirror. */
function PlanCard({ plan, currency }: { plan: LandingPlan; currency: string }) {
    const { locale } = useI18n();
    const order = useOrderDialog();
    const featured = plan.featured;
    const titleId = `pricing-plan-${plan.key}`;

    return (
        <article
            aria-labelledby={titleId}
            className={cn(
                // Tablet: a two-column spread (price left, list right).
                'relative flex h-full flex-col p-7 sm:p-8 md:grid md:grid-cols-2 md:items-start md:gap-x-10 lg:flex lg:items-stretch',
                featured
                    ? '[border-radius:50%_50%_28px_28px/var(--arch)_var(--arch)_28px_28px] pt-[calc(var(--arch)+1.75rem)] glass-strong sm:pt-[calc(var(--arch)+2rem)] lg:pb-14'
                    : 'glass-rim rounded-[28px] glass',
            )}
        >
            {featured ? null : (
                // A faint ink veil: the side cards still refract the
                // colour behind them but step back from Lease.
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-ink/25"
                />
            )}
            {featured ? (
                <>
                    {/* Two-green rim, 1px, masked to a ring: bright at the crown, fading down the sides. */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -inset-px rounded-[inherit] p-px [-webkit-mask-composite:xor] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
                        style={{
                            background:
                                'linear-gradient(172deg, var(--color-mint), color-mix(in oklch, var(--color-lagoon) 75%, transparent) 36%, color-mix(in oklch, var(--color-mint) 16%, transparent) 68%, color-mix(in oklch, var(--color-lagoon) 45%, transparent))',
                        }}
                    />
                    {/* Light falling on the mirror: warm at the crown, one diagonal streak. */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
                        style={{
                            background:
                                'radial-gradient(95% 42% at 50% 0%, color-mix(in oklch, var(--color-mint) 20%, transparent), transparent 72%), linear-gradient(118deg, transparent 22%, oklch(1 0 0 / 0.055) 30%, transparent 39%), radial-gradient(80% 30% at 50% 100%, color-mix(in oklch, var(--color-lagoon) 12%, transparent), transparent 70%)',
                        }}
                    />
                    {/* Inner bevel, like the frame of a mirror. */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-2 rounded-[inherit] border border-white/[0.08]"
                    />
                </>
            ) : null}

            <div>
                <h3
                    id={titleId}
                    className="font-display text-[2.125rem] leading-none font-medium tracking-[-0.015em] text-bone"
                >
                    <Managed text={plan.name} />
                </h3>
                {featured && (plan.badge || plan.badgeNote) ? (
                    <p className="absolute inset-x-0 top-[calc(var(--arch)*0.46)] flex flex-col items-center gap-1.5 text-center">
                        {plan.badge ? (
                            <span
                                {...englishRun(locale, plan.badge)}
                                className="flex items-center gap-2.5 text-kicker font-medium text-mint uppercase"
                            >
                                <span
                                    aria-hidden
                                    className="h-px w-5 bg-mint/50"
                                />
                                {plan.badge}
                                <span
                                    aria-hidden
                                    className="h-px w-5 bg-mint/50"
                                />
                            </span>
                        ) : null}
                        {plan.badgeNote ? (
                            <span className="text-[12px] text-mist">
                                <Managed text={plan.badgeNote} />
                            </span>
                        ) : null}
                    </p>
                ) : null}
                <p className="mt-3 text-[15px] leading-snug text-pretty text-mist lg:min-h-[2lh]">
                    <Managed text={plan.blurb} />
                </p>

                <Price
                    amount={
                        plan.priceMode === 'custom'
                            ? null
                            : (plan.prices?.[currency] ?? null)
                    }
                    currency={currency}
                    per={plan.priceCaption}
                    className="mt-7"
                />
                <p aria-hidden className="mt-3 text-[13px] text-mist/90">
                    <Managed text={plan.priceCaption} />
                </p>

                <dl>
                    <Ledger detail={plan.detail} currency={currency} />
                </dl>

                <a
                    {...order.link({
                        source: `pricing-${plan.key}`,
                        plan: plan.key,
                    })}
                    className={cn(
                        cta({
                            variant: featured ? 'primary' : 'glass',
                            size: 'md',
                        }),
                        'mt-6 w-full',
                    )}
                >
                    <Managed text={plan.ctaLabel} />
                    {featured ? (
                        <ArrowRight
                            aria-hidden
                            className="size-4 rtl:-scale-x-100"
                        />
                    ) : null}
                </a>
            </div>

            <div className="mt-8 border-t border-white/10 md:mt-0 md:border-t-0 lg:mt-8 lg:border-t">
                {plan.featuresHeading ? (
                    <p
                        {...englishRun(locale, plan.featuresHeading)}
                        className="border-b border-white/[0.07] py-3 text-kicker font-medium text-mint uppercase rtl:text-right"
                    >
                        {plan.featuresHeading}
                    </p>
                ) : null}
                <ul>
                    {plan.features.map((feature, index) => (
                        <li
                            key={`${index}-${feature}`}
                            className="flex items-start gap-3 border-b border-white/[0.07] py-3 text-[15px] leading-snug text-mist last:border-b-0"
                        >
                            <Check
                                aria-hidden
                                strokeWidth={2.25}
                                className="mt-[3px] size-3.5 shrink-0 text-mint"
                            />
                            <span>
                                <Managed text={feature}>
                                    <Feature text={feature} />
                                </Managed>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </article>
    );
}

/** Line-drawn device: a portrait screen on a slim foot. */
function DeviceGlyph({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 46"
            fill="none"
            aria-hidden
            className={cn('h-11 w-auto text-mint', className)}
        >
            <rect
                x="3.5"
                y="1"
                width="17"
                height="33"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.2"
            />
            <rect
                x="6.5"
                y="5.5"
                width="11"
                height="22"
                rx="1"
                className="fill-mint/15"
            />
            <circle cx="12" cy="3.4" r="0.7" fill="currentColor" />
            <path
                d="M12 34v8M6 44.5h12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function Pricing() {
    const landing = useLanding();

    // No plans: no pricing section (and no links to it).
    if (!hasSection(landing, 'pricing')) {
        return null;
    }

    return <Plans />;
}

function Plans() {
    const { t } = useI18n();
    const { pricing } = useLanding();
    const label = useContent('sections.pricing.label');
    const title = useContent('sections.pricing.title');
    const lede = useContent('sections.pricing.lede');
    const note = useContent('sections.pricing.note');
    const faqTitle = useContent('sections.pricing.faq_title');
    const currencyLabel = useContent('sections.pricing.currency_label');
    const { currencies, plans, faqs } = pricing;
    const [picked, setCurrency] = useState(currencies[0]?.code ?? '');
    // The first currency on offer, until the visitor picks another.
    const currency = currencies.some(({ code }) => code === picked)
        ? picked
        : (currencies[0]?.code ?? '');
    const currencyName = currencies.find(({ code }) => code === currency)?.name;
    const archColumn = plans.findIndex((plan) => plan.featured);

    return (
        <section id="pricing" className="relative isolate py-24 md:py-36">
            <Glow
                color="lagoon"
                className="bottom-40 -left-48 size-[34rem] opacity-20"
            />
            <Container>
                <SectionHeader
                    index="06"
                    label={label}
                    title={<Accent text={title} />}
                    lede={lede}
                />

                {currencyName ? (
                    <p className="sr-only" aria-live="polite">
                        {t('pricing.pricesIn', { currency: currencyName })}
                    </p>
                ) : null}

                {/*
                 * Ledger band: the currency switch and the note sit over the
                 * two plain cards, so the arch rises between them wherever
                 * the featured plan is (the middle, as seeded).
                 */}
                <Reveal className="mt-16 grid gap-y-6 md:mt-20 lg:mt-28 lg:grid-cols-3 lg:items-end lg:gap-x-8">
                    {/* One currency on offer: nothing to switch. */}
                    {currencies.length > 1 ? (
                        <Segmented
                            className={
                                archColumn === 0 ? 'lg:col-start-2' : undefined
                            }
                            label={currencyLabel}
                            value={currency}
                            onChange={setCurrency}
                            options={currencies.map(({ code }) => ({
                                value: code,
                                label: code,
                            }))}
                        />
                    ) : null}
                    <div
                        className={cn(
                            'flex items-end gap-4',
                            archColumn === 2
                                ? 'lg:col-start-2'
                                : 'lg:col-start-3',
                        )}
                    >
                        <DeviceGlyph className="shrink-0" />
                        <p className="max-w-[32ch] text-[13px] leading-relaxed text-mist">
                            {note}
                        </p>
                    </div>
                </Reveal>

                <div className="relative isolate mt-12 grid gap-6 [--arch:6.5rem] sm:[--arch:8rem] lg:mt-10 lg:grid-cols-3 lg:items-start lg:gap-8 lg:[--arch:9rem]">
                    <Glow
                        color="mint"
                        className="-top-10 left-1/2 size-[30rem] -translate-x-1/2 opacity-30 lg:-top-24 lg:size-[36rem]"
                    />
                    {plans.map((plan, index) => (
                        <Reveal
                            key={plan.key}
                            delay={index * 90}
                            // Phones stack the arch first; from lg it rises
                            // above the row in its own column.
                            className={
                                plan.featured
                                    ? 'order-1 lg:order-none lg:-mt-[var(--arch)]'
                                    : 'order-2 lg:order-none'
                            }
                        >
                            <PlanCard plan={plan} currency={currency} />
                        </Reveal>
                    ))}
                </div>

                {faqs.length > 0 ? (
                    <Reveal className="mt-20 grid gap-y-8 md:mt-28 lg:grid-cols-12 lg:gap-x-8">
                        <p className="text-kicker font-medium text-smoke uppercase lg:col-span-3 lg:pt-5">
                            {faqTitle}
                        </p>
                        <dl className="grid gap-8 md:grid-cols-3 lg:col-span-9">
                            {faqs.map((item) => (
                                <div
                                    key={item.id}
                                    className="border-t border-white/10 pt-5"
                                >
                                    <dt className="text-[16px] font-medium text-bone">
                                        <Managed text={item.question} />
                                    </dt>
                                    <dd className="mt-2.5 text-[15px] leading-relaxed text-pretty text-mist">
                                        <Managed text={item.answer} />
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Reveal>
                ) : null}
            </Container>
        </section>
    );
}
