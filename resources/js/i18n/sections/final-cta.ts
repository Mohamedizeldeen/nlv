import { defineMessages } from '../define';

/**
 * Static strings of the order section (sections/final-cta.tsx): `t('final-cta.<key>')`.
 * Admin-managed copy comes from the landing payload instead.
 */
export default defineMessages({
    en: {
        // The email field (its label is for screen readers; the placeholder shows).
        emailLabel: 'Work email',
        emailPlaceholder: 'you@yourstore.com',
        emailInvalid: 'That address looks incomplete. Try name@yourstore.com.',

        // Placeholder content: replace before launch. The three fanned
        // lookbook cards (IMAGES.finalCta.looks order) and the swatch behind them.
        lookCaption: 'Look {number}',
        look14City: 'Doha',
        look14Piece: 'Ivory hijab, pearl drops',
        look14Alt:
            'A woman in a white hijab and blouse with large white earrings, lit against a dark backdrop',
        look22City: 'Paris',
        look22Piece: 'Silk carré, navy',
        look22Alt:
            'A woman in a navy patterned silk headscarf and black blazer, hand near her face',
        look31City: 'London',
        look31Piece: 'Round gold frames, 46 mm',
        look31Alt:
            'A man in thin round gold glasses and a pale yellow turtleneck',
        backdropCaption: 'Backdrop: silk charmeuse, deep teal',
    },
    ar: {
        emailLabel: 'بريد العمل الإلكتروني',
        emailPlaceholder: 'name@yourstore.com',
        emailInvalid:
            'يبدو أن العنوان ناقص. اكتبه كاملًا، مثل name@yourstore.com.',

        lookCaption: 'إطلالة {number}',
        look14City: 'الدوحة',
        look14Piece: 'حجاب عاجي وأقراط لؤلؤ',
        look14Alt:
            'امرأة ترتدي حجابًا أبيض وبلوزة بيضاء وأقراطًا بيضاء كبيرة، يسطع عليها الضوء أمام خلفية داكنة',
        look22City: 'باريس',
        look22Piece: 'وشاح حريري كحلي',
        look22Alt:
            'امرأة ترتدي وشاحًا حريريًا كحليًا منقوشًا وسترة سوداء، ويدها قرب وجهها',
        look31City: 'لندن',
        look31Piece: 'إطار ذهبي دائري، 46 مم',
        look31Alt:
            'رجل يرتدي نظارة ذهبية دائرية بإطار رفيع وكنزة صفراء فاتحة بياقة عالية',
        backdropCaption: 'الخلفية: حرير شارموز، فيروزي داكن',
    },
});
