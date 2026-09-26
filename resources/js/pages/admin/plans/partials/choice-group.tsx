import { Check } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { FieldError } from '@/components/admin/field';
import { cn } from '@/lib/utils';

export type Choice<T extends string> = {
    value: T;
    label: string;
    description?: string;
};

/**
 * A row of glass radio cards (native radios, so arrow keys, labels and
 * form submission come for free): one choice, a short line under each.
 */
export function ChoiceGroup<T extends string>({
    name,
    legend,
    description,
    choices,
    value,
    onChange,
    error,
    className,
}: {
    name: string;
    legend: ReactNode;
    description?: ReactNode;
    choices: Choice<T>[];
    value: T;
    onChange: (value: T) => void;
    error?: string;
    className?: string;
}) {
    const id = useId();
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <fieldset
            aria-describedby={
                [descriptionId, errorId].filter(Boolean).join(' ') || undefined
            }
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
            <div className="mt-3 grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
                {choices.map((choice) => {
                    const checked = choice.value === value;

                    return (
                        <label
                            key={choice.value}
                            className={cn(
                                'relative flex cursor-pointer flex-col gap-1 rounded-[14px] px-4 py-3 ring-1 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mint/70',
                                checked
                                    ? 'bg-mint/[0.1] ring-mint/60'
                                    : 'bg-white/[0.04] ring-white/[0.12] hover:bg-white/[0.07]',
                            )}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={choice.value}
                                checked={checked}
                                onChange={() => onChange(choice.value)}
                                className="sr-only"
                            />
                            <span className="flex items-center justify-between gap-3 text-[14px] font-medium text-bone">
                                {choice.label}
                                <Check
                                    aria-hidden
                                    strokeWidth={2.25}
                                    className={cn(
                                        'size-4 shrink-0 text-mint transition-opacity duration-300',
                                        checked ? 'opacity-100' : 'opacity-0',
                                    )}
                                />
                            </span>
                            {choice.description ? (
                                <span className="text-[12.5px] leading-snug text-smoke">
                                    {choice.description}
                                </span>
                            ) : null}
                        </label>
                    );
                })}
            </div>
            {error ? (
                <FieldError id={errorId} className="mt-2">
                    {error}
                </FieldError>
            ) : null}
        </fieldset>
    );
}
