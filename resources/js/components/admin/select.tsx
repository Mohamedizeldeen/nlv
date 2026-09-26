import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { fieldFocus, fieldSurface, useFieldControl } from './field';

export type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

export type SelectProps = Omit<ComponentProps<'select'>, 'size'> & {
    options: SelectOption[];
    /** A first, empty option (e.g. "All statuses" in filters, "Choose…" in forms). */
    placeholder?: string;
    invalid?: boolean;
    size?: 'sm' | 'md';
};

/**
 * A native <select> in glass. Native keeps keyboard, mobile pickers and
 * form submission for free; the list itself renders dark.
 */
export function Select({
    options,
    placeholder,
    invalid,
    size = 'md',
    className,
    id,
    required,
    'aria-describedby': describedBy,
    ...props
}: SelectProps) {
    const control = useFieldControl({ id, describedBy, invalid, required });

    return (
        <div className={cn('relative min-w-0', className)}>
            <select
                {...control}
                {...props}
                className={cn(
                    'w-full min-w-0 cursor-pointer appearance-none truncate text-bone [color-scheme:dark] [&_option]:bg-ink-raised [&_option]:text-bone',
                    size === 'sm'
                        ? 'h-9 rounded-[12px] pr-9 pl-3 text-[14px]'
                        : 'h-11 pr-10 pl-3.5 text-[15px]',
                    fieldSurface,
                    size === 'sm' && 'rounded-[12px]',
                    fieldFocus,
                )}
            >
                {placeholder !== undefined ? (
                    <option value="">{placeholder}</option>
                ) : null}
                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                aria-hidden
                className={cn(
                    'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-smoke',
                    size === 'sm' ? 'right-3' : 'right-3.5',
                )}
            />
        </div>
    );
}
