import { Form } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { Panel } from '@/components/admin/panel';
import { Badge } from '@/components/admin/status-badge';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

/** The "Two-factor authentication" panel of Account → Security. */
export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <Panel
            title="Two-factor authentication"
            description={
                twoFactorEnabled
                    ? 'Logging in asks for your password, then a 6-digit code from the authenticator app on your phone.'
                    : 'Add a second step to logging in: after your password, a 6-digit code from an authenticator app on your phone. A stolen password alone then gets nobody in.'
            }
            actions={
                twoFactorEnabled ? (
                    <Badge tone="mint">On</Badge>
                ) : (
                    <Badge tone="muted">Off</Badge>
                )
            }
            footer={
                twoFactorEnabled ? (
                    <ConfirmDialog
                        trigger={
                            <Button variant="danger">
                                Turn off two-factor
                            </Button>
                        }
                        title={
                            <>
                                Turn off <em>two-factor?</em>
                            </>
                        }
                        description="Logging in will only ask for your password. Your recovery codes stop working, and turning it on again means scanning a new QR code."
                        confirmLabel="Turn it off"
                        form={disable.form()}
                    />
                ) : hasSetupData ? (
                    <Button onClick={() => setShowSetupModal(true)}>
                        <ShieldCheck aria-hidden />
                        Continue setup
                    </Button>
                ) : (
                    <Form
                        {...enable.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setShowSetupModal(true)}
                    >
                        {({ processing }) => (
                            <Button type="submit" disabled={processing}>
                                <ShieldCheck aria-hidden />
                                Turn on two-factor
                            </Button>
                        )}
                    </Form>
                )
            }
        >
            {twoFactorEnabled ? (
                <TwoFactorRecoveryCodes
                    recoveryCodesList={recoveryCodesList}
                    fetchRecoveryCodes={fetchRecoveryCodes}
                    errors={errors}
                />
            ) : (
                <ol className="grid gap-3 text-[13.5px] leading-relaxed text-mist sm:grid-cols-3 sm:gap-5">
                    {[
                        'Install an authenticator app, or use your password manager’s.',
                        'Scan the QR code the panel shows you.',
                        'Enter the first code to finish.',
                    ].map((step, index) => (
                        <li
                            key={step}
                            className="border-t border-white/10 pt-3"
                        >
                            <span className="block text-[10px] font-medium tracking-[0.2em] text-mint tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="mt-1.5 block text-pretty">
                                {step}
                            </span>
                        </li>
                    ))}
                </ol>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </Panel>
    );
}
