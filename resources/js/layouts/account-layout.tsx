import { Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { button } from '@/components/admin/button';
import { formatDate } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Tabs } from '@/components/admin/tabs';
import { BRAND } from '@/components/landing/brand';
import { Atmosphere, LogoMark } from '@/components/landing/primitives';
import { useInitials } from '@/hooks/use-initials';
import { useBrandChrome } from '@/layouts/brand-chrome';
import { cn } from '@/lib/utils';
import { home, logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { User } from '@/types';

/*
 * The signed-in person's own pages, /settings/profile and
 * /settings/security ("Account" in the admin sidebar). app.tsx nests this
 * layout inside AdminLayout, so the sidebar stays put between the admin's
 * pages and these; an account without admin access gets the same pages in
 * <AccountFrame> instead, without the admin's navigation.
 */

type Tab = 'profile' | 'security';

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

const HEADERS: Record<
    Tab,
    { crumb: string; title: (user: User) => ReactNode; description: string }
> = {
    profile: {
        crumb: 'Profile',
        title: (user) => (
            <>
                Hello, <em>{firstName(user.name)}.</em>
            </>
        ),
        description:
            'Your name and email address as the panel knows them. Your name shows on the leads assigned to you and in the activity log.',
    },
    security: {
        crumb: 'Security',
        title: () => (
            <>
                How you <em>log in.</em>
            </>
        ),
        description:
            'Your password, a second step from an authenticator app, and passkeys that log you in with a fingerprint or face.',
    },
};

const CORNERS = [
    'top-0 left-0 border-t border-l',
    'top-0 right-0 border-t border-r',
    'bottom-0 left-0 border-b border-l',
    'right-0 bottom-0 border-r border-b',
] as const;

/** A row of the staff pass: a spaced-caps term and its value. */
function PassRow({ term, children }: { term: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-[10px] font-medium tracking-[0.22em] text-smoke uppercase">
                {term}
            </dt>
            <dd className="min-w-0 truncate text-right text-[13px] text-mist">
                {children}
            </dd>
        </div>
    );
}

/**
 * The account at a glance, as a glass staff pass framed by the try-on
 * scan brackets (the forbidden page's door sign is its sibling).
 */
function StaffPass({ user }: { user: User }) {
    const initials = useInitials();
    const twoFactorOn =
        typeof user.two_factor_confirmed_at === 'string' &&
        user.two_factor_confirmed_at !== '';

    return (
        <section
            aria-label="Your account"
            className="glass-rim relative rounded-[28px] p-3 glass-strong"
        >
            <div className="relative px-5 pt-6 pb-4">
                {CORNERS.map((corner) => (
                    <span
                        key={corner}
                        aria-hidden
                        className={cn('absolute size-4 border-mint/50', corner)}
                    />
                ))}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-kicker font-medium text-smoke uppercase">
                        Staff pass
                    </p>
                    <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-mint shadow-[0_0_10px_oklch(0.84_0.12_160/0.8)]"
                    />
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <span
                        aria-hidden
                        className="grid size-14 shrink-0 place-items-center rounded-full bg-white/[0.06] font-display text-[1.35rem] font-medium text-bone ring-1 ring-white/20 ring-inset"
                    >
                        {initials(user.name)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-display text-[1.5rem] leading-tight font-medium text-bone">
                            {user.name}
                        </p>
                        <p className="truncate text-[13px] text-smoke">
                            {user.email}
                        </p>
                    </div>
                </div>

                <dl className="mt-6 divide-y divide-white/[0.08] border-t border-white/15">
                    <PassRow term="Access">
                        {user.is_admin ? (
                            <span className="text-mint">Admin</span>
                        ) : (
                            'No admin access'
                        )}
                    </PassRow>
                    <PassRow term="Email">
                        {user.email_verified_at ? (
                            'Confirmed'
                        ) : (
                            <span className="text-coral">Not confirmed</span>
                        )}
                    </PassRow>
                    <PassRow term="Two-factor">
                        {twoFactorOn ? (
                            <span className="text-mint">On</span>
                        ) : (
                            'Off'
                        )}
                    </PassRow>
                    <PassRow term="Since">
                        {formatDate(user.created_at)}
                    </PassRow>
                </dl>

                <p className="mt-5 text-[10px] font-medium tracking-[0.26em] text-smoke/80 uppercase">
                    {BRAND.company} · {BRAND.name} admin
                </p>
            </div>
        </section>
    );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
    const { component, props } = usePage();
    const tab: Tab = component === 'settings/security' ? 'security' : 'profile';
    const header = HEADERS[tab];
    const user = props.auth.user;

    return (
        <>
            <PageHeader
                crumbs={[{ label: header.crumb }]}
                title={header.title(user)}
                description={header.description}
                // Without admin access there is no sidebar to number from.
                {...(user.is_admin
                    ? {}
                    : { kicker: 'Your account', index: '' })}
            />

            <Tabs
                label="Account"
                value={tab}
                className="mt-8"
                items={[
                    {
                        value: 'profile',
                        label: HEADERS.profile.crumb,
                        href: editProfile.url(),
                    },
                    {
                        value: 'security',
                        label: HEADERS.security.crumb,
                        href: editSecurity.url(),
                    },
                ]}
            />

            <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
                <div className="grid min-w-0 gap-6">{children}</div>
                <aside className="lg:sticky lg:top-8">
                    <StaffPass user={user} />
                </aside>
            </div>
        </>
    );
}

/**
 * The account pages' frame for someone without admin access: the admin's
 * ink and light, the logo back to the site and Log out, no admin sidebar.
 */
export function AccountFrame({ children }: { children: ReactNode }) {
    useBrandChrome();

    return (
        <div className="landing relative isolate min-h-svh overflow-x-clip bg-ink font-sans text-bone antialiased [color-scheme:dark]">
            <Atmosphere />

            <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-10">
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
                <Link
                    href={logout()}
                    as="button"
                    onClick={() => router.flushAll()}
                    className={button({ variant: 'ghost' })}
                >
                    <LogOut aria-hidden />
                    Log out
                </Link>
            </header>

            <main className="relative mx-auto w-full max-w-[1240px] px-4 pt-10 pb-16 sm:px-6 lg:px-10">
                {children}
            </main>
        </div>
    );
}
