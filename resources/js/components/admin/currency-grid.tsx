import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FieldError, fieldFocusWithin, fieldSurface } from './field';

export type Currency = {
    /** ISO code, e.g. "USD". */
    code: string;
    /** Spoken name, e.g. "US dollars". */
    name: string;
};

type Prices = Record<string, number | null>;

type CurrencyGridProps = {
    /** Base field name: inputs submit as `${name}[USD]`, `${name}[EUR]`, … */
    name: string;
    /** Ordered currencies (config/landing.php → currencies). */
    currencies: Currency[];
    legend: ReactNode;
    description?: ReactNode;
    /** Initial whole-number prices keyed by code; missing codes start empty. */
    defaultValue?: Prices | null;
    /** Called on every edit with all prices (null for empty fields). */
    onValueChange?: (prices: Prices) => void;
    /**
     * Inertia's `errors`: messages under `${name}.${code}` show beside that
     * currency, one under `${name}` shows under the grid.
     */
    errors?: Partial<Record<string, string>>;
    /** Printed after each amount, e.g. "/ month". */
    unit?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
};

/**
 * One whole-number price per currency, as a labelled grid. Amounts are
 * digits only; each field shows its code, and screen readers hear
 * "Price in euros".
 */
export function CurrencyGrid({
    name,
    currencies,
    legend,
    description,
    defaultValue,
    onValueChange,
    errors = {},
    unit,
    required = false,
    disabled = false,
    className,
}: CurrencyGridProps) {
    const baseId = useId();
    const [prices, setPrices] = useState<Prices>(() =>
        Object.fromEntries(
            currencies.map(({ code }) => [code, defaultValue?.[code] ?? null]),
        ),
    );
    const groupError = errors[name];
    const descriptionId = description ? `${baseId}-description` : undefined;

    const update = (code: string, raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 9);
        const next = {
            ...prices,
            [code]: digits === '' ? null : Number(digits),
        };
        setPrices(next);
        onValueChange?.(next);
    };

    return (
        <fieldset
            aria-describedby={descriptionId}
            className={cn('min-w-0', className)}
        >
            <legend className="text-[13px] leading-snug font-medium text-bone">
                {legend}
            </legend>
            {description ? (
                <p
                    id={descriptionId}
                    className="mt-1 text-[12.5px] leading-relaxed text-smoke"
                >
                    {description}
                </p>
            ) : null}
            <div
                className={cn(
                    'mt-3 grid gap-2.5',
                    // As many columns as fit: amounts never get squeezed.
                    unit
                        ? 'grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]'
                        : 'grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]',
                )}
            >
                {currencies.map((currency) => {
                    const inputId = `${baseId}-${currency.code}`;
                    const error = errors[`${name}.${currency.code}`];
                    const errorId = error ? `${inputId}-error` : undefined;
                    const amount = prices[currency.code];

                    return (
                        <div
                            key={currency.code}
                            className="grid content-start gap-1.5"
                        >
                            <label htmlFor={inputId} className="sr-only">
                                Price in {currency.name}
                            </label>
                            <div
                                className={cn(
                                    'flex h-11 min-w-0 items-center',
                                    fieldSurface,
                                    fieldFocusWithin,
                                )}
                            >
                                <span
                                    aria-hidden
                                    className="shrink-0 pl-3 text-[10px] font-medium tracking-[0.2em] text-smoke"
                                >
                                    {currency.code}
                                </span>
                                <input
                                    id={inputId}
                                    name={`${name}[${currency.code}]`}
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={
                                        amount === null ? '' : String(amount)
                                    }
                                    onChange={(event) =>
                                        update(
                                            currency.code,
                                            event.target.value,
                                        )
                                    }
                                    required={required}
                                    disabled={disabled}
                                    aria-invalid={error ? true : undefined}
                                    aria-describedby={errorId}
                                    className="h-full w-full min-w-0 flex-1 bg-transparent px-2 text-right text-[15px] text-bone tabular-nums outline-none placeholder:text-smoke/60"
                                    placeholder="0"
                                />
                                {unit ? (
                                    <span
                                        aria-hidden
                                        className="shrink-0 pr-3 text-[12px] whitespace-nowrap text-smoke"
                                    >
                                        {unit}
                                    </span>
                                ) : (
                                    <span aria-hidden className="w-1.5" />
                                )}
                            </div>

                            {error ? (
                                <FieldError
                                    id={errorId}
                                    className="text-[12px]"
                                >
                                    {error}
                                </FieldError>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            {groupError ? (
                <FieldError className="mt-2">{groupError}</FieldError>
            ) : null}
        </fieldset>
    );
}
