import type { AdminUserRow } from '../types';

/** "Jane" from "Jane Doe". */
export function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
}

/**
 * Why an account can't be deleted from the panel, or null when it can
 * (the server refuses the same cases).
 */
export function deleteBlocker(
    user: Pick<AdminUserRow, 'isYou' | 'isAdmin'>,
    adminCount: number,
): string | null {
    if (user.isYou) {
        return 'You can’t delete your own account here. Do it from your account settings.';
    }

    if (user.isAdmin && adminCount <= 1) {
        return 'The only admin can’t be deleted: the panel would have nobody left to open it.';
    }

    return null;
}
