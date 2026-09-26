import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAdminSection } from './nav';

export type Crumb = {
    label: string;
    /** Omit for the current page. */
    href?: string;
};

type PageHeaderProps = {
    /** The page's <h1>. Wrap accent words in <em> for the italic mint. */
    title: ReactNode;
    description?: ReactNode;
    /** Buttons on the right (stacked under the title on phones). */
    actions?: ReactNode;
    /**
     * Trail after the section name, e.g. [{ label: 'NLV-000142' }]. With a
     * trail, the section name links back to the module's index.
     */
    crumbs?: Crumb[];
    /** Overrides the section label taken from the sidebar. */
    kicker?: string;
    /** Overrides the section number taken from the sidebar ("04"). */
    index?: string;
    className?: string;
};

const crumbLink =
    'rounded-[6px] transition-colors duration-[380ms] ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

/**
 * The editorial opener of every admin page, same grammar as the landing's
 * section headers: a hairline rule carrying "N° 04 — Lookbook / Looks",
 * then a Bodoni title with the description and actions beside it.
 */
export function PageHeader({
    title,
    description,
    actions,
    crumbs = [],
    kicker,
    index,
    className,
}: PageHeaderProps) {
    const section = useAdminSection();
    const number = index ?? section?.entry.index;
    const label = kicker ?? section?.entry.label;
    const child = kicker ? null : section?.child;
    // With a trail, the section name leads back to the module's index.
    const sectionHref = kicker ? undefined : section?.entry.href;
    const trail: Crumb[] = [
        ...(child
            ? [
                  {
                      label: child.label,
                      href: crumbs.length ? child.href : undefined,
                  },
              ]
            : []),
        ...crumbs,
    ];

    return (
        <header
            className={cn(
                'grid gap-x-8 gap-y-5 border-t border-white/10 pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end',
                className,
            )}
        >
            {label || number ? (
                <nav aria-label="Breadcrumb" className="md:col-span-2">
                    <ol className="flex flex-wrap items-baseline gap-y-1 text-kicker font-medium text-smoke uppercase">
                        <li className="whitespace-nowrap">
                            {number ? (
                                <span className="text-bone">N° {number}</span>
                            ) : null}
                            {number && label ? (
                                <span
                                    aria-hidden
                                    className="mx-3 text-white/25"
                                >
                                    —
                                </span>
                            ) : null}
                            {label && trail.length && sectionHref && !child ? (
                                <Link href={sectionHref} className={crumbLink}>
                                    {label}
                                </Link>
                            ) : (
                                label
                            )}
                        </li>
                        {trail.map((crumb) => (
                            <li
                                key={`${crumb.label}-${crumb.href ?? ''}`}
                                className="min-w-0 truncate"
                            >
                                <span
                                    aria-hidden
                                    className="mx-2.5 text-white/25"
                                >
                                    /
                                </span>
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className={crumbLink}
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span
                                        aria-current="page"
                                        className="text-mist"
                                    >
                                        {crumb.label}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            ) : null}

            <div className="min-w-0">
                <h1 className="font-display text-display-md font-medium text-balance text-bone [&_em]:font-normal [&_em]:text-mint">
                    {title}
                </h1>
                {description ? (
                    <div className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-pretty text-mist">
                        {description}
                    </div>
                ) : null}
            </div>

            {actions ? (
                <div className="flex flex-wrap items-center gap-2 md:justify-end md:pb-1">
                    {actions}
                </div>
            ) : null}
        </header>
    );
}
