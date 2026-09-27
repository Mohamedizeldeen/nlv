import type { SharedPageProps } from '@inertiajs/core';
import { createInertiaApp } from '@inertiajs/react';
import { BRAND } from '@/components/landing/brand';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AccountLayout, { AccountFrame } from '@/layouts/account-layout';
import AdminLayout from '@/layouts/admin-layout';
import AuthLayout from '@/layouts/auth-layout';

/*
 * The browser tab: "{page} - TryOn". A title that already names the brand
 * (the landing's own title, set in the admin under Site content → Search and
 * sharing) is used whole.
 */
function tabTitle(title: string): string {
    if (!title) {
        return BRAND.name;
    }

    return title.includes(BRAND.name) ? title : `${title} - ${BRAND.name}`;
}

void createInertiaApp({
    title: tabTitle,
    layout: (name, page) => {
        switch (true) {
            // The landing page and the public content pages (/pages/{slug})
            // bring their own landing-design chrome.
            case name === 'welcome' || name === 'page':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('admin/'):
                return AdminLayout;
            // The signed-in account's own pages (Account in the admin
            // sidebar): inside the admin panel, whose sidebar stays mounted
            // between them and the admin's pages. Accounts without admin
            // access get them in a plain frame, without the admin's menu.
            case name.startsWith('settings/'): {
                const auth = page.props.auth as
                    | SharedPageProps['auth']
                    | undefined;

                return auth?.user?.is_admin
                    ? [AdminLayout, AccountLayout]
                    : [AccountFrame, AccountLayout];
            }
            default:
                return null;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#7fe3b0',
    },
});
