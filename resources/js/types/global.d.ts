import type { AdminSharedProps } from '@/types/admin';
import type { Auth } from '@/types/auth';
import type { Direction, Locale, LocaleAlternates } from '@/types/landing';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /** Admin-only data; null for everyone else. */
            admin?: AdminSharedProps | null;
            /** The page's language: 'ar' under /ar, else 'en' (admin, auth and dashboard are English). */
            locale: Locale;
            /** 'rtl' for Arabic, else 'ltr' (also set on <html dir> by the server). */
            dir: Direction;
            /** The same public page in each language; null on pages that are not translated. */
            alternates: LocaleAlternates | null;
            [key: string]: unknown;
        };
    }
}
