import { defineMessages } from '../define';

/**
 * Static strings of the navbar and the phone menu (sections/navbar.tsx): `t('navbar.<key>')`.
 * Admin-managed copy comes from the landing payload instead; the section
 * links, "Log in" and the wordmark's name are in `common`.
 */
export default defineMessages({
    en: {
        skipToContent: 'Skip to content',
        primaryLabel: 'Primary',
        sectionsLabel: 'Sections',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
    },
    ar: {
        skipToContent: 'انتقل إلى المحتوى',
        primaryLabel: 'التنقّل الرئيسي',
        sectionsLabel: 'أقسام الصفحة',
        openMenu: 'افتح القائمة',
        closeMenu: 'أغلق القائمة',
    },
});
