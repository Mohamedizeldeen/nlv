import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, History, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ActivityController from '@/actions/App/Http/Controllers/Admin/ActivityController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { Field, FieldError } from '@/components/admin/field';
import { formatDate, parseDay, plural } from '@/components/admin/format';
import { KeyValue } from '@/components/admin/key-value';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { SaveBar } from '@/components/admin/save-bar';
import { TextInput } from '@/components/admin/text-input';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import { edit as securitySettings } from '@/routes/security';
import { deleteBlocker, firstName } from './partials/account';
import { DeleteUserDialog } from './partials/delete-user-dialog';
import { EMPTY_PASSWORD, PasswordFields } from './partials/password-fields';
import type { PasswordValues } from './partials/password-fields';
import { PasswordMethodChoice } from './partials/password-method';
import type { PasswordMethod, PasswordPolicy, UsersEditProps } from './types';

type EditedUser = UsersEditProps['user'];

const quietLink =
    'group inline-flex items-center gap-1.5 rounded-[8px] text-[13px] text-mist transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

/** How an address is compared (the server saves it trimmed and lowercase). */
const normalEmail = (email: string) => email.trim().toLowerCase();

/** Name and email, with the form's sticky save bar. */
function AccountForm({ user }: { user: EditedUser }) {
    const [initial] = useState({ name: user.name, email: user.email });
    const [values, setValues] = useState(initial);
    const emailChanged =
        values.email.trim() !== '' &&
        normalEmail(values.email) !== normalEmail(initial.email);
    const dirty = values.name !== initial.name || emailChanged;
    const guard = useUnsavedGuard(dirty, {
        subject: user.isYou
            ? 'your account'
            : `${firstName(user.name)}’s account`,
    });

    return (
        <Form
            {...UserController.update.form(user.id)}
            options={{ preserveScroll: true }}
            className="grid gap-5"
        >
            {({ errors, processing, hasErrors }) => (
                <>
                    <Panel
                        title="Name and email"
                        description={
                            user.isYou
                                ? 'How you appear in the activity log and on the leads assigned to you.'
                                : 'How they appear in the activity log and on the leads assigned to them.'
                        }
                        variant="strong"
                        bodyClassName="grid gap-6 sm:grid-cols-2"
                    >
                        <Field label="Name" required error={errors.name}>
                            <TextInput
                                name="name"
                                value={values.name}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        name: event.target.value,
                                    })
                                }
                                maxLength={255}
                                autoComplete="off"
                            />
                        </Field>
                        <Field
                            label="Email address"
                            required
                            error={errors.email}
                            hint={
                                emailChanged
                                    ? 'The new address signs in from now on and stays verified. A password link sent to the old one stops working.'
                                    : user.isYou
                                      ? 'You sign in with it.'
                                      : 'They sign in with it.'
                            }
                        >
                            <TextInput
                                name="email"
                                type="email"
                                value={values.email}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        email: event.target.value,
                                    })
                                }
                                maxLength={255}
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                            />
                        </Field>
                    </Panel>
                    <SaveBar
                        dirty={dirty}
                        processing={processing}
                        hasErrors={hasErrors}
                        savedAt={user.updatedAt}
                        onDiscard={() => setValues(initial)}
                    />
                    {guard}
                </>
            )}
        </Form>
    );
}

