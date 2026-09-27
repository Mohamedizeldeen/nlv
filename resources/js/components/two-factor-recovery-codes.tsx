import { Form } from '@inertiajs/react';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/admin/button';
import { FieldError } from '@/components/admin/field';
import { useClipboard } from '@/hooks/use-clipboard';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

/**
 * The recovery codes of an account with two-factor authentication on:
 * hidden until asked for, then shown in a glass well with Copy and
 * Regenerate.
 */
export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [visible, setVisible] = useState(false);
    const [copiedText, copy] = useClipboard();
    const codesRef = useRef<HTMLDivElement | null>(null);
    const allCodes = recoveryCodesList.join('\n');
    const copied = allCodes !== '' && copiedText === allCodes;

    const toggle = useCallback(async () => {
        if (!visible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setVisible(!visible);

        if (!visible) {
            setTimeout(() => {
                codesRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [visible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    return (
        <div className="grid gap-4">
            <div>
                <h3 className="text-[14px] font-medium text-bone">
                    Recovery codes
                </h3>
                <p
                    id="recovery-codes-note"
                    className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-pretty text-smoke"
                >
                    Lost your phone? Each code signs you in once, in place of
                    the code from the app. Keep them in a password manager.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="glass"
                    onClick={() => void toggle()}
                    aria-expanded={visible}
                    aria-controls="recovery-codes"
                >
                    {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    {visible ? 'Hide recovery codes' : 'Show recovery codes'}
                </Button>

                {visible && recoveryCodesList.length > 0 ? (
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => void copy(allCodes)}
                        >
                            {copied ? (
                                <Check aria-hidden className="text-mint" />
                            ) : (
                                <Copy aria-hidden />
                            )}
                            {copied ? 'Copied' : 'Copy all'}
                        </Button>
                        <Form
                            {...regenerateRecoveryCodes.form()}
                            options={{ preserveScroll: true }}
                            onSuccess={() => void fetchRecoveryCodes()}
                        >
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    disabled={processing}
                                    aria-describedby="recovery-codes-regenerate-note"
                                >
                                    <RefreshCw
                                        aria-hidden
                                        className={
                                            processing
                                                ? 'animate-spin'
                                                : undefined
                                        }
                                    />
                                    Regenerate
                                </Button>
                            )}
                        </Form>
                    </>
                ) : null}
            </div>

            <div id="recovery-codes" hidden={!visible}>
                {errors.length ? (
                    <div className="grid gap-1">
                        {Array.from(new Set(errors)).map((error) => (
                            <FieldError key={error}>{error}</FieldError>
                        ))}
                    </div>
                ) : (
                    <div ref={codesRef} className="grid gap-3">
                        {recoveryCodesList.length ? (
                            <ol
                                aria-label="Recovery codes"
                                className="grid gap-x-6 gap-y-2 rounded-[18px] bg-[oklch(0.12_0.012_200/0.55)] px-5 py-4 font-mono text-[13.5px] text-bone shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)] ring-1 ring-white/[0.1] ring-inset sm:grid-cols-2"
                            >
                                {recoveryCodesList.map((code, index) => (
                                    <li
                                        key={code}
                                        className="flex items-baseline gap-3 select-text"
                                    >
                                        <span
                                            aria-hidden
                                            className="w-5 shrink-0 font-sans text-[10px] font-medium tracking-[0.1em] text-smoke tabular-nums"
                                        >
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        {code}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <div
                                aria-label="Loading recovery codes"
                                className="grid gap-2 rounded-[18px] bg-white/[0.04] px-5 py-4 sm:grid-cols-2"
                            >
                                {Array.from({ length: 8 }, (_, index) => (
                                    <div
                                        key={index}
                                        aria-hidden
                                        className="h-4 animate-pulse rounded-[6px] bg-white/[0.08]"
                                    />
                                ))}
                            </div>
                        )}
                        <p
                            id="recovery-codes-regenerate-note"
                            className="text-[12.5px] leading-relaxed text-pretty text-smoke"
                        >
                            A used code is gone for good. Regenerate gives you
                            eight new ones and turns every old one off.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
