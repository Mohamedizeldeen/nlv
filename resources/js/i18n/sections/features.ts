import { defineMessages } from '../define';

/**
 * Static strings of the features section (sections/features.tsx): `t('features.<key>')`.
 * Admin-managed copy (kicker, title, lede) comes from the landing payload
 * instead. The device and cloud-app mockups show the product's own UI, so on
 * the Arabic page they show its Arabic UI; the store's wordmark and the
 * app's URL stay Latin artwork.
 *
 * Placeholder content: replace before launch. The store ("Maison Rimal" and
 * its branches), stock levels, try-on counts, prices and measurements are
 * illustrative only.
 */
export default defineMessages({
    en: {
        // Row 1: the endless rail. Titles mark their accent with *asterisks*.
        railLabel: 'The endless rail',
        railTitle: 'Gone from the rail. *Still on the mirror.*',
        railBody:
            'A missing size should not end a sale. The rail holds what fits on it; the device holds everything you carry, with what is waiting in the stockroom or at another branch. She tries on the 40 while someone brings it from the back.',
        railItem1Label: 'The whole catalogue, not just the rail',
        railItem1Detail:
            'Every piece, size and colour you stock, on the screen by the fitting rooms, in Arabic or English.',
        railItem2Label: 'Stockroom and branch stock, size by size',
        railItem2Detail:
            'She sees that the 40 is in the back, and which branch has the 42, before she has to ask.',
        railItem3Label: 'Bring it to the mirror',
        railItem3Detail:
            'One touch asks a stylist to fetch her size. The look stays on screen until it arrives.',
        railMetricCaption: 'more pieces tried per visit',
        railPhotoAlt:
            'Neutral blouses and knits on wooden hangers along a hanging branch rail',
        fig1: 'A dozen pieces on the rail. The whole collection on the mirror beside it.',

        // Row 1's device screen.
        onTheMirror: 'On the mirror',
        pieces: '{count} pieces',
        lookName: 'Linen blazer, blush',
        lookPrice: 'SAR 640',
        onYou: 'On you',
        onTheRail: 'on the rail',
        inTheStockroom: 'in the stockroom',
        atAnotherBranch: 'at another branch',
        stockLine: 'Size {size} · {where}',
        stockLeft: '{count} left. A stylist is on the way.',
        bringIt: 'Bring it to the mirror',
        railScreen:
            'The {brand} screen showing a shopper in a linen blazer, blush. Sizes {sizes}. Size {size} is selected, with a button to bring it to the mirror.',
        railScreenSize: '{size} {where}',

        // Row 2: run it from the cloud.
        cloudLabel: 'Run it from the cloud',
        cloudTitle: 'See what gets tried, *and what sells.*',
        cloudBody:
            'Our cloud app runs every device you own. Add a collection once and it is on every mirror before you open. Each week it shows which pieces get tried the most, and which of those go on to sell.',
        cloudItem1Label: 'One catalogue on every device',
        cloudItem1Detail:
            'New arrivals, prices and sizes reach every mirror at once. Nobody updates a screen by hand.',
        cloudItem2Label: 'What gets tried, and what sells',
        cloudItem2Detail:
            'Tries per piece, per size and per store, set against what sold. Reorder the right things.',
        cloudItem3Label: 'Every device at a glance',
        cloudItem3Detail:
            'Which mirrors are online and when each last updated. Our team watches the same screen.',
        cloudMetricCaption: 'conversion on pieces tried at the mirror',
        boutiqueAlt:
            'A couture salon under a crystal chandelier, with embroidered kaftans and brocade tunics on mannequins',
        fig2: 'The salon on Tahlia Street, Jeddah. One of three mirrors on one catalogue.',

        // Row 2's cloud app. `store` is the store's name in running text.
        store: 'Maison Rimal',
        mirror: 'Mirror {number}',
        tahliaStreet: 'Tahlia Street',
        redSeaMall: 'Red Sea Mall',
        olayaRiyadh: 'Olaya, Riyadh',
        online: 'Online',
        updating: 'Updating',
        autumnEdit: 'Autumn edit',
        mirrorAt: '{mirror} · {place}',
        editLiveSince: '{edit} live since {time}',
        tabCatalogue: 'Catalogue',
        tabDevices: 'Devices',
        tabInsights: 'Insights',
        thisWeek: 'This week',
        mostTried: 'Most tried this week',
        colPiece: 'Piece',
        colTried: 'Tried',
        colSold: 'Sold',
        colRate: 'Rate',
        devices: 'Devices',
        placeStatus: '{place} · {status}',
        editPieces: '{edit}, {count} pieces',
        onEveryMirror: 'On every mirror at {time}',
        pieceBlazer: 'Linen blazer, blush',
        pieceBag: 'Mini bag, burgundy',
        pieceShirt: 'Chambray shirt',
        pieceTrucker: 'Trucker, indigo',
        cloudScreen:
            '{brand} cloud app for {store}. Most tried this week: {pieces}. Devices: {devices}.',
        cloudScreenPiece: '{name}, {tried} tries, {sold} sold',
        cloudScreenDevice: '{mirror} at {place}, {status}',

        // Row 3: eyewear.
        eyewearLabel: 'Eyewear · In store',
        eyewearTitle: 'Frames, measured to *the millimetre.*',
        eyewearBody:
            'At the mirror, TryOn finds the pupils, the bridge and the width of the face, then shows only the frames that will sit right. Your optician gets numbers they can work with.',
        eyewearItem1Label: 'Face-width matching',
        eyewearItem1Detail:
            'Frames too wide or too narrow for her face drop out of the results.',
        eyewearItem2Label: 'Virtual lenses and tints',
        eyewearItem2Detail:
            'Clear, gradient, polarised or photochromic, previewed on the chosen frame.',
        eyewearItem3Label: 'Prescription-ready handoff',
        eyewearItem3Detail:
            'PD and fit notes travel with the order, not on a sticky note.',
        pdCaption: 'pupillary distance, measured at the mirror',
        eyewearAlt:
            'A smiling woman framing her face with her hands, wearing oversized emerald-green square frames',
        fig3: 'Square acetate, emerald. Measured at the mirror in 0.9 s.',

        // Row 3's measured plate.
        millimetres: 'mm',
        frameWidth: 'Frame width',
        bridge: 'Bridge',
        measure: '{value} mm',
        highlight: 'Highlight {label}, {value}',
        highlightPd: 'Highlight pupillary distance, {value} mm',

        // Shared.
        fig: 'Fig. {number}',
        /** Between the parts of a spoken list. */
        listComma: ', ',
        listSemicolon: '; ',
    },
    ar: {
        railLabel: 'رفّ لا ينتهي',
        railTitle: 'غاب عن الرف. *وبقي على المرآة.*',
        railBody:
            'غياب مقاس عن الرف لا ينبغي أن يُفقدك البيع. يحمل الرف ما يتّسع له، ويحمل الجهاز كل ما في متجرك، ومعه ما ينتظر في المخزن أو في فرع آخر. تجرّب المتسوّقة المقاس 40 بينما يُحضره أحدهم من المخزن.',
        railItem1Label: 'الكتالوج كاملًا، لا الرف وحده',
        railItem1Detail:
            'كل قطعة ومقاس ولون في مخزونك، على الشاشة بجوار غرف القياس، بالعربية أو الإنجليزية.',
        railItem2Label: 'مخزون المتجر والفروع، مقاسًا بمقاس',
        railItem2Detail:
            'ترى أن المقاس 40 في المخزن، وأي فرع يتوفر فيه المقاس 42، قبل أن تضطر إلى السؤال.',
        railItem3Label: 'اطلبه إلى المرآة',
        railItem3Detail:
            'لمسة واحدة تطلب من أحد المنسّقين إحضار مقاسها، وتبقى الإطلالة على الشاشة حتى يصل.',
        railMetricCaption: 'قطع أكثر تُجرَّب في كل زيارة',
        railPhotoAlt:
            'بلوزات وقطع تريكو بألوان هادئة على علّاقات خشبية، معلّقة على رفّ من غصن شجرة',
        fig1: 'اثنتا عشرة قطعة على الرف، والمجموعة كاملة على المرآة بجواره.',

        onTheMirror: 'على المرآة',
        pieces: '{count} قطعة',
        lookName: 'بليزر كتّان وردي',
        lookPrice: '640 SAR',
        onYou: 'عليك',
        onTheRail: 'على الرف',
        inTheStockroom: 'في المخزن',
        atAnotherBranch: 'في فرع آخر',
        stockLine: 'المقاس {size} · {where}',
        stockLeft: 'المتبقي: {count}. أحد المنسّقين في طريقه إليك.',
        bringIt: 'اطلبه إلى المرآة',
        railScreen:
            'شاشة {brand} تعرض متسوّقة ترتدي بليزر كتّان ورديًا. المقاسات: {sizes}. المقاس {size} محدَّد، ومعه زر لطلبه إلى المرآة.',
        railScreenSize: '{size} {where}',

        cloudLabel: 'أدِره من السحابة',
        cloudTitle: 'اعرف ما يُجرَّب، *وما يُباع.*',
        cloudBody:
            'يدير تطبيقنا السحابي كل أجهزتك. أضف المجموعة مرة واحدة، فتصل إلى كل مرآة قبل أن تفتح أبوابك. وكل أسبوع يُريك القطع الأكثر تجربة، وأيّها انتهى إلى البيع.',
        cloudItem1Label: 'كتالوج واحد على كل الأجهزة',
        cloudItem1Detail:
            'تصل القطع الجديدة والأسعار والمقاسات إلى كل مرآة في اللحظة نفسها. لا أحد يحدّث شاشة بيده.',
        cloudItem2Label: 'ما يُجرَّب، وما يُباع',
        cloudItem2Detail:
            'عدد التجارب لكل قطعة ولكل مقاس ولكل متجر، مقارنةً بما بِيع فعلًا، لتعيد طلب ما يستحق.',
        cloudItem3Label: 'كل الأجهزة في لمحة',
        cloudItem3Detail:
            'أي المرايا متصلة، ومتى حُدّثت كلٌّ منها آخر مرة. وفريقنا يتابع الشاشة نفسها.',
        cloudMetricCaption: 'في نسبة الشراء بعد التجربة أمام المرآة',
        boutiqueAlt:
            'صالون أزياء راقية تحت ثريا كريستالية، وقفاطين مطرّزة وسترات من البروكار على عارضات الأزياء',
        fig2: 'الصالون في شارع التحلية، جدة. واحدة من ثلاث مرايا على كتالوج واحد.',

        store: 'ميزون رمال',
        mirror: 'المرآة {number}',
        tahliaStreet: 'شارع التحلية',
        redSeaMall: 'رد سي مول',
        olayaRiyadh: 'العليا، الرياض',
        online: 'متصلة',
        updating: 'جارٍ التحديث',
        autumnEdit: 'مختارات الخريف',
        mirrorAt: '{mirror} · {place}',
        editLiveSince: '{edit} معروضة منذ {time}',
        tabCatalogue: 'الكتالوج',
        tabDevices: 'الأجهزة',
        tabInsights: 'التحليلات',
        thisWeek: 'هذا الأسبوع',
        mostTried: 'الأكثر تجربة هذا الأسبوع',
        colPiece: 'القطعة',
        colTried: 'التجارب',
        colSold: 'المبيعات',
        colRate: 'النسبة',
        devices: 'الأجهزة',
        placeStatus: '{place} · {status}',
        editPieces: '{edit}، {count} قطعة',
        onEveryMirror: 'على كل مرآة الساعة {time}',
        pieceBlazer: 'بليزر كتّان وردي',
        pieceBag: 'حقيبة صغيرة عنّابية',
        pieceShirt: 'قميص شامبري',
        pieceTrucker: 'سترة جينز نيلية',
        cloudScreen:
            'التطبيق السحابي من {brand} لمتجر {store}. الأكثر تجربة هذا الأسبوع: {pieces}. الأجهزة: {devices}.',
        cloudScreenPiece: '{name}: التجارب {tried}، المبيعات {sold}',
        cloudScreenDevice: '{mirror} في {place}، {status}',

        eyewearLabel: 'النظارات · داخل المتجر',
        eyewearTitle: 'إطارات مقيسة *بدقة المليمتر.*',
        eyewearBody:
            'TryOn يحدّد أمام المرآة الحدقتين وجسر الأنف وعرض الوجه، ثم لا يعرض إلا الإطارات التي تستقر على الوجه كما ينبغي. ويحصل اختصاصي البصريات لديك على أرقام يعمل بها.',
        eyewearItem1Label: 'مطابقة عرض الوجه',
        eyewearItem1Detail: 'تختفي من النتائج الإطارات الأعرض أو الأضيق من وجهها.',
        eyewearItem2Label: 'عدسات وألوان افتراضية',
        eyewearItem2Detail:
            'شفافة أو متدرّجة أو مستقطبة أو متغيّرة مع الضوء، تُعايَن على الإطار المختار.',
        eyewearItem3Label: 'بيانات جاهزة للوصفة الطبية',
        eyewearItem3Detail:
            'تنتقل مسافة الحدقتين وملاحظات المقاس مع الطلب، لا على ورقة لاصقة.',
        pdCaption: 'المسافة بين الحدقتين، مقيسة أمام المرآة',
        eyewearAlt:
            'امرأة مبتسمة تحيط وجهها بيديها، وترتدي نظارة بإطار مربّع كبير بلون أخضر زمرّدي',
        fig3: 'إطار أسيتات مربّع بلون زمرّدي. قِيس أمام المرآة في 0.9 ثانية.',

        millimetres: 'مم',
        frameWidth: 'عرض الإطار',
        bridge: 'الجسر',
        measure: '{value} مم',
        highlight: 'إبراز {label}، {value}',
        highlightPd: 'إبراز المسافة بين الحدقتين، {value} مم',

        fig: 'الشكل {number}',
        listComma: '، ',
        listSemicolon: '؛ ',
    },
});
