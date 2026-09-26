import { defineMessages } from '../define';

/**
 * Static strings of the kiosk section (sections/kiosk.tsx): `t('kiosk.<key>')`.
 * Admin-managed copy (kicker, title, lede, install line) comes from the
 * landing payload instead. The kiosk's screen shows the product's own UI, so
 * on the Arabic page it shows its Arabic UI. Product codes stay Latin
 * (55″ 4K, K55, EN · AR).
 *
 * Placeholder content: replace before launch. The installation ("Casa Lino,
 * Milan"), the look on screen and the hardware figures are illustrative.
 */
export default defineMessages({
    en: {
        // The installation, on the stage's badge.
        store: 'Casa Lino',
        city: 'Milan',
        unit: 'Kiosk 02',
        storeCity: '{store}, {city}',
        unitAfter: '· {unit}',
        stage: 'A {brand} kiosk standing in the store, its screen showing a shopper in a blush wool coat.',
        interiorAlt:
            'A bright, open fashion store with pastel long dresses on stands across a beige tiled floor',

        // The look on the kiosk's screen.
        look: 'Wool coat, blush',
        fit: 'Fit',
        sizeFit: '{size} · {fit}%',
        size: 'Size {size}',
        railCoat: 'Wool coat · Blush',
        railTulle: 'Tulle dress · Cream',
        railKnit: 'Rib knit · Oat',
        railAbaya: 'Abaya · Lilac',
        scanTitle: 'Scan to take this look home',
        scanNote: 'Saved to your phone. No app.',
        onScreen: 'On screen',
        onScreenNote: '{look}, size {size}. {fit}% fit, rendered in 1.8 s.',

        // Hotspots: title, the short label beside the dot, and the text.
        hotspot: '{number}. {title}',
        cameraTitle: 'Depth camera',
        cameraShort: 'Depth camera',
        cameraBody:
            'Reads posture and proportions from two metres away. Nothing is stored after the session.',
        screenTitle: '{code} portrait touch',
        screenShort: '4K touch',
        screenBody: 'Anti-glare glass, bright enough for a sunlit mall atrium.',
        qrTitle: 'Take it home',
        qrShort: 'Take it home',
        qrBody: 'Scan to save the look to your phone and share it with family. Nothing to install.',
        cloudTitle: 'Run from our cloud app',
        cloudShort: 'Cloud app',
        cloudBody:
            'Add pieces, sizes and prices once; every device in every branch shows them.',

        // The spec strip.
        model: 'Kiosk K55',
        specScreen: 'portrait touchscreen',
        specRender: 'per render',
        specLanguages: 'bilingual interface',
        specFootprint: 'footprint, or wall‑mounted',
        seconds: 's',
        metres: 'm',
    },
    ar: {
        store: 'كازا لينو',
        city: 'ميلانو',
        unit: 'الجهاز 02',
        storeCity: '{store}، {city}',
        unitAfter: '· {unit}',
        stage: 'جهاز {brand} قائم في المتجر، تعرض شاشته متسوّقة ترتدي معطفًا صوفيًا ورديًا.',
        interiorAlt:
            'متجر أزياء فسيح ومضيء، وفساتين طويلة بألوان الباستيل على حوامل فوق أرضية من البلاط البيج',

        look: 'معطف صوف وردي',
        fit: 'الملاءمة',
        sizeFit: '{size} · {fit}%',
        size: 'المقاس {size}',
        railCoat: 'معطف صوف · وردي',
        railTulle: 'فستان تول · كريمي',
        railKnit: 'تريكو مضلّع · بيج فاتح',
        railAbaya: 'عباية · ليلكي',
        scanTitle: 'امسح الرمز لتأخذ الإطلالة معك',
        scanNote: 'تُحفظ في هاتفك. بلا تطبيق.',
        onScreen: 'على الشاشة',
        onScreenNote: '{look}، مقاس {size}. ملاءمة {fit}%، ظهرت خلال 1.8 ثانية.',

        hotspot: '{number}. {title}',
        cameraTitle: 'كاميرا العمق',
        cameraShort: 'كاميرا العمق',
        cameraBody:
            'تقرأ الوقفة ونِسب الجسم من مسافة مترين، ولا يُحفظ شيء بعد انتهاء الجلسة.',
        screenTitle: 'شاشة لمس عمودية {code}',
        screenShort: 'لمس 4K',
        screenBody: 'زجاج مضاد للوهج، وسطوع يكفي لبهو مركز تجاري تغمره الشمس.',
        qrTitle: 'خذها معك',
        qrShort: 'خذها معك',
        qrBody: 'امسح الرمز لتحفظ الإطلالة في هاتفك وتشاركها مع العائلة، دون تثبيت أي شيء.',
        cloudTitle: 'يُدار من تطبيقنا السحابي',
        cloudShort: 'التطبيق السحابي',
        cloudBody:
            'أضف القطع والمقاسات والأسعار مرة واحدة، فتظهر على كل جهاز في كل فرع.',

        model: 'الجهاز K55',
        specScreen: 'شاشة لمس عمودية',
        specRender: 'لكل تجربة',
        specLanguages: 'واجهة بلغتين',
        specFootprint: 'مساحته على الأرض، أو يُثبَّت على الجدار',
        seconds: 'ثانية',
        metres: 'م',
    },
});
