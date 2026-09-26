/*
 * Props of the users page (Admin\UserController@index).
 */
import type { Paginated, SortState } from '@/types/admin';

export type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    isAdmin: boolean;
    /** Email address verified (the admin panel needs it). */
    verified: boolean;
    /** Two-factor authentication confirmed. */
    twoFactor: boolean;
    /** The latest `auth.login` in the activity log (ISO 8601). */
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    /** ISO 8601 */
    createdAt: string;
    /** YYYY-MM-DD in the app's time zone. */
    createdOn: string;
    /** The signed-in admin's own account. */
    isYou: boolean;
};

export type UserFilters = {
    search: string | null;
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
