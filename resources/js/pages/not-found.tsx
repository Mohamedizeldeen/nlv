import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { Accent } from '@/components/landing/accent';
import {
    LandingDataProvider,
    useContent,
} from '@/components/landing/landing-data';
import { LandingLinksContext } from '@/components/landing/links';
import type { LandingLinks } from '@/components/landing/links';
import { messageParts } from '@/components/landing/message-parts';
import {
    OrderDialogProvider,
    useOrderDialog,
} from '@/components/landing/order-dialog';
import {
    Atmosphere,
    Container,
    Glow,
    Reveal,
    cta,
} from '@/components/landing/primitives';
import Footer from '@/components/landing/sections/footer';
import Navbar from '@/components/landing/sections/navbar';
import { useDocumentLocale, useI18n } from '@/hooks/use-i18n';
import type { Alternates } from '@/i18n';
import { LocaleProvider } from '@/i18n/locale-provider';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import type { LandingData } from '@/types/landing';

/*
 * The public "not found" page: any address with nothing behind it (a
 * mistyped link, a page that was deleted or unpublished), rendered by the
 * exception handler in bootstrap/app.php with a 404 status, in the language
 * of the URL: Arabic under /ar. It wears the landing's chrome, so the way
 * home, the sections and "Order a device" are all at hand. The admin panel
 * keeps its own not-found page (admin/not-found).
 */

type NotFoundProps = {
    /** The address that matched nothing, e.g. "/pages/abuot". */
    path: string;
    /** The same address in each language: where the language switch goes. */
    twins: Alternates;
    landing: LandingData;
};

export default function NotFound({ path, twins, landing }: NotFoundProps) {
    const { auth } = usePage().props;
    const { locale, t } = useI18n();
    // <html lang dir> for the language of the URL (/ar/… is Arabic).
    useDocumentLocale();

    const links: LandingLinks = {
        signedIn: Boolean(auth.user),
        signIn: login(),
        admin: adminDashboard(),
    };

    // Same always-dark page as the landing, smooth scrolling included.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-page');

        return () => root.classList.remove('landing-page');
    }, []);

    return (
        <>
            <Head title={t('not-found.title')} />
            {/* The language switch leads to this address in the other
                language. The server shares no `alternates` here, so the
                <head> announces no hreflang twins for a missing page. */}
            <LocaleProvider locale={locale} alternates={twins}>
                <LandingDataProvider value={landing}>
                    <OrderDialogProvider>
                        <LandingLinksContext value={links}>
                            <div className="landing relative isolate min-h-screen overflow-x-clip bg-ink font-sans text-bone antialiased">
                                <Atmosphere />
                                <Navbar base="/" />
                                <main>
                                    <Missing path={path} />
                                </main>
                                <Footer base="/" />
                            </div>
                        </LandingLinksContext>
                    </OrderDialogProvider>
                </LandingDataProvider>
            </LocaleProvider>
        </>
    );
}

function Missing({ path }: { path: string }) {
    const { t, localePath } = useI18n();
    const order = useOrderDialog();
    const orderLabel = useContent('order.cta');

    return (
        <section
            id="top"
            aria-labelledby="not-found-title"
            className="relative isolate pt-32 pb-24 md:pt-44 md:pb-36"
        >
            <Glow
                color="jade"
                className="-top-56 -left-48 size-[40rem] opacity-25"
            />
            <Glow
                color="lagoon"
                className="-end-40 top-1/3 size-[28rem] opacity-20"
            />

            <Container>
                {/* The section-header voice: rule, kicker, title, lede. */}
                <Reveal
                    as="header"
                    className="grid gap-y-12 border-t border-white/10 pt-5 lg:grid-cols-12 lg:gap-x-8"
                >
                    <p className="text-kicker font-medium whitespace-nowrap text-smoke uppercase lg:col-span-12">
                        <span className="text-bone">
                            {messageParts(t, 'common.sectionIndex', {
                                index: '404',
                            })}
                        </span>
                        <span aria-hidden className="mx-3 text-white/25">
                            —
                        </span>
                        {t('not-found.title')}
                    </p>

                    <div className="lg:col-span-7 lg:pt-6">
                        <h1
                            id="not-found-title"
                            className="font-display text-display-xl font-medium text-balance text-bone rtl:leading-[1.3] [&_em]:font-normal [&_em]:text-mint"
                        >
                            <Accent text={t('not-found.heading')} />
                        </h1>
                        <p className="mt-8 max-w-[34rem] text-[17px] leading-relaxed text-pretty text-mist">
                            {t('not-found.lede')}
                        </p>

                        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <a
                                {...order.link(
                                    { source: 'not-found' },
                                    localePath('/#order'),
                                )}
                                className={cn(
                                    cta({ variant: 'primary', size: 'lg' }),
                                    'group/order',
                                )}
                            >
                                {orderLabel}
                                <ArrowRight
                                    aria-hidden
                                    className="size-4 transition-transform duration-[380ms] ease-glass group-hover/order:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/order:-translate-x-0.5"
                                />
                            </a>
                            <Link
                                href={localePath('/')}
                                className={cta({
                                    variant: 'glass',
                                    size: 'lg',
                                })}
                            >
                                {t('not-found.home')}
                            </Link>
                        </div>
                    </div>

                    <EmptyRail
                        path={path}
                        className="lg:col-span-5 lg:self-end"
                    />
                </Reveal>
            </Container>
        </section>
    );
}

