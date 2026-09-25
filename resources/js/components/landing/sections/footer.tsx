import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { Container, Wordmark } from '../primitives';

/*
 * Colophon: a statement, a print-style index of links under hairlines, and
 * the Arabic tagline set as a faint watermark standing on the last rule.
 */

type FooterLink = { label: string; href: string };

// Placeholder content: replace the `#` hrefs before launch.
const COLUMNS: { heading: string; links: FooterLink[] }[] = [
    {
        heading: 'Product',
        links: [
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Kiosk', href: '#kiosk' },
            { label: 'Lookbook', href: '#lookbook' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Developers', href: '#integrations' },
        ],
    },
    {
        heading: 'Company',
        links: [
            { label: 'About', href: '#' },
            { label: 'Careers', href: '#' },
            { label: 'Press', href: '#' },
            { label: 'Contact', href: `mailto:${BRAND.email}` },
        ],
    },
    {
        heading: 'Legal',
        links: [
            { label: 'Privacy', href: '#' },
            { label: 'Terms', href: '#' },
            { label: 'Data processing', href: '#' },
        ],
    },
];

// Placeholder content: replace with the real profile URLs before launch.
const SOCIALS: { name: string; href: string; icon: ReactNode }[] = [
    {
        name: 'Instagram',
        href: '#',
        icon: (
            <>
                <rect x="3" y="3" width="18" height="18" rx="5.5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                    cx="17.4"
                    cy="6.6"
                    r="0.9"
                    fill="currentColor"
                    stroke="none"
                />
            </>
        ),
    },
    {
        name: 'LinkedIn',
        href: '#',
        icon: (
            <>
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
                <path d="M2 9h4v12H2z" />
                <circle cx="4" cy="4" r="2" />
            </>
        ),
    },
    {
        name: 'X',
        href: '#',
        icon: (
            <>
                <path d="M4 4l11.7 16H20L8.3 4z" />
                <path d="M4 20l6.8-6.8M13.2 10.8 20 4" />
            </>
        ),
    },
    {
        name: 'YouTube',
        href: '#',
        icon: (
            <>
                <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                <path d="m10 15 5-3-5-3z" />
            </>
        ),
    },
];

const linkClass =
    'rounded-[6px] text-[15px] text-mist underline decoration-transparent decoration-1 underline-offset-[6px] transition-[color,text-decoration-color] duration-[380ms] ease-glass hover:text-bone hover:decoration-champagne/60 focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none';

export default function Footer() {
    return (
        <footer className="relative isolate overflow-hidden border-t border-white/10">
            {/* The glass edge: a highlight caught along the top hairline. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-px h-px bg-[linear-gradient(90deg,transparent,oklch(1_0_0/0.3)_50%,transparent)]"
            />

            <Container className="pt-16 md:pt-24">
                <div className="grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
                    <div className="lg:col-span-5">
                        <a
                            href="#top"
                            aria-label={`${BRAND.name}, back to top`}
                            className="inline-flex rounded-[12px] focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none"
                        >
                            <Wordmark />
                        </a>
                        <p className="mt-8 max-w-[21ch] font-display text-[1.625rem] leading-[1.18] font-medium tracking-[-0.01em] text-balance text-bone md:text-[1.875rem]">
                            Virtual try-on for fashion and eyewear retailers{' '}
                            <em className="font-normal text-champagne">
                                across the Gulf.
                            </em>
                        </p>
                        <p className="mt-4 text-sm text-smoke">
                            A product of {BRAND.company}.
                        </p>

                        <ul className="mt-8 -ml-2.5 flex items-center gap-1">
                            {SOCIALS.map((social) => (
                                <li key={social.name}>
                                    <a
                                        href={social.href}
                                        aria-label={`${BRAND.name} on ${social.name}`}
                                        className="group relative grid size-10 place-items-center rounded-full text-mist transition-colors duration-[380ms] ease-glass hover:text-bone focus-visible:text-bone focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                                    >
                                        <span
                                            aria-hidden
                                            className="absolute inset-0 scale-90 rounded-full opacity-0 glass-thin transition-[opacity,scale] duration-[380ms] ease-glass group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
                                        />
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden
                                            className="relative size-[18px]"
                                        >
                                            {social.icon}
                                        </svg>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <nav
                        aria-label="Footer"
                        className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:col-span-6 lg:col-start-7 lg:gap-x-8"
                    >
                        {COLUMNS.map((column, index) => (
                            <div
                                key={column.heading}
                                className={cn(
                                    'border-t border-white/10 pt-4',
                                    // On phones the last column becomes a
                                    // full-width legal line.
                                    index === COLUMNS.length - 1 &&
                                        'col-span-2 sm:col-span-1',
                                )}
                            >
                                <h2 className="text-kicker font-medium text-smoke uppercase">
                                    {column.heading}
                                </h2>
                                <ul
                                    className={cn(
                                        'mt-6 flex flex-col gap-y-3.5',
                                        index === COLUMNS.length - 1 &&
                                            'max-sm:flex-row max-sm:flex-wrap max-sm:gap-x-6',
                                    )}
                                >
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.href}
                                                className={linkClass}
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="mt-20 grid gap-y-4 md:mt-28 lg:grid-cols-12 lg:items-baseline lg:gap-x-8">
                    <p className="font-display text-lg text-mist italic lg:col-span-4">
                        Every screen is a fitting room.
                    </p>
                    <p
                        aria-hidden
                        lang="ar"
                        dir="rtl"
                        className="-mb-[0.24em] font-arabic text-[clamp(3rem,8.6vw,8rem)] leading-none whitespace-nowrap text-bone/[0.09] select-none lg:col-span-8"
                    >
                        {BRAND.taglineAr}
                    </p>
                </div>

                <div className="flex flex-col gap-2 border-t border-white/10 pt-8 pb-8 text-[13px] text-smoke sm:flex-row sm:items-center sm:justify-between lg:pt-11">
                    <p>© 2026 {BRAND.company}</p>
                    <p className="tracking-[0.04em]">
                        Riyadh
                        <span aria-hidden className="mx-2 text-white/25">
                            ·
                        </span>
                        Dubai
                        <span aria-hidden className="mx-2 text-white/25">
                            ·
                        </span>
                        Doha
                    </p>
                </div>
            </Container>
        </footer>
    );
}
