import type { InertiaLinkProps } from '@inertiajs/react';
import { createContext, useContext } from 'react';

type Href = NonNullable<InertiaLinkProps['href']>;

/*
 * There is no public sign-up: admins add every account from the admin
 * panel, so the navbar offers "Log in", or "Admin panel" once signed in.
 */
export type LandingLinks = {
    signedIn: boolean;
    signIn: Href;
    /** The admin panel's dashboard (/admin). */
    admin: Href;
};

export const LandingLinksContext = createContext<LandingLinks>({
    signedIn: false,
    signIn: '/login',
    admin: '/admin',
});

/** Auth-aware destinations for the navbar (log in, or the admin panel). */
export function useLandingLinks() {
    return useContext(LandingLinksContext);
}
