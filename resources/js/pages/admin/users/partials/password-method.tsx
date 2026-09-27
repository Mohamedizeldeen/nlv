import { useId } from 'react';
import type { ReactNode } from 'react';
import { FieldError } from '@/components/admin/field';
import { cn } from '@/lib/utils';
import type { PasswordMethod } from '../types';

export type MethodChoice = {
    value: PasswordMethod;
    label: string;
    description: ReactNode;
};

/**
 * "Set a password now" or "Email a link", as two glass radio cards (native
 * radios: arrow keys, labels and form submission come for free).
 */
export function PasswordMethodChoice({
    name,
    legend,
    choices,
    value,
    onChange,
    error,
}: {
    name: string;
    legend: string;
    choices: MethodChoice[];
    value: PasswordMethod;
    onChange: (value: PasswordMethod) => void;
    error?: string;
}) {
    const id = useId();
    const errorId = error ? `${id}-error` : undefined;

    return (
        <fieldset aria-describedby={errorId} className="min-w-0">
            <legend className="sr-only">{legend}</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
                {choices.map((choice) => {
                    const checked = choice.value === value;

                    return (
                        <label
                            key={choice.value}
                            className={cn(
                                'relative flex cursor-pointer items-start gap-3 rounded-[16px] px-4 py-3.5 ring-1 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mint/70',
                                checked
                                    ? 'bg-mint/[0.09] ring-mint/55'
                                    : 'bg-white/[0.035] ring-white/[0.12] hover:bg-white/[0.06]',
                            )}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={choice.value}
                                checked={checked}
                                onChange={() => onChange(choice.value)}
                                aria-invalid={error ? true : undefined}
                                className="peer sr-only"
                            />
                            <span
                                aria-hidden
                                className="mt-[3px] grid size-[18px] shrink-0 place-items-center rounded-full ring-1 ring-white/30 transition-[box-shadow] duration-300 ease-glass ring-inset peer-checked:ring-[5px] peer-checked:ring-mint"
                            />
                            <span className="grid min-w-0 gap-1">
                                <span className="text-[14px] leading-snug font-medium text-bone">
                                    {choice.label}
                                </span>
                                <span className="text-[12.5px] leading-snug text-pretty text-smoke">
                                    {choice.description}
                                </span>
                            </span>
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
