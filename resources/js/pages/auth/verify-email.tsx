import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { button } from '@/components/admin/button';
import { Spinner } from '@/components/ui/spinner';
import { AuthNotice } from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    const { auth } = usePage().props;
    const email = auth.user?.email;

    return (
        <>
            <Head title="Confirm your email" />

            {status === 'verification-link-sent' ? (
                <AuthNotice>
                    The link is on its way. Open it on any device.
                </AuthNotice>
            ) : null}

            <p className="text-[14px] leading-relaxed text-pretty text-mist">
                {email ? (
                    <>
                        The link goes to{' '}
                        <span className="text-bone">{email}</span>.{' '}
                    </>
                ) : null}
                Nothing after a few minutes? Check the spam folder, or send it
                again.
            </p>

            <Form {...send.form()} className="mt-6">
                {({ processing }) => (
                    <button
                        type="submit"
                        className={button({ size: 'md', className: 'w-full' })}
                        disabled={processing}
                    >
                        {processing ? <Spinner /> : null}
                        Email me the link
                    </button>
                )}
            </Form>

            <div className="mt-2 flex justify-center">
                <Link
                    href={logout()}
                    as="button"
                    onClick={() => router.flushAll()}
                    className={button({ variant: 'ghost' })}
                >
                    <LogOut aria-hidden />
                    Log out
                </Link>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Confirm your',
    accent: 'email address.',
    description:
        'The admin panel opens once your address is confirmed: we email you a link, you open it.',
};
