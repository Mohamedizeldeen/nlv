import { ArrowRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { parseAccent } from '@/components/admin/accent-text-input';
import { localeProps } from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import { cta } from '@/components/landing/primitives';
import { formatNumber } from '@/i18n/locales';
import { cn } from '@/lib/utils';
import type { PlanCardData } from '../types';

/*
 * The landing page's plan card (components/landing/sections/pricing.tsx),
 * redrawn for the admin: same glass, Bodoni figures, ruled ledger line and
 * arched "fitting-room mirror" for the featured plan, but sized by its
 * container instead of the viewport, so it reads the same in a three-card
 * row and in the editor's side column. Static: nothing here is a link.
 *
 * In Arabic the card is mirrored (right to left, Amiri titles, nothing
 * slanted), figures keep Western digits in their own LTR run, and the
 * currency code follows the number as Arabic reads it ("79 USD شهريًا").
 */

/** A currency code: Latin, tracked, even inside Arabic. */
function Code({ code, className }: { code: string; className?: string }) {
    return (
        <span lang="en" className={className}>
            {code}
        </span>
    );
}

function amountIn(
    prices: PlanCardData['prices'],
    currency: string,
): number | null {
    const amount = prices?.[currency];

    return typeof amount === 'number' && Number.isFinite(amount)
        ? amount
        : null;
}

/** Copy the editor has not filled in yet: a quiet stand-in. */
function Placeholder({ children }: { children: ReactNode }) {
    return <span className="text-smoke/70 italic">{children}</span>;
}

function Emphasis({ text }: { text: string }) {
    return (
        <>
            {parseAccent(text).map((part, index) =>
                part.accent ? (
                    <span
                        key={index}
                        className="font-medium text-bone tabular-nums"
                    >
                        {part.text}
                    </span>
                ) : (
                    <span key={index}>{part.text}</span>
                ),
            )}
        </>
    );
}

function Price({
    plan,
    currency,
    customPrice,
    locale,
}: {
    plan: PlanCardData;
    currency: string;
    customPrice: string;
    locale: ContentLocale;
}) {
    const figure =
        'font-display text-[2.75rem] leading-[0.9] font-medium tracking-[-0.02em] whitespace-nowrap text-bone @min-[23rem]:text-[3.25rem]';

    if (plan.priceMode === 'custom') {
        return (
            <p className="mt-7">
                <span
                    className={cn(
                        figure,
                        'block font-normal italic rtl:leading-[1.3] rtl:not-italic',
                    )}
                >
                    {customPrice || 'Let’s talk'}
                </span>
            </p>
        );
    }

    const amount = amountIn(plan.prices, currency);
    const code = (
        <Code
            code={currency}
            className="mt-[0.3rem] text-[12px] font-medium tracking-[0.22em] text-mist"
        />
    );

    return (
        <p className="mt-7 flex items-start gap-2.5">
            {locale === 'ar' ? null : code}
            {amount === null ? (
                <span
                    className={cn(figure, 'text-smoke/50')}
                    title={`No price in ${currency} yet`}
                >
                    —
                </span>
            ) : (
                <span className={cn(figure, 'tabular-nums bidi-ltr')}>
                    {formatNumber(locale, amount)}
                </span>
            )}
            {locale === 'ar' ? code : null}
        </p>
    );
}

function Ledger({
    detail,
    currency,
    locale,
}: {
    detail: PlanCardData['detail'];
    currency: string;
    locale: ContentLocale;
}) {
    if (detail.kind === 'none') {
        return null;
    }

    const money = detail.kind === 'prices';
    const amount = money ? amountIn(detail.prices, currency) : null;
    const figure = money
        ? amount === null
            ? '—'
            : formatNumber(locale, amount)
        : detail.value;
    const code = money ? (
        <Code
            code={currency}
            className="text-[11px] font-medium tracking-[0.2em] text-mist"
        />
    ) : null;

    return (
        <dl>
            <div className="mt-6 flex flex-col items-start gap-2.5 border-t border-white/10 pt-4 @min-[23rem]:flex-row @min-[23rem]:items-baseline @min-[23rem]:justify-between @min-[23rem]:gap-4">
                <dt className="text-kicker font-medium text-smoke uppercase">
                    {detail.label || <Placeholder>Label</Placeholder>}
                </dt>
                <dd className="flex items-baseline gap-1.5 text-[14px] text-mist">
                    {locale === 'ar' ? null : code}
                    <span
                        className={cn(
                            'font-display text-[1.625rem] leading-none font-medium tabular-nums bidi-ltr',
                            figure && figure !== '—'
                                ? 'text-bone'
                                : 'text-smoke/50',
                        )}
                    >
                        {figure || '—'}
                    </span>
                    {locale === 'ar' ? code : null}
                    {detail.caption ? <span>{detail.caption}</span> : null}
                </dd>
            </div>
        </dl>
    );
}

type PlanCardProps = {
    /** The card's texts, already in `locale`. */
    plan: PlanCardData;
    /** The currency the figures are shown in. */
    currency: string;
    /** The wording shown instead of a figure for a plan priced by quote. */
    customPrice: string;
    /** The page the card is drawn for: `/` (en) or `/ar` (ar). */
    locale?: ContentLocale;
    /** The card name's heading level (keep the page outline in order). */
    level?: 'h2' | 'h3';
    className?: string;
};

export function PlanCard({
    plan,
    currency,
    customPrice,
    locale = 'en',
    level: Heading = 'h3',
    className,
}: PlanCardProps) {
    const featured = plan.featured;
    const features = plan.features.filter((feature) => feature.trim());

    return (
        <div {...localeProps(locale)} className={cn('@container', className)}>
            <article
                className={cn(
                    'relative flex h-full flex-col p-6 [--arch:6rem] @min-[22rem]:p-7 @min-[22rem]:[--arch:7rem]',
                    featured
                        ? '[border-radius:50%_50%_24px_24px/var(--arch)_var(--arch)_24px_24px] pt-[calc(var(--arch)+1.5rem)] glass-strong @min-[22rem]:pt-[calc(var(--arch)+1.75rem)]'
                        : 'glass-rim rounded-[24px] glass',
                )}
            >
                {featured ? (
                    <>
                        {/* Two-green rim, bright at the crown, as on the landing. */}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute -inset-px rounded-[inherit] p-px [-webkit-mask-composite:xor] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
                            style={{
                                background:
                                    'linear-gradient(172deg, var(--color-mint), color-mix(in oklch, var(--color-lagoon) 75%, transparent) 36%, color-mix(in oklch, var(--color-mint) 16%, transparent) 68%, color-mix(in oklch, var(--color-lagoon) 45%, transparent))',
                            }}
                        />
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
                            style={{
                                background:
                                    'radial-gradient(95% 42% at 50% 0%, color-mix(in oklch, var(--color-mint) 20%, transparent), transparent 72%), linear-gradient(118deg, transparent 22%, oklch(1 0 0 / 0.055) 30%, transparent 39%), radial-gradient(80% 30% at 50% 100%, color-mix(in oklch, var(--color-lagoon) 12%, transparent), transparent 70%)',
                            }}
                        />
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-2 rounded-[inherit] border border-white/[0.08]"
                        />
                    </>
                ) : (
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-ink/25"
                    />
                )}

                <div>
                    <Heading className="font-display text-[2rem] leading-none font-medium tracking-[-0.015em] text-bone rtl:leading-[1.25]">
                        {plan.name || <Placeholder>Plan name</Placeholder>}
                    </Heading>
                    {featured && (plan.badge || plan.badgeNote) ? (
                        <p className="absolute inset-x-0 top-[calc(var(--arch)*0.46)] flex flex-col items-center gap-1.5 px-6 text-center">
                            {plan.badge ? (
                                <span className="flex items-center gap-2.5 text-kicker font-medium text-mint uppercase">
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
                                    {plan.badgeNote}
                                </span>
                            ) : null}
                        </p>
                    ) : null}
                    <p className="mt-3 min-h-[2lh] text-[15px] leading-snug text-pretty text-mist">
                        {plan.blurb || (
                            <Placeholder>
                                One line on who it is for.
                            </Placeholder>
                        )}
                    </p>

                    <Price
                        plan={plan}
                        currency={currency}
                        customPrice={customPrice}
                        locale={locale}
                    />
                    <p className="mt-3 text-[13px] text-mist/90">
                        {plan.priceCaption || (
                            <Placeholder>Price caption</Placeholder>
                        )}
                    </p>

                    <Ledger
                        detail={plan.detail}
                        currency={currency}
                        locale={locale}
                    />

                    <span
                        aria-hidden
                        className={cn(
                            cta({
                                variant: featured ? 'primary' : 'glass',
                                size: 'md',
                            }),
                            'pointer-events-none mt-6 w-full hover:translate-y-0',
                        )}
                    >
                        {plan.ctaLabel || 'Button label'}
                        {featured ? (
                            <ArrowRight className="size-4 rtl:-scale-x-100" />
                        ) : null}
                    </span>
                </div>

                <div className="mt-8 border-t border-white/10">
                    {plan.featuresHeading ? (
                        <p className="border-b border-white/[0.07] py-3 text-kicker font-medium text-mint uppercase">
                            {plan.featuresHeading}
                        </p>
                    ) : null}
                    {features.length ? (
                        <ul>
                            {features.map((feature, index) => (
                                <li
                                    key={`${index}-${feature}`}
                                    className="flex items-start gap-3 border-b border-white/[0.07] py-3 text-[15px] leading-snug text-mist last:border-b-0"
                                >
                                    <Check
                                        aria-hidden
                                        strokeWidth={2.25}
                                        className="mt-[3px] size-3.5 shrink-0 text-mint"
                                    />
                                    <span className="min-w-0 break-words">
                                        <Emphasis text={feature} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="py-3 text-[14px]">
                            <Placeholder>No features listed.</Placeholder>
                        </p>
                    )}
                </div>
            </article>
        </div>
    );
}
