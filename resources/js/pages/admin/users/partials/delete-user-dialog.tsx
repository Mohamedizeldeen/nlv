import { Form } from '@inertiajs/react';
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { Button, button } from '@/components/admin/button';
import { Modal } from '@/components/admin/dialog';
import { Field } from '@/components/admin/field';
import { plural } from '@/components/admin/format';
import { TextInput } from '@/components/admin/text-input';
import type { AdminUserRow } from '../types';
import { firstName } from './account';

/** The coral confirm button of the kit's ConfirmDialog. */
const confirmClass = button({
    variant: 'danger',
    className:
        'bg-coral/[0.16] text-[oklch(0.84_0.1_38)] ring-1 ring-coral/40 ring-inset hover:bg-coral/25 disabled:pointer-events-none disabled:opacity-45',
});

/**
 * Delete an account for good, confirmed by typing its email address
 * (`confirm_email`). The field sits in the body and belongs to the footer's
 * form through its `form` attribute; Delete stays off until it matches.
 */
export function DeleteUserDialog({
    user,
    trigger,
}: {
    user: Pick<AdminUserRow, 'id' | 'name' | 'email' | 'assignedLeads'>;
    /** The element that opens the dialog (a <button>). */
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const [error, setError] = useState<string | undefined>();
    const input = useRef<HTMLInputElement>(null);
    const formId = `delete-user-${useId()}`;
    const matches = typed.trim().toLowerCase() === user.email.toLowerCase();
    const leads = user.assignedLeads;

    const change = (next: boolean) => {
        setOpen(next);

        if (!next) {
            setTyped('');
            setError(undefined);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={change}
            trigger={trigger}
            size="sm"
            title={
                <>
                    Delete {firstName(user.name)}’s <em>account?</em>
                </>
            }
            description={
                <>
                    {user.name} can’t sign in again, and any open session ends
                    now.{' '}
                    {leads > 0
                        ? `${plural(leads, 'lead')} assigned to them ${leads === 1 ? 'becomes' : 'become'} unassigned. `
                        : null}
                    Their past changes stay in the activity log. This can’t be
                    undone.
                </>
            }
            onOpenAutoFocus={(event) => {
                event.preventDefault();
                input.current?.focus();
            }}
            footer={
                <Form
                    id={formId}
                    {...UserController.destroy.form(user.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => change(false)}
                    onError={(errors) => setError(errors.confirm_email)}
                    className="flex flex-wrap items-center justify-end gap-2"
                >
                    {({ processing }) => (
                        <>
                            <Button
                                variant="glass"
                                onClick={() => change(false)}
                            >
                                Cancel
                            </Button>
                            <button
                                type="submit"
                                disabled={!matches || processing}
                                className={confirmClass}
                            >
                                Delete account
                            </button>
                        </>
                    )}
                </Form>
            }
        >
            <Field
                label={
                    <>
                        Type{' '}
                        <span className="font-mono text-[12.5px] font-normal break-all text-mist">
                            {user.email}
                        </span>{' '}
                        to confirm
                    </>
                }
                error={error}
            >
                <TextInput
                    ref={input}
                    form={formId}
                    name="confirm_email"
                    type="email"
                    value={typed}
                    onChange={(event) => {
                        setTyped(event.target.value);
                        setError(undefined);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="none"
                    inputClassName="font-mono text-[14px]"
                />
            </Field>
        </Modal>
    );
}
