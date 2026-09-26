import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { button } from './button';
import type { ButtonSize, ButtonVariant } from './button';

/**
 * "View on site ↗": opens the public page (or a section of it, e.g.
 * `/#pricing`) in a new tab, and says so to screen readers. Page headers
 * put it before Delete.
 */
export function ViewOnSite({
    href,
    children = 'View on site',
    variant = 'glass',
    size,
    className,
}: {
    href: string;
    children?: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={button({ variant, size, className })}
        >
            {children}
            <span className="sr-only"> (opens in a new tab)</span>
            <ArrowUpRight aria-hidden />
        </a>
    );
}
