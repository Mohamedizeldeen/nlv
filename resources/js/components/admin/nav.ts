import { usePage } from '@inertiajs/react';
import { dashboard } from '@/routes/admin';
import { edit as editProfile } from '@/routes/profile';

/*
 * The admin sidebar, in order. Every module lives under one path prefix;
 * the sidebar and <PageHeader> both find the current section by the
 * longest matching prefix, so nested pages (/admin/looks/12/edit) light up
 * their module without extra wiring.
 *
 * Module agents: these paths are the contract. If a module's routes end up
 * elsewhere, change `href` here (or swap in its Wayfinder route's `.url()`).
 */

export type AdminNavLink = {
    key: string;
    label: string;
    href: string;
    /** Extra path prefixes that belong to this entry. */
    match?: string[];
    /** Show the shared `admin.newLeads` count next to the label. */
    count?: 'newLeads';
};

export type AdminNavEntry = AdminNavLink & {
    /** Printed like the landing's section numbers: "N° 04". */
    index: string;
    /** Sub-pages; the entry itself then acts as a heading. */
    children?: AdminNavLink[];
};

export type AdminNavGroup = {
    label: string;
    entries: AdminNavEntry[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
    {
        label: 'Overview',
        entries: [
            {
                key: 'dashboard',
                label: 'Dashboard',
                href: dashboard.url(),
                index: '01',
            },
            {
                key: 'leads',
                label: 'Leads',
                href: '/admin/leads',
                index: '02',
                count: 'newLeads',
            },
        ],
    },
    {
        label: 'Landing page',
        entries: [
            {
                key: 'stories',
                label: 'Stories',
                href: '/admin/stories',
                index: '03',
            },
            {
                key: 'lookbook',
                label: 'Lookbook',
                href: '/admin/looks',
                index: '04',
                children: [
                    { key: 'looks', label: 'Looks', href: '/admin/looks' },
                    {
                        key: 'look-categories',
                        label: 'Categories',
                        href: '/admin/look-categories',
                    },
                ],
            },
            {
                key: 'pricing',
                label: 'Pricing',
                href: '/admin/plans',
                index: '05',
                children: [
                    {
                        key: 'plans',
                        label: 'Plans & prices',
                        href: '/admin/plans',
                    },
                    { key: 'faqs', label: 'FAQ', href: '/admin/faqs' },
                ],
            },
            {
                key: 'pages',
                label: 'Pages',
                href: '/admin/pages',
                index: '06',
            },
            {
                key: 'content',
                label: 'Site content',
                href: '/admin/content',
                index: '07',
            },
        ],
    },
    {
        label: 'Records',
        entries: [
            {
                key: 'activity',
                label: 'Activity log',
                href: '/admin/activity',
                index: '08',
            },
            {
                key: 'users',
                label: 'Users',
                href: '/admin/users',
                index: '09',
            },
        ],
    },
    {
        // The signed-in admin's own profile, password, two-factor and
        // passkeys (/settings/*, see layouts/account-layout.tsx).
        label: 'Settings',
        entries: [
            {
                key: 'account',
                label: 'Account',
                href: editProfile.url(),
                match: ['/settings'],
                index: '10',
            },
        ],
    },
];

function pathOf(url: string): string {
    const path = new URL(url, 'http://localhost').pathname;

    return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/** Does `path` fall under `href` (exactly, or as a sub-path)? */
function under(path: string, href: string): boolean {
    const base = pathOf(href);

    // The dashboard is the panel's root: only an exact match counts.
    if (base === pathOf(dashboard.url())) {
        return path === base;
    }

    return path === base || path.startsWith(`${base}/`);
}

function matchLength(path: string, link: AdminNavLink): number {
    return Math.max(
        0,
        ...[link.href, ...(link.match ?? [])].map((href) =>
            under(path, href) ? pathOf(href).length : 0,
        ),
    );
}

export type AdminSection = {
    entry: AdminNavEntry;
    /** The matched sub-page, when the entry has children. */
    child: AdminNavLink | null;
};

/** The sidebar entry (and sub-page) that owns `url`, if any. */
export function findAdminSection(url: string): AdminSection | null {
    const path = pathOf(url);
    let best: (AdminSection & { length: number }) | null = null;

    for (const group of ADMIN_NAV) {
        for (const entry of group.entries) {
            const links = entry.children ?? [entry];

            for (const link of links) {
                const length = matchLength(path, link);

                if (length > 0 && (!best || length > best.length)) {
                    best = {
                        entry,
                        child: entry.children ? link : null,
                        length,
                    };
                }
            }
        }
    }

    return best ? { entry: best.entry, child: best.child } : null;
}

/** The section of the page being shown. */
export function useAdminSection(): AdminSection | null {
    return findAdminSection(usePage().url);
}
