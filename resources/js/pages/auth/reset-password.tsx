import { Form, Head } from '@inertiajs/react';
import { button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { TextInput } from '@/components/admin/text-input';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Reset password" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <Field label="Email address" error={errors.email}>
                            <TextInput
                                type="email"
                                name="email"
                                autoComplete="username"
                                value={email}
                                readOnly
                                className="bg-white/[0.03] hover:bg-white/[0.03]"
                                inputClassName="text-mist"
                            />
                        </Field>

                        <Field
                            label="Password"
                            error={errors.password}
                            required
                        >
                            <PasswordInput
                                name="password"
                                autoComplete="new-password"
                                autoFocus
                                passwordrules={passwordRules}
                            />
                        </Field>

                        <Field
                            label="Confirm the password"
                            error={errors.password_confirmation}
                            required
                        >
                            <PasswordInput
                                name="password_confirmation"
                                autoComplete="new-password"
                                passwordrules={passwordRules}
                            />
                        </Field>

                        <button
                            type="submit"
                            className={button({
                                size: 'md',
                                className: 'mt-1 w-full',
                            })}
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing ? <Spinner /> : null}
                            Save password
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Choose your',
    accent: 'password.',
    description:
        'Pick something long that you don’t use anywhere else. A password manager can make one up for you.',
};
