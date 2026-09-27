import { Link } from '@inertiajs/react';
import type { MouseEvent, ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/utils';
import type { LandingPageLink } from '@/types/landing';
import { Accent } from '../accent';
import { BRAND } from '../brand';
import { LanguageSwitch } from '../language-switch';
import { hasSection, useContent, useLanding } from '../landing-data';
import { Managed } from '../managed';
import {
    telHref,
    useOrderDialog,
    useTalkNumbers,
    whatsAppHref,
} from '../order-dialog';
import { Container, Wordmark } from '../primitives';
import { useSectionHref } from './navbar';
import type { SectionBase } from './navbar';

/*
 * Colophon: a statement, a print-style index of links under hairlines, and
 * the tagline set large in faint italic as the page's last word. The copy,
 * the contact email, phone, WhatsApp and address, the social profiles and
 * the Company and Legal pages all come from the admin; a contact line or a
 * profile left empty is not shown. The bottom line carries the language
 * switch.
 * On the Arabic page the grid mirrors; Amiri gets taller lines and, having
 * no italic, sets the tagline upright.
 */

type FooterLink = {
    label: string;
    href: string;
    /** An Inertia visit (content pages) rather than a plain anchor. */
    visit?: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
};

const SECTIONS = [
    { label: 'common.sectionHowItWorks', id: 'how-it-works' },
    { label: 'common.sectionKiosk', id: 'kiosk' },
    { label: 'common.sectionLookbook', id: 'lookbook' },
    { label: 'common.sectionPricing', id: 'pricing' },
] as const satisfies readonly { label: MessageKey; id: string }[];

/** Icons for the `social.*` settings; a profile left empty is not shown. */
const SOCIALS: { key: string; name: string; icon: ReactNode }[] = [
    {
        key: 'social.instagram',
        name: 'Instagram',
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
        key: 'social.linkedin',
        name: 'LinkedIn',
        icon: (
            <>
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
                <path d="M2 9h4v12H2z" />
                <circle cx="4" cy="4" r="2" />
            </>
        ),
    },
    {
        key: 'social.x',
        name: 'X',
        icon: (
            <>
                <path d="M4 4l11.7 16H20L8.3 4z" />
                <path d="M4 20l6.8-6.8M13.2 10.8 20 4" />
            </>
        ),
    },
    {
        key: 'social.youtube',
        name: 'YouTube',
        icon: (
            <>
                <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                <path d="m10 15 5-3-5-3z" />
            </>
        ),
    },
];

const linkClass =
    'rounded-[6px] text-[15px] text-mist underline decoration-transparent decoration-1 underline-offset-[6px] transition-[color,text-decoration-color] duration-[380ms] ease-glass hover:text-bone hover:decoration-mint/60 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none';

/** The payload's page links are already in the page's language. */
function pageLinks(
    pages: LandingPageLink[],
    group: LandingPageLink['group'],
): FooterLink[] {
    return pages
        .filter((page) => page.group === group)
        .map((page) => ({
            label: page.title,
            href: page.url,
            visit: true,
        }));
}

export default function Footer({ base = '' }: { base?: SectionBase }) {
    const { t } = useI18n();
    const sectionHref = useSectionHref(base);
    const landing = useLanding();
    const order = useOrderDialog();
    const statement = useContent('footer.statement');
    const companyLine = useContent('footer.company_line');
    const tagline = useContent('footer.tagline');
    const finePrint = useContent('footer.fine_print');
    const orderLabel = useContent('order.cta_short');
    const email = useContent('contact.email');
    const socials = SOCIALS.map((social) => ({
        ...social,
        href: landing.content[social.key] ?? '',
    })).filter((social) => social.href);

    const columns: { heading: string; links: FooterLink[] }[] = [
        {
            heading: t('footer.product'),
            links: [
                // A section that renders nothing loses its link.
                ...SECTIONS.filter((section) =>
                    hasSection(landing, section.id),
                ).map((section) => ({
                    label: t(section.label),
                    href: sectionHref(section.id),
                    visit: base !== '',
                })),
                {
                    label: orderLabel,
                    ...order.link({ source: 'footer' }, sectionHref('order')),
                },
            ],
        },
        {
            heading: t('common.groupCompany'),
            links: [
                ...pageLinks(landing.pages, 'company'),
                ...(email
                    ? [{ label: t('footer.contact'), href: `mailto:${email}` }]
                    : []),
            ],
        },
        {
            heading: t('common.groupLegal'),
            links: pageLinks(landing.pages, 'legal'),
        },
    ].filter((column) => column.links.length > 0);

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
                            aria-label={t('common.brandTop', {
                                brand: BRAND.name,
                            })}
                            className="inline-flex rounded-[12px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink focus-visible:outline-none"
                        >
                            <Wordmark />
                        </a>
                        <p className="mt-8 max-w-[21ch] font-display text-[1.625rem] leading-[1.18] font-medium tracking-[-0.01em] text-balance text-bone md:text-[1.875rem] rtl:leading-[1.45]">
                            <Accent
                                text={statement}
                                className="font-normal text-mint"
                            />
                        </p>
                        <p className="mt-4 text-sm text-smoke">{companyLine}</p>

                        <ContactLines />

                        {socials.length ? (
                            <ul className="-ms-2.5 mt-8 flex items-center gap-1">
                                {socials.map((social) => (
                                    <li key={social.name}>
                                        <a
                                            href={social.href}
                                            aria-label={t('footer.social', {
                                                brand: BRAND.name,
                                                network: social.name,
                                            })}
                                            className="group relative grid size-10 place-items-center rounded-full text-mist transition-colors duration-[380ms] ease-glass hover:text-bone focus-visible:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
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
                        ) : null}
                    </div>

                    <nav
                        aria-label={t('footer.navLabel')}
                        className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:col-span-6 lg:col-start-7 lg:gap-x-8"
                    >
                        {columns.map((column, index) => (
                            <div
                                key={column.heading}
                                className={cn(
                                    'border-t border-white/10 pt-4',
                                    // On phones the last column becomes a
                                    // full-width legal line.
                                    index === columns.length - 1 &&
                                        'col-span-2 sm:col-span-1',
                                )}
                            >
                                <h2 className="text-kicker font-medium text-smoke uppercase">
                                    {column.heading}
                                </h2>
                                <ul
                                    className={cn(
                                        'mt-6 flex flex-col gap-y-3.5',
                                        index === columns.length - 1 &&
                                            'max-sm:flex-row max-sm:flex-wrap max-sm:gap-x-6',
                                    )}
                                >
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            {link.visit ? (
                                                <Link
                                                    href={link.href}
                                                    className={linkClass}
                                                >
                                                    <Managed
                                                        text={link.label}
                                                    />
                                                </Link>
                                            ) : (
                                                <a
                                                    href={link.href}
                                                    onClick={link.onClick}
                                                    className={linkClass}
                                                >
                                                    {link.label}
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <p className="mt-20 pb-8 font-display text-[clamp(2.25rem,6.2vw,5.75rem)] leading-[0.95] font-normal tracking-[-0.02em] text-balance text-bone/[0.14] italic select-none md:mt-28 lg:pb-10 rtl:leading-[1.35]">
                    {tagline}
                </p>

                <div className="flex flex-col gap-2 border-t border-white/10 pt-8 pb-8 text-[13px] text-smoke sm:flex-row sm:items-center sm:justify-between lg:pt-11">
                    {/* A code-like line: left to right on both pages. */}
                    <p>
                        <span className="bidi-ltr">
                            {t('footer.copyright', {
                                year: '2026',
                                company: BRAND.company,
                            })}
                        </span>
                    </p>
                    <div className="flex items-center justify-between gap-x-6 sm:justify-end">
                        <p className="tracking-[0.04em]">{finePrint}</p>
                        <LanguageSwitch variant="footer" />
                    </div>
                </div>
            </Container>
        </footer>
    );
}

/**
 * Phone, WhatsApp and office address, set like the index opposite: a small
 * spaced-capitals label, then the line. On phones each label sits over its
 * line, the two numbers side by side and the address full width; from
 * `sm` the labels move beside them. Numbers read left to right on both
 * pages; each line hides while its setting is empty.
 */
function ContactLines() {
    const { t } = useI18n();
    const { phone, whatsapp } = useTalkNumbers();
    const address = useContent('contact.address').trim();
    const numberClass = cn(linkClass, 'whitespace-nowrap bidi-ltr');

    const lines: { label: string; value: ReactNode; wide?: boolean }[] = [];

    if (phone) {
        lines.push({
            label: t('footer.phone'),
            value: (
                <a href={telHref(phone)} className={numberClass}>
                    {phone}
                </a>
            ),
        });
    }

    if (whatsapp) {
        lines.push({
            label: t('footer.whatsapp'),
            value: (
                <a
                    href={whatsAppHref(whatsapp)}
                    target="_blank"
                    rel="noopener"
                    className={numberClass}
                >
                    {whatsapp}
                </a>
            ),
        });
    }

    if (address) {
        lines.push({
            label: t('footer.address'),
            // Its own direction: an English address on the Arabic page
            // keeps its punctuation in place.
            value: <bdi className="whitespace-pre-line">{address}</bdi>,
            wide: true,
        });
    }

    if (lines.length === 0) {
        return null;
    }

    return (
        <address className="mt-8 max-w-[26rem] not-italic">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-baseline sm:gap-y-3">
                {lines.map((line) => (
                    <div
                        key={line.label}
                        className={cn(
                            'min-w-0 sm:contents',
                            line.wide && 'col-span-2',
                        )}
                    >
                        <dt className="text-kicker font-medium text-smoke uppercase">
                            {line.label}
                        </dt>
                        <dd className="mt-2 text-[15px] leading-relaxed text-pretty text-mist sm:mt-0">
                            {line.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </address>
    );
}
