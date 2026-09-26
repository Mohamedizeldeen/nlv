import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { button } from './button';

const CORNERS = [
    'top-0 left-0 border-t border-l',
    'top-0 right-0 border-t border-r',
    'bottom-0 left-0 border-b border-l',
    'right-0 bottom-0 border-r border-b',
] as const;

/**
 * "Nothing here yet", framed by the try-on scan brackets from the landing
 * page. The title is Bodoni; wrap a word in <em> for the mint italic.
 */
export function EmptyState({
    title,
    description,
    action,
    compact = false,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    /** Usually one button or link, e.g. "Add the first story". */
    action?: ReactNode;
    /** Less padding, for empty tables and side panels. */
    compact?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                // Inset on phones so the brackets never touch a panel's edge.
                'relative mx-5 flex max-w-[34rem] flex-col items-center text-center sm:mx-auto',
                compact ? 'px-6 py-8' : 'px-8 py-14',
                className,
            )}
        >
            {CORNERS.map((corner) => (
                <span
                    key={corner}
                    aria-hidden
                    className={cn('absolute size-4 border-mint/50', corner)}
                />
            ))}
            <p
                className={cn(
                    'font-display font-medium text-balance text-bone [&_em]:font-normal [&_em]:text-mint',
                    compact
                        ? 'text-[1.35rem] leading-tight'
                        : 'text-[1.75rem] leading-[1.1]',
                )}
            >
                {title}
            </p>
            {description ? (
                <div className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-pretty text-smoke">
                    {description}
                </div>
            ) : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}

/**
 * The one "nothing matches" state of every filtered list: "No looks
 * *match.*", a line on what to try, and Clear filters. Compact, with room
 * above and below so the brackets clear an edge-to-edge panel.
 */
export function NoMatches({
    noun,
    clearHref,
    description = 'Try fewer words or other filters, or clear them to see the full list.',
    className,
}: {
    /** Plural, lowercase: "requests", "looks", "entries". */
    noun: string;
    /** The list without its filters (keep the tab or sort when it has one). */
    clearHref: string;
    description?: ReactNode;
    className?: string;
}) {
    return (
        <EmptyState
            compact
            className={cn('my-6', className)}
            title={
                <>
                    No {noun} <em>match.</em>
                </>
            }
            description={description}
            action={
                <Link href={clearHref} className={button({ variant: 'glass' })}>
                    Clear filters
                </Link>
            }
        />
    );
}
