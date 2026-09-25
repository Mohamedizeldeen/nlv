import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { MouseEvent, Ref } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { useLandingLinks } from '../links';
import { Arabic, Container, Wordmark, cta } from '../primitives';

/*
 * Fixed floating capsule. Links carry the number of the section they open
 * (the same "N° 03" the section header prints), and a single champagne bead
 * glides under whichever section is being read.
 */

const NAV = [
    {
        id: 'how-it-works',
        label: 'How it works',
        labelAr: 'كيف يعمل',
        index: '01',
    },
    { id: 'kiosk', label: 'Kiosk', labelAr: 'الكشك الذكي', index: '03' },
    {
        id: 'lookbook',
        label: 'Lookbook',
        labelAr: 'معرض الإطلالات',
        index: '04',
    },
    { id: 'pricing', label: 'Pricing', labelAr: 'الأسعار', index: '06' },
    {
        id: 'integrations',
        label: 'Developers',
        labelAr: 'التكامل',
        index: '07',
    },
] as const;

type NavId = (typeof NAV)[number]['id'];

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
    'integrations',
    'demo',
] as const;

const SCROLLED_AT = 24;
const MENU_ID = 'site-menu';

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

export default function Navbar() {
    const links = useLandingLinks();
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
                className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-[14px] bg-champagne px-4 py-2.5 text-sm font-medium text-ink transition-transform duration-[380ms] ease-glass focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-bone/80 focus-visible:outline-none"
            >
                Skip to content
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
                            className="absolute inset-0 rounded-[inherit] border border-white/[0.12] bg-[oklch(0.16_0.02_285/0.55)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.12)] backdrop-blur-[14px] backdrop-saturate-[1.6]"
                        />
                        {/* Scrolled: dense glass with its shadow fades in over it. */}
                        <div
                            aria-hidden
                            className={cn(
                                'glass-rim absolute inset-0 rounded-[inherit] glass-strong transition-opacity duration-[380ms] ease-glass',
                                scrolled || open ? 'opacity-100' : 'opacity-0',
                            )}
                        />

                        <div className="relative grid h-full grid-cols-[1fr_auto] items-center gap-4 pr-3 pl-4 sm:pl-5 lg:grid-cols-[auto_1fr_auto]">
                            <a
                                href="#top"
                                aria-label={`${BRAND.name}, back to top`}
                                className="justify-self-start rounded-[12px] py-1 focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                            >
                                <Wordmark />
                            </a>

                            <DesktopLinks active={active} onPhoto={!scrolled} />

                            <div className="flex items-center gap-1.5 justify-self-end">
                                {links.signedIn ? (
                                    <Link
                                        href={links.dashboard}
                                        className={cta({
                                            variant: 'gold',
                                            size: 'sm',
                                        })}
                                    >
                                        Dashboard
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
                                            Log in
                                        </Link>
                                        <Link
                                            href={links.start}
                                            className={cta({
                                                variant: 'gold',
                                                size: 'sm',
                                            })}
                                        >
                                            Get started
                                        </Link>
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
                        open={open}
                        active={active}
                        onNavigate={followMenuLink}
                    />
                </Container>
            </header>
        </>
    );
}

function DesktopLinks({
    active,
    onPhoto,
}: {
    active: NavId | null;
    /** Over the hero photograph the quieter tones step up one level. */
    onPhoto: boolean;
}) {
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
            aria-label="Primary"
            className="relative hidden h-full items-center justify-self-center lg:flex"
        >
            <ul className="flex items-center">
                {NAV.map((item) => {
                    const current = item.id === active;

                    return (
                        <li key={item.id}>
                            <a
                                href={`#${item.id}`}
                                aria-current={current ? 'true' : undefined}
                                className={cn(
                                    'group flex items-baseline rounded-[12px] px-3 py-2 text-sm transition-colors duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none xl:px-3.5',
                                    current || onPhoto
                                        ? 'text-bone'
                                        : 'text-mist hover:text-bone',
                                )}
                            >
                                <span data-label={item.id}>{item.label}</span>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'relative -top-[0.55em] ml-[3px] text-[9px] font-medium tracking-[0.06em] tabular-nums transition-colors duration-[380ms] ease-glass',
                                        current
                                            ? 'text-champagne'
                                            : onPhoto
                                              ? 'text-mist group-hover:text-bone'
                                              : 'text-smoke group-hover:text-mist',
                                    )}
                                >
                                    {item.index}
                                </span>
                            </a>
                        </li>
                    );
                })}
            </ul>
            <span
                ref={bead}
                aria-hidden
                className="pointer-events-none absolute bottom-[9px] left-0 size-1 rounded-full bg-champagne opacity-0 shadow-[0_0_10px_1px_oklch(0.86_0.075_82/0.55)] transition-[transform,opacity] duration-[520ms] ease-glass"
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
    return (
        <button
            ref={ref}
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={onToggle}
            className="ml-1 grid size-10 place-items-center rounded-[14px] bg-white/[0.06] text-bone ring-1 ring-white/[0.12] transition-colors duration-[380ms] ease-glass ring-inset hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none active:scale-[0.97] lg:hidden"
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
                            : 'translate-x-[3.5px] scale-x-[0.6]',
                    )}
                />
            </span>
        </button>
    );
}

