import { router } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { DEFAULT_LOCALE, isLocale, translate } from '@/i18n';
import type { Locale } from '@/i18n';

/*
 * The page's language, for the toast region's landmark name. The toaster
 * sits outside the page component (app.tsx), so it cannot read the page's
 * props: it follows the `locale` prop of each visit, and the first page's
 * comes from <html lang>.
 *
 * The server renders it in English (it has no document to read), and
 * hydration keeps that render; the client value then replaces it. A
 * useState initialised from <html lang> would hydrate "Notifications" on
 * the Arabic page and keep it, since sonner's region suppresses hydration
 * warnings and the state never changes afterwards.
 */
let visitedLocale: Locale | null = null;

function subscribeToVisits(onChange: () => void): () => void {
    return router.on('navigate', (event) => {
        const next = event.detail.page.props.locale;
        visitedLocale = isLocale(next) ? next : DEFAULT_LOCALE;
        onChange();
    });
}

function clientLocale(): Locale {
    if (visitedLocale) {
        return visitedLocale;
    }

    const lang = document.documentElement.lang;

    return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

const serverLocale = (): Locale => DEFAULT_LOCALE;

function usePageLocale(): Locale {
    return useSyncExternalStore(subscribeToVisits, clientLocale, serverLocale);
}

function Toaster({ ...props }: ToasterProps) {
    const locale = usePageLocale();

    useFlashToast();

    return (
        <Sonner
            theme="dark"
            className="toaster group"
            position="bottom-right"
            containerAriaLabel={translate(locale, 'common.notifications')}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
