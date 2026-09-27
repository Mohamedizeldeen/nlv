import { router } from '@inertiajs/react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import { EmptyState } from '@/components/admin/empty-state';
import { Panel } from '@/components/admin/panel';
import { Badge } from '@/components/admin/status-badge';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

/** The "Passkeys" panel of Account → Security. */
export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    /** Removes a passkey; settles when the visit finishes. */
    const remove = (id: number) =>
        new Promise<void>((resolve) =>
            router.delete(destroy.url(id), {
                preserveScroll: true,
                onFinish: () => resolve(),
            }),
        );

    return (
        <Panel
            title="Passkeys"
            description="Log in with your fingerprint, face or device PIN instead of a password. Each phone, computer or password manager keeps its own passkey."
            actions={
                passkeys.length > 0 ? (
                    <Badge tone="neutral">
                        {passkeys.length}{' '}
                        {passkeys.length === 1 ? 'passkey' : 'passkeys'}
                    </Badge>
                ) : null
            }
            padded={false}
            footer={<PasskeyRegistration onSuccess={() => router.reload()} />}
        >
            {passkeys.length > 0 ? (
                <ul className="divide-y divide-white/[0.07]">
                    {passkeys.map((passkey) => (
                        <PasskeyItem
                            key={passkey.id}
                            passkey={passkey}
                            onRemove={() => remove(passkey.id)}
                        />
                    ))}
                </ul>
            ) : (
                <EmptyState
                    compact
                    className="my-5"
                    title={
                        <>
                            No passkeys <em>yet.</em>
                        </>
                    }
                    description="Add one to log in without typing your password. Your password keeps working too."
                />
            )}
        </Panel>
    );
}
