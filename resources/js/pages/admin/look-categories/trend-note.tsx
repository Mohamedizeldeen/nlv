import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The note that opens the lookbook grid for a filter ("Abayas · this
 * week", a big figure, its unit in mint italic, one line), typeset as the
 * landing page sets it. Empty parts show as quiet placeholders, so the
 * preview never collapses while a form is being filled in. Inside a
 * `lang="ar" dir="rtl"` wrapper it reads as the Arabic page: right to left,
 * the unit upright, the figure kept left to right ("+33%" stays whole);
 * each text is isolated (`<bdi>`), so an English fallback keeps its full
 * stop at its end; the placeholders stay English (they speak to the admin).
 */
export function TrendNote({
    kicker,
    figure,
    unit,
    line,
    compact = false,
    className,
}: {
    kicker: ReactNode;
    figure: string | null;
    unit: string | null;
    line: string | null;
    compact?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('border-t border-white/15 pt-4 pb-2', className)}>
            <p className="text-kicker font-medium text-mist uppercase">
                {kicker}
            </p>
            {figure ? (
                <p
                    className={cn(
                        'font-display leading-[0.9] font-medium tracking-[-0.03em] text-bone',
                        compact
                            ? 'mt-5 text-[3rem]'
                            : 'mt-7 text-[3.25rem] sm:text-[4.25rem]',
                    )}
                >
                    <span className="bidi-ltr">{figure}</span>
                </p>
            ) : (
                <p className="mt-5 max-w-[30ch] text-[12.5px] leading-relaxed text-smoke">
                    <span lang="en" dir="ltr">
                        No figure: the note shows its line only.
                    </span>
                </p>
            )}
            {figure && unit ? (
                <p
                    className={cn(
                        'mt-2 font-display leading-tight text-mint italic',
                        compact ? 'text-xl' : 'text-xl sm:text-2xl',
                    )}
                >
                    <bdi>{unit}</bdi>
                </p>
            ) : null}
            <p
                className={cn(
                    'max-w-[30ch] text-[15px] leading-relaxed text-balance',
                    compact ? 'mt-4' : 'mt-5',
                    line ? 'text-mist' : 'text-smoke italic',
                )}
            >
                {line ? (
                    <bdi>{line}</bdi>
                ) : (
                    <span lang="en" dir="ltr">
                        The week’s line goes here.
                    </span>
                )}
            </p>
        </div>
    );
}

/** Lowercase, hyphenated, ASCII: what the server (Str::slug) makes of it too. */
export function slugify(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/@/g, '-at-')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export type FilterTab = { key: string; label: string; muted?: boolean };

/**
 * The lookbook's filter bar in miniature (glass, the selected tab in
 * mint). With `onSelect` the tabs are buttons that switch the preview;
 * without, it is a picture of the bar.
 */
export function FilterTabs({
    tabs,
    active,
    onSelect,
    label = 'Preview filter',
    className,
}: {
    tabs: FilterTab[];
    active: string;
    onSelect?: (key: string) => void;
    label?: string;
    className?: string;
}) {
    return (
        <div
            role={onSelect ? 'group' : undefined}
            aria-label={onSelect ? label : undefined}
            aria-hidden={onSelect ? undefined : true}
            className={cn(
                'glass-rim flex max-w-full flex-wrap gap-0.5 rounded-[16px] p-1 glass',
                className,
            )}
        >
            {tabs.map((tab) => {
                const selected = tab.key === active;
                const classes = cn(
                    'h-8 shrink-0 rounded-[12px] px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-300 ease-glass',
                    selected
                        ? 'bg-mint text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.55)]'
                        : tab.muted
                          ? 'text-smoke line-through decoration-white/25'
                          : 'text-mist',
                );

                return onSelect ? (
                    <button
                        key={tab.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelect(tab.key)}
                        className={cn(
                            classes,
                            'cursor-pointer focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                            !selected && 'hover:text-bone',
                        )}
                    >
                        {tab.label}
                    </button>
                ) : (
                    <span
                        key={tab.key}
                        className={cn(classes, 'grid place-items-center')}
                    >
                        {tab.label}
                    </span>
                );
            })}
        </div>
    );
}
