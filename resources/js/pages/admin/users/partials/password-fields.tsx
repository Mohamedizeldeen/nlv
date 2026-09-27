import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field } from '@/components/admin/field';
import { TextInput } from '@/components/admin/text-input';
import { cn } from '@/lib/utils';
import type { PasswordPolicy } from '../types';

export type PasswordValues = { password: string; confirmation: string };

export const EMPTY_PASSWORD: PasswordValues = {
    password: '',
    confirmation: '',
};

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';

function pick(set: string): string {
    const [random] = crypto.getRandomValues(new Uint32Array(1));

    return set[random % set.length];
}

/**
 * A password that is easy to read out and type: four groups of five
 * (no 0/O, 1/l/I), each with a capital, a small letter and a digit,
 * joined by hyphens, so it passes the strictest production rules too.
 * About 90 bits of randomness.
 */
function suggestPassword(): string {
    return Array.from({ length: 4 }, () => {
        const chars = [
            pick(UPPER),
            pick(LOWER),
            pick(DIGITS),
            pick(LOWER),
            pick(UPPER + LOWER + DIGITS),
        ];

        for (let index = chars.length - 1; index > 0; index--) {
            const [random] = crypto.getRandomValues(new Uint32Array(1));
            const swap = random % (index + 1);

            [chars[index], chars[swap]] = [chars[swap], chars[index]];
        }

        return chars.join('');
    }).join('-');
}

const linkButton =
    'cursor-pointer rounded-[6px] text-mist underline decoration-white/25 underline-offset-4 transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

/**
 * A new password and its confirmation (`password`, `password_confirmation`),
 * with show/hide, "Suggest one" (fills both and shows it) and "Copy", since
 * the admin passes it on themselves.
 */
export function PasswordFields({
    policy,
    values,
    onValuesChange,
    error,
    label = 'Password',
}: {
    policy: PasswordPolicy;
    values: PasswordValues;
    onValuesChange: (values: PasswordValues) => void;
    /** `errors.password` */
    error?: string;
    label?: string;
}) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);
    const { password, confirmation } = values;
    const mismatch =
        confirmation !== '' &&
        password !== '' &&
        !password.startsWith(confirmation);
    const short = password !== '' && password.length < policy.min;

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = window.setTimeout(() => setCopied(false), 1800);

        return () => window.clearTimeout(timer);
    }, [copied]);

    const suggest = () => {
        const next = suggestPassword();

        onValuesChange({ password: next, confirmation: next });
        setRevealed(true);
        setCopied(false);
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
        } catch {
            // No clipboard (an http address): show it, so it can be selected.
            setRevealed(true);
        }
    };

    const type = revealed ? 'text' : 'password';
    const shared = {
        type,
        autoComplete: 'new-password',
        spellCheck: false,
        autoCapitalize: 'none',
        maxLength: 255,
        passwordrules: policy.rules,
        inputClassName: cn(
            revealed && 'font-mono text-[14px] tracking-[0.04em]',
        ),
    } as const;

    return (
        <div className="grid gap-5 sm:grid-cols-2">
            <Field
                label={label}
                required
                error={error}
                hint={
                    short
                        ? `${password.length} of at least ${policy.min} characters.`
                        : `At least ${policy.min} characters. Nothing is emailed: you pass it on yourself.`
                }
                aside={
                    <span className="flex items-baseline gap-3">
                        {password !== '' && revealed ? (
                            <button
                                type="button"
                                onClick={() => void copy()}
                                className={linkButton}
                            >
                                <span aria-live="polite">
                                    {copied ? 'Copied' : 'Copy'}
                                </span>
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={suggest}
                            className={linkButton}
                        >
                            Suggest one
                        </button>
                    </span>
                }
            >
                <TextInput
                    {...shared}
                    name="password"
                    value={password}
                    onChange={(event) =>
                        onValuesChange({
                            ...values,
                            password: event.target.value,
                        })
                    }
                    trailing={
                        <button
                            type="button"
                            onClick={() => setRevealed((value) => !value)}
                            aria-pressed={revealed}
                            aria-label={
                                revealed
                                    ? 'Hide the password'
                                    : 'Show the password'
                            }
                            title={revealed ? 'Hide' : 'Show'}
                            className="-mr-1.5 grid size-8 cursor-pointer place-items-center rounded-[10px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                        >
                            {revealed ? (
                                <EyeOff aria-hidden />
                            ) : (
                                <Eye aria-hidden />
                            )}
                        </button>
                    }
                />
            </Field>
            <Field
                label="Type it again"
                required
                hint={
                    mismatch
                        ? 'Doesn’t match the first one yet.'
                        : confirmation !== '' && confirmation === password
                          ? 'Matches.'
                          : undefined
                }
            >
                <TextInput
                    {...shared}
                    name="password_confirmation"
                    value={confirmation}
                    invalid={mismatch || undefined}
                    onChange={(event) =>
                        onValuesChange({
                            ...values,
                            confirmation: event.target.value,
                        })
                    }
                />
            </Field>
        </div>
    );
}
