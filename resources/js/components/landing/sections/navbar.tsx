import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { MouseEvent, ReactNode, Ref } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { LanguageSwitch } from '../language-switch';
import { hasSection, useContent, useLanding } from '../landing-data';
import { useLandingLinks } from '../links';
import { useOrderDialog } from '../order-dialog';
import { Container, Wordmark, cta } from '../primitives';

/*
 * Fixed floating capsule. Links carry the number of the section they open
 * (the same "N° 03" the section header prints), and a single mint bead
 * glides under whichever section is being read. A section that renders
 * nothing (no published looks, plans…) loses its link. Every "Order a
 * device" opens the order pop-up; the anchors keep #order as their fallback.
 * The language switch sits beside "Log in" on desktop and at the foot of
 * the phone menu. On the Arabic page the capsule mirrors (wordmark on the
 * right); the bead is placed by measurement, so it follows either way.
 */

const NAV = [
    { id: 'how-it-works', label: 'common.sectionHowItWorks', index: '01' },
    { id: 'kiosk', label: 'common.sectionKiosk', index: '03' },
    { id: 'lookbook', label: 'common.sectionLookbook', index: '04' },
    { id: 'pricing', label: 'common.sectionPricing', index: '06' },
] as const satisfies readonly {
    id: string;
    label: MessageKey;
    index: string;
}[];

type NavId = (typeof NAV)[number]['id'];

/** The section links whose sections are on the page. */
function useNavItems() {
    const landing = useLanding();

    return NAV.filter((item) => hasSection(landing, item.id));
}

/**
 * Every section on the page, in order. Sections that have no nav link
 * (hero, features, stories…) are observed too, so the bead hides while
 * they are being read instead of lingering on the previous link.
 */
const SPY_IDS = [
    'top',
    'how-it-works',
    'features',
    'kiosk',
    'lookbook',
    'partners',
    'stories',
    'pricing',
    'order',
] as const;

const SCROLLED_AT = 24;
const MENU_ID = 'site-menu';

/**
 * Where the section links point: '' on the landing page itself, '/' on a
 * content page (/pages/{slug}), where they lead back to the landing.
 */
export type SectionBase = '' | '/';

/**
 * A section's link: "#pricing" on the landing page, the landing in the
 * page's language from a content page ("/#pricing", "/ar#pricing").
 */
export function useSectionHref(base: SectionBase) {
    const { localePath } = useI18n();

    return (id: string) => (base ? localePath(`${base}#${id}`) : `#${id}`);
}

function subscribeToScroll(onChange: () => void) {
    window.addEventListener('scroll', onChange, { passive: true });

    return () => window.removeEventListener('scroll', onChange);
}

const isScrolled = () => window.scrollY > SCROLLED_AT;
const isScrolledOnServer = () => false;

function isNavId(id: string | null): id is NavId {
    return NAV.some((item) => item.id === id);
}

/** The section crossing a thin reading line ~40% down the viewport. */
function useActiveSection(): NavId | null {
    const [current, setCurrent] = useState<string | null>(null);

    useEffect(() => {
        const intersecting = new Set<string>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        intersecting.add(entry.target.id);
                    } else {
                        intersecting.delete(entry.target.id);
                    }
                }

                // At a boundary two sections share the line: prefer the later one.
                const found = [...SPY_IDS]
                    .reverse()
                    .find((id) => intersecting.has(id));
                setCurrent(found ?? null);
            },
            { rootMargin: '-40% 0px -56% 0px' },
        );

        for (const id of SPY_IDS) {
            const section = document.getElementById(id);

            if (section) {
                observer.observe(section);
            }
        }

        return () => observer.disconnect();
    }, []);

    return isNavId(current) ? current : null;
}

