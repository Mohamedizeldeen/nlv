import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useRef, useState } from 'react';
import { button } from '@/components/admin/button';
import { Field, FieldError } from '@/components/admin/field';
import { TextInput } from '@/components/admin/text-input';
import { OtpInput } from '@/components/two-factor-setup-modal';
import { Spinner } from '@/components/ui/spinner';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

const MODES = {
    code: {
        title: 'One more',
        accent: 'step.',
        description:
            'Open the authenticator app on your phone and enter the 6-digit code it shows for this account.',
        toggle: 'Use a recovery code instead',
    },
    recovery: {
        title: 'Use a',
        accent: 'recovery code.',
        description:
            'Enter one of the recovery codes you saved when you turned on two-factor authentication. Each code works once.',
        toggle: 'Use the code from your app',
    },
} as const;

export default function TwoFactorChallenge() {
    const [mode, setMode] = useState<keyof typeof MODES>('code');
    const [code, setCode] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const copy = MODES[mode];

    setLayoutProps({
        title: copy.title,
        accent: copy.accent,
        description: copy.description,
    });

    const toggleMode = (clearErrors: () => void): void => {
        setMode(mode === 'code' ? 'recovery' : 'code');
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Two-factor authentication" />

            <Form
                {...store.form()}
                className="grid gap-5"
                resetOnError
                resetOnSuccess={mode === 'code'}
                onError={() => {
                    setCode('');
                    input.current?.focus();
                }}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {mode === 'recovery' ? (
                            <Field
                                label="Recovery code"
                                error={errors.recovery_code}
                                required
                            >
                                <TextInput
                                    ref={input}
                                    name="recovery_code"
                                    autoComplete="one-time-code"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="abcde12345-fghij67890"
                                    inputClassName="font-mono tracking-[0.04em]"
                                    autoFocus
                                />
                            </Field>
                        ) : (
                            <div className="grid justify-items-center gap-3">
                                <OtpInput
                                    name="code"
                                    label="Authentication code"
                                    value={code}
                                    onChange={setCode}
                                    invalid={Boolean(errors.code)}
                                    pattern={REGEXP_ONLY_DIGITS}
                                    inputRef={input}
                                    autoFocus
                                />
                                {errors.code ? (
                                    <FieldError className="text-center">
                                        {errors.code}
                                    </FieldError>
                                ) : null}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={button({
                                size: 'md',
                                className: 'mt-1 w-full',
                            })}
                            disabled={
                                processing ||
                                (mode === 'code' &&
                                    code.length < OTP_MAX_LENGTH)
                            }
                        >
                            {processing ? <Spinner /> : null}
                            Continue
                        </button>

                        <button
                            type="button"
                            className={button({
                                variant: 'ghost',
                                className: 'mx-auto',
                            })}
                            onClick={() => toggleMode(clearErrors)}
                        >
                            {copy.toggle}
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}

TwoFactorChallenge.layout = {
    title: MODES.code.title,
    accent: MODES.code.accent,
    description: MODES.code.description,
};
