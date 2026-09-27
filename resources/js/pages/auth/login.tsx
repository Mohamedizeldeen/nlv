import { Form, Head } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { TextInput } from '@/components/admin/text-input';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { AuthNotice } from '@/layouts/auth-layout';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
/* @chisel-passkeys */
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

type Props = {
    status?: string;
    canResetPassword: boolean;
};

/** "Remember me" as a glass check box (a native one, so the form sends it). */
function RememberMe() {
    return (
        <label className="group flex w-fit cursor-pointer items-center gap-3 text-[14px] text-mist select-none">
            <span className="relative grid size-5 shrink-0 place-items-center">
                <input
                    type="checkbox"
                    name="remember"
                    className="peer absolute inset-0 cursor-pointer appearance-none rounded-[7px] bg-white/[0.06] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.1)] ring-1 ring-white/20 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset group-hover:bg-white/[0.1] checked:bg-mint checked:ring-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
                />
                <Check
                    aria-hidden
                    strokeWidth={3}
                    className="pointer-events-none relative size-3.5 text-ink opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                />
            </span>
            Keep me logged in on this device
        </label>
    );
}

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            {status ? <AuthNotice>{status}</AuthNotice> : null}

            {/* @chisel-passkeys */}
            <PasskeyVerify />
            {/* @end-chisel-passkeys */}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <Field
                            label="Email address"
                            error={errors.email}
                            required
                        >
                            <TextInput
                                type="email"
                                name="email"
                                autoFocus
                                autoComplete="email"
                                placeholder="you@company.com"
                            />
                        </Field>

                        <Field
                            label="Password"
                            error={errors.password}
                            required
                            aside={
                                canResetPassword ? (
                                    <TextLink href={request()}>
                                        Forgot your password?
                                    </TextLink>
                                ) : undefined
                            }
                        >
                            <PasswordInput
                                name="password"
                                autoComplete="current-password"
                            />
                        </Field>

                        <RememberMe />

                        <button
                            type="submit"
                            className={button({
                                size: 'md',
                                className: 'mt-1 w-full',
                            })}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing ? <Spinner /> : null}
                            Log in
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Log in to the',
    accent: 'back of house.',
    description:
        'The admin panel: order requests, the landing page and everything on it.',
    note: 'No account? There’s no public sign-up. An admin adds each person from the panel’s Users page.',
};
