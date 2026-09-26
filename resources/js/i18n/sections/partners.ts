import { defineMessages } from '../define';

/**
 * Static strings of the partners strip (sections/partners.tsx): `t('partners.<key>')`.
 * Admin-managed copy comes from the landing payload instead. The retailer
 * wordmarks are artwork and stay Latin; their cities are translated.
 */
export default defineMessages({
    en: {
        // Unit labels beside the admin's figures.
        stores: 'stores',
        countries: 'countries',
        tryOnsYear: 'try-ons this year',

        retailersLabel: 'Retailers using {brand}',
        retailer: '{name}, {city}',
        pause: 'Pause the retailer list',

        cityJeddah: 'Jeddah',
        cityLondon: 'London',
        cityDubai: 'Dubai',
        cityMilan: 'Milan',
        cityDoha: 'Doha',
        cityCopenhagen: 'Copenhagen',
        cityKuwait: 'Kuwait City',
        cityParis: 'Paris',
        cityRiyadh: 'Riyadh',
        cityIstanbul: 'Istanbul',
    },
    ar: {
        // Stat-box units: the singular noun under a large figure.
        stores: 'متجر',
        countries: 'دولة',
        tryOnsYear: 'تجربة هذا العام',

        retailersLabel: 'متاجر تستخدم {brand}',
        retailer: '{name}، {city}',
        pause: 'أوقف حركة قائمة المتاجر',

        cityJeddah: 'جدة',
        cityLondon: 'لندن',
        cityDubai: 'دبي',
        cityMilan: 'ميلانو',
        cityDoha: 'الدوحة',
        cityCopenhagen: 'كوبنهاغن',
        cityKuwait: 'مدينة الكويت',
        cityParis: 'باريس',
        cityRiyadh: 'الرياض',
        cityIstanbul: 'إسطنبول',
    },
});
