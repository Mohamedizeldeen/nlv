import { defineMessages } from '../define';

/**
 * Static strings of the lookbook (sections/lookbook.tsx): `t('lookbook.<key>')`.
 * Admin-managed copy comes from the landing payload instead.
 * Counts are phrased so they need no plural forms (t() has none).
 */
export default defineMessages({
    en: {
        // The filter row.
        filterAll: 'All',
        filterLabel: 'Filter looks',
        showingAll: 'Showing all {count} looks',
        showingCategory: 'Showing {count} {category} looks',
        showMore: 'Show {count} more looks',

        // A look card: its chips, caption and the reveal button.
        before: 'Before',
        after: 'After',
        lookCity: 'Look {number} · {city}',
        seconds: '{seconds} s',
        renderedIn: 'Rendered in {seconds} seconds',
        compare: 'Before and after: look {number}, {title}, {city}',

        // The open frame at the end of a short edit.
        slotKicker: 'Look {number} · Your store',
    },
    ar: {
        filterAll: 'الكل',
        filterLabel: 'تصفية الإطلالات',
        showingAll: 'تُعرض كل الإطلالات، وعددها {count}',
        showingCategory: 'تُعرض إطلالات {category}، وعددها {count}',
        showMore: 'اعرض بقية الإطلالات ({count})',

        before: 'قبل',
        after: 'بعد',
        lookCity: 'إطلالة {number} · {city}',
        seconds: '{seconds} ث',
        renderedIn: 'ظهرت النتيجة خلال {seconds} ثانية',
        compare: 'قبل التجربة وبعدها: إطلالة {number}، {title}، {city}',

        slotKicker: 'إطلالة {number} · متجرك',
    },
});
