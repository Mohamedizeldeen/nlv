import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Button, button } from '@/components/admin/button';
import { Modal } from '@/components/admin/dialog';
import { FieldError } from '@/components/admin/field';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { cn } from '@/lib/utils';
import { confirm } from '@/routes/two-factor';

type OtpInputProps = {
    name: string;
    /** Accessible name of the (visually hidden) input. */
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    invalid?: boolean;
    autoFocus?: boolean;
    pattern?: string;
    /** The hidden input, e.g. to focus it again after a wrong code. */
    inputRef?: Ref<HTMLInputElement>;
};

/**
 * Six glass boxes for a 6-digit code (one hidden input underneath, so
 * paste and the phone's one-time-code autofill work). Also used by the
 * two-factor challenge at sign-in.
 */
export function OtpInput({
    name,
    label,
    value,
    onChange,
    disabled = false,
    invalid = false,
    autoFocus = false,
    pattern = REGEXP_ONLY_DIGITS,
    inputRef,
}: OtpInputProps) {
    const [focused, setFocused] = useState(false);
    const current = Math.min(value.length, OTP_MAX_LENGTH - 1);

    return (
        <InputOTP
            ref={inputRef}
            name={name}
            aria-label={label}
            aria-invalid={invalid || undefined}
            autoComplete="one-time-code"
            maxLength={OTP_MAX_LENGTH}
            value={value}
            onChange={onChange}
            disabled={disabled}
            pattern={pattern}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            <InputOTPGroup className="gap-2 sm:gap-2.5">
                {Array.from({ length: OTP_MAX_LENGTH }, (_, index) => (
                    <InputOTPSlot
                        key={index}
                        index={index}
                        className={cn(
                            'h-14 w-11 rounded-[14px] border-0 bg-white/[0.06] font-sans text-[22px] font-medium text-bone tabular-nums shadow-[inset_0_1px_0_0_oklch(1_0_0/0.1)] ring-1 ring-white/[0.14] transition-[box-shadow,background-color] duration-300 ease-glass ring-inset first:rounded-l-[14px] first:border-l-0 last:rounded-r-[14px] sm:w-12',
                            invalid && 'ring-coral/70',
                            focused &&
                                index === current &&
                                'bg-white/[0.09] ring-2 ring-mint/70',
                        )}
                    />
                ))}
            </InputOTPGroup>
        </InputOTP>
    );
}

const CORNERS = [
    'top-0 left-0 border-t border-l',
    'top-0 right-0 border-t border-r',
    'bottom-0 left-0 border-b border-l',
    'right-0 bottom-0 border-r border-b',
] as const;

