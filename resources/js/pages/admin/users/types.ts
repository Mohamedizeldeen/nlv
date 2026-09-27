/*
 * Props of the users pages (Admin\UserController).
 */
import type { Paginated, SortState } from '@/types/admin';

export type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    /**
     * Opens the admin panel. Every account added here is an admin; false
     * only for an account made before that (it can be given access).
     */
    isAdmin: boolean;
    /** Email address verified (the admin panel needs it). */
    verified: boolean;
    /** Two-factor authentication confirmed. */
    twoFactor: boolean;
    /** The latest `auth.login` in the activity log (ISO 8601). */
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    /** Leads assigned to this account (deleted leads not counted). */
    assignedLeads: number;
    /** ISO 8601 */
    createdAt: string;
    /** YYYY-MM-DD in the app's time zone. */
    createdOn: string;
    /** The signed-in admin's own account. */
    isYou: boolean;
};

export type UserFilters = {
    search: string | null;
    /** Kept for old links; the page no longer offers it. */
    role: 'admin' | 'member' | null;
    status: 'verified' | 'unverified' | null;
};

export type UsersIndexProps = {
    users: Paginated<AdminUserRow>;
    filters: UserFilters;
    /** null: the default order (admins first, then by name). */
    sort: SortState | null;
    adminCount: number;
    totalCount: number;
};

/** What the password fields need to know. */
export type PasswordPolicy = {
    /** Shortest password an admin can set (12). */
    min: number;
    /** The browser's `passwordrules` hint. */
    rules: string;
    /** How long an emailed link works, in minutes. */
    linkMinutes: number;
};

/** `password_method` on the create form. */
export type PasswordMethod = 'set' | 'link';

export type UsersCreateProps = {
    password: PasswordPolicy;
};

export type UsersEditProps = {
    user: AdminUserRow & {
        /** ISO 8601 */
        updatedAt: string | null;
    };
    adminCount: number;
    password: PasswordPolicy;
};
