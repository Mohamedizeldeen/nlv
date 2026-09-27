import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { KeyRound } from 'lucide-react';
import { button } from '@/components/admin/button';
import { FieldError } from '@/components/admin/field';
import { Spinner } from '@/components/ui/spinner';
import { AuthDivider } from '@/layouts/auth-layout';
import { dashboard } from '@/routes/admin';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
};

/**
 * "Log in with a passkey" (or confirm with one) above the password form,
 * in the sign-in pages' glass. Hidden where the browser has no passkeys.
 */
export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? dashboard.url());
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="grid gap-2">
                <button
                    type="button"
                    className={button({
                        variant: 'glass',
                        size: 'md',
                        className: 'w-full',
                    })}
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading ? <Spinner /> : <KeyRound aria-hidden />}
                    {isLoading
                        ? (loadingLabel ?? 'Waiting for your passkey…')
                        : (label ?? 'Log in with a passkey')}
                </button>
                {error ? (
                    <FieldError className="text-center">{error}</FieldError>
                ) : null}
            </div>

            <AuthDivider>{separator ?? 'or with your email'}</AuthDivider>
        </>
    );
}
