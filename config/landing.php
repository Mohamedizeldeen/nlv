<?php

/*
|--------------------------------------------------------------------------
| Landing page: currencies and the site settings schema
|--------------------------------------------------------------------------
|
| Read these through App\Support\Settings, never with config() on a single
| key: setting keys contain dots ("contact.email"), which config() would
| treat as nesting.
|
| Every setting has a group, an admin label, a type (text, textarea, accent,
| email, url, phone, number, currencies), a default and an optional help
| line. "accent" is a line of copy whose *starred phrase* is set in italic
| mint on the page. Settings marked 'public' => false never reach the
| browser. A stored null means "use the default".
|
| Copy (every text, textarea and accent setting) is 'translatable' => true:
| it has an English 'default' and an Arabic 'default_ar', and is stored as
| {"en": ..., "ar": ...} (a plain stored value is English). On the Arabic
| page a setting reads its stored Arabic, else 'default_ar', else the English
| value, so an empty 'default_ar' never leaves the page blank. Contact
| addresses, links, figures and currencies are the same in both languages.
|
| Defaults are the landing page's final copy (resources/js/components/
| landing/sections/*.tsx, re-synced after the September 2026 copy pass), so
| an empty setting shows exactly what the page showed before the admin panel.
| The pop-up keys (order.dialog_*, consent, submit, success_*) are new copy.
|
*/

