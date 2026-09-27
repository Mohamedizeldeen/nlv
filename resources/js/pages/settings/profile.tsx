import { Form, Head, usePage } from '@inertiajs/react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { Button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { Panel } from '@/components/admin/panel';
import { TextInput } from '@/components/admin/text-input';
import DeleteUser from '@/components/delete-user';
import { Spinner } from '@/components/ui/spinner';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
    },
    /* @end-chisel-email-verification */
) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Profile · Account · Admin" />

            <Form
                {...ProfileController.update.form()}
                options={{ preserveScroll: true }}
            >
                {({ processing, errors }) => (
                    <Panel
                        title="Name and email"
                        description="Log-in, reset and confirmation emails go to this address."
                        variant="strong"
                        footer={
                            <Button
                                type="submit"
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing ? <Spinner /> : null}
                                Save profile
                            </Button>
                        }
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="Name" error={errors.name} required>
                                <TextInput
                                    name="name"
                                    defaultValue={auth.user.name}
                                    autoComplete="name"
                                    maxLength={255}
                                />
                            </Field>

                            <Field
                                label="Email address"
                                error={errors.email}
                                required
                                hint="A new address has to be confirmed from an emailed link before the admin panel opens again."
                            >
                                <TextInput
                                    type="email"
                                    name="email"
                                    defaultValue={auth.user.email}
                                    autoComplete="username"
                                    maxLength={255}
                                />
                            </Field>
                        </div>

                        {/* @chisel-email-verification */}
                        {mustVerifyEmail &&
                        auth.user.email_verified_at === null ? (
                            <div className="mt-6 rounded-[16px] bg-coral/[0.07] px-4 py-3.5 text-[13.5px] leading-relaxed text-pretty text-mist ring-1 ring-coral/25 ring-inset">
                                <p>
                                    <span className="text-bone">
                                        Your email address isn’t confirmed yet.
                                    </span>{' '}
                                    The admin panel opens once it is.{' '}
                                    <Link
                                        href={send()}
                                        as="button"
                                        className="cursor-pointer rounded-[4px] text-mint underline decoration-mint/40 underline-offset-[0.28em] transition-[text-decoration-color] duration-[380ms] ease-glass hover:decoration-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                    >
                                        Email me a confirmation link
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' ? (
                                    <p
                                        role="status"
                                        className="mt-1.5 text-mint"
                                    >
                                        The link is on its way to{' '}
                                        {auth.user.email}.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                        {/* @end-chisel-email-verification */}
                    </Panel>
                )}
            </Form>

            <DeleteUser />
        </>
    );
}
