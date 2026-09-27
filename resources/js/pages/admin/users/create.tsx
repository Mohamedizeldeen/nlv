import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { SaveBar } from '@/components/admin/save-bar';
import { TextInput } from '@/components/admin/text-input';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import { login } from '@/routes';
import { NextSteps } from './partials/next-steps';
import { EMPTY_PASSWORD, PasswordFields } from './partials/password-fields';
import type { PasswordValues } from './partials/password-fields';
import { PasswordMethodChoice } from './partials/password-method';
import type { PasswordMethod, UsersCreateProps } from './types';

export default function UsersCreate({ password: policy }: UsersCreateProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [method, setMethod] = useState<PasswordMethod>('set');
    const [passwords, setPasswords] = useState<PasswordValues>(EMPTY_PASSWORD);
    const dirty =
        name.trim() !== '' ||
        email.trim() !== '' ||
        passwords.password !== '' ||
        passwords.confirmation !== '';
    const guard = useUnsavedGuard(dirty, { subject: 'this new account' });
    const address = email.trim() || 'their address';
    const minutes = `${policy.linkMinutes} minutes`;

    const steps =
        method === 'set'
            ? [
                  <>
                      The account works <strong>as soon as you add it</strong>.
                      Its email address counts as verified: you vouch for it.
                  </>,
                  <>
                      Pass the password on yourself, in person or through a
                      channel you trust. <strong>Nothing is emailed.</strong>
                  </>,
                  <>
                      They sign in at{' '}
                      <span className="font-mono text-[13px] text-bone">
                          {login.url()}
                      </span>{' '}
                      and land on the dashboard. From their account settings
                      they can change the password and turn on two-factor.
                  </>,
              ]
            : [
                  <>
                      The account works <strong>as soon as you add it</strong>,
                      with a password nobody knows yet.
                  </>,
                  <>
                      <strong className="break-all">{address}</strong> gets an
                      email with a link to choose one. It works for {minutes}.
                  </>,
                  <>
                      If it runs out, send a new one from their page, or they
                      use “Forgot your password?” on the sign-in page.
                  </>,
              ];

    return (
        <>
            <Head title="Add user · Users · Admin" />

            <PageHeader
                crumbs={[{ label: 'Add user' }]}
                title={
                    <>
                        Someone new <em>at the panel.</em>
                    </>
                }
                description="They get the same access as you: the landing page, every lead, and this list of people. There are no lesser roles."
                actions={
                    <Link
                        href={UserController.index.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Cancel
                    </Link>
                }
            />

            <Form
                {...UserController.store.form()}
                options={{ preserveScroll: true }}
                className="mt-8"
            >
                {({ errors, processing, hasErrors }) => (
                    <>
                        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
                            <div className="grid gap-5 lg:col-span-7">
                                <Panel
                                    title="Who they are"
                                    description="Their name shows in the activity log and on the leads assigned to them."
                                    variant="strong"
                                    bodyClassName="grid gap-6 sm:grid-cols-2"
                                >
                                    <Field
                                        label="Name"
                                        required
                                        error={errors.name}
                                    >
                                        <TextInput
                                            name="name"
                                            value={name}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                            maxLength={255}
                                            autoComplete="off"
                                            autoFocus
                                            placeholder="Layla Haddad"
                                        />
                                    </Field>
                                    <Field
                                        label="Email address"
                                        required
                                        error={errors.email}
                                        hint="They sign in with it. Saved in lowercase."
                                    >
                                        <TextInput
                                            name="email"
                                            type="email"
                                            value={email}
                                            onChange={(event) =>
                                                setEmail(event.target.value)
                                            }
                                            maxLength={255}
                                            autoComplete="off"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            placeholder="layla@yourstore.com"
                                        />
                                    </Field>
                                </Panel>

                                <Panel
                                    title="Their password"
                                    description="Choose it now, or let them choose it themselves."
                                    variant="strong"
                                    bodyClassName="grid gap-6"
                                >
                                    <PasswordMethodChoice
                                        name="password_method"
                                        legend="How they get a password"
                                        value={method}
                                        onChange={setMethod}
                                        error={errors.password_method}
                                        choices={[
                                            {
                                                value: 'set',
                                                label: 'Set a password now',
                                                description:
                                                    'You pass it on yourself. It works right away.',
                                            },
                                            {
                                                value: 'link',
                                                label: 'Email them a link',
                                                description: `They choose their own. The link works for ${minutes}.`,
                                            },
                                        ]}
                                    />
                                    {method === 'set' ? (
                                        <PasswordFields
                                            policy={policy}
                                            values={passwords}
                                            onValuesChange={setPasswords}
                                            error={errors.password}
                                        />
                                    ) : (
                                        <p className="border-t border-white/10 pt-5 text-[14px] leading-relaxed text-pretty text-mist">
                                            The email goes out as soon as you
                                            add the account, from the site’s
                                            mail address, with a button to the
                                            password page.
                                        </p>
                                    )}
                                </Panel>

                                <SaveBar
                                    dirty={dirty}
                                    isNew
                                    processing={processing}
                                    hasErrors={hasErrors}
                                    createLabel={
                                        method === 'link'
                                            ? 'Add and email the link'
                                            : 'Add user'
                                    }
                                />
                            </div>

                            <aside className="grid gap-5 lg:sticky lg:top-8 lg:col-span-5">
                                <Panel
                                    kicker="What happens next"
                                    title={
                                        method === 'set'
                                            ? 'With a password you set'
                                            : 'With an emailed link'
                                    }
                                >
                                    <NextSteps steps={steps} />
                                </Panel>
                            </aside>
                        </div>
                        {guard}
                    </>
                )}
            </Form>
        </>
    );
}
