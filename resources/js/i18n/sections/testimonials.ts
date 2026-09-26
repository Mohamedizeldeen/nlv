import { defineMessages } from '../define';

/**
 * Static strings of the stories (sections/testimonials.tsx): `t('testimonials.<key>')`.
 * Admin-managed copy comes from the landing payload instead.
 */
export default defineMessages({
    en: {
        // The big quotation mark over the featured quote.
        quoteMark: '“',
        // A store and its city, in a sentence and in the compact list.
        place: '{store}, {city}',
        placeShort: '{store} · {city}',

        // The carousel controls and the story list.
        previous: 'Previous story',
        next: 'Next story',
        listLabel: 'Retailer stories',
        position: 'Story {number} of {count}: {name}',
        tabLabel: '{name}, {store}, {city}: {label} {figure}',
    },
    ar: {
        // Arabic quotes open with «, which RTL shows mirrored, pointing out.
        quoteMark: '«',
        place: '{store}، {city}',
        placeShort: '{store} · {city}',

        previous: 'القصة السابقة',
        next: 'القصة التالية',
        listLabel: 'قصص المتاجر',
        position: 'القصة {number} من {count}: {name}',
        tabLabel: '{name}، {store}، {city}: {label} {figure}',
    },
});
