import { useSyncExternalStore } from 'react';

/*
 * The current time for "12 min ago" labels, safe with server rendering:
 * the server (and the hydrating client) see null, so time-dependent text is
 * only filled in after hydration and never mismatches. Ticks every minute.
 */

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
    const timer = window.setInterval(onChange, MINUTE / 4);

    return () => window.clearInterval(timer);
}

// A stable value per minute, so React sees no change between ticks.
const getMinute = () => Math.floor(Date.now() / MINUTE);
const getServerMinute = () => null;

/** Now (to the minute) in the browser; null during SSR and hydration. */
export function useNow(): Date | null {
    const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);

    return minute === null ? null : new Date(minute * MINUTE);
}
