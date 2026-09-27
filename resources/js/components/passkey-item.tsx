import { KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { Badge } from '@/components/admin/status-badge';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    /** Removes it; the dialog stays busy until the promise settles. */
    onRemove: () => Promise<void>;
};

/** One passkey: its name, where it lives, when it was added and last used. */
export default function PasskeyItem({ passkey, onRemove }: Props) {
    return (
        <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-white/[0.06] text-mint ring-1 ring-white/[0.12] ring-inset"
            >
                <KeyRound className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="truncate text-[14.5px] font-medium text-bone">
                        {passkey.name}
                    </p>
                    {passkey.authenticator ? (
                        <Badge tone="muted">{passkey.authenticator}</Badge>
                    ) : null}
                </div>
                <p className="mt-0.5 text-[12.5px] text-smoke">
                    Added {passkey.created_at_diff}
                    {passkey.last_used_at_diff ? (
                        <>
                            <span aria-hidden className="mx-1.5 text-white/25">
                                ·
                            </span>
                            last used {passkey.last_used_at_diff}
                        </>
                    ) : (
                        <>
                            <span aria-hidden className="mx-1.5 text-white/25">
                                ·
                            </span>
                            never used
                        </>
                    )}
                </p>
            </div>
            <ConfirmDialog
                trigger={
                    <Button
                        variant="danger"
                        size="xs"
                        aria-label={`Remove the passkey “${passkey.name}”`}
                    >
                        <Trash2 aria-hidden />
                        <span className="max-sm:sr-only">Remove</span>
                    </Button>
                }
                title={
                    <>
                        Remove this <em>passkey?</em>
                    </>
                }
                description={`“${passkey.name}” won’t be able to log you in any more. Your other passkeys and your password keep working.`}
                confirmLabel="Remove passkey"
                onConfirm={onRemove}
            />
        </li>
    );
}
