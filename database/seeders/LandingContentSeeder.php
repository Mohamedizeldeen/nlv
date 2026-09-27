<?php

namespace Database\Seeders;

use App\Enums\FooterGroup;
use App\Enums\PlanKey;
use App\Models\Faq;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use App\Support\LandingContent;
use App\Support\MediaRef;
use App\Support\Settings;
use Database\Factories\PlanFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * The landing page's content as it shipped before the admin panel: 4 stories,
 * 4 Lookbook categories, 12 looks, the 3 plans, 3 questions, and placeholder
 * content pages for the footer. The copy, figures and stock photo ids are the
 * ones the section files showed before the page read them from the database
 * (the photos are kept here as `unsplash:` media refs), so seeding a new
 * database gives the same page.
 *
 * Idempotent: every record is matched on its natural key (story name,
 * category slug, look title, plan key, question, page slug) and only created
 * when it is missing, so running it again never duplicates anything and never
 * overwrites an admin's edits. A seeded record that was deleted, or renamed
 * (its key changed), comes back on the next run.
 *
 * Arabic (arabic()) is written into the records' `*_ar` columns only where
 * they are still empty, so it can run on a database an admin already edits.
 *
 * Placeholder content: replace before launch. The people, stores and figures
 * are fictional; the pages are marked as placeholders.
 */
class LandingContentSeeder extends Seeder
{
    /**
     * Seed the landing page content. Only records that don't exist yet are
     * created, so running it again (e.g. on production) never overwrites what
     * an admin has edited.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->seedStories();
            $this->seedLookbook();
            $this->seedPlans();
            $this->seedFaqs();
            $this->seedPages();
            $this->seedArabic();
        });

        LandingContent::forget();
        Settings::forget();
    }

    /**
     * The Stories section, in page order.
     */
    private function seedStories(): void
    {
        foreach (self::stories() as $order => $story) {
            Story::query()->firstOrCreate(
                ['name' => $story['name']],
                [...$story, 'sort_order' => $order, 'is_published' => true],
            );
        }
    }