function SetupStep({
    qrCodeSvg,
    manualSetupKey,
    onNextStep,
    errors,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    onNextStep: () => void;
    errors: string[];
}) {
    const [copiedText, copy] = useClipboard();
    const copied = manualSetupKey !== null && copiedText === manualSetupKey;

    if (errors.length > 0) {
        return (
            <div className="grid gap-4">
                {Array.from(new Set(errors)).map((error) => (
                    <FieldError key={error}>{error}</FieldError>
                ))}
                <p className="text-[13.5px] leading-relaxed text-smoke">
                    Close this window and try again. If it keeps happening,
                    reload the page.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            {/* The code on a light tile: phones read dark-on-light codes best. */}
            <div className="relative mx-auto grid size-[14.5rem] place-items-center p-3">
                {CORNERS.map((corner) => (
                    <span
                        key={corner}
                        aria-hidden
                        className={cn('absolute size-5 border-mint/60', corner)}
                    />
                ))}
                {qrCodeSvg ? (
                    <div
                        role="img"
                        aria-label="QR code for your authenticator app"
                        className="size-full rounded-[14px] bg-white p-3 [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                ) : (
                    <Spinner className="size-6 text-mint" />
                )}
            </div>

            <div className="grid gap-2">
                <p
                    id="two-factor-setup-key-label"
                    className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase"
                >
                    Or type this setup key
                </p>
                <div className="flex h-11 items-center gap-2 rounded-[14px] bg-white/[0.06] pr-1.5 pl-3.5 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.1)] ring-1 ring-white/[0.14] ring-inset">
                    {manualSetupKey ? (
                        <>
                            <input
                                type="text"
                                readOnly
                                value={manualSetupKey}
                                aria-labelledby="two-factor-setup-key-label"
                                onFocus={(event) =>
                                    event.currentTarget.select()
                                }
                                className="h-full min-w-0 flex-1 bg-transparent font-mono text-[14px] tracking-[0.06em] text-bone outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => void copy(manualSetupKey)}
                                className={button({
                                    variant: 'ghost',
                                    size: 'xs',
                                    className: 'shrink-0',
                                })}
                            >
                                {copied ? (
                                    <Check aria-hidden className="text-mint" />
                                ) : (
                                    <Copy aria-hidden />
                                )}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </>
                    ) : (
                        <Spinner className="text-mint" />
                    )}
                </div>
            </div>

            <Button
                variant="primary"
                className="w-full"
                onClick={onNextStep}
                disabled={!qrCodeSvg}
            >
                I’ve added it, continue
            </Button>
        </div>
    );
}

function VerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const [code, setCode] = useState('');
    const input = useRef<HTMLInputElement>(null);

    return (
        <Form
            {...confirm.form()}
            options={{ preserveScroll: true }}
            onSuccess={() => onClose()}
            onError={() => {
                setCode('');
                input.current?.focus();
            }}
            resetOnError
            resetOnSuccess
            className="grid gap-6"
        >
            {({
                processing,
                errors,
            }: {
                processing: boolean;
                errors?: { confirmTwoFactorAuthentication?: { code?: string } };
            }) => {
                const error = errors?.confirmTwoFactorAuthentication?.code;

                return (
                    <>
                        <div className="grid justify-items-center gap-3 py-2">
                            <OtpInput
                                name="code"
                                label="Code from your authenticator app"
                                value={code}
                                onChange={setCode}
                                invalid={Boolean(error)}
                                inputRef={input}
                                autoFocus
                            />
                            {error ? (
                                <FieldError className="text-center">
                                    {error}
                                </FieldError>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="glass"
                                onClick={onBack}
                                disabled={processing}
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    processing || code.length < OTP_MAX_LENGTH
                                }
                            >
                                {processing ? <Spinner /> : null}
                                Turn it on
                            </Button>
                        </div>
                    </>
                );
            }}
        </Form>
    );
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
};

/**
 * Turning on two-factor authentication, in the admin's glass modal: scan
 * the QR code (or type the key), then prove it works with a first code.
 */
export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: Props) {
    const [verifying, setVerifying] = useState(false);

    const handleClose = useCallback(() => {
        if (twoFactorEnabled) {
            clearSetupData();
        }

        setVerifying(false);
        onClose();
    }, [clearSetupData, onClose, twoFactorEnabled]);

    const handleNextStep = useCallback(() => {
        if (requiresConfirmation) {
            setVerifying(true);

            return;
        }

        clearSetupData();
        handleClose();
    }, [requiresConfirmation, clearSetupData, handleClose]);

    const fetchSetupDataRef = useRef(fetchSetupData);

    useEffect(() => {
        fetchSetupDataRef.current = fetchSetupData;
    }, [fetchSetupData]);

    useEffect(() => {
        if (isOpen && !qrCodeSvg) {
            void fetchSetupDataRef.current();
        }
    }, [isOpen, qrCodeSvg]);

    return (
        <Modal
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
            size="sm"
            title={
                verifying ? (
                    <>
                        Enter the <em>first code.</em>
                    </>
                ) : (
                    <>
                        Add the panel to <em>your app.</em>
                    </>
                )
            }
            description={
                verifying
                    ? 'Type the 6-digit code your authenticator app now shows for this account.'
                    : 'Scan the QR code with an authenticator app (1Password, Google Authenticator, Microsoft Authenticator, Authy…).'
            }
        >
            <div className="pb-1">
                {verifying ? (
                    <VerificationStep
                        onClose={handleClose}
                        onBack={() => setVerifying(false)}
                    />
                ) : (
                    <SetupStep
                        qrCodeSvg={qrCodeSvg}
                        manualSetupKey={manualSetupKey}
                        onNextStep={handleNextStep}
                        errors={errors}
                    />
                )}
            </div>
        </Modal>
    );
}
