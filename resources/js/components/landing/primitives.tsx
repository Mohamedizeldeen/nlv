import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { BRAND } from './brand';
import { messageParts } from './message-parts';

/** Page-width wrapper shared by every section. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12',
                className,
            )}
            {...props}
        />
    );
}

const glass = cva('relative', {
    variants: {
        variant: {
            default: 'glass',
            strong: 'glass-strong',
            thin: 'glass-thin',
        },
        rim: {
            true: 'glass-rim',
            false: '',
        },
    },
    defaultVariants: { variant: 'default', rim: true },
});

type GlassProps = ComponentProps<'div'> & VariantProps<typeof glass>;

/**
 * Frosted surface; pass `rounded-*` in className (cards use 24-32px,
 * chips 14-16px). The same look is available as the `glass`, `glass-strong`,
 * `glass-thin` and `glass-rim` utilities for non-div elements.
 */
export function Glass({ variant, rim, className, ...props }: GlassProps) {
    return (
        <div className={cn(glass({ variant, rim }), className)} {...props} />
    );
}

/** Class builder for links and buttons; apply to <Link>, <a> or <button>. */
export const cta = cva(
    'relative inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-[translate,background-color,box-shadow,color] duration-[380ms] ease-glass select-none focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary:
                    'bg-mint text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6),0_10px_30px_-10px_oklch(0.84_0.12_160/0.55)] hover:-translate-y-0.5 hover:bg-[oklch(0.88_0.11_160)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.7),0_18px_44px_-12px_oklch(0.84_0.12_160/0.7)]',
                glass: 'text-bone glass-thin hover:-translate-y-0.5 hover:bg-white/[0.16]',
                ghost: 'text-mist hover:text-bone',
            },
            size: {
                sm: 'h-10 rounded-[14px] px-4 text-sm',
                md: 'h-12 rounded-[20px] px-6 text-[15px]',
                lg: 'h-14 rounded-[20px] px-7 text-base',
            },
        },
        defaultVariants: { variant: 'primary', size: 'md' },
    },
);

/**
 * Reports whether an element has entered the viewport. Returns a callback
 * ref to attach to the element.
 */
export function useInView({
    once = true,
    rootMargin = '0px 0px -10% 0px',
    threshold = 0,
}: { once?: boolean; rootMargin?: string; threshold?: number } = {}) {
    const [node, setNode] = useState<Element | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);

                    if (once) {
                        observer.disconnect();
                    }
                } else if (!once) {
                    setInView(false);
                }
            },
            { rootMargin, threshold },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [node, once, rootMargin, threshold]);

    return [setNode, inView] as const;
}

type RevealProps = {
    as?: 'div' | 'section' | 'header' | 'article' | 'li' | 'figure' | 'p';
    /** Stagger in milliseconds. */
    delay?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    id?: string;
};

/** Fades and rises its children in once they scroll into view. */
export function Reveal({
    as: Tag = 'div',
    delay = 0,
    className,
    style,
    children,
    id,
}: RevealProps) {
    const [ref, shown] = useInView();

    return (
        <Tag
            ref={ref}
            id={id}
            data-shown={shown}
            className={cn('reveal', className)}
            style={
                { '--reveal-delay': `${delay}ms`, ...style } as CSSProperties
            }
        >
            {children}
        </Tag>
    );
}

type SectionHeaderProps = {
    /** Two-digit section number, e.g. "03". */
    index: string;
    label: string;
    /** Wrap accent words in <em> for the italic mint treatment. */
    title: ReactNode;
    lede?: ReactNode;
    className?: string;
};

/**
 * Editorial section opener: a hairline rule carrying the section index and
 * label, then a display title set from the reading side with the lede
 * pushed to the far column. On the Arabic page the grid mirrors by itself
 * (the title on the right); the index drops its "N°" and the title's
 * lines open up for Amiri's marks.
 */
export function SectionHeader({
    index,
    label,
    title,
    lede,
    className,
}: SectionHeaderProps) {
    const { t } = useI18n();

    return (
        <Reveal
            as="header"
            className={cn(
                'grid gap-y-8 border-t border-white/10 pt-5 md:grid-cols-12 md:gap-x-8',
                className,
            )}
        >
            <p className="text-kicker font-medium whitespace-nowrap text-smoke uppercase md:col-span-12">
                <span className="text-bone">
                    {messageParts(t, 'common.sectionIndex', { index })}
                </span>
                <span aria-hidden className="mx-3 text-white/25">
                    —
                </span>
                {label}
            </p>
            <h2 className="font-display text-display-lg font-medium text-balance text-bone md:col-span-8 rtl:leading-[1.3] [&_em]:font-normal [&_em]:text-mint">
                {title}
            </h2>
            {lede ? (
                <div className="text-[17px] leading-relaxed text-pretty text-mist md:col-span-4 md:self-end">
                    {lede}
                </div>
            ) : null}
        </Reveal>
    );
}

const glowColor = {
    jade: 'bg-jade',
    lagoon: 'bg-lagoon',
    coral: 'bg-coral',
    rose: 'bg-rose',
    mint: 'bg-mint',
} as const;

/**
 * A soft coloured light for a section. The parent needs `relative isolate`;
 * size and position it with className (e.g. "-left-40 top-10 size-[36rem]").
 */
export function Glow({
    color,
    className,
}: {
    color: keyof typeof glowColor;
    className?: string;
}) {
    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none absolute -z-10 rounded-full opacity-40 blur-[70px] md:blur-[110px]',
                glowColor[color],
                className,
            )}
        />
    );
}

/** Fixed, slowly drifting colour field that every glass surface refracts. */
export function Atmosphere() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
            <div className="absolute -top-[25%] -left-[20%] size-[70vmax] animate-drift-a rounded-full bg-jade opacity-40 blur-[80px] will-change-transform md:blur-[120px]" />
            <div className="absolute top-[15%] -right-[25%] size-[60vmax] animate-drift-b rounded-full bg-lagoon opacity-30 blur-[80px] will-change-transform md:blur-[120px]" />
            <div className="absolute -bottom-[30%] left-[0%] size-[55vmax] animate-drift-c rounded-full bg-jade opacity-30 blur-[80px] will-change-transform md:blur-[120px]" />
            <div className="absolute right-[5%] bottom-[0%] size-[34vmax] animate-drift-a rounded-full bg-lagoon opacity-20 blur-[70px] will-change-transform [animation-direction:reverse] [animation-duration:26s] md:blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_30%,var(--color-ink)_95%)]" />
            <div className="absolute inset-0 grain opacity-[0.06] mix-blend-overlay" />
        </div>
    );
}

/**
 * The brand logo (white on transparent). Size it by height only, e.g.
 * "h-5"; the width follows the logo's proportions.
 */
export function LogoMark({ className }: { className?: string }) {
    return (
        <img
            src={BRAND.logo.src}
            width={BRAND.logo.width}
            height={BRAND.logo.height}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            className={cn('h-6 w-auto shrink-0 object-contain', className)}
        />
    );
}

/**
 * The logo and the product name: a lockup, so it keeps its left-to-right
 * order on the Arabic page too.
 */
export function Wordmark({ className }: { className?: string }) {
    return (
        <span
            dir="ltr"
            className={cn(
                'inline-flex items-center gap-2.5 text-bone',
                className,
            )}
        >
            <LogoMark />
            <span className="font-display text-[1.5rem] leading-none font-medium tracking-[-0.02em]">
                {BRAND.name}
            </span>
        </span>
    );
}