export default function Navbar({ base = '' }: { base?: SectionBase }) {
    const { t, localePath } = useI18n();
    const sectionHref = useSectionHref(base);
    const links = useLandingLinks();
    const order = useOrderDialog();
    const orderLabel = useContent('order.cta_short');
    const orderCompact = useContent('order.cta_compact');
    const scrolled = useSyncExternalStore(
        subscribeToScroll,
        isScrolled,
        isScrolledOnServer,
    );
    const active = useActiveSection();
    const [open, setOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);

    const dismissMenu = () => {
        setOpen(false);
        menuButton.current?.focus({ preventScroll: true });
    };

    // A menu link was followed: release the scroll lock before the browser
    // scrolls to the anchor, and let focus move on to that section.
    const followMenuLink = () => {
        document.documentElement.style.overflow = '';
        setOpen(false);
    };

    // The menu's order link: close the menu in the same update that opens
    // the pop-up, so the menu's scroll lock is released before the dialog
    // takes its own. Focus parks on the menu button first, so it returns
    // there (and not to the hidden menu) when the pop-up closes.
    const orderFromMenu = () => {
        setOpen(false);
        menuButton.current?.focus({ preventScroll: true });
        order.open({ source: 'mobile-menu' });
    };

    // While the menu is open: lock page scroll, close on Escape, and close
    // if the viewport grows into the desktop layout.
    useEffect(() => {
        if (!open) {
            return;
        }

        const root = document.documentElement;
        const desktop = window.matchMedia('(min-width: 64rem)');
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                menuButton.current?.focus({ preventScroll: true });
            }
        };
        const onViewport = () => {
            if (desktop.matches) {
                setOpen(false);
            }
        };

        // Reserve the scrollbar's gutter so nothing shifts while locked.
        root.style.scrollbarGutter = 'stable';
        root.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);
        desktop.addEventListener('change', onViewport);

        return () => {
            root.style.overflow = '';
            root.style.scrollbarGutter = '';
            document.removeEventListener('keydown', onKeyDown);
            desktop.removeEventListener('change', onViewport);
        };
    }, [open]);

    return (
        <>
            <a
                href="#top"
                className="fixed start-3 top-3 z-[60] -translate-y-24 rounded-[14px] bg-mint px-4 py-2.5 text-sm font-medium text-ink transition-transform duration-[380ms] ease-glass focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-bone/80 focus-visible:outline-none"
            >
                {t('navbar.skipToContent')}
            </a>

            <header className="pointer-events-none fixed inset-x-0 top-3 z-50">
                {/* Dims the page behind the open menu; a click closes it. */}
                <div
                    aria-hidden
                    onClick={dismissMenu}
                    className={cn(
                        'fixed inset-0 bg-ink/60 transition-[opacity,visibility] duration-[380ms] ease-glass lg:hidden',
                        open
                            ? 'pointer-events-auto visible opacity-100'
                            : 'invisible opacity-0',
                    )}
                />

                <Container className="relative">
                    <div className="pointer-events-auto relative h-16 rounded-[22px]">
                        {/*
                         * At rest the capsule only ever sits on the hero
                         * photograph: a smoked pane with no shadow or rim,
                         * dark enough to keep the type legible on bright
                         * plaster, near invisible on shadow.
                         */}
                        <div
                            aria-hidden
                            className="absolute inset-0 rounded-[inherit] border border-white/[0.12] bg-[oklch(0.16_0.02_200/0.55)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.12)] backdrop-blur-[14px] backdrop-saturate-[1.6]"
                        />
                        {/* Scrolled: dense glass with its shadow fades in over it. */}
                        <div
                            aria-hidden
                            className={cn(
                                'glass-rim absolute inset-0 rounded-[inherit] glass-strong transition-opacity duration-[380ms] ease-glass',
                                scrolled || open ? 'opacity-100' : 'opacity-0',
                            )}
                        />

                        <div className="relative grid h-full grid-cols-[1fr_auto] items-center gap-4 ps-4 pe-3 sm:ps-5 lg:grid-cols-[auto_1fr_auto]">
                            {base ? (
                                <Link
                                    href={localePath('/')}
                                    aria-label={t('common.brandHome', {
                                        brand: BRAND.name,
                                    })}
                                    className="justify-self-start rounded-[12px] py-1 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                >
                                    <Wordmark />
                                </Link>
                            ) : (
                                <a
                                    href="#top"
                                    aria-label={t('common.brandTop', {
                                        brand: BRAND.name,
                                    })}
                                    className="justify-self-start rounded-[12px] py-1 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                >
                                    <Wordmark />
                                </a>
                            )}

                            <DesktopLinks
                                base={base}
                                active={active}
                                onPhoto={!scrolled}
                            />

                            <div className="flex items-center gap-1.5 justify-self-end">
                                <LanguageSwitch
                                    variant="navbar"
                                    className={cn(
                                        'hidden lg:inline-flex',
                                        !scrolled && 'text-bone',
                                    )}
                                />
                                {links.signedIn ? (
                                    <Link
                                        href={links.admin}
                                        className={cta({
                                            variant: 'primary',
                                            size: 'sm',
                                        })}
                                    >
                                        {t('common.adminPanel')}
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={links.signIn}
                                            className={cn(
                                                cta({
                                                    variant: 'ghost',
                                                    size: 'sm',
                                                }),
                                                'hidden sm:inline-flex',
                                                !scrolled && 'text-bone',
                                            )}
                                        >
                                            {t('common.logIn')}
                                        </Link>
                                        <a
                                            {...order.link(
                                                { source: 'navbar' },
                                                sectionHref('order'),
                                            )}
                                            className={cta({
                                                variant: 'primary',
                                                size: 'sm',
                                            })}
                                        >
                                            <span className="sm:hidden">
                                                {orderCompact}
                                            </span>
                                            <span className="hidden sm:inline">
                                                {orderLabel}
                                            </span>
                                        </a>
                                    </>
                                )}

                                <MenuButton
                                    ref={menuButton}
                                    open={open}
                                    onToggle={() => setOpen((value) => !value)}
                                />
                            </div>
                        </div>
                    </div>

                    <MobileMenu
                        base={base}
                        open={open}
                        active={active}
                        onNavigate={followMenuLink}
                        onOrder={orderFromMenu}
                    />
                </Container>
            </header>
        </>
    );
}

