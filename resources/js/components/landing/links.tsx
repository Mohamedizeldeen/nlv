import type { InertiaLinkProps } from '@inertiajs/react';
import { createContext, useContext } from 'react';

type Href = NonNullable<InertiaLinkProps['href']>;

export type LandingLinks = {
    signedIn: boolean;
    signIn: Href;
    dashboard: Href;
    /** Absent when registration is disabled. */
    signUp?: Href;
};

export const LandingLinksContext = createContext<LandingLinks>({
    signedIn: false,
    signIn: '/login',
    dashboard: '/dashboard',
    signUp: '/register',
});

/** Auth-aware destinations; `start` is where "Start free trial" goes. */
export function useLandingLinks() {
    const links = useContext(LandingLinksContext);

    return {
        ...links,
        start: links.signedIn
            ? links.dashboard
            : (links.signUp ?? links.signIn),
    };
}
