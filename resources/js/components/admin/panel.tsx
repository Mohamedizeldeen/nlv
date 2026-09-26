import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PanelProps = {
    /** Short heading (Instrument Sans). Rendered as an <h2>. */
    title?: ReactNode;
    /** Tiny spaced-caps line above the title, e.g. "Last 30 days". */
    kicker?: ReactNode;
    description?: ReactNode;
    /** Buttons or links at the header's right edge. */
    actions?: ReactNode;
    /** Sits under a hairline at the bottom (e.g. the form's Save row). */
    footer?: ReactNode;
    /** `strong` is the denser glass for long forms and tables. */
    variant?: 'default' | 'strong';
    /** false: no body padding (tables and lists run edge to edge). */
    padded?: boolean;
    as?: 'section' | 'div' | 'article' | 'aside';
    id?: string;
    className?: string;
    bodyClassName?: string;
    children?: ReactNode;
};

/**
 * A glass card with a specular rim: the admin's basic surface. Headers
 * and footers are separated from the body by hairlines.
 */
export function Panel({
    title,
    kicker,
    description,
    actions,
    footer,
    variant = 'default',
    padded = true,
    as: Tag = 'section',
    id,
    className,
    bodyClassName,
    children,
}: PanelProps) {
    const hasHeader = Boolean(title || kicker || description || actions);

    return (
        <Tag
            id={id}
            className={cn(
                'glass-rim relative flex min-w-0 flex-col rounded-[24px]',
                variant === 'strong' ? 'glass-strong' : 'glass',
                className,
            )}
        >
            {hasHeader ? (
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-white/10 px-5 py-4 sm:px-6">
                    {/* Grows from 12rem: a long description wraps beside the
                        actions (the completeness badge, a preview toggle)
                        instead of pushing them under it; only a narrow
                        panel drops them to their own line. */}
                    <div className="min-w-0 flex-[1_1_12rem]">
                        {kicker ? (
                            <p className="mb-1.5 text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                                {kicker}
                            </p>
                        ) : null}
                        {title ? (
                            <h2 className="text-[15px] leading-snug font-medium text-bone">
                                {title}
                            </h2>
                        ) : null}
                        {description ? (
                            <div className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-pretty text-smoke">
                                {description}
                            </div>
                        ) : null}
                    </div>
                    {actions ? (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {actions}
                        </div>
                    ) : null}
                </div>
            ) : null}
            <div
                className={cn(
                    'min-w-0 flex-1',
                    padded && 'p-5 sm:p-6',
                    bodyClassName,
                )}
            >
                {children}
            </div>
            {footer ? (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4 sm:px-6">
                    {footer}
                </div>
            ) : null}
        </Tag>
    );
}
