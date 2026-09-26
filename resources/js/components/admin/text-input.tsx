import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { fieldFocusWithin, fieldSurface, useFieldControl } from './field';

export type TextInputProps = Omit<ComponentProps<'input'>, 'size'> & {
    /** Text or an icon inside the field's left edge, e.g. "https://". */
    leading?: ReactNode;
    /** Text or an icon inside the right edge, e.g. "cm" or a button. */
    trailing?: ReactNode;
    /** Classes for the <input> itself; `className` styles the glass well. */
    inputClassName?: string;
    /** Explicit invalid state (inside a <Field>, its `error` decides). */
    invalid?: boolean;
    size?: 'sm' | 'md';
};

/**
 * A glass text field. Every native input attribute passes through
 * (name, defaultValue, type, autoComplete, …), so it works as-is inside
 * Inertia's <Form>. `dir="rtl"` mirrors the whole field, adornments too.
 */
export function TextInput({
    leading,
    trailing,
    className,
    inputClassName,
    invalid,
    size = 'md',
    id,
    required,
    dir,
    'aria-describedby': describedBy,
    ...props
}: TextInputProps) {
    const control = useFieldControl({ id, describedBy, invalid, required });

    return (
        <div
            dir={dir}
            className={cn(
                'flex w-full min-w-0 items-center',
                size === 'sm' ? 'h-9 rounded-[12px]' : 'h-11',
                fieldSurface,
                size === 'sm' && 'rounded-[12px]',
                fieldFocusWithin,
                className,
            )}
        >
            {leading ? (
                <span className="flex shrink-0 items-center ps-3.5 text-[13px] text-smoke [&_svg]:size-4">
                    {leading}
                </span>
            ) : null}
            <input
                {...control}
                {...props}
                className={cn(
                    'h-full w-full min-w-0 flex-1 bg-transparent text-bone outline-none placeholder:text-smoke/80 disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden',
                    size === 'sm' ? 'px-3 text-[14px]' : 'px-3.5 text-[15px]',
                    leading ? 'ps-2' : null,
                    trailing ? 'pe-2' : null,
                    inputClassName,
                )}
            />
            {trailing ? (
                <span className="flex shrink-0 items-center pe-3.5 text-[13px] text-smoke [&_svg]:size-4">
                    {trailing}
                </span>
            ) : null}
        </div>
    );
}
