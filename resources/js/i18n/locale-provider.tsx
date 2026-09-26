import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { Alternates, Locale } from './locales';

export type LocaleOverride = {
    locale: Locale;
    alternates?: Alternates | null;
};

/**
 * Pages never need this: `useI18n()` reads the language from the shared
 * Inertia props. It is for renders outside an Inertia page, like the
 * landing-preview harness (`?lang=ar`).
 */
export const LocaleOverrideContext = createContext<LocaleOverride | null>(null);

export function LocaleProvider({
    locale,
    alternates = null,
    children,
}: LocaleOverride & { children: ReactNode }) {
    return (
        <LocaleOverrideContext value={{ locale, alternates }}>
            {children}
        </LocaleOverrideContext>
    );
}
