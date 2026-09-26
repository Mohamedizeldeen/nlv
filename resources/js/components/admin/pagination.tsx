import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types/admin';
import { formatNumber } from './format';

type PaginationProps = {
    /** The paginator as Laravel sends it (`->paginate()` / `->withQueryString()`). */
    paginator: Omit<Paginated<unknown>, 'data'>;
    /** Plural noun for the summary: "leads" → "Showing 26–50 of 212 leads". */
    noun?: string;
    className?: string;
};

const pageLink =
    'grid h-9 min-w-9 place-items-center rounded-[12px] px-2 text-[13px] tabular-nums transition-colors duration-300 ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

const stepLink =
    'inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-[13px] transition-colors duration-300 ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

/**
 * "Showing 26–50 of 212 leads" and page links, from a Laravel paginator.
 * Keeps the query string when the controller uses `->withQueryString()`.
 * Renders nothing when everything fits on one page.
 */
export function Pagination({
    paginator,
    noun = 'results',
    className,
}: PaginationProps) {
    const { from, to, total, last_page, prev_page_url, next_page_url, links } =
        paginator;

    if (total === 0) {
        return null;
    }

    // Laravel's links are [previous, ...pages and "...", next].
    const pages = links.slice(1, -1);

    return (
        <nav
            aria-label="Pagination"
            className={cn(
                'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[13px] text-smoke',
                className,
            )}
        >
            {total === 1 ? (
                <p>
                    Showing <span className="text-mist tabular-nums">1</span>{' '}
                    {noun.endsWith('ies')
                        ? `${noun.slice(0, -3)}y`
                        : noun.replace(/s$/, '')}
                </p>
            ) : (
                <p>
                    Showing{' '}
                    <span className="text-mist tabular-nums">
                        {formatNumber(from ?? 0)}–{formatNumber(to ?? 0)}
                    </span>{' '}
                    of{' '}
                    <span className="text-mist tabular-nums">
                        {formatNumber(total)}
                    </span>{' '}
                    {noun}
                </p>
            )}

            {last_page > 1 ? (
                <div className="flex items-center gap-1">
                    {prev_page_url ? (
                        <Link
                            href={prev_page_url}
                            preserveState
                            rel="prev"
                            className={cn(
                                stepLink,
                                'text-mist hover:bg-white/[0.07] hover:text-bone',
                            )}
                        >
                            <ArrowLeft aria-hidden className="size-3.5" />
                            <span className="max-sm:sr-only">Previous</span>
                        </Link>
                    ) : (
                        <span
                            aria-hidden
                            className={cn(stepLink, 'text-white/20')}
                        >
                            <ArrowLeft className="size-3.5" />
                            <span className="max-sm:hidden">Previous</span>
                        </span>
                    )}

                    <ol className="flex items-center gap-0.5 max-sm:hidden">
                        {pages.map((link, index) => (
                            <li key={`${link.label}-${index}`}>
                                {link.url === null ? (
                                    <span
                                        className={cn(pageLink, 'text-smoke')}
                                    >
                                        …
                                    </span>
                                ) : (
                                    <Link
                                        href={link.url}
                                        preserveState
                                        aria-current={
                                            link.active ? 'page' : undefined
                                        }
                                        aria-label={`Page ${link.label}`}
                                        className={cn(
                                            pageLink,
                                            link.active
                                                ? 'bg-white/[0.1] text-bone ring-1 ring-white/[0.16] ring-inset'
                                                : 'text-mist hover:bg-white/[0.07] hover:text-bone',
                                        )}
                                    >
                                        {link.label}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ol>
                    <span className="px-2 text-mist tabular-nums sm:hidden">
                        {paginator.current_page} / {last_page}
                    </span>

                    {next_page_url ? (
                        <Link
                            href={next_page_url}
                            preserveState
                            rel="next"
                            className={cn(
                                stepLink,
                                'text-mist hover:bg-white/[0.07] hover:text-bone',
                            )}
                        >
                            <span className="max-sm:sr-only">Next</span>
                            <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                    ) : (
                        <span
                            aria-hidden
                            className={cn(stepLink, 'text-white/20')}
                        >
                            <span className="max-sm:hidden">Next</span>
                            <ArrowRight className="size-3.5" />
                        </span>
                    )}
                </div>
            ) : null}
        </nav>
    );
}
