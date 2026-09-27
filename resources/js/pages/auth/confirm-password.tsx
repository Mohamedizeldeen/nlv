import { Form, Head } from '@inertiajs/react';
import { button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';
/* @chisel-passkeys */
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            {/* @chisel-passkeys */}
            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with a passkey"
                loadingLabel="Waiting for your passkey…"
                separator="or with your password"
            />
            {/* @end-chisel-passkeys */}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <Field
                            label="Password"
                            error={errors.password}
                            required
                        >
                            <PasswordInput
                                name="password"
                                autoComplete="current-password"
                                autoFocus
                            />
                        </Field>

                        <button
                            type="submit"
                            className={button({
                                size: 'md',
                                className: 'mt-1 w-full',
                            })}
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing ? <Spinner /> : null}
                            Confirm and continue
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirm it’s',
    accent: 'you.',
    description:
        'You’re about to see or change how you log in. Enter your password to go on; the panel won’t ask again for a few hours.',
};
