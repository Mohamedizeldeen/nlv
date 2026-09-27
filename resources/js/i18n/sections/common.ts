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

        // The account links (the auth pages and the admin panel they lead
        // to are English only).
        logIn: 'Log in',
        adminPanel: 'Admin panel',

        // The wordmark link's accessible name.
        brandHome: '{brand}, home',
        brandTop: '{brand}, back to top',

        // Groups of content pages (footer columns, a page's kicker).
        groupCompany: 'Company',
        groupLegal: 'Legal',

        // The toast region's landmark name (components/ui/sonner.tsx).
        notifications: 'Notifications',

        // Under the order form and in the pop-up's thank-you view, after
        // "Prefer email?": the numbers set in Site content (contact.phone,
        // contact.whatsapp), each a link. Only the numbers that are set.
        talkBoth: 'Prefer to talk? Call {phone} or WhatsApp {whatsapp}.',
        talkPhone: 'Prefer to talk? Call {phone}.',
        talkWhatsApp: 'Prefer to talk? We’re on WhatsApp at {whatsapp}.',
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
        adminPanel: 'لوحة التحكم',

        brandHome: '{brand}، الصفحة الرئيسية',
        brandTop: '{brand}، العودة إلى أعلى الصفحة',

        groupCompany: 'الشركة',
        groupLegal: 'الشؤون القانونية',

        notifications: 'الإشعارات',

        // The numbers are isolated left-to-right runs inside the sentence.
        talkBoth:
            'هل تفضّل الحديث إلينا؟ اتصل بنا على {phone}، أو راسلنا عبر واتساب على {whatsapp}.',
        talkPhone: 'هل تفضّل الحديث إلينا؟ اتصل بنا على {phone}.',
        talkWhatsApp: 'هل تفضّل الحديث إلينا؟ راسلنا عبر واتساب على {whatsapp}.',
    },
});
