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

/** Auth-aware destinations for the navbar (log in, or the dashboard). */
export function useLandingLinks() {
    return useContext(LandingLinksContext);
}
