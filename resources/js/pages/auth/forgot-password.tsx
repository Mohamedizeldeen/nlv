import { Form, Head } from '@inertiajs/react';
import { button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { TextInput } from '@/components/admin/text-input';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { AuthNotice } from '@/layouts/auth-layout';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {status ? <AuthNotice>{status}</AuthNotice> : null}

            <Form {...email.form()} className="grid gap-5">
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
                                autoComplete="email"
                                autoFocus
                                placeholder="you@company.com"
                            />
                        </Field>

                        <button
                            type="submit"
                            className={button({
                                size: 'md',
                                className: 'mt-1 w-full',
                            })}
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing ? <Spinner /> : null}
                            Email me a reset link
                        </button>
                    </>
                )}
            </Form>

            <p className="mt-6 text-center text-[13.5px] text-smoke">
                Remembered it?{' '}
                <TextLink href={login()}>Back to log in</TextLink>
            </p>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot your',
    accent: 'password?',
    description:
        'Enter your account’s email address. We’ll send a link to choose a new password.',
    note: 'The link works for 60 minutes. Nothing arrives? Check the spam folder, or ask another admin to send you one from the Users page.',
};