    /**
     * The Lookbook filters, then the looks in the edit's display order.
     */
    private function seedLookbook(): void
    {
        foreach (self::categories() as $order => $category) {
            LookCategory::query()->firstOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'sort_order' => $order],
            );
        }

        $categories = LookCategory::query()->pluck('id', 'slug');

        foreach (self::looks() as $order => $look) {
            ['category' => $slug] = $look;
            unset($look['category']);

            Look::query()->firstOrCreate(
                ['title' => $look['title']],
                [
                    ...$look,
                    'look_category_id' => $categories[$slug],
                    'before_image' => null,
                    'sort_order' => $order,
                    'is_published' => true,
                ],
            );
        }
    }

    /**
     * Buy, Lease and Chain, as the pricing section shows them.
     *
     * Price maps are saved with their codes sorted: a MySQL JSON column stores
     * object keys sorted anyway, and a map in another order would read as a
     * change (and be logged) on every run. Display order comes from the
     * `pricing.currencies` setting, not from the map.
     */
    private function seedPlans(): void
    {
        foreach (PlanKey::cases() as $key) {
            $attributes = PlanFactory::defaults($key);

            foreach (['prices', 'detail_prices'] as $column) {
                if (is_array($attributes[$column])) {
                    ksort($attributes[$column], SORT_STRING);
                }
            }

            Plan::query()->firstOrCreate(['key' => $key->value], $attributes);
        }
    }

    /**
     * The questions under the plans, in page order.
     */
    private function seedFaqs(): void
    {
        foreach (self::faqs() as $order => [$question, $answer]) {
            Faq::query()->firstOrCreate(
                ['question' => $question],
                ['answer' => $answer, 'sort_order' => $order, 'is_published' => true],
            );
        }
    }

    /**
     * The footer's Company and Legal pages, in footer order.
     */
    private function seedPages(): void
    {
        foreach (self::pages() as $order => $page) {
            Page::query()->firstOrCreate(
                ['slug' => $page['slug']],
                [...$page, 'sort_order' => $order, 'is_published' => true],
            );
        }
    }

    /**
     * The Arabic version of the seeded records (arabic()), written only into
     * Arabic columns that are still empty: an admin's Arabic edits are never
     * overwritten, and a record the data doesn't know is left alone. An
     * empty translation is skipped, so the page shows the English until it
     * is filled in. Logged like any other edit.
     */
    private function seedArabic(): void
    {
        $arabic = static::arabic();

        $this->fillArabic(Story::query()->get()->keyBy('name'), $arabic['stories']);
        $this->fillArabic(LookCategory::query()->get()->keyBy('slug'), $arabic['categories']);
        $this->fillArabic(Look::query()->get()->keyBy('title'), $arabic['looks']);
        $this->fillArabic(Plan::query()->get()->keyBy(fn (Plan $plan): string => $plan->key->value), $arabic['plans']);
        $this->fillArabic(Faq::query()->get()->keyBy('question'), $arabic['faqs']);
        $this->fillArabic(Page::query()->get()->keyBy('slug'), $arabic['pages']);
    }

    /**
     * Fill the empty Arabic columns of the matching records.
     *
     * @param  Collection<array-key, covariant Model>  $records  keyed by natural key
     * @param  array<string, array<string, string|list<string>>>  $translations  natural key => column => value
     */
    private function fillArabic(Collection $records, array $translations): void
    {
        foreach ($translations as $key => $columns) {
            $record = $records->get($key);

            if (! $record instanceof Model) {
                continue;
            }

            foreach ($columns as $column => $value) {
                // A list (plan features) is only used once every item is translated.
                $complete = is_array($value)
                    ? $value !== [] && array_filter($value, fn (string $item): bool => blank($item)) === []
                    : filled($value);

                if ($complete && blank($record->getAttribute($column))) {
                    $record->setAttribute($column, $value);
                }
            }

            if ($record->isDirty()) {
                $record->save();
            }
        }
    }

    /**
     * Store owners (testimonials.tsx). Focus and zoom are the featured 4:5
     * crop's; the list's avatar zooms in on the same focus.
     *
     * @return list<array<string, string|float>>
     */
    public static function stories(): array
    {
        return [
            [
                'name' => 'Noura Al-Harbi',
                'role' => 'Founder',
                'store' => 'Rimal Abayas',
                'city' => 'Riyadh',
                'coordinates' => '24.71° N · 46.68° E',
                'quote' => 'On Thursday evenings the fitting-room queue ran out of the door, and women left without trying anything. Now they try it on at the mirror first. Abaya sales *rose by a third* in one season.',
                'metric_figure' => '+33%',
                'metric_label' => 'Abaya sales',
                'metric_note' => 'in one season',
                'metric_short' => 'sales',
                'portrait' => MediaRef::unsplash('photo-1753486986377-1395ccfb4a8a'),
                'portrait_focus_x' => 0.53,
                'portrait_focus_y' => 0.3,
                'portrait_zoom' => 1.35,
            ],
            [
                'name' => 'Khalid Mansour',
                'role' => 'Retail Director',
                'store' => 'Layan Optics',
                'city' => 'Dubai',
                'coordinates' => '25.20° N · 55.27° E',
                'quote' => 'We put the kiosk next to the frame wall. People who would have tried three frames now *try twenty*, and they leave with a photo to show their family.',
                'metric_figure' => '×6',
                'metric_label' => 'Frames tried per visit',
                'metric_note' => 'at the frame wall',
                'metric_short' => 'frames tried',
                'portrait' => MediaRef::unsplash('photo-1629425733761-caae3b5f2e50'),
                'portrait_focus_x' => 0.45,
                'portrait_focus_y' => 0.26,
                'portrait_zoom' => 1.1,
            ],
            [
                'name' => 'Elena Marchetti',
                'role' => 'Store Manager',
                'store' => 'Casa Lino',
                'city' => 'Milan',
                'coordinates' => '45.46° N · 9.19° E',
                'quote' => 'Our clients used to take half the rail into the fitting room. Now they *shortlist at the mirror* and only try on what they’re sure of.',
                'metric_figure' => '−45%',
                'metric_label' => 'Fitting-room time',
                'metric_note' => 'per visit',
                'metric_short' => 'fitting time',
                'portrait' => MediaRef::unsplash('photo-1567532939604-b6b5b0db2604'),
                // Tall 2:3 original: centred lower and zoomed so the face clears the quote glass.
                'portrait_focus_x' => 0.47,
                'portrait_focus_y' => 0.5,
                'portrait_zoom' => 1.3,
            ],
            [
                'name' => 'James Okafor',
                'role' => 'Owner',
                'store' => 'Hollis & Vane',
                'city' => 'London',
                'coordinates' => '51.51° N · 0.13° W',
                'quote' => 'Installation took an afternoon. By the weekend the mirror was *the busiest corner of the shop*.',
                'metric_figure' => '+24%',
                'metric_label' => 'Conversion on tried pieces',
                'metric_note' => 'in one season',
                'metric_short' => 'conversion',
                'portrait' => MediaRef::unsplash('photo-1588178454780-441fa5b99fa5'),
                'portrait_focus_x' => 0.5,
                'portrait_focus_y' => 0.31,
                'portrait_zoom' => 1.1,
            ],
        ];
    }

    /**
     * The Lookbook filters and their "this week" notes (lookbook.tsx).
     *
     * @return list<array{name: string, slug: string, note: string, stat_figure: string, stat_unit: string}>
     */
    public static function categories(): array
    {
        return [
            [
                'name' => 'Abayas',
                'slug' => 'abayas',
                'note' => 'Sizes run 52 to 60. Navy and black satin led the week in Riyadh and Jeddah.',
                'stat_figure' => '54',
                'stat_unit' => 'most tried size',
            ],
            [
                'name' => 'Everyday',
                'slug' => 'everyday',
                'note' => 'The best-converting edit of the week: a denim jacket, a camel coat, a navy suit.',
                'stat_figure' => '38%',
                'stat_unit' => 'went into the bag',
            ],
            [
                'name' => 'Evening',
                'slug' => 'evening',
                'note' => 'Occasion wear peaks in the weeks before Eid, weddings and the winter holidays.',
                'stat_figure' => 'Sat',
                'stat_unit' => 'peak try-on day',
            ],
            [
                'name' => 'Eyewear',
                'slug' => 'eyewear',
                'note' => 'Share of all frames tried this week. Clear acetate is climbing in Tokyo.',
                'stat_figure' => '41%',
                'stat_unit' => 'tortoiseshell',
            ],
        ];
    }

    /**
     * The edit in display order, with the stock photo ids and captions the
     * Lookbook used before it read looks from the database. `aspect` is the
     * photo's width / height.
     *
     * @return list<array{category: string, title: string, city: string, render_seconds: float, after_image: string, alt: string, aspect: float, focus_x: float, focus_y: float}>
     */
    public static function looks(): array
    {
        $looks = [
            ['abayas', 'Quilted abaya, navy', 'Riyadh', 1.7, 'photo-1762605135318-f34a993cbcf0', 0.67, 0.42, 0.55,
                'A woman in an open navy quilted abaya over a beige dress, seated beneath woven palm baskets'],
            ['evening', 'Silk gown, black', 'Dubai', 1.9, 'photo-1546190075-ed60eaed45e4', 0.8, 0.42, 0.52,
                'A woman in a flowing black gown on desert dunes, the train sweeping out in the wind'],
            ['eyewear', 'Round acetate, tortoise', 'London', 1.6, 'photo-1618077360395-f3068be8e001', 1.0, 0.47, 0.45,
                'A smiling man with a salt-and-pepper beard wearing round tortoiseshell glasses'],
            ['everyday', 'Denim jacket, stonewash', 'New York', 1.5, 'photo-1551537482-f2075a1d41f2', 0.67, 0.5, 0.4,
                'A young man with curly hair and glasses in a stonewashed denim jacket against a teal door'],
            ['evening', 'Chiffon maxi, teal', 'Istanbul', 1.8, 'photo-1609357605129-26f69add5d6e', 0.67, 0.47, 0.55,
                'A woman twirling in a long-sleeved teal chiffon maxi dress on a red-earth path'],
            ['abayas', 'Embroidered satin abaya', 'Jeddah', 1.7, 'photo-1739829417987-28d43f9a6b49', 0.67, 0.55, 0.5,
                'Close-up of a black satin abaya sleeve with gold and emerald beaded embroidery'],
            ['everyday', 'Camel coat, olive knit', 'Milan', 1.8, 'photo-1618244972963-dbee1a7edc95', 0.67, 0.5, 0.5,
                'A woman in a camel coat over an olive ribbed-knit midi dress on a city street'],
            ['evening', 'Kurta and sharara, mint', 'Singapore', 1.9, 'photo-1583391733956-3750e0ff4e8b', 0.8, 0.55, 0.45,
                'A woman in a mint embroidered kurta and tiered sharara with a sequinned dupatta'],
            ['everyday', 'Navy suit, slim', 'Abu Dhabi', 1.6, 'photo-1617137968427-85924c800a22', 0.67, 0.48, 0.45,
                'A bearded man walking toward the camera in a slim navy suit and open-collar white shirt'],
            ['eyewear', 'Clear acetate frames', 'Tokyo', 1.8, 'photo-1531384441138-2736e62e0919', 0.67, 0.39, 0.35,
                'A smiling man in clear optical frames, a navy beret and turtleneck, holding a film camera'],
            ['evening', 'Bisht, gold zari trim', 'Doha', 1.7, 'photo-1756412066366-b46dafaca253', 0.82, 0.55, 0.5,
                'Detail of a dark brown bisht with gold trim worn over a white thobe and red shemagh'],
            ['eyewear', 'Cat-eye optical, black', 'Paris', 1.6, 'photo-1552942362-50ecec295033', 1.5, 0.49, 0.53,
                'A woman looking back over her shoulder in dark cat-eye glasses, golden-hour sea behind her'],
        ];

        return array_values(array_map(fn (array $look): array => [
            'category' => $look[0],
            'title' => $look[1],
            'city' => $look[2],
            'render_seconds' => $look[3],
            'after_image' => MediaRef::unsplash($look[4]),
            'alt' => $look[8],
            'aspect' => $look[5],
            'focus_x' => $look[6],
            'focus_y' => $look[7],
        ], $looks));
    }

    /**
     * "Asked before every order" (pricing.tsx), as [question, answer].
     *
     * @return list<array{0: string, 1: string}>
     */
    public static function faqs(): array
    {
        return [
            [
                'What does the cloud app do?',
                'It runs the try-on on the device, keeps your catalogue up to date and shows which pieces get tried on and which get bought.',
            ],
            [
                'Do you keep customer photos?',
                'No. Photos are deleted when the session ends. A look is kept only if the shopper saves it to her phone.',
            ],
            [
                'How long does installation take?',
                'One visit. Our team installs and calibrates the device, and it is ready for shoppers the same day.',
            ],
        ];
    }

    /**
     * The footer's content pages (footer.tsx): placeholder Markdown, clearly
     * marked, for NLV to replace before launch.
     *
     * @return list<array{title: string, slug: string, summary: string, footer_group: FooterGroup, body: string}>
     */
    public static function pages(): array
    {
        return [
            [
                'title' => 'About',
                'slug' => 'about',
                'summary' => 'NLV makes TryOn, the in-store try-on mirror for fashion and eyewear stores, and the cloud app that runs it.',
                'footer_group' => FooterGroup::Company,
                'body' => <<<'MD'
                    > **Placeholder page.** This text stands in for NLV's own words. Replace it before launch.

                    NLV makes **TryOn**: a touchscreen try-on mirror for fashion and eyewear stores, and the cloud app that runs it.

                    ## What we make

                    One product. The TryOn device stands on your shop floor, where the fitting-room queue used to be. A shopper picks a piece on the screen and sees it on herself before she buys, then scans a code to keep the look on her phone. Our cloud app runs the device, keeps your catalogue on it and shows you which pieces get tried on most.

                    Our own team installs every device and calibrates it to the light and the floor of your store.

                    ## Who we work with

                    Boutiques, abaya houses, opticians and tailors, from a single store to a group fitting out several countries at once.

                    ## Where to find us

                    [Office address, company registration number and a short history of NLV.]
                    MD,
            ],
            [
                'title' => 'Careers',
                'slug' => 'careers',
                'summary' => 'Open roles at NLV, the team that builds, installs and supports the TryOn device and its cloud app.',
                'footer_group' => FooterGroup::Company,
                'body' => <<<'MD'
                    > **Placeholder page.** Replace it with NLV's open roles before launch.

                    NLV is a small team of engineers, designers, installers and store specialists building the TryOn device and its cloud app.

                    ## Open roles

                    [List each role: title, location, a few lines on the work, and how to apply.]

                    ## How to apply

                    [Where to send an application and what to include with it.]
                    MD,
            ],
            [
                'title' => 'Press',
                'slug' => 'press',
                'summary' => 'Press information, photographs and contacts for TryOn by NLV.',
                'footer_group' => FooterGroup::Company,
                'body' => <<<'MD'
                    > **Placeholder page.** Replace it with NLV's press information before launch.

                    ## About TryOn

                    TryOn is an in-store try-on mirror by NLV: a touchscreen device for fashion and eyewear stores and the cloud app that runs it, installed and calibrated by NLV's own team.

                    ## Press kit

                    [Links to the logo files, product photographs and a one-page fact sheet.]

                    ## Press contact

                    [Name, email address and phone number of the press contact.]
                    MD,
            ],
            [
                'title' => 'Privacy',
                'slug' => 'privacy',
                'summary' => 'How NLV handles the personal data sent through this website and seen by TryOn devices in stores.',
                'footer_group' => FooterGroup::Legal,
                'body' => <<<'MD'
                    > **Placeholder page.** This is not NLV's privacy policy. Replace it with a policy reviewed by legal counsel before launch.

                    This page will explain what personal data NLV collects through this website and at TryOn devices, why it is collected, and how long it is kept.

                    ## Order requests

                    When you send an order request, NLV receives the details you enter in the form: your name, company, email address, phone number, country, city, the number of devices, the plan you prefer and your message. They are used to answer your request and arrange your order.

                    ## At the device

                    [How photos taken at the device are used, when they are deleted, and what is kept when a shopper saves a look to their phone.]

                    ## Your rights

                    [How to ask for a copy of your data, correct it or have it deleted.]

                    ## Contact

                    [The data controller's name, address and contact email.]
                    MD,
            ],
            [
                'title' => 'Terms',
                'slug' => 'terms',
                'summary' => 'The terms for using this website and for ordering the TryOn device and its cloud app.',
                'footer_group' => FooterGroup::Legal,
                'body' => <<<'MD'
                    > **Placeholder page.** These are not NLV's terms. Replace this page with terms reviewed by legal counsel before launch.

                    ## Using this website

                    [Terms for visitors to this website.]

                    ## Ordering a device

                    [How quotes, orders, delivery, installation, payment and cancellation work for the Buy, Lease and Chain plans.]

                    ## The cloud app

                    [Terms for the cloud app that runs on the device: availability, support and acceptable use.]

                    ## Warranty and servicing

                    [The warranty on a bought device, what it covers, and servicing during a lease.]

                    ## Contact

                    [Company name, registered address and contact email.]
                    MD,
            ],
            [
                'title' => 'Data processing',
                'slug' => 'data-processing',
                'summary' => 'How NLV processes personal data on behalf of the retailers that run TryOn devices in their stores.',
                'footer_group' => FooterGroup::Legal,
                'body' => <<<'MD'
                    > **Placeholder page.** This is not a data processing agreement. Replace it with the agreement prepared by legal counsel before launch.

                    This page will set out how NLV processes personal data on behalf of the retailers that run TryOn devices in their stores.

                    ## Scope

                    [The data processed at the device and in the cloud app, what it is used for, and how long it is kept.]

                    ## Sub-processors

                    [The sub-processors NLV uses, such as hosting providers, and where they process data.]

                    ## Security

                    [The technical and organisational measures that protect the data.]

                    ## Contact

                    [Who retailers contact about data processing.]
                    MD,
            ],
        ];
    }

    /**
     * The Arabic version of every seeded record: natural key (story name,
     * category slug, look title, plan key, question, page slug, as in the
     * English data above) => Arabic column => text. Same markup as the
     * English: *accent* in quotes and plan features, Markdown in page
     * bodies; plan features list one Arabic line per English line.
     *
     * Modern Standard Arabic for Gulf and wider Arab readers, Western digits,
     * brand names (NLV, TryOn) in Latin; the terms follow the glossary used
     * for the settings defaults in config/landing.php (التجربة الافتراضية,
     * الجهاز, التطبيق السحابي, غرفة القياس, معرض الإطلالات, اطلب جهازك).
     *
     * Empty strings are placeholders: seedArabic() skips them, and the page
     * shows the English until they are filled in. The only ones left are the
     * columns whose English is empty too (the badge and features heading of
     * the plans that have none).
     *
     * @return array{
     *     stories: array<string, array<string, string>>,
     *     categories: array<string, array<string, string>>,
     *     looks: array<string, array<string, string>>,
     *     plans: array<string, array<string, string|list<string>>>,
     *     faqs: array<string, array<string, string>>,
     *     pages: array<string, array<string, string>>
     * }
     */
    public static function arabic(): array
    {
        return [
            'stories' => [
                'Noura Al-Harbi' => [
                    'name_ar' => 'نورة الحربي',
                    'role_ar' => 'مؤسِّسة',
                    'store_ar' => 'رمال للعبايات',
                    'city_ar' => 'الرياض',
                    'quote_ar' => 'في أمسيات الخميس كان طابور غرف القياس يمتدّ إلى خارج الباب، فتغادر نساء كثيرات دون أن يجرّبن شيئًا. أما اليوم فيجرّبن القطعة أمام المرآة أولًا، وقد ارتفعت مبيعات العبايات *بمقدار الثلث* في موسم واحد.',
                    'metric_label_ar' => 'مبيعات العبايات',
                    'metric_short_ar' => 'المبيعات',
                    'metric_note_ar' => 'في موسم واحد',
                ],
                'Khalid Mansour' => [
                    'name_ar' => 'خالد منصور',
                    'role_ar' => 'مدير التجزئة',
                    'store_ar' => 'ليان للبصريات',
                    'city_ar' => 'دبي',
                    'quote_ar' => 'وضعنا الجهاز بجوار جدار الإطارات. من كان يكتفي بتجربة ثلاثة إطارات صار *يجرّب عشرين*، ويغادر ومعه صورة يُريها لعائلته.',
                    'metric_label_ar' => 'الإطارات المجرَّبة في كل زيارة',
                    'metric_short_ar' => 'إطارات مجرَّبة',
                    'metric_note_ar' => 'عند جدار الإطارات',
                ],
                'Elena Marchetti' => [
                    'name_ar' => 'إيلينا ماركيتي',
                    'role_ar' => 'مديرة المتجر',
                    'store_ar' => 'كازا لينو',
                    'city_ar' => 'ميلانو',
                    'quote_ar' => 'كان عملاؤنا يأخذون نصف ما على الرف إلى غرفة القياس. اليوم *يحسمون اختيارهم أمام المرآة*، ولا يقيسون إلا ما هم واثقون منه.',
                    'metric_label_ar' => 'الوقت في غرفة القياس',
                    'metric_short_ar' => 'وقت القياس',
                    'metric_note_ar' => 'في كل زيارة',
                ],
                'James Okafor' => [
                    'name_ar' => 'جيمس أوكافور',
                    'role_ar' => 'صاحب المتجر',
                    'store_ar' => 'هوليس آند فين',
                    'city_ar' => 'لندن',
                    'quote_ar' => 'لم يستغرق التركيب أكثر من عصر يوم واحد. ومع حلول عطلة نهاية الأسبوع صارت المرآة *أكثر زوايا المتجر ازدحامًا*.',
                    'metric_label_ar' => 'نسبة شراء القطع المجرَّبة',
                    'metric_short_ar' => 'نسبة الشراء',
                    'metric_note_ar' => 'في موسم واحد',
                ],
            ],
            'categories' => [
                'abayas' => [
                    'name_ar' => 'العبايات',
                    'note_ar' => 'المقاسات من 52 إلى 60. تصدّر الساتان الكحلي والأسود هذا الأسبوع في الرياض وجدة.',
                    'stat_figure_ar' => '54',
                    'stat_unit_ar' => 'المقاس الأكثر تجربة',
                ],
                'everyday' => [
                    'name_ar' => 'الأزياء اليومية',
                    'note_ar' => 'الأكثر شراءً بعد التجربة من مختارات الأسبوع: جاكيت دنيم، ومعطف جملي، وبدلة كحلية.',
                    'stat_figure_ar' => '38%',
                    'stat_unit_ar' => 'انتهت إلى الشراء',
                ],
                'evening' => [
                    'name_ar' => 'أزياء السهرة',
                    'note_ar' => 'يبلغ الإقبال على أزياء المناسبات ذروته في الأسابيع التي تسبق العيد والأعراس وعطلات الشتاء.',
                    'stat_figure_ar' => 'السبت',
                    'stat_unit_ar' => 'يوم ذروة التجارب',
                ],
                'eyewear' => [
                    'name_ar' => 'النظارات',
                    'note_ar' => 'نسبتها من مجموع الإطارات المجرَّبة هذا الأسبوع. والإقبال على الأسيتات الشفافة يتزايد في طوكيو.',
                    'stat_figure_ar' => '41%',
                    'stat_unit_ar' => 'بنقشة صدف السلحفاة',
                ],
            ],
            'looks' => [
                'Quilted abaya, navy' => [
                    'title_ar' => 'عباية مبطّنة، كحلية',
                    'city_ar' => 'الرياض',
                    'alt_ar' => 'امرأة ترتدي عباية كحلية مبطّنة مفتوحة فوق فستان بيج، تجلس تحت سلال مجدولة من سعف النخيل',
                ],
                'Silk gown, black' => [
                    'title_ar' => 'فستان سهرة حريري، أسود',
                    'city_ar' => 'دبي',
                    'alt_ar' => 'امرأة على كثبان الصحراء في فستان أسود منسدل، وذيله يتطاير مع الريح',
                ],
                'Round acetate, tortoise' => [
                    'title_ar' => 'إطار أسيتات دائري، بنقشة السلحفاة',
                    'city_ar' => 'لندن',
                    'alt_ar' => 'رجل مبتسم بلحية يخالطها الشيب، يرتدي نظارة دائرية بنقشة صدف السلحفاة',
                ],
                'Denim jacket, stonewash' => [
                    'title_ar' => 'جاكيت دنيم، مغسول بالحجر',
                    'city_ar' => 'نيويورك',
                    'alt_ar' => 'شاب بشعر مجعّد ونظارة، يرتدي جاكيت دنيم مغسولًا بالحجر أمام باب فيروزي داكن',
                ],
                'Chiffon maxi, teal' => [
                    'title_ar' => 'فستان شيفون طويل، فيروزي داكن',
                    'city_ar' => 'إسطنبول',
                    'alt_ar' => 'امرأة تدور بفستان شيفون فيروزي داكن يصل إلى الكاحل، بأكمام طويلة، على درب من التراب الأحمر',
                ],
                'Embroidered satin abaya' => [
                    'title_ar' => 'عباية ساتان مطرّزة',
                    'city_ar' => 'جدة',
                    'alt_ar' => 'لقطة مقرّبة لكُمّ عباية ساتان سوداء مطرّز بالخرز الذهبي والزمرّدي',
                ],
                'Camel coat, olive knit' => [
                    'title_ar' => 'معطف جملي وتريكو زيتي',
                    'city_ar' => 'ميلانو',
                    'alt_ar' => 'امرأة في معطف جملي فوق فستان من التريكو المضلّع بلون زيتي يصل إلى منتصف الساق، في أحد شوارع المدينة',
                ],
                'Kurta and sharara, mint' => [
                    'title_ar' => 'كورتا وشرارة، نعناعي',
                    'city_ar' => 'سنغافورة',
                    'alt_ar' => 'امرأة في كورتا مطرّزة بلون النعناع وشرارة متعددة الطبقات، مع دوباتا مزيّنة بالترتر',
                ],
                'Navy suit, slim' => [
                    'title_ar' => 'بدلة كحلية، قصّة ضيّقة',
                    'city_ar' => 'أبوظبي',
                    'alt_ar' => 'رجل ملتحٍ يسير نحو الكاميرا في بدلة كحلية ضيّقة القصّة وقميص أبيض مفتوح الياقة',
                ],
                'Clear acetate frames' => [
                    'title_ar' => 'إطارات أسيتات شفافة',
                    'city_ar' => 'طوكيو',
                    'alt_ar' => 'رجل مبتسم بنظارة طبية شفافة الإطار وقبعة بيريه كحلية وكنزة بياقة عالية، يحمل كاميرا فيلم',
                ],
                'Bisht, gold zari trim' => [
                    'title_ar' => 'بشت بحاشية زري ذهبية',
                    'city_ar' => 'الدوحة',
                    'alt_ar' => 'لقطة مقرّبة لبشت بنّي داكن بحواشٍ ذهبية، يُلبَس فوق ثوب أبيض مع شماغ أحمر',
                ],
                'Cat-eye optical, black' => [
                    'title_ar' => 'نظارة طبية بتصميم عين القطة، سوداء',
                    'city_ar' => 'باريس',
                    'alt_ar' => 'امرأة تنظر من فوق كتفها بنظارة داكنة بتصميم عين القطة، والبحر خلفها في ضوء الغروب',
                ],
            ],
            'plans' => [
                'buy' => [
                    'name_ar' => 'شراء',
                    'blurb_ar' => 'امتلك الجهاز بالكامل، وادفع اشتراك التطبيق شهرًا بشهر.',
                    'price_caption_ar' => 'دفعة واحدة، للجهاز الواحد',
                    'detail_label_ar' => 'التطبيق السحابي',
                    'detail_caption_ar' => 'شهريًا',
                    // No features heading and no badge in English either.
                    'features_heading_ar' => '',
                    'features_ar' => [
                        'ضمان *12 شهرًا*',
                        'تجارب *غير محدودة*',
                        'مزامنة الكتالوج عبر التطبيق السحابي',
                        'دعم عبر البريد الإلكتروني',
                    ],
                    'cta_label_ar' => 'اطلب جهازك',
                    'badge_ar' => '',
                    'badge_note_ar' => '',
                ],
                'lease' => [
                    'name_ar' => 'إيجار',
                    'blurb_ar' => 'الجهاز والتطبيق السحابي والصيانة في رسم شهري واحد.',
                    'price_caption_ar' => 'شهريًا للجهاز الواحد، شاملًا كل شيء',
                    'detail_label_ar' => 'مدة العقد',
                    'detail_caption_ar' => 'شهرًا',
                    'features_heading_ar' => 'كل ما في خطة الشراء، إضافةً إلى',
                    'features_ar' => [
                        'الصيانة طوال مدة العقد',
                        'استبدال مجاني إذا تعطّل الجهاز',
                        'أولوية في الدعم',
                    ],
                    'cta_label_ar' => 'اطلب جهازك',
                    'badge_ar' => 'الأكثر اختيارًا',
                    'badge_note_ar' => 'تختاره 6 من كل 10 متاجر جديدة',
                ],
                'chain' => [
                    'name_ar' => 'سلاسل المتاجر',
                    'blurb_ar' => 'للمجموعات التي تجهّز عدة متاجر في وقت واحد.',
                    'price_caption_ar' => 'تسعير مخصّص لخطة التركيب في فروعك',
                    'detail_label_ar' => 'عدد الأجهزة',
                    'detail_caption_ar' => 'أو أكثر',
                    // No features heading and no badge in English either.
                    'features_heading_ar' => '',
                    'features_ar' => [
                        'عرض موحّد لكل الفروع في التطبيق السحابي',
                        'تدريب فريق المتجر في الموقع',
                        'مدير حساب مخصّص',
                        'اتفاقية مستوى خدمة بتوفّر *99.9%*',
                    ],
                    'cta_label_ar' => 'تحدّث إلى فريق المبيعات',
                    'badge_ar' => '',
                    'badge_note_ar' => '',
                ],
            ],
            'faqs' => [
                'What does the cloud app do?' => [
                    'question_ar' => 'ما دور التطبيق السحابي؟',
                    'answer_ar' => 'يشغّل التجربة على الجهاز، ويُبقي كتالوجك محدّثًا، ويُريك القطع الأكثر تجربة وتلك التي تُشترى فعلًا.',
                ],
                'Do you keep customer photos?' => [
                    'question_ar' => 'هل تحتفظون بصور العملاء؟',
                    'answer_ar' => 'لا. تُحذف الصور بانتهاء الجلسة، ولا تبقى الإطلالة إلا إذا حفظتها المتسوّقة على هاتفها.',
                ],
                'How long does installation take?' => [
                    'question_ar' => 'كم يستغرق التركيب؟',
                    'answer_ar' => 'زيارة واحدة. يركّب فريقنا الجهاز ويضبطه، فيصبح جاهزًا لاستقبال المتسوّقين في اليوم نفسه.',
                ],
            ],
            'pages' => [
                'about' => [
                    'title_ar' => 'من نحن',
                    'summary_ar' => 'تصنع NLV جهاز TryOn، مرآة التجربة التي تقف في متاجر الأزياء والنظارات، والتطبيق السحابي الذي يشغّله.',
                    'body_ar' => <<<'MD'
                        > **صفحة مؤقتة.** هذا النص بديل مؤقت عن كلمات NLV نفسها. استبدِله قبل الإطلاق.

                        تصنع NLV جهاز **TryOn**: مرآة تجربة بشاشة لمس لمتاجر الأزياء والنظارات، والتطبيق السحابي الذي يشغّلها.

                        ## ما نصنعه

                        منتج واحد. يقف جهاز TryOn في صالة متجرك، في المكان الذي كان يشغله طابور غرفة القياس. تختار المتسوّقة قطعة على الشاشة وتراها على نفسها قبل أن تشتري، ثم تمسح رمزًا لتحتفظ بالإطلالة على هاتفها. ويشغّل تطبيقنا السحابي الجهاز، ويُبقي كتالوجك عليه، ويُريك القطع الأكثر تجربة.

                        يتولّى فريقنا تركيب كل جهاز بنفسه، ويضبطه على إضاءة متجرك ومساحته.

                        ## مع من نعمل

                        البوتيكات ودور العبايات ومتاجر النظارات والخيّاطون، من متجر واحد إلى مجموعة تجهّز فروعها في عدة دول دفعة واحدة.

                        ## أين تجدنا

                        [عنوان المكتب، ورقم السجل التجاري، ونبذة قصيرة عن تاريخ NLV.]
                        MD,
                ],
                'careers' => [
                    'title_ar' => 'الوظائف',
                    'summary_ar' => 'الوظائف الشاغرة في NLV، الفريق الذي يطوّر جهاز TryOn وتطبيقه السحابي، ويركّبه ويدعمه.',
                    'body_ar' => <<<'MD'
                        > **صفحة مؤقتة.** استبدِلها بالوظائف الشاغرة في NLV قبل الإطلاق.

                        NLV فريق صغير من المهندسين والمصمّمين وفنّيي التركيب وخبراء المتاجر، يطوّر جهاز TryOn وتطبيقه السحابي.

                        ## الوظائف الشاغرة

                        [اذكر كل وظيفة: المسمّى، والموقع، وأسطرًا قليلة عن طبيعة العمل، وطريقة التقديم.]

                        ## طريقة التقديم

                        [أين تُرسَل الطلبات، وما الذي يُرفَق بها.]
                        MD,
                ],
                'press' => [
                    'title_ar' => 'المركز الإعلامي',
                    'summary_ar' => 'معلومات صحفية وصور وجهات تواصل إعلامي لجهاز TryOn من NLV.',
                    'body_ar' => <<<'MD'
                        > **صفحة مؤقتة.** استبدِلها بمعلومات NLV الصحفية قبل الإطلاق.

                        ## عن TryOn

                        TryOn من NLV مرآة تجربة داخل المتجر: جهاز بشاشة لمس لمتاجر الأزياء والنظارات، مع التطبيق السحابي الذي يشغّله، ويتولّى فريق NLV تركيبه وضبطه بنفسه.

                        ## الملف الصحفي

                        [روابط ملفات الشعار، وصور المنتج، وصفحة واحدة بأبرز المعلومات.]

                        ## التواصل الإعلامي

                        [اسم مسؤول التواصل الإعلامي، وبريده الإلكتروني، ورقم هاتفه.]
                        MD,
                ],
                'privacy' => [
                    'title_ar' => 'سياسة الخصوصية',
                    'summary_ar' => 'كيف تتعامل NLV مع البيانات الشخصية المرسَلة عبر هذا الموقع، وتلك التي تلتقطها أجهزة TryOn في المتاجر.',
                    'body_ar' => <<<'MD'
                        > **صفحة مؤقتة.** هذه ليست سياسة NLV للخصوصية. استبدِلها بسياسة يراجعها مستشار قانوني قبل الإطلاق.

                        ستوضّح هذه الصفحة البيانات الشخصية التي تجمعها NLV عبر هذا الموقع وعند أجهزة TryOn، وسبب جمعها، ومدة الاحتفاظ بها.

                        ## طلبات الأجهزة

                        عندما ترسل طلبًا، تتلقى NLV البيانات التي تُدخلها في النموذج: اسمك، وشركتك، وبريدك الإلكتروني، ورقم هاتفك، والبلد، والمدينة، وعدد الأجهزة، والخطة التي تفضّلها، ورسالتك. وتُستخدم هذه البيانات للرد على طلبك وترتيب تنفيذه.

                        ## عند الجهاز

                        [كيف تُستخدم الصور الملتقطة عند الجهاز، ومتى تُحذف، وما الذي يبقى حين يحفظ المتسوّق إطلالة على هاتفه.]

                        ## حقوقك

                        [كيف تطلب نسخة من بياناتك، أو تصحيحها، أو حذفها.]

                        ## التواصل

                        [اسم جهة التحكم في البيانات، وعنوانها، وبريدها الإلكتروني.]
                        MD,
                ],
                'terms' => [
                    'title_ar' => 'الشروط والأحكام',
                    'summary_ar' => 'شروط استخدام هذا الموقع، وشروط طلب جهاز TryOn وتطبيقه السحابي.',
                    'body_ar' => <<<'MD'
                        > **صفحة مؤقتة.** هذه ليست شروط NLV. استبدِل هذه الصفحة بشروط يراجعها مستشار قانوني قبل الإطلاق.

                        ## استخدام هذا الموقع

                        [شروط زوّار هذا الموقع.]

                        ## طلب جهاز

                        [كيف تسير عروض الأسعار، والطلبات، والتوصيل، والتركيب، والدفع، والإلغاء في خطط الشراء والإيجار وسلاسل المتاجر.]

                        ## التطبيق السحابي

                        [شروط التطبيق السحابي الذي يعمل على الجهاز: توفّر الخدمة، والدعم، والاستخدام المقبول.]

                        ## الضمان والصيانة

                        [الضمان على الجهاز المُشترى وما يغطيه، والصيانة خلال مدة الإيجار.]

                        ## التواصل

                        [اسم الشركة، وعنوانها المسجّل، وبريدها الإلكتروني.]
                        MD,
                ],
                'data-processing' => [
                    'title_ar' => 'معالجة البيانات',
                    'summary_ar' => 'كيف تعالج NLV البيانات الشخصية نيابةً عن متاجر التجزئة التي تشغّل أجهزة TryOn في فروعها.',
                    'body_ar' => <<<'MD'
                        > **صفحة مؤقتة.** هذه ليست اتفاقية لمعالجة البيانات. استبدِلها بالاتفاقية التي يُعدّها المستشار القانوني قبل الإطلاق.

                        ستحدّد هذه الصفحة كيف تعالج NLV البيانات الشخصية نيابةً عن متاجر التجزئة التي تشغّل أجهزة TryOn في فروعها.

                        ## النطاق

                        [البيانات التي تُعالَج عند الجهاز وفي التطبيق السحابي، والغرض من استخدامها، ومدة الاحتفاظ بها.]

                        ## جهات المعالجة الفرعية

                        [جهات المعالجة الفرعية التي تستعين بها NLV، مثل مزوّدي الاستضافة، وأماكن معالجتها للبيانات.]

                        ## أمن البيانات

                        [التدابير التقنية والتنظيمية التي تحمي البيانات.]

                        ## التواصل

                        [الجهة التي يتواصل معها تجّار التجزئة بشأن معالجة البيانات.]
                        MD,
                ],
            ],
        ];
    }
}