function DesktopLinks({
    base,
    active,
    onPhoto,
}: {
    base: SectionBase;
    active: NavId | null;
    /** Over the hero photograph the quieter tones step up one level. */
    onPhoto: boolean;
}) {
    const { t } = useI18n();
    const sectionHref = useSectionHref(base);
    const items = useNavItems();
    const nav = useRef<HTMLElement>(null);
    const bead = useRef<HTMLSpanElement>(null);

    // Glide the bead under the active label. Measured after layout and again
    // whenever the row resizes (web fonts arriving change the label widths).
    useLayoutEffect(() => {
        const row = nav.current;
        const dot = bead.current;

        if (!row || !dot) {
            return;
        }

        const place = () => {
            const label = active
                ? row.querySelector<HTMLElement>(`[data-label="${active}"]`)
                : null;

            if (!label) {
                dot.style.opacity = '0';

                return;
            }

            const x =
                label.getBoundingClientRect().left -
                row.getBoundingClientRect().left +
                label.offsetWidth / 2 -
                2;
            const appearing = dot.style.opacity !== '1';

            if (appearing) {
                // Reappear in place rather than sliding in from the last spot.
                dot.style.transitionProperty = 'opacity';
            }

            dot.style.transform = `translateX(${x}px)`;

            if (appearing) {
                dot.getBoundingClientRect();
                dot.style.transitionProperty = '';
            }

            dot.style.opacity = '1';
        };

        place();

        const resize = new ResizeObserver(place);
        resize.observe(row);

        return () => resize.disconnect();
    }, [active]);

    return (
        <nav
            ref={nav}
            aria-label={t('navbar.primaryLabel')}
            className="relative hidden h-full items-center justify-self-center lg:flex"
        >
            <ul className="flex items-center">
                {items.map((item) => {
                    const current = item.id === active;

                    return (
                        <li key={item.id}>
                            <SectionLink
                                href={sectionHref(item.id)}
                                aria-current={current ? 'true' : undefined}
                                className={cn(
                                    'group flex items-baseline rounded-[12px] px-3 py-2 text-sm transition-colors duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none xl:px-3.5',
                                    current || onPhoto
                                        ? 'text-bone'
                                        : 'text-mist hover:text-bone',
                                )}
                            >
                                <span data-label={item.id}>
                                    {t(item.label)}
                                </span>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'relative -top-[0.55em] ms-[3px] text-[9px] font-medium tracking-[0.06em] tabular-nums transition-colors duration-[380ms] ease-glass rtl:ms-1',
                                        current
                                            ? 'text-mint'
                                            : onPhoto
                                              ? 'text-mist group-hover:text-bone'
                                              : 'text-smoke group-hover:text-mist',
                                    )}
                                >
                                    {item.index}
                                </span>
                            </SectionLink>
                        </li>
                    );
                })}
            </ul>
            <span
                ref={bead}
                aria-hidden
                className="pointer-events-none absolute bottom-[9px] left-0 size-1 rounded-full bg-mint opacity-0 shadow-[0_0_10px_1px_oklch(0.84_0.12_160/0.55)] transition-[transform,opacity] duration-[520ms] ease-glass"
            />
        </nav>
    );
}

