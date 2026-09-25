import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUp, Check } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { useLandingLinks } from '../links';
import { Container, cta, Glow, Reveal, SectionHeader } from '../primitives';

// Placeholder content: replace before launch.
// Prices, plan limits, the "most chosen" share, the average cost of a
// return and the kiosk hardware prices are all placeholders.

const CURRENCIES = ['USD', 'SAR', 'AED'] as const;
type Currency = (typeof CURRENCIES)[number];
type Billing = 'monthly' | 'yearly';
type Amounts = Record<Currency, number>;
type PlanId = 'starter' | 'growth' | 'pro';

/** Per-month prices; yearly shows the per-month equivalent. */
const PRICES: Record<PlanId, Record<Billing, Amounts>> = {
    starter: {
        monthly: { USD: 79, SAR: 299, AED: 289 },
        yearly: { USD: 65, SAR: 249, AED: 239 },
    },
    growth: {
        monthly: { USD: 249, SAR: 939, AED: 919 },
        yearly: { USD: 207, SAR: 779, AED: 765 },
    },
    pro: {
        monthly: { USD: 699, SAR: 2629, AED: 2569 },
        yearly: { USD: 582, SAR: 2189, AED: 2139 },
    },
};

/** Average cost of one returned order: shipping both ways, inspection, repackaging. */
const RETURN_COST: Amounts = { USD: 28, SAR: 106, AED: 103 };

const KIOSK_HARDWARE: { buy: Amounts; lease: Amounts } = {
    buy: { USD: 3900, SAR: 14600, AED: 14300 },
    lease: { USD: 190, SAR: 715, AED: 699 },
};

const MOST_CHOSEN_NOTE = 'by 6 in 10 new stores';

type Feature = { figure?: string; text: string };

type Plan = {
    id: PlanId;
    name: string;
    audience: string;
    features: Feature[];
};

const PLANS: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        audience: 'For a single online store finding its fit.',
        features: [
            { figure: '1,000', text: 'try-ons a month' },
            { text: 'Web widget on every product page' },
            { figure: '1', text: 'storefront' },
            { text: 'Email support in Arabic and English' },
        ],
    },
    {
        id: 'growth',
        name: 'Growth',
        audience: 'For brands selling online and in one store.',
        features: [
            { figure: '10,000', text: 'try-ons a month' },
            { figure: '1', text: 'kiosk licence' },
            { text: 'Size advice from a single photo' },
            { text: 'Shopify app and REST API' },
            { text: 'Returns analytics by product and size' },
            { text: 'Priority chat support' },
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        audience: 'For multi-store retailers and eyewear chains.',
        features: [
            { figure: '50,000', text: 'try-ons a month' },
            { figure: 'Up to 5', text: 'kiosk licences' },
            { text: 'Eyewear PD measurement' },
            { text: 'SSO and audit log' },
            { text: 'A dedicated success manager' },
            { figure: '99.9%', text: 'uptime SLA' },
        ],
    },
];

const QUESTIONS = [
    {
        q: 'What counts as a try-on?',
        a: 'One finished render: one shopper, one piece. Switching the size on a look you have already rendered doesn’t count again.',
    },
    {
        q: 'Do you keep customer photos?',
        a: 'No. Photos are deleted when the session ends. A render is kept only if the shopper saves the look.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes, from your dashboard, with no call to book. Monthly plans stop at the end of the month; yearly plans simply don’t renew.',
    },
];

const number = new Intl.NumberFormat('en-US');

const CURRENCY_NAMES: Record<Currency, string> = {
    USD: 'US dollars',
    SAR: 'Saudi riyals',
    AED: 'UAE dirhams',
};

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
        <span
            ref={ref}
            aria-hidden
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
 * Glass segmented control with a sliding champagne indicator. It is a
 * radio group: arrow keys move the choice, Tab leaves the group.
 */
