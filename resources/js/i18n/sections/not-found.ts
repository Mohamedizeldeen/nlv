import { defineMessages } from '../define';

/**
 * Static strings of the public "not found" page (pages/not-found.tsx):
 * `t('not-found.<key>')`. The navbar, the footer and the order button keep
 * their own copy; the section number ("N° 404") is `common.sectionIndex`.
 */
export default defineMessages({
    en: {
        // The browser tab, and the kicker beside "N° 404".
        title: 'Page not found',
        // The headline; the *starred* phrase is set in italic mint.
        heading: 'That page isn’t *on the rail.*',
        lede: 'The link may be mistyped, or the page may have moved. The rest of the site is where you left it.',
        home: 'Back to the home page',
        // The caption under the empty rail, before the address itself.
        requested: 'Requested',
    },
    ar: {
        title: 'الصفحة غير موجودة',
        heading: 'هذه الصفحة ليست *على الرف.*',
        lede: 'ربما في الرابط خطأ، أو نُقلت الصفحة إلى عنوان آخر. أما بقية الموقع فما زالت حيث تركتها.',
        home: 'العودة إلى الصفحة الرئيسية',
        requested: 'العنوان المطلوب',
    },
});
