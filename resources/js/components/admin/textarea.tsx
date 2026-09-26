import { useState } from 'react';
import type { ChangeEvent, ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { fieldFocus, fieldSurface, useFieldControl } from './field';

export type TextareaProps = ComponentProps<'textarea'> & {
    /** Explicit invalid state (inside a <Field>, its `error` decides). */
    invalid?: boolean;
    /** Show a "120 / 200" counter under the field (needs `maxLength`). */
    showCount?: boolean;
    /** Monospaced text, for Markdown bodies. */
    mono?: boolean;
};

/** A glass multi-line field that grows with its content (up to ~half the viewport). */
export function Textarea({
    className,
    invalid,
    showCount = false,
    mono = false,
    rows = 4,
    id,
    required,
    'aria-describedby': describedBy,
    onChange,
    value,
    defaultValue,
    maxLength,
    ...props
}: TextareaProps) {
    const control = useFieldControl({ id, describedBy, invalid, required });
    const [length, setLength] = useState(
        () => String(value ?? defaultValue ?? '').length,
    );
    const counted = showCount && maxLength !== undefined;
    const counterId = `${control.id}-count`;

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setLength(event.target.value.length);
        onChange?.(event);
    };

    return (
        <div className="grid gap-1.5">
            <textarea
                {...control}
                aria-describedby={
                    [control['aria-describedby'], counted ? counterId : null]
                        .filter(Boolean)
                        .join(' ') || undefined
                }
                rows={rows}
                value={value}
                defaultValue={defaultValue}
                maxLength={maxLength}
                onChange={handleChange}
                className={cn(
                    'block [field-sizing:content] w-full min-w-0 resize-y px-3.5 py-3 text-[15px] leading-relaxed text-bone placeholder:text-smoke/80',
                    'max-h-[calc(50vh+8rem)] min-h-24',
                    mono && 'font-mono text-[13px] leading-[1.7]',
                    fieldSurface,
                    fieldFocus,
                    className,
                )}
                {...props}
            />
            {counted ? (
                <p
                    id={counterId}
                    // Digits keep their order next to right-to-left text.
                    dir="ltr"
                    className={cn(
                        'justify-self-end text-[12px] tabular-nums',
                        length >= maxLength ? 'text-coral' : 'text-smoke',
                    )}
                >
                    {length} / {maxLength}
                </p>
            ) : null}
        </div>
    );
}