return [

    /*
    | Price currencies, in display order: code => name (as read aloud).
    | The `pricing.currencies` setting picks which are shown, and in what order.
    */
    'currencies' => [
        'USD' => 'US dollars',
        'EUR' => 'euros',
        'GBP' => 'pounds sterling',
        'AED' => 'UAE dirhams',
        'SAR' => 'Saudi riyals',
    ],

    /*
    | The same names on the Arabic page (a code missing here reads its English name).
    */
    'currencies_ar' => [
        'USD' => 'دولار أمريكي',
        'EUR' => 'يورو',
        'GBP' => 'جنيه إسترليني',
        'AED' => 'درهم إماراتي',
        'SAR' => 'ريال سعودي',
    ],

    /*
    | Setting groups, in the order the "Site content" admin page lists them.
    | `site_content` => false: edited elsewhere (the pricing page), not there.
    */
    'groups' => [
        'contact' => ['label' => 'Contact details', 'help' => 'How shoppers and retailers reach NLV, and where new order requests are sent.', 'site_content' => true],
        'social' => ['label' => 'Social profiles', 'help' => 'Full profile URLs for the footer icons. Leave one empty to hide its icon.', 'site_content' => true],
        'stats' => ['label' => 'Headline figures', 'help' => 'The numbers in the hero badge and the partners band.', 'site_content' => true],
        'hero' => ['label' => 'Hero', 'help' => 'The first screen of the landing page.', 'site_content' => true],
        'sections' => ['label' => 'Section headings', 'help' => 'The kicker, title and introduction of each numbered section.', 'site_content' => true],
        'partners' => ['label' => 'Partners band', 'help' => 'The glass band above the retailer names.', 'site_content' => true],
        'order' => ['label' => 'Order form', 'help' => 'The order section at the foot of the page and the "Order a device" pop-up.', 'site_content' => true],
        'footer' => ['label' => 'Footer', 'help' => 'The closing statement, tagline and fine print.', 'site_content' => true],
        'seo' => ['label' => 'Search and sharing', 'help' => 'The page title and description shown by search engines and link previews.', 'site_content' => true],
        'pricing' => ['label' => 'Pricing', 'help' => 'Edited on the Plans & prices page.', 'site_content' => false],
    ],

    'settings' => [

        // Contact ---------------------------------------------------------
        'contact.email' => [
            'group' => 'contact', 'label' => 'Email', 'type' => 'email',
            'default' => 'hello@tryon.app',
            'help' => 'Shown in the order section ("Prefer email?") and used for the footer Contact link.',
        ],
        'contact.phone' => [
            'group' => 'contact', 'label' => 'Phone', 'type' => 'phone',
            'default' => '',
            'help' => 'In international format, e.g. +971 4 123 4567. Shown as typed in the footer, the order section and the order thank-you screen. Leave empty to hide it.',
        ],
        'contact.whatsapp' => [
            'group' => 'contact', 'label' => 'WhatsApp number', 'type' => 'phone',
            'default' => '',
            'help' => 'In international format, e.g. +971 4 123 4567. Opens a WhatsApp chat from the footer, the order section and the order thank-you screen. Leave empty to hide it.',
        ],
        'contact.address' => [
            'group' => 'contact', 'label' => 'Office address', 'type' => 'textarea', 'translatable' => true,
            'default' => '',
            'default_ar' => '',
            'help' => 'Shown in the footer. Leave empty to hide it.',
        ],
        'contact.lead_notify_email' => [
            'group' => 'contact', 'label' => 'Send new order requests to', 'type' => 'email',
            'default' => '',
            'help' => 'Every new order request is emailed here. Leave empty to only see them in the admin panel.',
            'public' => false,
        ],

        // Social ------------------------------------------------------------
        'social.instagram' => [
            'group' => 'social', 'label' => 'Instagram', 'type' => 'url',
            'default' => '', 'help' => 'e.g. https://www.instagram.com/nlv',
        ],
        'social.linkedin' => [
            'group' => 'social', 'label' => 'LinkedIn', 'type' => 'url',
            'default' => '', 'help' => 'e.g. https://www.linkedin.com/company/nlv',
        ],
        'social.x' => [
            'group' => 'social', 'label' => 'X', 'type' => 'url',
            'default' => '', 'help' => 'e.g. https://x.com/nlv',
        ],
        'social.youtube' => [
            'group' => 'social', 'label' => 'YouTube', 'type' => 'url',
            'default' => '', 'help' => 'e.g. https://www.youtube.com/@nlv',
        ],

        // Headline figures ------------------------------------------------
        'stats.stores' => [
            'group' => 'stats', 'label' => 'Stores', 'type' => 'number',
            'default' => 140,
            'help' => 'Stores with a device. Shown with a plus in the partners band, and under the live try-on counter on the hero.',
        ],
        'stats.countries' => [
            'group' => 'stats', 'label' => 'Countries', 'type' => 'number',
            'default' => 14,
            'help' => 'Countries with at least one device.',
        ],
        'stats.tryons_year' => [
            'group' => 'stats', 'label' => 'Try-ons this year', 'type' => 'text', 'translatable' => true,
            'default' => '2.1M',
            'default_ar' => '2.1 مليون',
            'help' => 'Written as it should read, e.g. 2.1M.',
        ],
        'stats.tryons_today' => [
            'group' => 'stats', 'label' => 'Try-ons today', 'type' => 'number',
            'default' => 10284,
            'help' => 'The starting figure of the live counter on the hero lens.',
        ],

        // Hero ------------------------------------------------------------
        'hero.kicker' => [
            'group' => 'hero', 'label' => 'Kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'In-store AI try-on',
            'default_ar' => 'التجربة الافتراضية داخل المتجر',
            'help' => 'The small spaced capitals above the headline.',
        ],
        'hero.title' => [
            'group' => 'hero', 'label' => 'Headline', 'type' => 'accent', 'translatable' => true,
            'default' => 'Every screen is a *fitting room.*',
            'default_ar' => 'كل شاشة *غرفة قياس.*',
            'help' => 'Wrap the phrase set in italic mint in *asterisks*.',
        ],
        'hero.lede' => [
            'group' => 'hero', 'label' => 'Introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'TryOn is a touchscreen mirror for your shop floor. Shoppers see the coat, the abaya and the frames on themselves before they buy, without queueing for a fitting room. Our cloud app runs the device and keeps your catalogue on it.',
            'default_ar' => 'TryOn مرآة بشاشة لمس، صُمّمت لصالة متجرك. يرى المتسوّقون المعطف والعباية والنظارة على أنفسهم قبل الشراء، دون انتظار دورهم أمام غرفة القياس. ويشغّل تطبيقنا السحابي الجهاز ويُبقي كتالوجك عليه محدّثًا.',
            'help' => null,
        ],
        'hero.cta_primary' => [
            'group' => 'hero', 'label' => 'Main button', 'type' => 'text', 'translatable' => true,
            'default' => 'Order a device',
            'default_ar' => 'اطلب جهازك',
            'help' => 'Opens the order form.',
        ],
        'hero.cta_secondary' => [
            'group' => 'hero', 'label' => 'Second button', 'type' => 'text', 'translatable' => true,
            'default' => 'Watch demo',
            'default_ar' => 'شاهد كيف يعمل',
            'help' => 'Scrolls to How it works.',
        ],
        'hero.point_1' => [
            'group' => 'hero', 'label' => 'Reassurance 1', 'type' => 'text', 'translatable' => true,
            'default' => 'Installed by our team',
            'default_ar' => 'يركّبه فريقنا',
            'help' => 'The three short lines under the buttons.',
        ],
        'hero.point_2' => [
            'group' => 'hero', 'label' => 'Reassurance 2', 'type' => 'text', 'translatable' => true,
            'default' => 'Cloud app included',
            'default_ar' => 'التطبيق السحابي مشمول',
            'help' => null,
        ],
        'hero.point_3' => [
            'group' => 'hero', 'label' => 'Reassurance 3', 'type' => 'text', 'translatable' => true,
            'default' => 'Wherever your stores are',
            'default_ar' => 'أينما كانت متاجرك',
            'help' => null,
        ],

        // Section headings ------------------------------------------------
        'sections.how_it_works.label' => [
            'group' => 'sections', 'label' => 'How it works: kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'How it works', 'help' => 'Section 01.',
            'default_ar' => 'كيف يعمل',
        ],
        'sections.how_it_works.title' => [
            'group' => 'sections', 'label' => 'How it works: title', 'type' => 'accent', 'translatable' => true,
            'default' => "From the rail to *“it\u{00A0}fits”* in four taps.", 'help' => null,
            'default_ar' => "من الرف إلى *«على\u{00A0}مقاسي»* بأربع لمسات.",
        ],
        'sections.how_it_works.lede' => [
            'group' => 'sections', 'label' => 'How it works: introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'No app, no measuring tape, no queue for the fitting room. Shoppers walk up to the mirror in your store.',
            'default_ar' => 'بلا تطبيق، ولا شريط قياس، ولا طابور أمام غرفة القياس. يكفي أن يقف المتسوّق أمام المرآة في متجرك.',
            'help' => null,
        ],
        'sections.features.label' => [
            'group' => 'sections', 'label' => 'Shop floor: kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'On the shop floor', 'help' => 'Section 02.',
            'default_ar' => 'في صالة العرض',
        ],
        'sections.features.title' => [
            'group' => 'sections', 'label' => 'Shop floor: title', 'type' => 'accent', 'translatable' => true,
            'default' => 'The fitting room, *without the queue.*', 'help' => null,
            'default_ar' => 'غرفة القياس، *من دون طابور.*',
        ],
        'sections.features.lede' => [
            'group' => 'sections', 'label' => 'Shop floor: introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'One device on your shop floor, and our cloud app behind it. Shoppers try on everything you carry without waiting for a room, and you see which pieces they reach for.',
            'default_ar' => 'جهاز واحد في صالة متجرك، ومن خلفه تطبيقنا السحابي. يجرّب المتسوّقون كل ما تعرضه دون انتظار غرفة شاغرة، وترى أنت القطع التي تمتد إليها أيديهم.',
            'help' => null,
        ],
        'sections.kiosk.label' => [
            'group' => 'sections', 'label' => 'Kiosk: kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'The kiosk', 'help' => 'Section 03.',
            'default_ar' => 'الجهاز',
        ],
        'sections.kiosk.title' => [
            'group' => 'sections', 'label' => 'Kiosk: title', 'type' => 'accent', 'translatable' => true,
            'default' => 'The mirror that *sells.*', 'help' => null,
            'default_ar' => 'المرآة التي *تبيع.*',
        ],
        'sections.kiosk.lede' => [
            'group' => 'sections', 'label' => 'Kiosk: introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => "A 55-inch touchscreen that stands where the fitting-room queue used to be. Shoppers try on the whole catalogue, including sizes that aren't on the rail, and take the look home on their phone.",
            'default_ar' => 'شاشة لمس بقياس 55 بوصة، تقف حيث كان طابور غرفة القياس. يجرّب المتسوّقون الكتالوج كاملًا، حتى المقاسات غير المعروضة على الرف، ثم يأخذون الإطلالة معهم على هواتفهم.',
            'help' => null,
        ],
        'sections.kiosk.install_line' => [
            'group' => 'sections', 'label' => 'Kiosk: install line', 'type' => 'text', 'translatable' => true,
            'default' => 'Sold or leased, installed and calibrated by our team, for one store or a hundred.',
            'default_ar' => 'للبيع أو الإيجار، يركّبه فريقنا ويضبطه، لمتجر واحد أو لمئة متجر.',
            'help' => 'Under the model name, beside the hardware figures.',
        ],
        'sections.lookbook.label' => [
            'group' => 'sections', 'label' => 'Lookbook: kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'Lookbook', 'help' => 'Section 04.',
            'default_ar' => 'معرض الإطلالات',
        ],
        'sections.lookbook.title' => [
            'group' => 'sections', 'label' => 'Lookbook: title', 'type' => 'accent', 'translatable' => true,
            'default' => 'Looks our shoppers *tried on* this week.', 'help' => null,
            'default_ar' => 'إطلالات *جرّبها* المتسوّقون هذا الأسبوع.',
        ],
        'sections.lookbook.lede' => [
            'group' => 'sections', 'label' => 'Lookbook: introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'Abayas in Riyadh, silk in Dubai, frames in London. A few of the ten thousand looks tried on today.',
            'default_ar' => 'عبايات في الرياض، وحرير في دبي، ونظارات في لندن. لمحة من عشرة آلاف إطلالة جُرّبت اليوم.',
            'help' => null,
        ],
        'sections.lookbook.hint' => [
            'group' => 'sections', 'label' => 'Lookbook: hint', 'type' => 'text', 'translatable' => true,
            'default' => 'Hover a look for before and after.',
            'default_ar' => 'مرّر المؤشر فوق أي إطلالة لتقارن قبل التجربة وبعدها.',
            'help' => 'Beside the filters, on screens with a mouse.',
        ],
        'sections.lookbook.hint_touch' => [
            'group' => 'sections', 'label' => 'Lookbook: hint on touch screens', 'type' => 'text', 'translatable' => true,
            'default' => 'Tap a look for before and after.',
            'default_ar' => 'المس أي إطلالة لتقارن قبل التجربة وبعدها.',
            'help' => 'The same hint on phones and tablets.',
        ],
        'sections.lookbook.all_kicker' => [
            'group' => 'sections', 'label' => 'Lookbook: "All" note kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'This week’s edit',
            'default_ar' => 'مختارات هذا الأسبوع',
            'help' => 'The note that opens the grid when no filter is picked. Each category has its own note.',
        ],
        'sections.lookbook.all_note' => [
            'group' => 'sections', 'label' => 'Lookbook: "All" note', 'type' => 'text', 'translatable' => true,
            'default' => 'Twelve cities, chosen from 71,400 try-ons this week.',
            'default_ar' => 'اخترناها من بين 71,400 تجربة في اثنتي عشرة مدينة هذا الأسبوع.',
            'help' => null,
        ],
        'sections.lookbook.all_unit' => [
            'group' => 'sections', 'label' => 'Lookbook: "All" note unit', 'type' => 'text', 'translatable' => true,
            'default' => 'looks',
            'default_ar' => 'إطلالة',
            'help' => 'Set in italic after the number of published looks, e.g. "12 looks".',
        ],
        'sections.lookbook.category_suffix' => [
            'group' => 'sections', 'label' => 'Lookbook: category note kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'this week',
            'default_ar' => 'هذا الأسبوع',
            'help' => 'Follows the category name above each category’s note, e.g. "Abayas · this week".',
        ],
        'sections.lookbook.slot_title' => [
            'group' => 'sections', 'label' => 'Lookbook: open frame title', 'type' => 'accent', 'translatable' => true,
            'default' => 'Your pieces, on *your* shoppers.',
            'default_ar' => 'قطعك، على *متسوّقيك* أنت.',
            'help' => 'The empty frame that closes a short edit, kept for the reader’s own store. Wrap the italic word in *asterisks*.',
        ],
        'sections.lookbook.slot_link' => [
            'group' => 'sections', 'label' => 'Lookbook: open frame link', 'type' => 'text', 'translatable' => true,
            'default' => 'Order a device',
            'default_ar' => 'اطلب جهازك',
            'help' => 'Under that title. Opens the order form.',
        ],
        'sections.lookbook.footnote' => [
            'group' => 'sections', 'label' => 'Lookbook: footnote', 'type' => 'text', 'translatable' => true,
            'default' => 'Photos shown with permission. Try-on renders are generated in under two seconds.',
            'default_ar' => 'الصور منشورة بإذن أصحابها. وتظهر نتيجة التجربة في أقل من ثانيتين.',
            'help' => 'The fine print under the grid.',
        ],
        'sections.lookbook.cadence' => [
            'group' => 'sections', 'label' => 'Lookbook: update line', 'type' => 'text', 'translatable' => true,
            'default' => 'New edit every Sunday',
            'default_ar' => 'مختارات جديدة كل يوم أحد',
            'help' => 'Set beside the footnote.',
        ],
        'sections.stories.label' => [
            'group' => 'sections', 'label' => 'Stories: kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'Stories', 'help' => 'Section 05.',
            'default_ar' => 'قصص',
        ],
        'sections.stories.title' => [
            'group' => 'sections', 'label' => 'Stories: title', 'type' => 'accent', 'translatable' => true,
            'default' => 'Store owners, *in their own words.*', 'help' => null,
            'default_ar' => 'أصحاب المتاجر، *بلسانهم.*',
        ],
        'sections.stories.lede' => [
            'group' => 'sections', 'label' => 'Stories: introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'An abaya house in Riyadh, an optician in Dubai, a boutique in Milan and a tailor in London, on their first season with TryOn.',
            'default_ar' => 'دار عبايات في الرياض، ومتجر نظارات في دبي، وبوتيك في ميلانو، وخيّاط في لندن، في موسمهم الأول مع TryOn.',
            'help' => null,
        ],
        'sections.stories.footnote' => [
            'group' => 'sections', 'label' => 'Stories: footnote', 'type' => 'text', 'translatable' => true,
            'default' => 'Figures reported by each retailer for their first season on TryOn.',
            'default_ar' => 'أرقام أفاد بها كل متجر عن موسمه الأول مع TryOn.',
            'help' => 'The fine print under the list of stories.',
        ],
        'sections.pricing.label' => [
            'group' => 'sections', 'label' => 'Pricing: kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'Pricing', 'help' => 'Section 06.',
            'default_ar' => 'الأسعار',
        ],
        'sections.pricing.title' => [
            'group' => 'sections', 'label' => 'Pricing: title', 'type' => 'accent', 'translatable' => true,
            'default' => 'One device. *Your way to own it.*', 'help' => null,
            'default_ar' => 'جهاز واحد. *امتلكه على طريقتك.*',
        ],
        'sections.pricing.lede' => [
            'group' => 'sections', 'label' => 'Pricing: introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'Every device comes with our cloud app. Our own team installs it in your store and calibrates it to your light and your floor.',
            'default_ar' => 'يأتي كل جهاز مع تطبيقنا السحابي، ويركّبه فريقنا في متجرك ويضبطه على إضاءته ومساحته.',
            'help' => null,
        ],
        'sections.pricing.currency_label' => [
            'group' => 'sections', 'label' => 'Pricing: currency switch label', 'type' => 'text', 'translatable' => true,
            'default' => 'Currency',
            'default_ar' => 'العملة',
            'help' => 'Set in small capitals beside the currency codes. The switch only shows when more than one currency is offered.',
        ],
        'sections.pricing.note' => [
            'group' => 'sections', 'label' => 'Pricing: price note', 'type' => 'text', 'translatable' => true,
            'default' => 'Prices per device, excluding VAT. Installation and calibration come with every device.',
            'default_ar' => 'الأسعار للجهاز الواحد ولا تشمل ضريبة القيمة المضافة. التركيب والضبط مشمولان مع كل جهاز.',
            'help' => 'Beside the currency switch.',
        ],
        'sections.pricing.custom_price' => [
            'group' => 'sections', 'label' => 'Pricing: custom price wording', 'type' => 'text', 'translatable' => true,
            'default' => 'Let’s talk',
            'default_ar' => 'لنتحدّث',
            'help' => 'Shown instead of a figure on a plan priced by quote.',
        ],
        'sections.pricing.faq_title' => [
            'group' => 'sections', 'label' => 'Pricing: questions heading', 'type' => 'text', 'translatable' => true,
            'default' => 'Asked before every order',
            'default_ar' => 'أسئلة تسبق كل طلب',
            'help' => 'The kicker beside the questions under the plans.',
        ],

        // Partners band ---------------------------------------------------
        'partners.kicker' => [
            'group' => 'partners', 'label' => 'Kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'In boutiques and opticians', 'help' => null,
            'default_ar' => 'في البوتيكات ومتاجر النظارات',
        ],
        'partners.title' => [
            'group' => 'partners', 'label' => 'Title', 'type' => 'accent', 'translatable' => true,
            'default' => 'From NLV to *the world.*', 'help' => null,
            'default_ar' => 'من NLV إلى *العالم.*',
        ],

        // Order form ------------------------------------------------------
        'order.kicker' => [
            'group' => 'order', 'label' => 'Section kicker', 'type' => 'text', 'translatable' => true,
            'default' => 'Order a device', 'help' => 'The order section at the foot of the page.',
            'default_ar' => 'اطلب جهازك',
        ],
        'order.title' => [
            'group' => 'order', 'label' => 'Section title', 'type' => 'accent', 'translatable' => true,
            'default' => 'Your next customer is already *in front of a screen.*', 'help' => null,
            'default_ar' => 'عميلك القادم يقف الآن *أمام شاشة.*',
        ],
        'order.lede' => [
            'group' => 'order', 'label' => 'Section introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'Leave your email and our team will call within one business day to confirm how many devices you need, the installation date, and getting your catalogue onto TryOn.',
            'default_ar' => 'اترك بريدك الإلكتروني، وسيتصل بك فريقنا خلال يوم عمل واحد لتأكيد عدد الأجهزة التي تحتاج إليها، وموعد التركيب، وإضافة كتالوجك إلى TryOn.',
            'help' => null,
        ],
        'order.cta' => [
            'group' => 'order', 'label' => 'Button', 'type' => 'text', 'translatable' => true,
            'default' => 'Order a device', 'help' => 'Opens the order form.',
            'default_ar' => 'اطلب جهازك',
        ],
        'order.cta_short' => [
            'group' => 'order', 'label' => 'Navbar, menu and footer link', 'type' => 'text', 'translatable' => true,
            'default' => 'Order a device',
            'default_ar' => 'اطلب جهازك',
            'help' => 'The order button in the navbar and the phone menu, and the link in the footer. Opens the order form.',
        ],
        'order.cta_compact' => [
            'group' => 'order', 'label' => 'Navbar button on phones', 'type' => 'text', 'translatable' => true,
            'default' => 'Order',
            'default_ar' => 'اطلب',
            'help' => 'The navbar only has room for a word or two on phones.',
        ],
        'order.dialog_title' => [
            'group' => 'order', 'label' => 'Pop-up title', 'type' => 'accent', 'translatable' => true,
            'default' => 'Order a *device.*', 'help' => 'The heading of the order pop-up.',
            'default_ar' => 'اطلب *جهازك.*',
        ],
        'order.dialog_lede' => [
            'group' => 'order', 'label' => 'Pop-up introduction', 'type' => 'textarea', 'translatable' => true,
            'default' => 'Tell us about your store. Our team will call within one business day to confirm the devices, the plan and an installation date.',
            'default_ar' => 'حدّثنا عن متجرك، وسيتصل بك فريقنا خلال يوم عمل واحد لتأكيد عدد الأجهزة والخطة وموعد التركيب.',
            'help' => null,
        ],
        'order.consent' => [
            'group' => 'order', 'label' => 'Consent checkbox', 'type' => 'text', 'translatable' => true,
            'default' => 'NLV may contact me about this order and keep these details to handle it.',
            'default_ar' => 'أوافق على أن تتواصل معي NLV بشأن هذا الطلب، وأن تحتفظ بهذه البيانات لمتابعته.',
            'help' => 'Visitors must tick it to send the form.',
        ],
        'order.submit' => [
            'group' => 'order', 'label' => 'Pop-up send button', 'type' => 'text', 'translatable' => true,
            'default' => 'Send order request', 'help' => null,
            'default_ar' => 'أرسل الطلب',
        ],
        'order.success_title' => [
            'group' => 'order', 'label' => 'Thank-you title', 'type' => 'text', 'translatable' => true,
            'default' => 'Thank you.', 'help' => 'Shown once the order is sent, with its reference.',
            'default_ar' => 'شكرًا لك.',
        ],
        'order.success_body' => [
            'group' => 'order', 'label' => 'Thank-you message', 'type' => 'textarea', 'translatable' => true,
            'default' => 'Our team will contact you within one business day to confirm your order and book the installation.',
            'default_ar' => 'سيتواصل معك فريقنا خلال يوم عمل واحد لتأكيد طلبك وتحديد موعد التركيب.',
            'help' => null,
        ],
        'order.email_prompt' => [
            'group' => 'order', 'label' => 'Email prompt', 'type' => 'text', 'translatable' => true,
            'default' => 'Prefer email?', 'help' => 'Followed by the contact email.',
            'default_ar' => 'هل تفضّل البريد الإلكتروني؟',
        ],
        'order.demo_prompt' => [
            'group' => 'order', 'label' => 'Demo prompt', 'type' => 'text', 'translatable' => true,
            'default' => 'Want to see it first?', 'help' => null,
            'default_ar' => 'هل تودّ أن تراه أولًا؟',
        ],
        'order.demo_link' => [
            'group' => 'order', 'label' => 'Demo link', 'type' => 'text', 'translatable' => true,
            'default' => 'Ask for an in-store demo', 'help' => 'Opens an email to the contact address.',
            'default_ar' => 'اطلب عرضًا توضيحيًا في المتجر',
        ],
        'order.menu_demo_link' => [
            'group' => 'order', 'label' => 'Demo link in the phone menu', 'type' => 'text', 'translatable' => true,
            'default' => 'Ask for a demo',
            'default_ar' => 'اطلب عرضًا توضيحيًا',
            'help' => 'The shorter demo link after the demo prompt, at the foot of the phone menu.',
        ],
        'order.demo_subject' => [
            'group' => 'order', 'label' => 'Demo email subject', 'type' => 'text', 'translatable' => true,
            'default' => 'In-store demo request', 'help' => null,
            'default_ar' => 'طلب عرض توضيحي في المتجر',
        ],

        // Footer ----------------------------------------------------------
        'footer.statement' => [
            'group' => 'footer', 'label' => 'Statement', 'type' => 'accent', 'translatable' => true,
            'default' => 'A try-on mirror for fashion and eyewear, *at home in any city.*', 'help' => null,
            'default_ar' => 'مرآة تجربة للأزياء والنظارات، *تليق بكل مدينة.*',
        ],
        'footer.company_line' => [
            'group' => 'footer', 'label' => 'Company line', 'type' => 'text', 'translatable' => true,
            'default' => 'A product of NLV.', 'help' => null,
            'default_ar' => 'منتج من NLV.',
        ],
        'footer.tagline' => [
            'group' => 'footer', 'label' => 'Tagline', 'type' => 'text', 'translatable' => true,
            'default' => 'Every screen is a fitting room.', 'help' => 'Set large in faint italic at the foot of the page.',
            'default_ar' => 'كل شاشة غرفة قياس.',
        ],
        'footer.fine_print' => [
            'group' => 'footer', 'label' => 'Fine print', 'type' => 'text', 'translatable' => true,
            'default' => 'Tried on in fourteen countries', 'help' => 'Opposite the copyright line.',
            'default_ar' => 'مُجرَّب في أربع عشرة دولة',
        ],

        // Search and sharing ----------------------------------------------
        'seo.title' => [
            'group' => 'seo', 'label' => 'Page title', 'type' => 'text', 'translatable' => true,
            'default' => 'TryOn: AI virtual try-on for fashion retail',
            'default_ar' => 'TryOn: التجربة الافتراضية بالذكاء الاصطناعي لمتاجر الأزياء',
            'help' => 'The browser tab and search result title. Keep it under 60 characters.',
        ],
        'seo.description' => [
            'group' => 'seo', 'label' => 'Description', 'type' => 'textarea', 'translatable' => true,
            'default' => "TryOn is NLV's in-store AI try-on mirror: shoppers see clothes and eyewear on themselves before they buy. Device and cloud app, installed by our team worldwide.",
            'default_ar' => 'TryOn من NLV مرآة للتجربة الافتراضية داخل المتجر: يرى المتسوّقون الملابس والنظارات على أنفسهم قبل الشراء. جهاز وتطبيق سحابي، ويتولّى فريقنا التركيب أينما كنت.',
            'help' => 'The search result snippet. Keep it under 160 characters.',
        ],

        // Pricing (edited on the Plans & prices page) ---------------------
        'pricing.currencies' => [
            'group' => 'pricing', 'label' => 'Currencies', 'type' => 'currencies',
            'default' => ['USD', 'EUR', 'GBP', 'AED', 'SAR'],
            'help' => 'The currencies visitors can switch between, in order. The first is shown first.',
            'public' => false,
        ],
    ],

];
