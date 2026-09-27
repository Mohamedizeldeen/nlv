import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, LogOut } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { button } from '@/components/admin/button';
import { BRAND } from '@/components/landing/brand';
import { Atmosphere, LogoMark } from '@/components/landing/primitives';
import { cn } from '@/lib/utils';
import { home, login, logout } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { edit as editProfile } from '@/routes/profile';

type ForbiddenProps = {
    status: number;
    /**
     * `not-admin`: a signed-in account without admin access (or a guest).
     * `denied`: an admin, refused one particular action.
     */
    reason: 'not-admin' | 'denied';
    /** An explicit reason given by the server (admins only). */
    message: string | null;
    user: { name: string; email: string } | null;
};

const CORNERS = [
    'top-0 left-0 border-t border-l',
    'top-0 right-0 border-t border-r',
    'bottom-0 left-0 border-b border-l',
    'right-0 bottom-0 border-r border-b',
] as const;

/**
 * The page's own frame: this page is shown to people who may not be admins,
 * so it has the admin's look (ink, drifting light, grain) without its
 * sidebar.
 */
function ForbiddenFrame({ children }: { children: ReactNode }) {
    useEffect(() => {
        const root = document.documentElement;
        const previousScheme = root.style.colorScheme;
        root.classList.add('landing-page', 'admin-panel');
        root.style.colorScheme = 'dark';

        return () => {
            root.classList.remove('landing-page', 'admin-panel');
            root.style.colorScheme = previousScheme;
        };
    }, []);

    return (
        <div className="landing relative isolate flex min-h-svh flex-col overflow-x-clip bg-ink font-sans text-bone antialiased [color-scheme:dark]">
            <Atmosphere />
            {children}
        </div>
    );
}

/** A glass door sign, framed by the try-on scan brackets. */
function DoorSign() {
    return (
        <div
            aria-hidden
            className="glass-rim relative mx-auto w-full max-w-[20rem] rounded-[28px] px-9 pt-10 pb-9 glass-strong"
        >
            <div className="relative px-6 py-8">
                {CORNERS.map((corner) => (
                    <span
                        key={corner}
                        className={cn('absolute size-5 border-mint/60', corner)}
                    />
                ))}
                <p className="text-kicker font-medium text-smoke uppercase">
                    Private
                </p>
                <p className="mt-5 font-display text-[4.25rem] leading-[0.9] font-medium tracking-[-0.02em] text-bone">
                    Staff
                    <br />
                    <em className="font-normal text-mint">only.</em>
                </p>
                <div className="mt-7 h-px bg-white/15" />
                <p className="mt-4 text-[10px] font-medium tracking-[0.26em] text-smoke uppercase">
                    {BRAND.company} · Admin panel
                </p>
            </div>
        </div>
    );
}

export default function Forbidden({
    status,
    reason,
    message,
    user,
}: ForbiddenProps) {
    const denied = reason === 'denied';

    return (
        <>
            <Head title="Staff only" />

            <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 pt-6 sm:px-8 lg:px-12">
                <Link
                    href={home()}
                    className="flex shrink-0 items-center gap-3 rounded-[12px] py-1 text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                >
                    <LogoMark className="h-5" />
                    <span className="font-display text-[1.35rem] leading-none font-medium tracking-[-0.02em]">
                        {BRAND.name}
                    </span>
                    <span className="sr-only">, back to the site</span>
                </Link>
                {user ? (
                    <p className="min-w-0 truncate text-[13px] text-smoke">
                        Signed in as{' '}
                        <span className="text-mist">{user.email}</span>
                    </p>
                ) : null}
            </header>

            <main className="relative mx-auto grid w-full max-w-[1240px] flex-1 content-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:px-12">
                <div className="min-w-0 lg:col-span-7 lg:self-center">
                    <p className="flex items-baseline border-t border-white/10 pt-4 text-kicker font-medium text-smoke uppercase">
                        <span className="text-bone">N° {status}</span>
                        <span aria-hidden className="mx-3 text-white/25">
                            —
                        </span>
                        Admin panel
                    </p>

                    <h1 className="mt-8 font-display text-display-lg font-medium text-balance text-bone [&_em]:font-normal [&_em]:text-mint">
                        {denied ? (
                            <>
                                That isn’t yours <em>to change.</em>
                            </>
                        ) : (
                            <>
                                This is the <em>back of house.</em>
                            </>
                        )}
                    </h1>

                    <div className="mt-6 max-w-[54ch] space-y-3 text-[16px] leading-relaxed text-pretty text-mist">
                        {denied ? (
                            <p>
                                {message ??
                                    'Your admin account can’t do this particular thing. If you think it should, check with another admin.'}
                            </p>
                        ) : user ? (
                            <>
                                <p>
                                    You’re signed in as{' '}
                                    <span className="text-bone">
                                        {user.name}
                                    </span>
                                    , and that account doesn’t have access to
                                    the admin panel.
                                </p>
                                <p className="text-smoke">
                                    If you should have it, ask one of the site’s
                                    admins to make you an admin from their Users
                                    page, then open this link again.
                                </p>
                            </>
                        ) : (
                            <p>
                                Sign in with an admin account to open the panel.
                            </p>
                        )}
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-2">
                        {denied ? (
                            <Link href={adminDashboard()} className={button()}>
                                <ArrowLeft aria-hidden />
                                Back to the dashboard
                            </Link>
                        ) : user ? (
                            <Link href={home()} className={button()}>
                                <ArrowLeft aria-hidden />
                                Back to the site
                            </Link>
                        ) : (
                            <Link href={login()} className={button()}>
                                Sign in
                            </Link>
                        )}

                        {denied ? (
                            <a
                                href={home.url()}
                                target="_blank"
                                rel="noopener"
                                className={button({ variant: 'glass' })}
                            >
                                View site
                                <span className="sr-only">
                                    {' '}
                                    (opens in a new tab)
                                </span>
                                <ArrowUpRight aria-hidden />
                            </a>
                        ) : user ? (
                            <>
                                <Link
                                    href={editProfile()}
                                    className={button({ variant: 'glass' })}
                                >
                                    Your account
                                </Link>
                                <Link
                                    href={logout()}
                                    as="button"
                                    className={button({ variant: 'ghost' })}
                                >
                                    <LogOut aria-hidden />
                                    Sign out
                                </Link>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="max-lg:hidden lg:col-span-4 lg:col-start-9 lg:self-center">
                    <DoorSign />
                </div>
            </main>
        </>
    );
}

// Not the admin layout: non-admins must not see the admin's navigation.
Forbidden.layout = ForbiddenFrame;