function Segmented<T extends string>({
    label,
    options,
    value,
    onChange,
    note,
}: {
    label: string;
    options: readonly Option<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Small annotation attached above the last option. */
    note?: string;
}) {
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
        const moves: Record<string, number> = {
            ArrowRight: forward,
            ArrowDown: forward,
            ArrowLeft: back,
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
    const left = (active / count) * 100;
    const right = ((count - 1 - active) / count) * 100;

    return (
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3">
            <span
                id={labelId}
                className="text-kicker font-medium text-mist uppercase"
            >
                {label}
            </span>
            <div className="relative w-full max-w-64 rounded-[16px] p-1 glass-thin has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-champagne/70 lg:max-w-[13.5rem]">
                {note ? (
                    // A dimension bracket over the last option, drawn like
                    // the measurement lines elsewhere on the page.
                    <span
                        aria-hidden
                        className="absolute bottom-full mb-1.5 flex flex-col items-center gap-1.5"
                        style={{
                            left: `calc(0.25rem + (100% - 0.5rem) * ${(count - 1) / count})`,
                            width: `calc((100% - 0.5rem) / ${count})`,
                        }}
                    >
                        <span className="text-[11px] leading-none font-medium tracking-[0.04em] whitespace-nowrap text-champagne">
                            {note}
                        </span>
                        <span className="h-1.5 w-[calc(100%-1rem)] rounded-t-[2px] border-x border-t border-champagne/55" />
                    </span>
                ) : null}
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
                                    'h-10 cursor-pointer rounded-[12px] px-3 text-sm font-medium tracking-[0.01em] transition-colors duration-300 ease-glass focus-visible:outline-none',
                                    selected
                                        ? 'text-bone'
                                        : 'text-mist hover:bg-white/[0.06] hover:text-bone',
                                )}
                            >
                                {option.label}
                                {index === count - 1 && note ? (
                                    <span className="sr-only">, {note}</span>
                                ) : null}
                            </button>
                        );
                    })}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 grid rounded-[12px] bg-champagne shadow-[inset_0_1px_0_oklch(1_0_0/0.55)] transition-[clip-path] duration-500 ease-glass"
                        style={{
                            ...columns,
                            clipPath: `inset(0 ${right}% 0 ${left}% round 12px)`,
                        }}
                    >
                        {options.map((option) => (
                            <span
                                key={option.value}
                                className="grid h-10 place-items-center px-3 text-sm font-medium tracking-[0.01em] text-ink"
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

/** A price set like a couture ticket: small currency code, Bodoni figure. */
function Price({
    amount,
    currency,
    className,
}: {
    amount: number;
    currency: Currency;
    className?: string;
}) {
    return (
        <p className={cn('flex items-start gap-2.5', className)}>
            <Rolling
                text={currency}
                className="mt-[0.3rem] text-[12px] font-medium tracking-[0.22em] text-mist"
            />
            <Rolling
                text={number.format(amount)}
                className="font-display text-[3.5rem] leading-[0.9] font-medium tracking-[-0.02em] text-bone tabular-nums sm:text-[3.75rem]"
            />
            <span className="sr-only">
                {currency} {number.format(amount)} per month
            </span>
        </p>
    );
}

/** The dagger note behind every "covers its cost" line. */
function ReturnNote({
    currency,
    className,
}: {
    currency: Currency;
    className?: string;
}) {
    return (
        <p
            className={cn(
                'text-[13px] leading-relaxed text-pretty text-mist/85',
                className,
            )}
        >
            <span className="text-champagne">†</span> At an average of{' '}
            <span className="text-bone tabular-nums">
                {currency} {number.format(RETURN_COST[currency])}
            </span>{' '}
            per returned order: shipping both ways, inspection and repackaging.
            Your own figure appears in the analytics dashboard from week one.
        </p>
    );
}

/** Line-drawn kiosk: a portrait screen on a slim foot. */
function KioskGlyph({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 46"
            fill="none"
            aria-hidden
            className={cn('h-11 w-auto text-champagne', className)}
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
                className="fill-champagne/15"
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

/** One plan. Growth is drawn as the arched fitting-room mirror. */
function PlanCard({
    plan,
    billing,
    currency,
}: {
    plan: Plan;
    billing: Billing;
    currency: Currency;
}) {
    const links = useLandingLinks();
    const amount = PRICES[plan.id][billing][currency];
    const breakEven = Math.ceil(amount / RETURN_COST[currency]);
    const featured = plan.id === 'growth';
    const titleId = `pricing-plan-${plan.id}`;

    const action =
        plan.id === 'pro' ? (
            <a
                href="#demo"
                className={cn(cta({ variant: 'glass', size: 'md' }), 'w-full')}
            >
                Talk to sales
            </a>
        ) : (
            <Link
                href={links.start}
                className={cn(
                    cta({
                        variant: featured ? 'gold' : 'glass',
                        size: 'md',
                    }),
                    'w-full',
                )}
            >
                Start free trial
                {featured ? (
                    <ArrowRight aria-hidden className="size-4" />
                ) : null}
            </Link>
        );

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
                // colour behind them but step back from Growth.
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-ink/25"
                />
            )}
            {featured ? (
                <>
                    {/* Champagne to rose rim, 1px, masked to a ring. */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -inset-px rounded-[inherit] p-px [-webkit-mask-composite:xor] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
                        style={{
                            background:
                                'linear-gradient(170deg, var(--color-champagne), oklch(0.8 0.1 355 / 0.85) 38%, oklch(0.86 0.075 82 / 0.18) 70%, oklch(0.8 0.1 355 / 0.45))',
                        }}
                    />
                    {/* Light falling on the mirror: warm at the crown, one diagonal streak. */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
                        style={{
                            background:
                                'radial-gradient(95% 42% at 50% 0%, oklch(0.86 0.075 82 / 0.2), transparent 72%), linear-gradient(118deg, transparent 22%, oklch(1 0 0 / 0.055) 30%, transparent 39%), radial-gradient(80% 30% at 50% 100%, oklch(0.8 0.1 355 / 0.1), transparent 70%)',
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
                    {plan.name}
                </h3>
                {featured ? (
                    <p className="absolute inset-x-0 top-[calc(var(--arch)*0.46)] flex flex-col items-center gap-1.5 text-center">
                        <span className="flex items-center gap-2.5 text-kicker font-medium text-champagne uppercase">
                            <span
                                aria-hidden
                                className="h-px w-5 bg-champagne/50"
                            />
                            Most chosen
                            <span
                                aria-hidden
                                className="h-px w-5 bg-champagne/50"
                            />
                        </span>
                        <span className="text-[12px] text-mist">
                            {MOST_CHOSEN_NOTE}
                        </span>
                    </p>
                ) : null}
                <p className="mt-3 text-[15px] leading-snug text-pretty text-mist lg:min-h-[2lh]">
                    {plan.audience}
                </p>

                <Price amount={amount} currency={currency} className="mt-7" />
                <p className="mt-3 text-[13px] text-mist/90 tabular-nums">
                    {billing === 'yearly' ? (
                        <>
                            per month · {currency} {number.format(amount * 12)}{' '}
                            billed yearly
                        </>
                    ) : (
                        'per month · billed monthly'
                    )}
                </p>

                <p className="mt-6 border-t border-white/10 pt-4 text-[14px] leading-snug text-mist">
                    Covers its cost at{' '}
                    <span className="font-medium text-champagne tabular-nums">
                        {breakEven}
                    </span>{' '}
                    fewer returns a month
                    <sup className="text-champagne">†</sup>
                </p>

                <div className="mt-6">{action}</div>
            </div>

            <ul className="mt-8 border-t border-white/10 md:mt-0 md:border-t-0 lg:mt-8 lg:border-t">
                {plan.features.map((feature) => (
                    <li
                        key={feature.text}
                        className="flex items-start gap-3 border-b border-white/[0.07] py-3 text-[15px] leading-snug text-mist last:border-b-0"
                    >
                        <Check
                            aria-hidden
                            strokeWidth={2.25}
                            className="mt-[3px] size-3.5 shrink-0 text-champagne"
                        />
                        <span>
                            {feature.figure ? (
                                <span className="font-medium text-bone tabular-nums">
                                    {feature.figure}{' '}
                                </span>
                            ) : null}
                            {feature.text}
                        </span>
                    </li>
                ))}
            </ul>
        </article>
    );
}

export default function Pricing() {
    const [billing, setBilling] = useState<Billing>('monthly');
    const [currency, setCurrency] = useState<Currency>('USD');

    return (
        <section id="pricing" className="relative isolate py-24 md:py-36">
            <Glow
                color="rose"
                className="bottom-40 -left-48 size-[34rem] opacity-25"
            />
            <Container>
                <SectionHeader
                    index="06"
                    label="Pricing"
                    labelAr="الأسعار"
                    title={
                        <>
                            Plans that pay for themselves <em>in returns.</em>
                        </>
                    }
                    lede="Every plan includes the web widget, Arabic and English interfaces and the analytics dashboard. Kiosk hardware is sold or leased separately."
                />

                <p className="sr-only" aria-live="polite">
                    Prices in {CURRENCY_NAMES[currency]}, billed {billing}.
                </p>

                {/* Ledger band: controls over Starter, the arch rises through the middle. */}
                <Reveal className="mt-16 grid gap-y-6 md:mt-20 lg:grid-cols-3 lg:gap-x-8">
                    <div className="flex flex-col gap-3 pt-6">
                        <Segmented
                            label="Billing"
                            value={billing}
                            onChange={setBilling}
                            note="2 months free"
                            options={[
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'yearly', label: 'Yearly' },
                            ]}
                        />
                        <Segmented
                            label="Currency"
                            value={currency}
                            onChange={setCurrency}
                            options={CURRENCIES.map((code) => ({
                                value: code,
                                label: code,
                            }))}
                        />
                    </div>
                    <p className="max-w-[30ch] text-[13px] leading-relaxed text-mist lg:col-start-3 lg:self-end">
                        Prices per month, excluding VAT. Every plan starts with
                        14 days free, no card required.
                    </p>
                </Reveal>

                <div className="relative isolate mt-12 grid gap-6 [--arch:6.5rem] sm:[--arch:8rem] lg:mt-10 lg:grid-cols-3 lg:items-start lg:gap-8 lg:[--arch:9rem]">
                    <Glow
                        color="champagne"
                        className="-top-10 left-1/2 size-[30rem] -translate-x-1/2 opacity-35 lg:-top-24 lg:size-[36rem]"
                    />
                    <Reveal className="order-2 lg:order-none">
                        <PlanCard
                            plan={PLANS[0]}
                            billing={billing}
                            currency={currency}
                        />
                        {/* The shortest column carries the footnote, as in print. */}
                        <ReturnNote
                            currency={currency}
                            className="mt-8 hidden lg:block"
                        />
                    </Reveal>
                    <Reveal
                        delay={90}
                        className="order-1 lg:order-none lg:-mt-[var(--arch)]"
                    >
                        <PlanCard
                            plan={PLANS[1]}
                            billing={billing}
                            currency={currency}
                        />
                    </Reveal>
                    <Reveal delay={180} className="order-3 lg:order-none">
                        <PlanCard
                            plan={PLANS[2]}
                            billing={billing}
                            currency={currency}
                        />
                    </Reveal>
                </div>

                <ReturnNote
                    currency={currency}
                    className="mt-10 max-w-[70ch] lg:hidden"
                />

                <Reveal className="mt-6 lg:mt-16">
                    <div className="glass-rim relative grid items-center gap-x-8 gap-y-5 rounded-[24px] px-6 py-6 glass sm:px-8 lg:grid-cols-12 lg:py-5">
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-ink/25"
                        />
                        <div className="flex items-center gap-5 lg:col-span-5">
                            <KioskGlyph className="shrink-0" />
                            <div>
                                <p className="text-kicker font-medium text-mist uppercase">
                                    Kiosk hardware
                                </p>
                                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px] text-mist">
                                    <span className="text-bone">From</span>
                                    <span className="inline-flex items-baseline gap-1.5 text-bone">
                                        <Rolling
                                            text={currency}
                                            className="text-[11px] font-medium tracking-[0.2em] text-mist"
                                        />
                                        <Rolling
                                            text={number.format(
                                                KIOSK_HARDWARE.buy[currency],
                                            )}
                                            className="font-display text-[1.75rem] leading-none font-medium tabular-nums"
                                        />
                                        <span className="sr-only">
                                            {currency}{' '}
                                            {number.format(
                                                KIOSK_HARDWARE.buy[currency],
                                            )}
                                        </span>
                                    </span>
                                    <span>
                                        or {currency}{' '}
                                        <span className="text-bone tabular-nums">
                                            {number.format(
                                                KIOSK_HARDWARE.lease[currency],
                                            )}
                                        </span>{' '}
                                        a month on lease
                                    </span>
                                </p>
                            </div>
                        </div>
                        <p className="text-[15px] leading-relaxed text-pretty text-mist lg:col-span-5">
                            Installed and calibrated by our own team in KSA,
                            UAE, Qatar, Kuwait, Bahrain and Oman.
                        </p>
                        <a
                            href="#kiosk"
                            className={cn(
                                cta({ variant: 'ghost', size: 'sm' }),
                                'justify-self-start px-0 focus-visible:ring-offset-0 lg:col-span-2 lg:justify-self-end',
                            )}
                        >
                            See the kiosk
                            <ArrowUp aria-hidden className="size-4" />
                        </a>
                    </div>
                </Reveal>

                <Reveal className="mt-20 grid gap-y-8 md:mt-28 lg:grid-cols-12 lg:gap-x-8">
                    <p className="text-kicker font-medium text-smoke uppercase lg:col-span-3 lg:pt-5">
                        Asked at every demo
                    </p>
                    <dl className="grid gap-8 md:grid-cols-3 lg:col-span-9">
                        {QUESTIONS.map((item) => (
                            <div
                                key={item.q}
                                className="border-t border-white/10 pt-5"
                            >
                                <dt className="text-[16px] font-medium text-bone">
                                    {item.q}
                                </dt>
                                <dd className="mt-2.5 text-[15px] leading-relaxed text-pretty text-mist">
                                    {item.a}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Reveal>
            </Container>
        </section>
    );
}
