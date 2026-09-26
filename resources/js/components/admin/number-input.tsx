import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { fieldFocusWithin, fieldSurface, useFieldControl } from './field';

type NumberInputProps = Omit<
    ComponentProps<'input'>,
    | 'type'
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'size'
    | 'min'
    | 'max'
    | 'step'
> & {
    defaultValue?: number | null;
    /** Controlled value (pair with onValueChange). */
    value?: number | null;
    /** Called with the parsed number, or null while the field is empty. */
    onValueChange?: (value: number | null) => void;
    min?: number;
    max?: number;
    step?: number;
    /** A unit after the number: "s", "devices", "/ month". */
    unit?: string;
    invalid?: boolean;
    className?: string;
};

function decimalsOf(step: number): number {
    const [, fraction = ''] = String(step).split('.');

    return fraction.length;
}

/**
 * A number field with − / + steppers (the arrow keys step too). Decimal
 * steps such as 0.1 keep their precision, so "1.8 s" never becomes
 * 1.7999999.
 */
export function NumberInput({
    defaultValue = null,
    value,
    onValueChange,
    min,
    max,
    step = 1,
    unit,
    invalid,
    className,
    id,
    required,
    disabled,
    'aria-describedby': describedBy,
    ...props
}: NumberInputProps) {
    const control = useFieldControl({ id, describedBy, invalid, required });
    const [text, setText] = useState(() =>
        defaultValue === null ? '' : String(defaultValue),
    );
    const shown =
        value === undefined ? text : value === null ? '' : String(value);
    const current = shown === '' ? null : Number(shown);
    const decimals = decimalsOf(step);

    const commit = (next: string) => {
        setText(next);
        const parsed = next === '' ? null : Number(next);
        onValueChange?.(
            parsed === null || Number.isNaN(parsed) ? null : parsed,
        );
    };

    const clamp = (n: number) =>
        Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

    const nudge = (direction: 1 | -1) => {
        const base =
            current === null || Number.isNaN(current) ? (min ?? 0) : current;
        commit(clamp(base + direction * step).toFixed(decimals));
    };

    const atMin = min !== undefined && current !== null && current <= min;
    const atMax = max !== undefined && current !== null && current >= max;
    const stepper =
        'grid h-full w-9 shrink-0 cursor-pointer place-items-center text-smoke transition-colors duration-300 ease-glass hover:text-bone disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <div
            className={cn(
                'flex h-11 w-full min-w-0 items-center',
                fieldSurface,
                fieldFocusWithin,
                className,
            )}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label="Decrease"
                disabled={disabled || atMin}
                onClick={() => nudge(-1)}
                className={stepper}
            >
                <Minus aria-hidden className="size-3.5" />
            </button>
            <input
                {...control}
                {...props}
                type="number"
                inputMode={decimals ? 'decimal' : 'numeric'}
                value={shown}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                onChange={(event) => commit(event.target.value)}
                className="h-full w-full min-w-0 flex-1 [appearance:textfield] bg-transparent text-center text-[15px] text-bone tabular-nums outline-none placeholder:text-smoke/80 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {unit ? (
                <span className="shrink-0 pr-1 text-[13px] text-smoke">
                    {unit}
                </span>
            ) : null}
            <button
                type="button"
                tabIndex={-1}
                aria-label="Increase"
                disabled={disabled || atMax}
                onClick={() => nudge(1)}
                className={stepper}
            >
                <Plus aria-hidden className="size-3.5" />
            </button>
        </div>
    );
}