/** A new password now, or an emailed link to choose one. */
function PasswordPanel({
    user,
    policy,
}: {
    user: EditedUser;
    policy: PasswordPolicy;
}) {
    const [method, setMethod] = useState<PasswordMethod>('set');
    const [passwords, setPasswords] = useState<PasswordValues>(EMPTY_PASSWORD);
    const first = firstName(user.name);

    if (user.isYou) {
        return (
            <Panel
                title="Password"
                description="Change your own password in your account settings: they ask for the current one first, and hold two-factor and passkeys too."
                variant="strong"
                padded={false}
                footer={
                    <Link
                        href={securitySettings.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Open security settings
                    </Link>
                }
            />
        );
    }

    const action =
        method === 'set'
            ? UserController.setPassword.form(user.id)
            : UserController.sendPasswordLink.form(user.id);

    return (
        <Form
            {...action}
            options={{ preserveScroll: true }}
            onSuccess={() => setPasswords(EMPTY_PASSWORD)}
        >
            {({ errors, processing }) => (
                <Panel
                    title="Password"
                    description={`Give ${first} a new one now, or email a link to choose their own.`}
                    variant="strong"
                    bodyClassName="grid gap-6"
                    footer={
                        <>
                            <p className="mr-auto min-w-0 flex-[1_1_16rem] text-[12.5px] leading-snug text-pretty text-smoke">
                                {method === 'set'
                                    ? `${first} is signed out on every device, and signs in with the new one.`
                                    : 'Their current password keeps working until they choose a new one.'}
                            </p>
                            <button
                                type="submit"
                                disabled={
                                    processing ||
                                    (method === 'set' &&
                                        passwords.password === '')
                                }
                                className={button({
                                    className:
                                        'disabled:pointer-events-none disabled:opacity-45',
                                })}
                            >
                                {method === 'set'
                                    ? 'Set new password'
                                    : 'Email the link'}
                            </button>
                        </>
                    }
                >
                    <PasswordMethodChoice
                        name="method"
                        legend="How they get a new password"
                        value={method}
                        onChange={setMethod}
                        choices={[
                            {
                                value: 'set',
                                label: 'Set a new password now',
                                description:
                                    'You pass it on yourself. It works right away.',
                            },
                            {
                                value: 'link',
                                label: 'Email them a link',
                                description: `They choose their own. The link works for ${policy.linkMinutes} minutes.`,
                            },
                        ]}
                    />
                    {method === 'set' ? (
                        <PasswordFields
                            label="New password"
                            policy={policy}
                            values={passwords}
                            onValuesChange={setPasswords}
                            error={errors.password}
                        />
                    ) : (
                        <div className="grid gap-2 border-t border-white/10 pt-5">
                            <p className="text-[14px] leading-relaxed text-pretty text-mist">
                                The email goes to{' '}
                                <span className="break-all text-bone">
                                    {user.email}
                                </span>
                                , with a button to the password page. A new link
                                replaces any sent before.
                            </p>
                            {errors.password_link ? (
                                <FieldError>{errors.password_link}</FieldError>
                            ) : null}
                        </div>
                    )}
                </Panel>
            )}
        </Form>
    );
}

/**
 * An account made before every account was an admin: it can't open the
 * panel until it is given access (or it can be deleted).
 */
function PanelAccess({ user }: { user: EditedUser }) {
    const { errors } = usePage().props;

    return (
        <Panel
            kicker="No panel access"
            title="This account can’t open the panel"
            description="It was made before every account became an admin. Give it access, or delete it if nobody uses it."
            padded={Boolean(errors.admin)}
            footer={
                <ConfirmDialog
                    tone="default"
                    trigger={<Button variant="glass">Give panel access</Button>}
                    title={
                        <>
                            Give {firstName(user.name)} <em>panel access?</em>
                        </>
                    }
                    description={`${user.name} (${user.email}) will be an admin like everyone else here: the landing page, every lead and this list of people.`}
                    confirmLabel="Give access"
                    onConfirm={() =>
                        new Promise<void>((resolve) =>
                            router.post(
                                UserController.grantAdmin.url(user.id),
                                {},
                                {
                                    preserveScroll: true,
                                    onFinish: () => resolve(),
                                },
                            ),
                        )
                    }
                />
            }
        >
            {errors.admin ? <FieldError>{errors.admin}</FieldError> : null}
        </Panel>
    );
}

export default function UsersEdit({
    user,
    adminCount,
    password,
}: UsersEditProps) {
    const blocker = deleteBlocker(user, adminCount);
    const activityHref = ActivityController.index.url({
        query: { user: String(user.id) },
    });

    return (
        <>
            <Head title={`${user.name} · Users · Admin`} />

            <PageHeader
                crumbs={[{ label: user.name }]}
                title={
                    user.isYou ? (
                        <>
                            Your <em>account.</em>
                        </>
                    ) : (
                        <>
                            {firstName(user.name)}’s <em>account.</em>
                        </>
                    )
                }
                description={
                    <>
                        Added {formatDate(parseDay(user.createdOn))}.{' '}
                        {user.lastLoginAt ? (
                            <>
                                Last signed in{' '}
                                <RelativeTime value={user.lastLoginAt} />.
                            </>
                        ) : user.isYou ? null : (
                            'Hasn’t signed in yet.'
                        )}
                    </>
                }
                actions={
                    <>
                        <Link
                            href={activityHref}
                            className={button({ variant: 'glass' })}
                        >
                            <History aria-hidden />
                            Activity
                        </Link>
                        {blocker ? null : (
                            <DeleteUserDialog
                                user={user}
                                trigger={
                                    <Button variant="danger">
                                        <Trash2 aria-hidden /> Delete
                                    </Button>
                                }
                            />
                        )}
                    </>
                }
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-12 lg:items-start">
                <div className="grid gap-5 lg:col-span-7">
                    <AccountForm key={user.updatedAt ?? user.id} user={user} />
                    <PasswordPanel user={user} policy={password} />
                </div>

                <aside className="grid gap-5 lg:sticky lg:top-8 lg:col-span-5">
                    {user.isAdmin ? null : <PanelAccess user={user} />}

                    <Panel
                        kicker="On record"
                        title={user.email}
                        actions={
                            <Link href={activityHref} className={quietLink}>
                                Everything they did
                                <ArrowRight
                                    aria-hidden
                                    className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-mint"
                                />
                            </Link>
                        }
                        bodyClassName="pt-2 sm:pt-3"
                    >
                        <KeyValue
                            columns={2}
                            items={[
                                {
                                    label: 'Access',
                                    value: user.isAdmin ? 'Admin' : 'None yet',
                                },
                                {
                                    label: 'Email',
                                    value: user.verified
                                        ? 'Verified'
                                        : 'Not verified',
                                },
                                {
                                    label: 'Two-factor',
                                    value: user.twoFactor ? (
                                        <span className="text-mint">On</span>
                                    ) : (
                                        'Off'
                                    ),
                                },
                                {
                                    label: 'Leads assigned',
                                    value:
                                        user.assignedLeads > 0
                                            ? plural(user.assignedLeads, 'lead')
                                            : 'None',
                                },
                                {
                                    label: 'Last sign-in',
                                    value: user.lastLoginAt ? (
                                        <span className="grid">
                                            <RelativeTime
                                                value={user.lastLoginAt}
                                            />
                                            {user.lastLoginIp ? (
                                                <span className="font-mono text-[12px] text-smoke tabular-nums">
                                                    {user.lastLoginIp}
                                                </span>
                                            ) : null}
                                        </span>
                                    ) : (
                                        'Never'
                                    ),
                                },
                                {
                                    label: 'Added',
                                    value: formatDate(parseDay(user.createdOn)),
                                },
                            ]}
                        />
                        {blocker ? (
                            <p className="pt-4 text-[12.5px] leading-relaxed text-pretty text-smoke">
                                {blocker}
                            </p>
                        ) : null}
                    </Panel>
                </aside>
            </div>
        </>
    );
}
