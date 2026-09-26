import { defineMessages } from '../define';

/**
 * Static strings of the order pop-up (order-dialog.tsx): `t('order-dialog.<key>')`.
 * Admin-managed copy comes from the landing payload instead (title, lede,
 * consent, submit label, success title and body: `order.*`). The server's
 * validation messages arrive in the page's language (lang/ar.json).
 * Counts are phrased so they need no plural forms (t() has none).
 */
export default defineMessages({
    en: {
        // The kicker over the form and over the success view.
        kicker: 'Order request',
        kickerSent: 'Request sent',
        close: 'Close',

        // Part 01.
        partStore: 'You and your store',
        name: 'Full name',
        company: 'Company or store name',
        email: 'Work email',
        emailPlaceholder: 'you@yourstore.com',
        phone: 'Phone',
        phonePlaceholder: 'With country code',
        country: 'Country',
        city: 'City',

        // Part 02.
        partOrder: 'Your order',
        devices: 'Number of devices',
        devicesHint:
            '1 to 999. Planning a larger rollout? Say so in your message.',
        devicesFewer: 'One device fewer',
        devicesMore: 'One device more',
        plan: 'How would you like to own it?',
        unsure: 'Not sure yet',
        unsureBlurb: 'Our team will help you choose.',
        message: 'Message',
        messagePlaceholder:
            "How many stores, which pieces shoppers should try on first (abayas, eyewear, knitwear…), and when you'd like the device installed.",
        privacyLink: 'Read the {title} page',
        honeypot: 'Website',

        // Used only if the payload has no plans (it always has buy, lease, chain).
        buy: 'Buy',
        buyBlurb: 'Own the device outright.',
        lease: 'Lease',
        leaseBlurb: 'One monthly fee, all-in.',
        chain: 'Chain',
        chainBlurb: 'Several stores at once.',

        // The submit bar.
        allRequired: 'Every field is required.',
        checkOne: 'Check the highlighted field.',
        checkMany: 'Check the {count} highlighted fields.',
        sending: 'Sending…',

        // Closing a form that has something typed in it.
        discardTitle: 'Discard this request?',
        discardBody:
            'Nothing has been sent yet, and what you have typed will be lost.',
        keepEditing: 'Keep editing',
        discard: 'Discard',

        // The success view: the reference, set like a ticket, over what was sent.
        reference: 'Reference',
        copy: 'Copy',
        copied: 'Copied',
        copyLabel: 'Copy the reference',
        copiedLabel: 'Reference copied',
        store: 'Store',
        place: 'City',
        placeValue: '{city}, {country}',
        deviceCount: 'Devices',
        planChosen: 'Plan',
        quote: 'Quote it if you write to us at {email}.',
    },
    ar: {
        kicker: 'طلب جهاز',
        kickerSent: 'أُرسل طلبك',
        close: 'إغلاق',

        partStore: 'أنت ومتجرك',
        name: 'الاسم الكامل',
        company: 'اسم الشركة أو المتجر',
        email: 'بريد العمل الإلكتروني',
        emailPlaceholder: 'name@yourstore.com',
        phone: 'رقم الهاتف',
        phonePlaceholder: 'مع رمز الدولة',
        country: 'البلد',
        city: 'المدينة',

        partOrder: 'طلبك',
        devices: 'عدد الأجهزة',
        devicesHint: 'من 1 إلى 999. هل تخطط لتركيب أوسع؟ اذكر ذلك في رسالتك.',
        devicesFewer: 'أنقِص جهازًا واحدًا',
        devicesMore: 'أضِف جهازًا واحدًا',
        plan: 'كيف تفضّل امتلاك الجهاز؟',
        unsure: 'لم أحدّد بعد',
        unsureBlurb: 'سيساعدك فريقنا على الاختيار.',
        message: 'الرسالة',
        messagePlaceholder:
            'عدد متاجرك، والقطع التي تريد أن يجرّبها المتسوّقون أولًا (العبايات، النظارات، التريكو…)، والموعد الذي تفضّله لتركيب الجهاز.',
        privacyLink: 'اطّلع على صفحة {title}',
        honeypot: 'الموقع الإلكتروني',

        buy: 'شراء',
        buyBlurb: 'امتلك الجهاز بالكامل.',
        lease: 'إيجار',
        leaseBlurb: 'رسم شهري واحد يشمل كل شيء.',
        chain: 'سلاسل المتاجر',
        chainBlurb: 'عدة متاجر في وقت واحد.',

        allRequired: 'كل الحقول مطلوبة.',
        checkOne: 'راجع الحقل المحدَّد.',
        checkMany: 'راجع الحقول المحدَّدة، وعددها {count}.',
        sending: 'جارٍ الإرسال…',

        discardTitle: 'هل تريد إلغاء هذا الطلب؟',
        discardBody: 'لم يُرسَل شيء بعد، وسيضيع ما كتبته.',
        keepEditing: 'تابع الكتابة',
        discard: 'ألغِ الطلب',

        reference: 'رقم المرجع',
        copy: 'نسخ',
        copied: 'تم النسخ',
        copyLabel: 'انسخ رقم المرجع',
        copiedLabel: 'تم نسخ رقم المرجع',
        store: 'المتجر',
        place: 'المدينة',
        placeValue: '{city}، {country}',
        deviceCount: 'عدد الأجهزة',
        planChosen: 'الخطة',
        quote: 'اذكر هذا الرقم إذا راسلتنا على {email}.',
    },
});
