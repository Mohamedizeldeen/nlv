import { router, usePage } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    AccountMenu,
    AdminBrand,
    AdminNavList,
    ViewSiteLink,
} from '@/components/admin/admin-nav';
import { portalSurface } from '@/components/admin/dialog';
import { Atmosphere } from '@/components/landing/primitives';
import { cn } from '@/lib/utils';

/*
 * The admin panel's frame: the landing page's ink, drifting jade/lagoon
 * light and grain behind a floating glass sidebar (a glass drawer below
 * `lg`). Always dark, whatever the app's appearance setting says.
 */

const MAIN_ID = 'admin-main';

/** Forces the landing's dark look on <html> while an admin page is shown. */
function useAdminChrome() {
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
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <>
            <div className="min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto overscroll-contain px-3 pt-5 pb-4">
                <AdminNavList onNavigate={onNavigate} />
            </div>
            <div className="border-t border-white/10 p-3">
                <ViewSiteLink />
                <div className="mt-1">
                    <AccountMenu />
                </div>
            </div>
        </>
    );
}

function MenuButton({ open }: { open: boolean }) {
    return (
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
    );
}

/** Phones and tablets: a floating glass bar and a glass drawer. */
function MobileBar() {
    const [open, setOpen] = useState(false);
    const { props } = usePage();
    const newLeads = props.admin?.newLeads ?? 0;

    // Close after any visit, and when the viewport grows into the sidebar layout.
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 64rem)');
        const onViewport = () => desktop.matches && setOpen(false);
        desktop.addEventListener('change', onViewport);
        const stop = router.on('navigate', () => setOpen(false));

        return () => {
            desktop.removeEventListener('change', onViewport);
            stop();
        };
    }, []);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <header className="fixed inset-x-3 top-3 z-40 lg:hidden">
                <div className="glass-rim relative flex h-14 items-center gap-3 rounded-[20px] pr-2 pl-4 glass-strong">
                    <AdminBrand />
                    <DialogPrimitive.Trigger
                        aria-label={
                            newLeads > 0
                                ? `Open menu, ${newLeads} new leads`
                                : 'Open menu'
                        }
                        className={cn(
                            'relative ml-auto grid size-10 shrink-0 cursor-pointer place-items-center rounded-[14px] bg-white/[0.06] text-bone ring-1 ring-white/[0.12] transition-colors duration-[380ms] ease-glass ring-inset hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none active:scale-[0.97]',
                        )}
                    >
                        <MenuButton open={open} />
                        {newLeads > 0 ? (
                            <span
                                aria-hidden
                                className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-[6px] bg-mint px-1 text-[10px] font-semibold text-ink tabular-nums"
                            >
                                {newLeads > 99 ? '99+' : newLeads}
                            </span>
                        ) : null}
                    </DialogPrimitive.Trigger>
                </div>
            </header>

            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        portalSurface,
                        'fixed inset-0 z-50 bg-[oklch(0.1_0.012_200/0.6)] backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden',
                    )}
                />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className={cn(
                        portalSurface,
                        'glass-rim fixed inset-y-3 left-3 z-50 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col rounded-[28px] glass-strong duration-[380ms] ease-glass focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-8 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-left-8 lg:hidden',
                    )}
                >
                    <DialogPrimitive.Title className="sr-only">
                        Admin menu
                    </DialogPrimitive.Title>
                    <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 pr-3 pl-4">
                        <AdminBrand onNavigate={() => setOpen(false)} />
                        <DialogPrimitive.Close
                            aria-label="Close menu"
                            className="grid size-10 cursor-pointer place-items-center rounded-[14px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                        >
                            <X aria-hidden className="size-4" />
                        </DialogPrimitive.Close>
                    </div>
                    <SidebarBody onNavigate={() => setOpen(false)} />
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    useAdminChrome();

    return (
        <div className="landing relative isolate min-h-svh overflow-x-clip bg-ink font-sans text-bone antialiased [color-scheme:dark]">
            <Atmosphere />

            <a
                href={`#${MAIN_ID}`}
                className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-[14px] bg-mint px-4 py-2.5 text-sm font-medium text-ink transition-transform duration-[380ms] ease-glass focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-bone/80 focus-visible:outline-none"
            >
                Skip to content
            </a>

            {/* Desktop: a floating glass column. */}
            <aside className="glass-rim fixed inset-y-3 left-3 z-30 hidden w-[16.5rem] flex-col rounded-[28px] glass-strong lg:flex">
                <div className="flex h-[4.25rem] shrink-0 items-center border-b border-white/10 px-5">
                    <AdminBrand />
                </div>
                <SidebarBody />
            </aside>

            <MobileBar />

            <main
                id={MAIN_ID}
                tabIndex={-1}
                className="relative min-w-0 px-4 pt-[5.5rem] pb-16 focus:outline-none sm:px-6 lg:pt-8 lg:pr-10 lg:pl-[calc(16.5rem+0.75rem+2.5rem)] xl:pr-12"
            >
                <div className="mx-auto w-full max-w-[1240px]">{children}</div>
            </main>
        </div>
    );
}
