import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { Button, button } from '@/components/admin/button';
import { Modal } from '@/components/admin/dialog';
import { Field, FieldError } from '@/components/admin/field';
import { Panel } from '@/components/admin/panel';
import PasswordInput from '@/components/password-input';

/**
 * The profile page's last panel: deleting your own account, after typing
 * your password in a glass modal.
 */
export default function DeleteUser() {
    const [open, setOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <Panel variant="strong">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                <div className="min-w-0 flex-[1_1_16rem]">
                    <h2 className="text-[15px] leading-snug font-medium text-bone">
                        Delete your account
                    </h2>
                    <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-pretty text-smoke">
                        Removes your account and logs you out for good. This
                        can’t be undone.
                    </p>
                </div>
                <Modal
                    open={open}
                    onOpenChange={setOpen}
                    size="sm"
                    trigger={
                        <Button variant="danger" data-test="delete-user-button">
                            <Trash2 aria-hidden />
                            Delete account
                        </Button>
                    }
                    title={
                        <>
                            Delete your <em>account?</em>
                        </>
                    }
                    description="You’ll be logged out straight away and won’t be able to log in again. Enter your password to confirm."
                >
                    <Form
                        {...ProfileController.destroy.form()}
                        options={{ preserveScroll: true }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        resetOnError
                        className="grid gap-6 pb-2"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <Field
                                    label="Your password"
                                    error={errors.password}
                                    required
                                >
                                    <PasswordInput
                                        ref={passwordInput}
                                        name="password"
                                        autoComplete="current-password"
                                        autoFocus
                                    />
                                </Field>

                                {/* Anything else the server refuses (e.g. the last admin). */}
                                {Object.entries(errors)
                                    .filter(([key]) => key !== 'password')
                                    .map(([key, message]) => (
                                        <FieldError key={key}>
                                            {message}
                                        </FieldError>
                                    ))}

                                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
                                    <DialogPrimitive.Close
                                        className={button({ variant: 'glass' })}
                                        onClick={() => resetAndClearErrors()}
                                    >
                                        Cancel
                                    </DialogPrimitive.Close>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        data-test="confirm-delete-user-button"
                                        className={button({
                                            variant: 'danger',
                                            className:
                                                'bg-coral/[0.16] text-[oklch(0.84_0.1_38)] ring-1 ring-coral/40 ring-inset hover:bg-coral/25',
                                        })}
                                    >
                                        Delete my account
                                    </button>
                                </div>
                            </>
                        )}
                    </Form>
                </Modal>
            </div>
        </Panel>
    );
}
