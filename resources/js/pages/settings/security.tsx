import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { Button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { Panel } from '@/components/admin/panel';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps /* @end-chisel-2fa */;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security · Account · Admin" />

            <Form
                {...SecurityController.update.form()}
                options={{ preserveScroll: true }}
                resetOnError={[
                    'password',
                    'password_confirmation',
                    'current_password',
                ]}
                resetOnSuccess
                onError={(errors) => {
                    if (errors.password) {
                        passwordInput.current?.focus();
                    }

                    if (errors.current_password) {
                        currentPasswordInput.current?.focus();
                    }
                }}
            >
                {({ errors, processing }) => (
                    <Panel
                        title="Password"
                        description="Use a long password you don’t use anywhere else. A password manager can make one up and remember it."
                        variant="strong"
                        footer={
                            <Button
                                type="submit"
                                disabled={processing}
                                data-test="update-password-button"
                            >
                                {processing ? <Spinner /> : null}
                                Change password
                            </Button>
                        }
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field
                                label="Current password"
                                error={errors.current_password}
                                required
                                className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]"
                            >
                                <PasswordInput
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                />
                            </Field>

                            <Field
                                label="New password"
                                error={errors.password}
                                required
                            >
                                <PasswordInput
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                    passwordrules={props.passwordRules}
                                />
                            </Field>

                            <Field
                                label="Confirm the new password"
                                error={errors.password_confirmation}
                                required
                            >
                                <PasswordInput
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    passwordrules={props.passwordRules}
                                />
                            </Field>
                        </div>
                    </Panel>
                )}
            </Form>

            {/* @chisel-2fa */}
            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />
            {/* @end-chisel-2fa */}

            {/* @chisel-passkeys */}
            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
            {/* @end-chisel-passkeys */}
        </>
    );
}