function MenuButton({
    ref,
    open,
    onToggle,
}: {
    ref: Ref<HTMLButtonElement>;
    open: boolean;
    onToggle: () => void;
}) {
    const { t } = useI18n();

    return (
        <button
            ref={ref}
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={t(open ? 'navbar.closeMenu' : 'navbar.openMenu')}
            onClick={onToggle}
            className="ms-1 grid size-10 place-items-center rounded-[14px] bg-white/[0.06] text-bone ring-1 ring-white/[0.12] transition-colors duration-[380ms] ease-glass ring-inset hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none active:scale-[0.97] lg:hidden"
        >
            <span aria-hidden className="relative block h-3 w-[18px]">
                <span
                    className={cn(
                        'absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-current transition-[translate,rotate] duration-[380ms] ease-glass',
                        open && 'translate-y-[5.25px] rotate-45',
                    )}
                />
                <span
                    className={cn(
                        'absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-current transition-[translate,rotate,scale] duration-[380ms] ease-glass',
                        open
                            ? '-translate-y-[5.25px] -rotate-45'
                            : 'translate-x-[3.5px] scale-x-[0.6] rtl:-translate-x-[3.5px]',
                    )}
                />
            </span>
        </button>
    );
}

function MobileMenu({
    base,
    open,
    active,
    onNavigate,
    onOrder,
}: {
    base: SectionBase;
    open: boolean;
    active: NavId | null;
    onNavigate: () => void;
    onOrder: () => void;
}) {
    const { t } = useI18n();
    const sectionHref = useSectionHref(base);
    const links = useLandingLinks();
    const items = useNavItems();
    const email = useContent('contact.email');
    const orderLabel = useContent('order.cta_short');
    const demoPrompt = useContent('order.demo_prompt');
    const demoLink = useContent('order.menu_demo_link');
    const demoSubject = useContent('order.demo_subject');
    const handleClick = (event: MouseEvent) => {
        // Anchors keep their default behaviour; this only closes the menu.
        if (event.defaultPrevented) {
            return;
        }

        onNavigate();
    };
    const handleOrder = (event: MouseEvent<HTMLAnchorElement>) => {
        // New-tab and new-window clicks follow the #order fallback.
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        event.preventDefault();
        onOrder();
    };

    return (
        <div
            id={MENU_ID}
            className={cn(
                'glass-rim pointer-events-auto relative mt-2 max-h-[calc(100svh-6.5rem)] overflow-y-auto overscroll-contain rounded-[28px] glass-strong transition-[opacity,translate,visibility] duration-[380ms] ease-glass sm:ms-auto sm:max-w-[27rem] lg:hidden',
                open
                    ? 'visible translate-y-0 opacity-100'
                    : 'invisible -translate-y-3 opacity-0',
            )}
        >
            <nav
                aria-label={t('navbar.sectionsLabel')}
                className="px-5 pt-3 sm:px-6"
            >
                <ol>
                    {items.map((item, index) => {
                        const current = item.id === active;

                        return (
                            <li
                                key={item.id}
                                className={cn(
                                    'border-b border-white/10 transition-[opacity,translate] duration-[520ms] ease-glass',
                                    open
                                        ? 'translate-y-0 opacity-100'
                                        : 'translate-y-2 opacity-0',
                                )}
                                style={{
                                    transitionDelay: open
                                        ? `${80 + index * 45}ms`
                                        : '0ms',
                                }}
                            >
                                <SectionLink
                                    href={sectionHref(item.id)}
                                    onClick={handleClick}
                                    aria-current={current ? 'true' : undefined}
                                    className="group -mx-2 grid grid-cols-[2.5rem_1fr] items-baseline gap-x-2 rounded-[14px] px-2 py-3.5 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                >
                                    <span
                                        className={cn(
                                            'text-[10px] font-medium tracking-[0.2em] tabular-nums transition-colors duration-[380ms] ease-glass',
                                            current
                                                ? 'text-mint'
                                                : 'text-smoke',
                                        )}
                                    >
                                        {t('common.sectionIndex', {
                                            index: item.index,
                                        })}
                                    </span>
                                    <span
                                        className={cn(
                                            'font-display text-[clamp(1.5rem,7vw,1.875rem)] leading-none font-medium tracking-[-0.015em] whitespace-nowrap transition-colors duration-[380ms] ease-glass',
                                            current
                                                ? 'text-mint'
                                                : 'text-bone group-hover:text-mint',
                                        )}
                                    >
                                        {t(item.label)}
                                    </span>
                                </SectionLink>
                            </li>
                        );
                    })}
                </ol>
            </nav>

            <div
                className={cn(
                    'px-5 pt-5 pb-5 transition-opacity duration-[520ms] ease-glass sm:px-6',
                    open ? 'opacity-100 delay-300' : 'opacity-0',
                )}
            >
                {/* From sm up the capsule already carries these. */}
                {links.signedIn ? (
                    <Link
                        href={links.admin}
                        onClick={onNavigate}
                        className={cn(
                            cta({ variant: 'primary' }),
                            'w-full sm:hidden',
                        )}
                    >
                        {t('common.adminPanel')}
                    </Link>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:hidden">
                        <Link
                            href={links.signIn}
                            onClick={onNavigate}
                            className={cta({ variant: 'glass' })}
                        >
                            {t('common.logIn')}
                        </Link>
                        <a
                            href={sectionHref('order')}
                            onClick={handleOrder}
                            className={cta({ variant: 'primary' })}
                        >
                            {orderLabel}
                        </a>
                    </div>
                )}

                {email ? (
                    <p className="mt-5 flex items-center justify-between gap-4 text-sm text-smoke sm:mt-0">
                        <span>{demoPrompt}</span>
                        <a
                            href={`mailto:${email}?subject=${encodeURIComponent(demoSubject)}`}
                            className="group inline-flex items-center gap-1.5 rounded-[10px] text-bone transition-colors duration-[380ms] ease-glass hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                        >
                            {demoLink}
                            <ArrowRight
                                aria-hidden
                                className="size-3.5 transition-transform duration-[380ms] ease-glass group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                            />
                        </a>
                    </p>
                ) : null}

                <div className="mt-4 border-t border-white/10 pt-1.5">
                    <LanguageSwitch variant="menu" />
                </div>
            </div>
        </div>
    );
}

/**
 * A section link: a plain anchor on the landing page, an Inertia visit back
 * to it from a content page (Inertia scrolls to the #section on arrival).
 */
function SectionLink({
    href,
    ...props
}: {
    href: string;
    className?: string;
    children: ReactNode;
    onClick?: (event: MouseEvent) => void;
    'aria-current'?: 'true';
}) {
    return href.startsWith('/') ? (
        <Link href={href} {...props} />
    ) : (
        <a href={href} {...props} />
    );
}
