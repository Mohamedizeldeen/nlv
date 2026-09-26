import { defineMessages } from '../define';

/**
 * Strings shared by several sections: `t('common.<key>')`. The page chrome
 * (navbar, phone menu, footer, content pages) and the section header.
 */
export default defineMessages({
    en: {
        // The language switch names the OTHER language in its own script:
        // the one place where the other script appears on a page.
        otherLanguage: 'العربية',
        switchLanguage: 'Switch to Arabic',

        // The section number the headers, navbar and phone menu print.
        sectionIndex: 'N° {index}',

        // Links to the numbered sections (navbar, phone menu, footer).
        sectionHowItWorks: 'How it works',
        sectionKiosk: 'Kiosk',
        sectionLookbook: 'Lookbook',
        sectionPricing: 'Pricing',

        // The account links (the auth pages themselves are English only).
        logIn: 'Log in',
        dashboard: 'Dashboard',

        // The wordmark link's accessible name.
        brandHome: '{brand}, home',
        brandTop: '{brand}, back to top',

        // Groups of content pages (footer columns, a page's kicker).
        groupCompany: 'Company',
        groupLegal: 'Legal',

        // The toast region's landmark name (components/ui/sonner.tsx).
        notifications: 'Notifications',
    },
    ar: {
        otherLanguage: 'English',
        switchLanguage: 'التبديل إلى الإنجليزية',

        // Arabic has no "N°": the number stands alone.
        sectionIndex: '{index}',

        sectionHowItWorks: 'كيف يعمل',
        sectionKiosk: 'الجهاز',
        sectionLookbook: 'معرض الإطلالات',
        sectionPricing: 'الأسعار',

        logIn: 'تسجيل الدخول',
        dashboard: 'لوحة التحكم',

        brandHome: '{brand}، الصفحة الرئيسية',
        brandTop: '{brand}، العودة إلى أعلى الصفحة',

        groupCompany: 'الشركة',
        groupLegal: 'الشؤون القانونية',

        notifications: 'الإشعارات',
    },
});
