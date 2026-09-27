import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { BRAND } from '@/components/landing/brand';
import { Atmosphere, LogoMark } from '@/components/landing/primitives';
import { useBrandChrome } from '@/layouts/brand-chrome';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { dashboard } from '@/routes/admin';

/*
 * The sign-in pages (log in, forgot and reset password, the two-factor
 * challenge, password confirmation, email verification) in the admin's
 * design: the landing's ink, drifting jade/lagoon light and grain, a
 * Bodoni headline with a mint italic accent beside a glass panel that
 * holds the form. English and left-to-right, like the admin panel.
 *
 * Pages set the words through their layout props:
 *
 *     Login.layout = { title: 'Log in to the', accent: 'back of house.', … };
 */

type AuthLayoutProps = {
    /** The headline's upright part. */
    title?: string;
    /** The headline's last words, in mint italic. */
    accent?: string;
    description?: string;
    /** A quieter line under the headline (under the form on phones). */
    note?: string;
    children: ReactNode;
};

const CORNERS = [
    '-top-2 -left-2 border-t border-l rounded-tl-[10px]',
    '-top-2 -right-2 border-t border-r rounded-tr-[10px]',
    '-bottom-2 -left-2 border-b border-l rounded-bl-[10px]',
    '-right-2 -bottom-2 border-r border-b rounded-br-[10px]',
] as const;

const focusRing =
    'focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

export default function AuthLayout({
    title = '',
    accent = '',
    description = '',
    note = '',
    children,
}: AuthLayoutProps) {
    useBrandChrome();
    const { auth } = usePage().props;
    // Signed in (confirming the password, say): back to the panel instead.
    const inPanel = Boolean(auth.user?.email_verified_at);

    return (
        <div className="landing relative isolate flex min-h-svh flex-col overflow-x-clip bg-ink font-sans text-bone antialiased [color-scheme:dark]">
            <Atmosphere />

            <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 pt-6 sm:px-8 lg:px-12">
                <Link
                    href={home()}
                    className={cn(
                        'flex shrink-0 items-center gap-3 rounded-[12px] py-1 text-bone',
                        focusRing,
                    )}
                >
                    <LogoMark className="h-5" />
                    <span className="font-display text-[1.35rem] leading-none font-medium tracking-[-0.02em]">
                        {BRAND.name}
                    </span>
                    <span className="sr-only">, back to the site</span>
                </Link>
                <Link
                    href={inPanel ? dashboard() : home()}
                    className={cn(
                        'group -mr-2 flex h-9 items-center gap-2 rounded-[12px] px-2 text-[13px] text-smoke transition-colors duration-[380ms] ease-glass hover:text-bone',
                        focusRing,
                    )}
                >
                    <ArrowLeft
                        aria-hidden
                        className="size-4 transition-transform duration-[380ms] ease-glass group-hover:-translate-x-0.5"
                    />
                    {inPanel ? 'Back to the panel' : 'Back to the site'}
                </Link>
            </header>

            <main className="relative mx-auto grid w-full max-w-[1240px] flex-1 content-start items-center gap-10 px-5 pt-10 pb-14 sm:px-8 lg:grid-cols-12 lg:content-center lg:gap-8 lg:px-12 lg:py-14">
                <div className="min-w-0 lg:col-span-6">
                    <p className="flex items-baseline border-t border-white/10 pt-4 text-kicker font-medium text-smoke uppercase">
                        <span className="text-bone">{BRAND.company}</span>
                        <span aria-hidden className="mx-3 text-white/25">
                            —
                        </span>
                        Admin panel
                    </p>

                    <h1 className="mt-6 font-display text-display-md font-medium text-balance text-bone sm:mt-8 sm:text-display-lg [&_em]:font-normal [&_em]:text-mint">
                        {title}
                        {title && accent ? ' ' : null}
                        {accent ? <em>{accent}</em> : null}
                    </h1>

                    {description ? (
                        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-pretty text-mist sm:mt-6 sm:text-[16px]">
                            {description}
                        </p>
                    ) : null}

                    {note ? (
                        <p className="mt-10 hidden max-w-[44ch] border-l border-mint/40 pl-4 text-[13.5px] leading-relaxed text-pretty text-smoke lg:block">
                            {note}
                        </p>
                    ) : null}
                </div>

                <div className="min-w-0 lg:col-span-5 lg:col-start-8">
                    <div className="relative mx-auto w-full max-w-[28rem] lg:mx-0 lg:ml-auto">
                        {CORNERS.map((corner) => (
                            <span
                                key={corner}
                                aria-hidden
                                className={cn(
                                    'pointer-events-none absolute size-5 border-mint/45',
                                    corner,
                                )}
                            />
                        ))}
                        <div className="glass-rim relative rounded-[28px] px-5 py-6 glass-strong sm:px-8 sm:py-8">
                            {children}
                        </div>
                    </div>

                    {note ? (
                        <p className="mx-auto mt-8 max-w-[28rem] border-l border-mint/40 pl-4 text-[13.5px] leading-relaxed text-pretty text-smoke lg:hidden">
                            {note}
                        </p>
                    ) : null}
                </div>
            </main>
        </div>
    );
}

/** A confirmation from the server ("We have emailed your reset link."). */
export function AuthNotice({ children }: { children: ReactNode }) {
    return (
        <p
            role="status"
            className="mb-6 flex gap-2.5 rounded-[14px] bg-mint/[0.08] px-4 py-3 text-[13.5px] leading-snug text-pretty text-mint ring-1 ring-mint/25 ring-inset"
        >
            <Check aria-hidden className="mt-px size-4 shrink-0" />
            <span>{children}</span>
        </p>
    );
}

/** "or with your email": a hairline rule with a spaced-caps word in it. */
export function AuthDivider({ children }: { children: ReactNode }) {
    return (
        <p className="my-6 flex items-center gap-3 text-[10px] font-medium tracking-[0.24em] whitespace-nowrap text-smoke uppercase">
            <span aria-hidden className="h-px flex-1 bg-white/10" />
            {children}
            <span aria-hidden className="h-px flex-1 bg-white/10" />
        </p>
    );
}
