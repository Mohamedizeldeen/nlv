import { defineMessages } from '../define';

/**
 * Static strings of the hero (sections/hero.tsx): `t('hero.<key>')`.
 * Admin-managed copy comes from the landing payload instead; these are the
 * lens artwork's readings, its live badge and the accessible names.
 */
export default defineMessages({
    en: {
        photoAlt:
            'Two women in tailored abayas, one taupe and one cream, standing under a white plaster arch hung with sheer curtains',

        // The lens.
        lensLabel: 'Try-on lens',
        lensView: '{brand} view',
        moveLens: 'Move the try-on lens',
        dragLens: 'Drag the lens',

        // Its readings (FitChips).
        size: 'Size',
        fit: '({fit}% fit)',
        drape: 'Drape',
        drapeValue: 'Relaxed',
        render: 'Render',
        seconds: '{seconds} s',

        // The body map inside the lens.
        width: '{cm} cm',
        length: 'Length {cm} cm',

        // The live badge over the lens.
        tryOnsToday: 'try-ons today',
        reach: 'across {stores} stores in {countries} countries',

        // The magazine caption in the margin.
        look: 'Look {number}',
        garment: 'Linen abaya, sand',
    },
    ar: {
        photoAlt:
            'امرأتان بعبايتين مفصّلتين، إحداهما بلون رمادي بنّي والأخرى بلون كريمي، تقفان تحت قوس من الجص الأبيض تتدلّى منه ستائر شفافة',

        lensLabel: 'عدسة التجربة',
        lensView: 'بعين {brand}',
        moveLens: 'حرّك عدسة التجربة',
        dragLens: 'اسحب العدسة',

        size: 'المقاس',
        fit: '(ملاءمة {fit}%)',
        drape: 'الانسدال',
        drapeValue: 'انسيابي',
        render: 'المعالجة',
        seconds: '{seconds} ث',

        width: '{cm} سم',
        length: 'الطول {cm} سم',

        tryOnsToday: 'تجربة اليوم',
        // Figures with unit labels, as in a stat line: no noun has to agree
        // with a number the admin may change.
        reach: 'المتاجر {stores} · الدول {countries}',

        look: 'إطلالة {number}',
        garment: 'عباية كتّان رملية',
    },
});
