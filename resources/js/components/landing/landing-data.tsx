import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { LandingData } from '@/types/landing';

/**
 * The `landing` prop (App\Support\LandingContent) for every section below
 * it: copy, stats, stories, lookbook, pricing and footer pages. welcome.tsx,
 * page.tsx and the section preview harness each provide it once.
 */
export const LandingDataContext = createContext<LandingData | null>(null);

export function LandingDataProvider({
    value,
    children,
}: {
    value: LandingData;
    children: ReactNode;
}) {
    return <LandingDataContext value={value}>{children}</LandingDataContext>;
}

/** The whole landing payload. Throws when no provider is mounted. */
export function useLanding(): LandingData {
    const landing = useContext(LandingDataContext);

    if (!landing) {
        throw new Error(
            'useLanding() needs a <LandingDataProvider> above it: wrap the page (welcome.tsx, page.tsx) or the preview harness in one, with the `landing` prop as its value.',
        );
    }

    return landing;
}

/**
 * Sections built from admin records render nothing until one is published,
 * and links to them (navbar, phone menu, footer) hide with them.
 */
const RECORD_SECTIONS: Record<string, (landing: LandingData) => boolean> = {
    lookbook: (landing) => landing.lookbook.looks.length > 0,
    stories: (landing) => landing.stories.length > 0,
    pricing: (landing) => landing.pricing.plans.length > 0,
};

/** Whether the section with this id renders on the landing page. */
export function hasSection(landing: LandingData, id: string): boolean {
    return RECORD_SECTIONS[id]?.(landing) ?? true;
}

const warned = new Set<string>();

/**
 * One copy setting by its dot key ("hero.title", "contact.email"), see
 * config/landing.php. Unknown keys return '' (and warn once in dev); keys
 * the admin left empty, like an unset social link, also return ''.
 */
export function useContent(key: string): string {
    const { content } = useLanding();

    if (Object.hasOwn(content, key)) {
        return content[key];
    }

    if (import.meta.env.DEV && !warned.has(key)) {
        warned.add(key);
        console.warn(
            `[landing] Unknown content key "${key}": add it to config/landing.php (settings) or fix the typo.`,
        );
    }

    return '';
}
