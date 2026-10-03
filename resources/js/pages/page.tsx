import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { BRAND } from '@/components/landing/brand';
import {
    LandingDataProvider,
    useContent,
} from '@/components/landing/landing-data';
import { LandingLinksContext } from '@/components/landing/links';
import type { LandingLinks } from '@/components/landing/links';
import { OrderDialogProvider } from '@/components/landing/order-dialog';
import {
    Atmosphere,
    Container,
    Glow,
    Reveal,
    useAnchorGlide,
} from '@/components/landing/primitives';
import Footer from '@/components/landing/sections/footer';
import Navbar from '@/components/landing/sections/navbar';
import { useDocumentLocale, useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/i18n';
import { login } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import type { ContentPageProps, LandingPageLink } from '@/types/landing';

/*
 * A content page (About, Privacy, Terms...) at /pages/{slug} and, in
 * Arabic, /ar/pages/{slug}, written in Markdown in the admin and rendered
 * by the server (PageController). It wears the landing's chrome: the navbar
 * leads back to the landing's sections in the same language, and the footer
 * and order pop-up work as they do there.
 */

const GROUP_LABEL = {
    company: 'common.groupCompany',
    legal: 'common.groupLegal',
} as const satisfies Record<LandingPageLink['group'], MessageKey>;

/** Ids the landing chrome already uses: a heading never takes one. */
const RESERVED_IDS = new Set([
    'top',
    'how-it-works',
    'features',
    'kiosk',
    'lookbook',
    'partners',
    'stories',
    'pricing',
    'order',
    'page-title',
    'site-menu',
]);

type Heading = { id: string; text: string };

const ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
};

/** Plain text of a heading's inner HTML (the server escapes &, <, > and "). */
function headingText(inner: string): string {
    return inner
        .replace(/<[^>]*>/g, '')
        .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
            if (code.startsWith('#')) {
                const point =
                    code[1].toLowerCase() === 'x'
                        ? parseInt(code.slice(2), 16)
                        : parseInt(code.slice(1), 10);

                return Number.isNaN(point)
                    ? entity
                    : String.fromCodePoint(point);
            }

            return ENTITIES[code.toLowerCase()] ?? entity;
        })
        .trim();
}

/**
 * "Data we collect" → "data-we-collect". ASCII only: Inertia looks a
 * #fragment up without decoding it, so a percent-encoded Arabic id would
 * never be found. Arabic headings fall back to "section", "section-2"…
 */
