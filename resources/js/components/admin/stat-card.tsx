import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from './format';

const InGroup = createContext(false);

type StatCardProps = {
    label: string;
    value: number | string;
    /** A short line under the figure: "last 7 days", "of 212 leads". */
    note?: ReactNode;
    /** Makes the whole card a link to the list behind the number. */
    href?: string;
    /** `mint` colours the figure: use it for numbers that need action. */
    tone?: 'default' | 'mint';
    className?: string;
};

/**
 * One headline number, set like the landing's prices: spaced-caps label,
 * a Bodoni figure, a quiet note. Inside <StatGroup> it becomes a cell of a
 * shared glass strip; on its own it is a glass card.
 */
export function StatCard({
    label,
    value,
    note,
    href,
    tone = 'default',
    className,
}: StatCardProps) {
    const grouped = useContext(InGroup);
    const figure = typeof value === 'number' ? formatNumber(value) : value;

    const body = (
        <>
            <span className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                    {label}
                </span>
                {href ? (
                    <ArrowUpRight
                        aria-hidden
                        className="-mt-0.5 size-4 shrink-0 text-smoke transition-[translate,color] duration-[380ms] ease-glass group-hover/stat:translate-x-0.5 group-hover/stat:-translate-y-0.5 group-hover/stat:text-mint"
                    />
                ) : null}
            </span>
            <span
                className={cn(
                    'mt-4 block font-display text-[2.75rem] leading-none font-medium tracking-[-0.02em]',
                    tone === 'mint' ? 'text-mint' : 'text-bone',
                )}
            >
                {figure}
            </span>
            {note ? (
                <span className="mt-2.5 block text-[13px] leading-snug text-smoke">
                    {note}
                </span>
            ) : null}
        </>
    );

    const frame = cn(
        'group/stat relative flex min-w-0 flex-col p-5 sm:p-6',
        grouped ? '' : 'glass-rim rounded-[24px] glass',
        href &&
            'transition-colors duration-[380ms] ease-glass hover:bg-white/[0.04] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none focus-visible:ring-inset',
        className,
    );

    return href ? (
        <Link href={href} className={frame}>
            {body}
        </Link>
    ) : (
        <div className={frame}>{body}</div>
    );
}

/**
 * A glass strip of <StatCard>s divided by hairlines: 2 per row on phones,
 * all in one row from `md` (up to 4 fit comfortably).
 */
export function StatGroup({
    children,
    label,
    className,
}: {
    children: ReactNode;
    /** Accessible name for the group, e.g. "Leads at a glance". */
    label?: string;
    className?: string;
}) {
    return (
        <InGroup value>
            <section
                aria-label={label}
                className={cn(
                    'glass-rim relative grid grid-cols-2 overflow-hidden rounded-[24px] glass md:auto-cols-fr md:grid-flow-col md:grid-cols-none',
                    // Hairlines between cells: vertical within a row, horizontal between rows.
                    '[&>*]:border-white/10 md:[&>*+*]:border-l max-md:[&>*:nth-child(even)]:border-l max-md:[&>*:nth-child(n+3)]:border-t',
                    className,
                )}
            >
                {children}
            </section>
        </InGroup>
    );
}
