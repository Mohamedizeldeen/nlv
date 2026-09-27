import { defineMessages } from '../define';

/**
 * Static strings of the footer (sections/footer.tsx): `t('footer.<key>')`.
 * Admin-managed copy comes from the landing payload instead; the section
 * links and the Company/Legal headings are in `common`.
 */
export default defineMessages({
    en: {
        navLabel: 'Footer',
        product: 'Product',
        contact: 'Contact',
        social: '{brand} on {network}',
        copyright: '© {year} {company}',

        // The contact lines under the company line (Site content → Contact
        // details); a line whose setting is empty is not shown.
        phone: 'Phone',
        whatsapp: 'WhatsApp',
        address: 'Office',
    },
    ar: {
        navLabel: 'روابط التذييل',
        product: 'المنتج',
        contact: 'تواصل معنا',
        social: '{brand} على {network}',
        // Set as an isolated left-to-right run (bidi-ltr), like a code.
        copyright: '© {year} {company}',

        phone: 'الهاتف',
        whatsapp: 'واتساب',
        address: 'العنوان',
    },
});