/** Hanger positions along the rail: x, resting tilt (deg). */
const HANGERS = [
    { x: 58, tilt: -4 },
    { x: 80, tilt: 2 },
    { x: 104, tilt: -1 },
    { x: 384, tilt: 3 },
    { x: 408, tilt: -2 },
] as const;

/** Where the one tagged hanger hangs, alone mid-rail. */
const TAGGED = 236;

/** A wire hanger, hooked over the rail at (0, 0). */
function Hanger() {
    return (
        <>
            <path d="M0 20V9C0 0-8-5-11 1" />
            <path d="M0 20 45 44Q50 47 45 49H-45Q-50 47-45 44Z" />
        </>
    );
}

/**
 * Artwork: a shop rail with its hangers pushed to the ends, and one left in
 * the middle carrying a "404" swing tag. Under it, the address that was
 * asked for, as it was typed (read left to right on the Arabic page too).
 */
function EmptyRail({ path, className }: { path: string; className?: string }) {
    const { t } = useI18n();

    return (
        <figure className={cn('relative', className)}>
            <svg
                viewBox="0 0 480 250"
                aria-hidden
                className="w-full overflow-visible"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* The rail and its two ceiling drops. */}
                <g className="stroke-white/30" strokeWidth="1.5">
                    <path d="M40 0V30M440 0V30" />
                    <path d="M16 32H464" strokeWidth="2.5" />
                </g>

                {HANGERS.map((hanger) => (
                    <g
                        key={hanger.x}
                        transform={`translate(${hanger.x} 32) rotate(${hanger.tilt})`}
                        className="stroke-white/25"
                        strokeWidth="1.25"
                    >
                        <Hanger />
                    </g>
                ))}

                <g transform={`translate(${TAGGED} 32)`}>
                    <g className="origin-[0_0] animate-sway [transform-box:view-box]">
                        <g className="stroke-mint" strokeWidth="1.5">
                            <Hanger />
                            {/* The tag's string, from the shoulder. */}
                            <path
                                d="M27 35C30 52 33 64 34 78"
                                strokeWidth="1"
                            />
                        </g>
                        <g transform="translate(34 78) rotate(9)">
                            <path
                                d="M-11 0H11L24 13V96H-24V13Z"
                                className="fill-ink-raised stroke-mint/70"
                                strokeWidth="1"
                            />
                            <circle
                                cx="0"
                                cy="11"
                                r="2.5"
                                className="stroke-mint/70"
                                strokeWidth="1"
                            />
                            <path
                                d="M-14 32H14"
                                className="stroke-white/15"
                                strokeWidth="1"
                            />
                            <text
                                x="0"
                                y="67"
                                textAnchor="middle"
                                className="fill-bone font-display text-[19px] font-medium"
                            >
                                404
                            </text>
                            <path
                                d="M-14 80H14"
                                className="stroke-white/15"
                                strokeWidth="1"
                            />
                        </g>
                    </g>
                </g>
            </svg>

            <figcaption className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-white/10 pt-4">
                <span className="text-kicker font-medium text-smoke uppercase">
                    {t('not-found.requested')}
                </span>
                <span
                    dir="ltr"
                    lang="en"
                    className="min-w-0 text-[14px] break-all text-bone"
                >
                    {path}
                </span>
            </figcaption>
        </figure>
    );
}
