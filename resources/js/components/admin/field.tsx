import { createContext, useContext, useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FieldContextValue = {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
    required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Wires a control to its surrounding <Field>: id, aria-describedby (hint +
 * error), aria-invalid and required. Explicit props win, so every kit
 * input also works outside a Field.
 */
export function useFieldControl({
    id,
    describedBy,
    invalid,
    required,
}: {
    id?: string;
    describedBy?: string;
    invalid?: boolean;
    required?: boolean;
}) {
    const field = useContext(FieldContext);
    const fallbackId = useId();
    const ids = [field?.describedBy, describedBy].filter(Boolean).join(' ');
    const isInvalid = invalid ?? field?.invalid ?? false;

    return {
        id: id ?? field?.id ?? fallbackId,
        'aria-describedby': ids || undefined,
        'aria-invalid': isInvalid ? true : undefined,
        required: required ?? field?.required ?? undefined,
    };
}

/**
 * The glass look of every text-like control: a translucent well with a
 * lit top edge and a mint focus ring (coral when invalid). Apply it to the
 * element that should show the ring (use `focus-within` wrappers for
 * inputs with adornments).
 */
export const fieldSurface =
    'rounded-[14px] bg-white/[0.06] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.1)] ring-1 ring-white/[0.14] ring-inset transition-[box-shadow,background-color] duration-300 ease-glass hover:bg-white/[0.08]';

/** Focus ring for a wrapper around an input. */
export const fieldFocusWithin =
    'focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-mint/70 has-[[aria-invalid=true]]:ring-coral/80 has-[[aria-invalid=true]]:focus-within:ring-coral/90 has-[:disabled]:opacity-50';

/** Focus ring for a control that is itself the surface (select, textarea). */
export const fieldFocus =
    'focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none aria-invalid:ring-coral/80 aria-invalid:focus-visible:ring-coral/90 disabled:opacity-50';

type FieldProps = {
    label: ReactNode;
    /** Helper text under the control (linked with aria-describedby). */
    hint?: ReactNode;
    /** Validation message, e.g. `errors.name` from Inertia's <Form>. */
    error?: string;
    /** Marks the control required (and adds `required` to it). */
    required?: boolean;
    /** Prints "Optional" beside the label; use on the rarer case. */
    optional?: boolean;
    /** Something at the label's right edge: a counter, a small link. */
    aside?: ReactNode;
    /** Override the generated control id. */
    id?: string;
    className?: string;
    children: ReactNode;
};

/**
 * Label, control, hint and error, wired together for screen readers.
 * The control is any kit input (TextInput, Textarea, Select, …), which
 * picks the wiring up from context.
 *
 * <Field label="Store" error={errors.store} required>
 *     <TextInput name="store" defaultValue={story.store} />
 * </Field>
 */
export function Field({
    label,
    hint,
    error,
    required = false,
    optional = false,
    aside,
    id,
    className,
    children,
}: FieldProps) {
    const generated = useId();
    const controlId = id ?? `field-${generated}`;
    const hintId = hint ? `${controlId}-hint` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;
    const describedBy =
        [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
        <FieldContext
            value={{
                id: controlId,
                describedBy,
                invalid: Boolean(error),
                required,
            }}
        >
            <div className={cn('grid min-w-0 content-start gap-2', className)}>
                <div className="flex items-baseline justify-between gap-3">
                    <label
                        htmlFor={controlId}
                        className="text-[13px] leading-snug font-medium text-bone"
                    >
                        {label}
                        {optional ? (
                            <span className="ml-2 text-[12px] font-normal text-smoke">
                                Optional
                            </span>
                        ) : null}
                    </label>
                    {aside ? (
                        <span className="text-[12px] text-smoke tabular-nums">
                            {aside}
                        </span>
                    ) : null}
                </div>
                {children}
                {error ? <FieldError id={errorId}>{error}</FieldError> : null}
                {hint ? (
                    <p
                        id={hintId}
                        className="text-[12.5px] leading-relaxed text-pretty text-smoke"
                    >
                        {hint}
                    </p>
                ) : null}
            </div>
        </FieldContext>
    );
}

/**
 * What <Field> gives its control (id, aria-describedby, aria-invalid,
 * required), without the label: for composite fields that label their
 * controls themselves, such as the bilingual ones.
 */
export function FieldControlScope({
    id,
    describedBy,
    invalid = false,
    required = false,
    children,
}: {
    id: string;
    describedBy?: string;
    invalid?: boolean;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <FieldContext value={{ id, describedBy, invalid, required }}>
            {children}
        </FieldContext>
    );
}

/** A validation message in the kit's style (Field renders one for you). */
export function FieldError({
    id,
    children,
    className,
}: {
    id?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <p
            id={id}
            className={cn(
                'text-[13px] leading-snug text-pretty text-coral',
                className,
            )}
        >
            {children}
        </p>
    );
}

/**
 * Groups related fields under a legend, e.g. "Portrait" or "Monthly
 * price". Lay the fields out with className (defaults to a single column).
 */
export function Fieldset({
    legend,
    description,
    className,
    children,
}: {
    legend: ReactNode;
    description?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <fieldset className="min-w-0">
            <legend className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                {legend}
            </legend>
            {description ? (
                <p className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-pretty text-smoke">
                    {description}
                </p>
            ) : null}
            <div className={cn('mt-4 grid gap-5', className)}>{children}</div>
        </fieldset>
    );
}
