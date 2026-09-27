import { useEffect } from 'react';

/**
 * Gives <html> the admin's always-dark look (ink background, dark scheme,
 * mint toasts and progress bar, the shadcn tokens mapped to the admin's
 * palette) while a page outside the admin layout is shown: the sign-in
 * pages, and the account pages of someone without admin access.
 */
export function useBrandChrome(): void {
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
