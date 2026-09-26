import { useId, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { CurrencyOption } from '../types';

/**
 * The landing's currency switch, for previews: a glass segmented radio
 * group with a sliding mint indicator. Arrow keys move the choice; Tab
 * leaves the group.
 */
export function CurrencySwitch({
    currencies,
    value,
    onChange,
    label = 'Currency',
    className,
}: {
    currencies: CurrencyOption[];
    value: string;
    onChange: (code: string) => void;
    label?: string;
    className?: string;
}) {
    const labelId = useId();
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const count = currencies.length;
    const active = Math.max(
        0,
        currencies.findIndex((currency) => currency.code === value),
    );

    if (count === 0) {
        return null;
    }

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const last = count - 1;
        const forward = active === last ? 0 : active + 1;
        const back = active === 0 ? last : active - 1;
        const moves: Record<string, number> = {
            ArrowRight: forward,
            ArrowDown: forward,
            ArrowLeft: back,
            ArrowUp: back,
            Home: 0,
            End: last,
        };
        const next = moves[event.key];

        if (next === undefined) {
            return;
        }

        event.preventDefault();
        onChange(currencies[next].code);
        buttons.current[next]?.focus();
    };

    const columns: CSSProperties = {
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    };
    const left = (active / count) * 100;
    const right = ((count - 1 - active) / count) * 100;

    return (
        <div className={cn('flex flex-wrap items-center gap-3', className)}>
            <span
                id={labelId}
                className="text-kicker font-medium text-mist uppercase"
            >
                {label}
            </span>
            <div
                className="relative w-full rounded-[16px] p-1 glass-thin has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-mint/70 sm:w-auto"
                style={{ minWidth: `${Math.min(count * 3.75, 20)}rem` }}
            >
                <div
                    role="radiogroup"
                    aria-labelledby={labelId}
                    className="relative grid"
                    style={columns}
                >
                    {currencies.map((currency, index) => {
                        const selected = index === active;

                        return (
                            <button
                                key={currency.code}
                                ref={(node) => {
                                    buttons.current[index] = node;
                                }}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={currency.name}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => onChange(currency.code)}
                                onKeyDown={onKeyDown}
                                className={cn(
                                    'h-9 cursor-pointer rounded-[12px] px-1 text-[13px] font-medium tracking-[0.04em] transition-colors duration-300 ease-glass focus-visible:outline-none',
                                    selected
                                        ? 'text-bone'
                                        : 'text-mist hover:bg-white/[0.06] hover:text-bone',
                                )}
                            >
                                {currency.code}
                            </button>
                        );
                    })}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 grid rounded-[12px] bg-mint shadow-[inset_0_1px_0_oklch(1_0_0/0.55)] transition-[clip-path] duration-500 ease-glass"
                        style={{
                            ...columns,
                            clipPath: `inset(0 ${right}% 0 ${left}% round 12px)`,
                        }}
                    >
                        {currencies.map((currency) => (
                            <span
                                key={currency.code}
                                className="grid h-9 place-items-center px-1 text-[13px] font-medium tracking-[0.04em] text-ink"
                            >
                                {currency.code}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
