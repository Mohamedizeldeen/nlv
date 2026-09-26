import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useFieldControl } from './field';

type ToggleProps = {
    /** Form field name; submits "1" or "0" through a hidden input. */
    name?: string;
    /** Uncontrolled initial state. */
    defaultChecked?: boolean;
    /** Controlled state (pair with onCheckedChange). */
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    /** Visible label beside the switch. Omit inside a <Field>. */
    label?: ReactNode;
    /** A quieter line under the label. */
    description?: ReactNode;
    disabled?: boolean;
    id?: string;
    className?: string;
};

/**
 * An on/off switch (role="switch"), e.g. "Published". Space or Enter
 * toggles it. With `name`, the value travels with Inertia's <Form> as
 * "1"/"0", which Laravel's `boolean` rule accepts.
 */
export function Toggle({
    name,
    defaultChecked = false,
    checked,
    onCheckedChange,
    label,
    description,
    disabled = false,
    id,
    className,
}: ToggleProps) {
    const [inner, setInner] = useState(defaultChecked);
    const on = checked ?? inner;
    const control = useFieldControl({ id });
    const descriptionId = useId();

    const toggle = () => {
        const next = !on;
        setInner(next);
        onCheckedChange?.(next);
    };

    const knob = (
        <button
            type="button"
            role="switch"
            id={control.id}
            aria-checked={on}
            aria-describedby={
                [
                    control['aria-describedby'],
                    description ? descriptionId : null,
                ]
                    .filter(Boolean)
                    .join(' ') || undefined
            }
            disabled={disabled}
            onClick={toggle}
            className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] ring-1 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                on
                    ? 'bg-mint shadow-[inset_0_1px_0_oklch(1_0_0/0.5),0_6px_18px_-8px_oklch(0.84_0.12_160/0.7)] ring-mint'
                    : 'bg-white/[0.08] ring-white/[0.16]',
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'size-[22px] rounded-full shadow-[0_2px_6px_oklch(0_0_0/0.35)] transition-[translate,background-color] duration-300 ease-glass',
                    on ? 'translate-x-5 bg-ink' : 'translate-x-0 bg-bone',
                )}
            />
        </button>
    );

    return (
        <div className={cn('flex items-start gap-3', className)}>
            {name ? (
                <input type="hidden" name={name} value={on ? '1' : '0'} />
            ) : null}
            {knob}
            {label || description ? (
                <div className="grid gap-0.5 pt-0.5">
                    {label ? (
                        <label
                            htmlFor={control.id}
                            className="cursor-pointer text-[14px] leading-snug font-medium text-bone"
                        >
                            {label}
                        </label>
                    ) : null}
                    {description ? (
                        <p
                            id={descriptionId}
                            className="text-[12.5px] leading-relaxed text-smoke"
                        >
                            {description}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
