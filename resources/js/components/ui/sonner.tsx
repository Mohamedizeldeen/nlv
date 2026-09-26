import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { isLocale, translate } from '@/i18n';
import type { Locale } from '@/i18n';

/**
 * The page's language, for the toast region's landmark name. The toaster
 * sits outside the page component (app.tsx), so it follows the `locale`
 * prop of each visit; the first page's comes from <html lang>.
 */
function usePageLocale(): Locale {
    const [locale, setLocale] = useState<Locale>(() =>
        typeof document !== 'undefined' && isLocale(document.documentElement.lang)
            ? document.documentElement.lang
            : 'en',
    );

    useEffect(
        () =>
            router.on('navigate', (event) => {
                const next = event.detail.page.props.locale;
                setLocale(isLocale(next) ? next : 'en');
            }),
        [],
    );

    return locale;
}

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();
    const locale = usePageLocale();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
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