function slugify(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Gives every h2 of the server's HTML an id, so the "On this page" index
 * can link to it. Done on the string, so the server render and hydration
 * produce the same markup.
 */
function withAnchors(html: string): { html: string; headings: Heading[] } {
    const used = new Set(RESERVED_IDS);
    const headings: Heading[] = [];

    const anchored = html.replace(
        /<h2>([\s\S]*?)<\/h2>/g,
        (_, inner: string) => {
            const text = headingText(inner);
            const base = slugify(text) || 'section';
            let id = base;

            for (let n = 2; used.has(id); n += 1) {
                id = `${base}-${n}`;
            }

            used.add(id);
            headings.push({ id, text });

            return `<h2 id="${id}">${inner}</h2>`;
        },
    );

    return { html: anchored, headings };
}

export default function ContentPage({ page, landing }: ContentPageProps) {
    const { auth } = usePage().props;
    const { url } = usePage();
    // <html lang dir> for this page's language (/pages or /ar/pages).
    useDocumentLocale();
    // Taps on #anchors (the "On this page" index) glide.
    useAnchorGlide();

    const links: LandingLinks = {
        signedIn: Boolean(auth.user),
        signIn: login(),
        admin: adminDashboard(),
    };

    // Same always-dark page as the landing.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-page');

        return () => root.classList.remove('landing-page');
    }, []);

    const slug = decodeURIComponent(
        url.split(/[?#]/)[0].replace(/^(?:\/ar)?\/pages\//, ''),
    );
    const group = landing.pages.find((entry) => entry.slug === slug)?.group;

    return (
        <>
            <Head title={page.title}>
                {page.summary ? (
                    <meta name="description" content={page.summary} />
                ) : null}
            </Head>
            <LandingDataProvider value={landing}>
                <OrderDialogProvider>
                    <LandingLinksContext value={links}>
                        <div className="landing relative isolate min-h-screen overflow-x-clip bg-ink font-sans text-bone antialiased">
                            <Atmosphere />
                            <Navbar base="/" />
                            <main>
                                <Article
                                    title={page.title}
                                    summary={page.summary}
                                    html={page.html}
                                    group={group}
                                />
                            </main>
                            <Footer base="/" />
                        </div>
                    </LandingLinksContext>
                </OrderDialogProvider>
            </LandingDataProvider>
        </>
    );
}

function Article({
    title,
    summary,
    html,
    group,
}: {
    title: string;
    summary: string | null;
    html: string;
    group?: LandingPageLink['group'];
}) {
    const { t } = useI18n();
    const email = useContent('contact.email');
    const body = useMemo(() => withAnchors(html), [html]);
    const indexed = body.headings.length > 1;

    return (
        <article
            id="top"
            aria-labelledby="page-title"
            className="relative isolate pt-32 pb-24 md:pt-44 md:pb-36"
        >
            <Glow
                color="jade"
                className="-top-56 -left-48 size-[40rem] opacity-25"
            />

            <Container>
                {/* The section-header voice: rule, kicker, title, lede. */}
                <Reveal
                    as="header"
                    className="grid gap-y-8 border-t border-white/10 pt-5 lg:grid-cols-12 lg:gap-x-8"
                >
                    <p className="text-kicker font-medium whitespace-nowrap text-smoke uppercase lg:col-span-12">
                        <span className="text-bone">{BRAND.company}</span>
                        {group ? (
                            <>
                                <span
                                    aria-hidden
                                    className="mx-3 text-white/25"
                                >
                                    —
                                </span>
                                {t(GROUP_LABEL[group])}
                            </>
                        ) : null}
                    </p>
                    <h1
                        id="page-title"
                        className="font-display text-display-xl font-medium text-balance text-bone lg:col-span-8"
                    >
                        {title}
                    </h1>
                    {summary ? (
                        <p className="max-w-[36rem] text-[17px] leading-relaxed text-pretty text-mist lg:col-span-4 lg:self-end">
                            {summary}
                        </p>
                    ) : null}
                </Reveal>

                <div className="mt-14 grid md:mt-20 lg:grid-cols-12 lg:gap-x-8">
                    {indexed ? (
                        <nav
                            aria-label={t('page.onThisPage')}
                            className="hidden lg:col-span-3 lg:block"
                        >
                            <div className="sticky top-32">
                                <p className="text-kicker font-medium text-smoke uppercase">
                                    {t('page.onThisPage')}
                                </p>
                                <ol className="mt-5 border-t border-white/10">
                                    {body.headings.map((heading, index) => (
                                        <li
                                            key={heading.id}
                                            className="border-b border-white/10"
                                        >
                                            <a
                                                href={`#${heading.id}`}
                                                className="group -mx-2 grid grid-cols-[2.25rem_1fr] items-baseline rounded-[12px] px-2 py-3 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                            >
                                                <span className="text-[10px] font-medium tracking-[0.2em] text-smoke tabular-nums transition-colors duration-[380ms] ease-glass group-hover:text-mint">
                                                    {String(index + 1).padStart(
                                                        2,
                                                        '0',
                                                    )}
                                                </span>
                                                <span className="text-[15px] leading-snug text-mist transition-colors duration-[380ms] ease-glass group-hover:text-bone">
                                                    {heading.text}
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </nav>
                    ) : null}

                    <div className="min-w-0 lg:col-span-8 lg:col-start-5">
                        <div
                            className="landing-prose"
                            dangerouslySetInnerHTML={{ __html: body.html }}
                        />

                        {email ? (
                            <p className="mt-16 max-w-[42rem] border-t border-white/10 pt-5 text-[14px] text-smoke md:mt-20">
                                {t('page.questions')}{' '}
                                <a
                                    href={`mailto:${email}`}
                                    className="text-bone underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-mint focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                >
                                    {email}
                                </a>
                            </p>
                        ) : null}
                    </div>
                </div>
            </Container>
        </article>
    );
}
