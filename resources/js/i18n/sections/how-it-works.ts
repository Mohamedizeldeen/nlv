import { defineMessages } from '../define';

/**
 * Static strings of How it works (sections/how-it-works.tsx): `t('how-it-works.<key>')`.
 * Admin-managed copy (kicker, title, lede) comes from the landing payload
 * instead. The mirror and phone mockups show the product's own UI, so on the
 * Arabic page they show its Arabic UI.
 *
 * Placeholder content: replace before launch. The demo look, store, prices
 * and figures are illustrative; the Arabic nouns agree with the demo counts
 * (17 نقطة، 412 قطعة، 3 ألوان).
 */
export default defineMessages({
    en: {
        // The demo look. The store's wordmark on the mirror stays Latin
        // artwork; `store` is its name in running text.
        look: 'Look 26',
        garment: 'Abaya',
        colour: 'Lilac',
        price: 'SAR 1,450',
        render: '1.8 s',
        distance: '2.0 m',
        store: 'Maison Rimal',
        city: 'Jeddah',
        sizeRange: '50 to 60',

        // On the mirror's screen and the shopper's phone.
        poseDetected: 'Pose detected',
        landmarks: '{count} landmarks',
        pieces: '{count} pieces',
        tabAll: 'All',
        tabAbayas: 'Abayas',
        tabDresses: 'Dresses',
        tabKnits: 'Knits',
        tabBags: 'Bags',
        pieceWithSize: '{garment} · {colour} · {size}',
        piece: '{garment} · {colour}',
        pieceOptions: '{count} colours · sizes {range}',
        tryItOn: 'Try it on',
        draping: 'Draping · {size}',
        renderedIn: 'Rendered in',
        fitConfidence: '{confidence}% fit confidence',
        takeHome: 'Take this look home',
        scanHint: 'Scan with your phone camera. No app.',
        savedLook: 'Saved look',
        savedSize: 'Size {size} · {store}',
        share: 'Share with family',

        // The four steps: title, text, the figure beside the number, and
        // the spoken description of the mockup.
        step1Title: 'Step up to the mirror',
        step1Body:
            'Its camera reads her posture and proportions from about two metres away. Nothing to hold, nothing to take off.',
        step1Meta: 'About {distance} away',
        step1Device:
            "The mirror's screen showing its camera view of the shopper standing about {distance} away, pose detected with {count} landmarks.",
        step2Title: 'Pick a piece',
        step2Body:
            'The whole catalogue is on the touchscreen, including the sizes and colours that aren’t on the rail today.',
        step2Device:
            "The mirror's touchscreen showing a grid of pieces from {store}, with the lilac abaya selected in size {size}.",
        step3Title: 'See it on you',
        step3Body:
            'The piece appears on her in about 1.8 seconds, with the size to ask for and how sure we are of it.',
        step3Meta: '{render} per render',
        step3Device:
            'The mirror showing the shopper wearing the lilac abaya, rendered in {render}, with size {size} recommended at {confidence}% fit confidence.',
        step4Title: 'Take the look home',
        step4Body:
            'A QR code on the mirror saves the look to her phone, with no app to install. She can share it with family, or come back for it.',
        step4Meta: 'QR code, no app',
        step4Device:
            "The mirror showing a QR code, and the shopper's phone with her saved look open: the lilac abaya in size {size}.",

        // The walkthrough's controls.
        play: 'Play the walkthrough',
        pause: 'Pause the walkthrough',
        stepCurrent: 'Step {number}',
        stepTotal: 'of {total}',
        selectAny: 'Select any step',
        playing: 'Playing on its own',
        paused: 'Paused',
        stepButton: 'Step {number} of {total}: {title}',
        stepPick: 'Step {number}: {title}',
        chooseStep: 'Choose a step',

        // The note under the steps.
        shownLabel: 'Shown',
        /** The look's colour inside the note, as an adjective. */
        shownColour: 'lilac',
        shown: '{look}: {colour} abaya with a blush panel, size {size}. Tried on at {store} in {city}, then saved to her phone.',
    },
    ar: {
        look: 'إطلالة 26',
        garment: 'عباية',
        colour: 'ليلكي',
        price: '1,450 SAR',
        render: '1.8 ثانية',
        distance: '2.0 م',
        store: 'ميزون رمال',
        city: 'جدة',
        sizeRange: '50 إلى 60',

        poseDetected: 'رُصدت الوضعية',
        landmarks: '{count} نقطة',
        pieces: '{count} قطعة',
        tabAll: 'الكل',
        tabAbayas: 'عبايات',
        tabDresses: 'فساتين',
        tabKnits: 'تريكو',
        tabBags: 'حقائب',
        pieceWithSize: '{garment} · {colour} · {size}',
        piece: '{garment} · {colour}',
        pieceOptions: '{count} ألوان · المقاسات من {range}',
        tryItOn: 'جرّبها',
        draping: 'جارٍ القياس · {size}',
        renderedIn: 'جاهزة خلال',
        fitConfidence: 'يناسبك بنسبة {confidence}%',
        takeHome: 'خذ هذه الإطلالة معك',
        scanHint: 'امسح الرمز بكاميرا هاتفك. بلا تطبيق.',
        savedLook: 'إطلالة محفوظة',
        savedSize: 'المقاس {size} · {store}',
        share: 'شاركها مع العائلة',

        step1Title: 'قف أمام المرآة',
        step1Body:
            'تقرأ كاميرا المرآة وقفتها ونِسب جسمها من مسافة مترين تقريبًا. لا شيء تحمله، ولا شيء تخلعه.',
        step1Meta: 'على بُعد {distance} تقريبًا',
        step1Device:
            'شاشة المرآة تعرض ما تلتقطه كاميرتها: المتسوّقة واقفة على بُعد {distance} تقريبًا، وقد رُصدت وضعيتها في {count} نقطة.',
        step2Title: 'اختر قطعة',
        step2Body:
            'الكتالوج كله على شاشة اللمس، بما فيه المقاسات والألوان غير المعروضة على الرف اليوم.',
        step2Device:
            'شاشة اللمس في المرآة تعرض شبكة من قطع {store}، وقد اختيرت العباية الليلكية بمقاس {size}.',
        step3Title: 'شاهدها عليك',
        step3Body:
            'تظهر القطعة عليها في نحو 1.8 ثانية، ومعها المقاس الذي تطلبه ومدى ثقتنا به.',
        step3Meta: '{render} لكل تجربة',
        step3Device:
            'المرآة تعرض المتسوّقة بالعباية الليلكية، وقد ظهرت خلال {render}، مع ترشيح المقاس {size} بنسبة ملاءمة {confidence}%.',
        step4Title: 'خذ الإطلالة معك',
        step4Body:
            'رمز QR على المرآة يحفظ الإطلالة في هاتفها دون تثبيت أي تطبيق. ويمكنها مشاركتها مع العائلة، أو العودة إليها لاحقًا.',
        step4Meta: 'رمز QR، بلا تطبيق',
        step4Device:
            'المرآة تعرض رمز QR، وهاتف المتسوّقة مفتوح على إطلالتها المحفوظة: العباية الليلكية بمقاس {size}.',

        play: 'شغّل العرض',
        pause: 'أوقف العرض مؤقتًا',
        stepCurrent: 'الخطوة {number}',
        stepTotal: 'من {total}',
        selectAny: 'اختر أي خطوة',
        playing: 'يتقدّم تلقائيًا',
        paused: 'متوقف مؤقتًا',
        stepButton: 'الخطوة {number} من {total}: {title}',
        stepPick: 'الخطوة {number}: {title}',
        chooseStep: 'اختر خطوة',

        shownLabel: 'في الصورة',
        shownColour: 'ليلكية',
        shown: '{look}: عباية {colour} مطعّمة بالوردي، مقاس {size}. جُرّبت في {store} بمدينة {city}، ثم حُفظت في هاتف المتسوّقة.',
    },
});
