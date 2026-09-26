import { Link } from '@inertiajs/react';
import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabItem = {
    value: string;
    /** Text, or a node (e.g. `<span lang="ar">العربية</span>`). */
    label: ReactNode;
    /** Link tabs: each tab is a page (e.g. ?group=contact). */
    href?: string;
    /** A small superscript number, like the landing navbar's "Pricing ⁰⁶". */
    count?: number | string;
    /** Something in this tab needs fixing: coral label and underline. */
    invalid?: boolean;
};

type TabsProps = {
    items: TabItem[];
    /** The selected tab's value. */
    value: string;
    /** State tabs: called with the new value (omit when every item has `href`). */
    onValueChange?: (value: string) => void;
    /** Prefix for tab/panel ids; pair with <TabPanel idPrefix>. */
    idPrefix?: string;
    /** Accessible name, e.g. "Content groups". */
    label: string;
    className?: string;
};

const tabClass = (active: boolean, invalid = false) =>
    cn(
        'group relative -mb-px flex h-11 shrink-0 cursor-pointer items-baseline gap-0 rounded-t-[10px] px-3 pt-3 text-[14px] whitespace-nowrap transition-colors duration-300 ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none focus-visible:ring-inset',
        'after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:transition-[background-color,opacity] after:duration-300',
        active
            ? 'text-bone after:bg-mint after:shadow-[0_0_10px_oklch(0.84_0.12_160/0.5)]'
            : 'text-smoke after:bg-transparent hover:text-bone',
        invalid &&
            (active
                ? 'text-coral after:bg-coral after:shadow-none'
                : 'text-coral hover:text-coral'),
    );

function Count({
    value,
    active,
}: {
    value: TabItem['count'];
    active: boolean;
}) {
    if (value === undefined) {
        return null;
    }

    return (
        <span
            className={cn(
                'relative -top-[0.55em] ml-[3px] text-[9px] font-medium tracking-[0.06em] tabular-nums',
                active ? 'text-mint' : 'text-smoke group-hover:text-mist',
            )}
        >
            {value}
        </span>
    );
}

/**
 * A row of tabs on a hairline, the selected one underlined in mint.
 * With `href`s they are page links (aria-current); otherwise an ARIA
 * tablist with arrow-key, Home and End navigation.
 */
export function Tabs({
    items,
    value,
    onValueChange,
    idPrefix = 'tabs',
    label,
    className,
}: TabsProps) {
    const list = useRef<HTMLDivElement>(null);
    const linkTabs = items.every((item) => item.href !== undefined);
    const frame = cn(
        'flex [scrollbar-width:none] overflow-x-auto border-b border-white/10 [&::-webkit-scrollbar]:hidden',
        className,
    );

    if (linkTabs) {
        return (
            <nav aria-label={label} className={frame}>
                {items.map((item) => {
                    const active = item.value === value;

                    return (
                        <Link
                            key={item.value}
                            href={item.href ?? ''}
                            preserveScroll
                            aria-current={active ? 'page' : undefined}
                            className={tabClass(active, item.invalid)}
                        >
                            {item.label}
                            <Count value={item.count} active={active} />
                        </Link>
                    );
                })}
            </nav>
        );
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const index = items.findIndex((item) => item.value === value);
        const moves: Record<string, number> = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: items.length - 1,
        };

        if (!(event.key in moves)) {
            return;
        }

        event.preventDefault();
        const next = (moves[event.key] + items.length) % items.length;
        onValueChange?.(items[next].value);
        list.current
            ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [next]?.focus();
    };

    return (
        <div
            ref={list}
            role="tablist"
            aria-label={label}
            onKeyDown={onKeyDown}
            className={frame}
        >
            {items.map((item) => {
                const active = item.value === value;

                return (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        id={`${idPrefix}-tab-${item.value}`}
                        aria-selected={active}
                        aria-controls={`${idPrefix}-panel-${item.value}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onValueChange?.(item.value)}
                        className={tabClass(active, item.invalid)}
                    >
                        {item.label}
                        <Count value={item.count} active={active} />
                    </button>
                );
            })}
        </div>
    );
}

/**
 * The panel of a state tab; render only the selected one, or all with
 * `hidden`. A panel is a Tab stop (with a mint ring) unless it holds
 * controls of its own: pass `focusable={false}` then.
 */
export function TabPanel({
    value,
    idPrefix = 'tabs',
    hidden = false,
    focusable = true,
    className,
    children,
}: {
    value: string;
    idPrefix?: string;
    hidden?: boolean;
    focusable?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            role="tabpanel"
            id={`${idPrefix}-panel-${value}`}
            aria-labelledby={`${idPrefix}-tab-${value}`}
            hidden={hidden}
            tabIndex={focusable ? 0 : undefined}
            className={cn(
                'rounded-[14px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none focus-visible:ring-inset',
                className,
            )}
        >
            {children}
        </div>
    );
}
