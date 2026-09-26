import { defineMessages } from '../define';

/**
 * Static strings of the content pages (pages/page.tsx): `t('page.<key>')`.
 * Admin-managed copy comes from the landing payload instead; the page's
 * title, summary and body come from the server.
 */
export default defineMessages({
    en: {
        onThisPage: 'On this page',
        questions: 'Questions about this page?',
    },
    ar: {
        onThisPage: 'في هذه الصفحة',
        questions: 'هل لديك سؤال عن هذه الصفحة؟',
    },
});