function MobileMenu({
    open,
    active,
    onNavigate,
}: {
    open: boolean;
    active: NavId | null;
    onNavigate: () => void;
}) {
    const links = useLandingLinks();
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        // Anchors keep their default behaviour; this only closes the menu.
        if (event.defaultPrevented) {
            return;
        }

        onNavigate();
    };

    return (
        <div
            id={MENU_ID}
            className={cn(
                'glass-rim pointer-events-auto relative mt-2 max-h-[calc(100svh-6.5rem)] overflow-y-auto overscroll-contain rounded-[28px] glass-strong transition-[opacity,translate,visibility] duration-[380ms] ease-glass sm:ml-auto sm:max-w-[27rem] lg:hidden',
                open
                    ? 'visible translate-y-0 opacity-100'
                    : 'invisible -translate-y-3 opacity-0',
            )}
        >
            <nav aria-label="Sections" className="px-5 pt-3 sm:px-6">
                <ol>
                    {NAV.map((item, index) => {
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
                                <a
                                    href={`#${item.id}`}
                                    onClick={handleClick}
                                    aria-current={current ? 'true' : undefined}
                                    className="group -mx-2 grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-2 rounded-[14px] px-2 py-3.5 focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                                >
                                    <span
                                        className={cn(
                                            'text-[10px] font-medium tracking-[0.2em] tabular-nums transition-colors duration-[380ms] ease-glass',
                                            current
                                                ? 'text-champagne'
                                                : 'text-smoke',
                                        )}
                                    >
                                        N° {item.index}
                                    </span>
                                    <span
                                        className={cn(
                                            'font-display text-[clamp(1.5rem,7vw,1.875rem)] leading-none font-medium tracking-[-0.015em] whitespace-nowrap transition-colors duration-[380ms] ease-glass',
                                            current
                                                ? 'text-champagne'
                                                : 'text-bone group-hover:text-champagne',
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                    <Arabic className="text-[15px] whitespace-nowrap text-smoke transition-colors duration-[380ms] ease-glass group-hover:text-mist sm:text-base">
                                        {item.labelAr}
                                    </Arabic>
                                </a>
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
                        href={links.dashboard}
                        onClick={onNavigate}
                        className={cn(
                            cta({ variant: 'gold' }),
                            'w-full sm:hidden',
                        )}
                    >
                        Dashboard
                    </Link>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:hidden">
                        <Link
                            href={links.signIn}
                            onClick={onNavigate}
                            className={cta({ variant: 'glass' })}
                        >
                            Log in
                        </Link>
                        <Link
                            href={links.start}
                            onClick={onNavigate}
                            className={cta({ variant: 'gold' })}
                        >
                            Get started
                        </Link>
                    </div>
                )}

                <p className="mt-5 flex items-center justify-between gap-4 text-sm text-smoke sm:mt-0">
                    <span>Prefer a walkthrough?</span>
                    <a
                        href="#demo"
                        onClick={handleClick}
                        className="group inline-flex items-center gap-1.5 rounded-[10px] text-bone transition-colors duration-[380ms] ease-glass hover:text-champagne focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                    >
                        Book a demo
                        <ArrowRight
                            aria-hidden
                            className="size-3.5 transition-transform duration-[380ms] ease-glass group-hover:translate-x-0.5"
                        />
                    </a>
                </p>
            </div>
        </div>
    );
}
