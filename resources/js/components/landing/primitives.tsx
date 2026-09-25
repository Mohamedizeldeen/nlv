import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from './brand';

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
    'relative inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-[translate,background-color,box-shadow,color] duration-[380ms] ease-glass select-none focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                gold: 'bg-champagne text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6),0_10px_30px_-10px_oklch(0.86_0.075_82/0.55)] hover:-translate-y-0.5 hover:bg-[oklch(0.9_0.07_84)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.7),0_18px_44px_-12px_oklch(0.86_0.075_82/0.7)]',
                glass: 'text-bone glass-thin hover:-translate-y-0.5 hover:bg-white/[0.16]',
                ghost: 'text-mist hover:text-bone',
            },
            size: {
                sm: 'h-10 rounded-[14px] px-4 text-sm',
                md: 'h-12 rounded-[20px] px-6 text-[15px]',
                lg: 'h-14 rounded-[20px] px-7 text-base',
            },
        },
        defaultVariants: { variant: 'gold', size: 'md' },
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
    /** Arabic counterpart of `label`. */
    labelAr: string;
    /** Wrap accent words in <em> for the italic champagne treatment. */
    title: ReactNode;
    lede?: ReactNode;
    className?: string;
};

/**
 * Editorial section opener: a hairline rule carrying the section index and
 * a bilingual label, then a left-set display title with the lede pushed to
 * the right column.
 */
export function SectionHeader({
    index,
    label,
    labelAr,
    title,
    lede,
    className,
}: SectionHeaderProps) {
    return (
        <Reveal
            as="header"
            className={cn(
                'grid gap-y-8 border-t border-white/10 pt-5 md:grid-cols-12 md:gap-x-8',
                className,
            )}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 md:col-span-12">
                <p className="text-kicker font-medium whitespace-nowrap text-smoke uppercase">
                    <span className="text-bone">N° {index}</span>
                    <span className="mx-3 text-white/25">—</span>
                    {label}
                </p>
                <p
                    lang="ar"
                    dir="rtl"
                    className="font-arabic text-lg whitespace-nowrap text-smoke"
                >
                    {labelAr}
                </p>
            </div>
            <h2 className="font-display text-display-lg font-medium text-balance text-bone md:col-span-8 [&_em]:font-normal [&_em]:text-champagne">
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
    amethyst: 'bg-amethyst',
    lagoon: 'bg-lagoon',
    coral: 'bg-coral',
    rose: 'bg-rose',
    champagne: 'bg-champagne',
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
            <div className="absolute -top-[25%] -left-[20%] size-[70vmax] animate-drift-a rounded-full bg-amethyst opacity-40 blur-[80px] will-change-transform md:blur-[120px]" />
            <div className="absolute top-[15%] -right-[25%] size-[60vmax] animate-drift-b rounded-full bg-lagoon opacity-30 blur-[80px] will-change-transform md:blur-[120px]" />
            <div className="absolute -bottom-[30%] left-[0%] size-[55vmax] animate-drift-c rounded-full bg-coral opacity-25 blur-[80px] will-change-transform md:blur-[120px]" />
            <div className="absolute right-[5%] bottom-[0%] size-[34vmax] animate-drift-a rounded-full bg-rose opacity-20 blur-[70px] will-change-transform [animation-direction:reverse] [animation-duration:26s] md:blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_30%,var(--color-ink)_95%)]" />
            <div className="absolute inset-0 grain opacity-[0.06] mix-blend-overlay" />
        </div>
    );
}

/**
 * Brand glyph: an arched fitting-room mirror, half of it already "tried on".
 */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden
            className={cn('size-7', className)}
        >
            <path
                d="M16 4a10 10 0 0 1 10 10v15H16z"
                className="fill-champagne"
            />
            <path
                d="M6 29V14a10 10 0 0 1 20 0v15z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M16 4v25" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    );
}

export function Wordmark({ className }: { className?: string }) {
    return (
        <span
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

/** Inline Arabic text with the right language, direction and face. */
export function Arabic({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <span lang="ar" dir="rtl" className={cn('font-arabic', className)}>
            {children}
        </span>
    );
}
