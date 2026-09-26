import { defineMessages } from '../define';

/**
 * Static strings of pricing and the FAQ (sections/pricing.tsx): `t('pricing.<key>')`.
 * Admin-managed copy comes from the landing payload instead.
 *
 * Money: the currency code stays Latin (USD, SAR…). In English it leads
 * ("USD 3,900"); in Arabic it follows the number ("3,900 USD"), as in the
 * glossary's "79 USD شهريًا".
 */
export default defineMessages({
    en: {
        // Screen-reader line announced when the visitor picks a currency.
        pricesIn: 'Prices in {currency}.',
        // A price as screen readers hear it (the figures on screen are visual only).
        money: '{currency} {amount}',
        price: '{currency} {amount}, {per}',
        // A plan without a price ("Let's talk"), followed by its caption.
        customPrice: ', {per}',
    },
    ar: {
        pricesIn: 'العملة المعروضة: {currency}.',
        money: '{amount} {currency}',
        price: '{amount} {currency}، {per}',
        customPrice: '، {per}',
    },
});
