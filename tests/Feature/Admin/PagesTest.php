<?php

namespace Tests\Feature\Admin;

use App\Enums\FooterGroup;
use App\Models\ActivityLog;
use App\Models\Page;
use App\Models\User;
use App\Support\Activity;
use App\Support\LandingContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Every pages route: [method, route name, needs a page].
     *
     * @return array<string, array{0: string, 1: string, 2: bool}>
     */
    public static function routes(): array
    {
        return [
            'index' => ['get', 'admin.pages.index', false],
            'create' => ['get', 'admin.pages.create', false],
            'store' => ['post', 'admin.pages.store', false],
            'edit' => ['get', 'admin.pages.edit', true],
            'update' => ['put', 'admin.pages.update', true],
            'destroy' => ['delete', 'admin.pages.destroy', true],
            'publish' => ['patch', 'admin.pages.publish', true],
            'reorder' => ['post', 'admin.pages.reorder', false],
            'preview' => ['post', 'admin.pages.preview', false],
        ];
    }

    #[DataProvider('routes')]
    public function test_guests_are_sent_to_the_login_page(string $method, string $name, bool $withPage): void
    {
        $page = Page::factory()->create();

        $this->{$method}(route($name, $withPage ? $page : []))->assertRedirect(route('login'));

        $this->assertModelExists($page);
    }

    #[DataProvider('routes')]
    public function test_non_admins_are_forbidden(string $method, string $name, bool $withPage): void
    {
        $page = Page::factory()->create(['title' => 'About']);

        $this->actingAs(User::factory()->create())
            ->{$method}(route($name, $withPage ? $page : []), ['title' => 'Hacked', 'body' => 'x', 'ids' => [$page->id], 'is_published' => false])
            ->assertForbidden();

        $this->assertSame('About', $page->fresh()?->title);
    }

    public function test_the_index_lists_pages_in_page_order_with_the_footer_columns(): void
    {
        $terms = Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Terms', 'slug' => 'terms', 'sort_order' => 2]);
        $about = Page::factory()->inFooter(FooterGroup::Company)->create(['title' => 'About', 'slug' => 'about', 'sort_order' => 0]);
        $privacy = Page::factory()->inFooter(FooterGroup::Legal)->unpublished()->create(['title' => 'Privacy', 'slug' => 'privacy', 'sort_order' => 1]);
        $draft = Page::factory()->create(['title' => 'Draft', 'slug' => 'draft', 'sort_order' => 3, 'body' => "> **Placeholder page.** Replace it.\n\nText."]);

        $this->actingAs($this->admin())
            ->get(route('admin.pages.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/pages/index')
                ->where('total', 4)
                ->where('sort', null)
                ->where('filters', ['search' => null, 'group' => null, 'status' => null])
                ->has('pages.data', 4)
                ->where('pages.data.0.title', 'About')
                ->where('pages.data.1.title', 'Privacy')
                ->where('pages.data.2.title', 'Terms')
                ->where('pages.data.3.title', 'Draft')
                ->where('pages.data.3.placeholder', true)
                ->has('pages.data.0', fn (Assert $row) => $row
                    ->where('id', $about->id)
                    ->where('title', 'About')
                    ->where('slug', 'about')
                    ->where('footer_group', 'company')
                    ->where('is_published', true)
                    ->where('placeholder', false)
                    ->where('missing_arabic', ['title', 'summary', 'body'])
                    ->has('summary')
                    ->whereType('updated_at', 'string'),
                )
                ->where('footer.company', [['id' => $about->id, 'title' => 'About', 'slug' => 'about', 'is_published' => true]])
                ->where('footer.legal.0.id', $privacy->id)
                ->where('footer.legal.0.is_published', false)
                ->where('footer.legal.1.id', $terms->id)
                ->where('footerGroups', [['value' => 'company', 'label' => 'Company'], ['value' => 'legal', 'label' => 'Legal']]),
            );

        $this->assertModelExists($draft);
    }

    public function test_the_index_can_be_searched_filtered_and_sorted(): void
    {
        Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Terms of sale', 'slug' => 'terms']);
        Page::factory()->inFooter(FooterGroup::Legal)->unpublished()->create(['title' => 'Privacy', 'slug' => 'privacy']);
        Page::factory()->inFooter(FooterGroup::Company)->create(['title' => 'About NLV', 'slug' => 'about']);
        Page::factory()->create(['title' => 'Launch notes', 'slug' => 'launch-notes']);

        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('admin.pages.index', ['search' => 'terms']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'terms')
                ->has('pages.data', 1)
                ->where('pages.data.0.slug', 'terms'),
            );

        $this->get(route('admin.pages.index', ['group' => 'legal', 'status' => 'hidden']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', ['search' => null, 'group' => 'legal', 'status' => 'hidden'])
                ->has('pages.data', 1)
                ->where('pages.data.0.slug', 'privacy'),
            );

        $this->get(route('admin.pages.index', ['group' => 'none']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('pages.data', 1)
                ->where('pages.data.0.slug', 'launch-notes'),
            );

        $this->get(route('admin.pages.index', ['group' => 'bogus', 'status' => 'maybe', 'sort' => 'title', 'direction' => 'desc']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', ['search' => null, 'group' => null, 'status' => null])
                ->where('sort', ['column' => 'title', 'direction' => 'desc'])
                ->has('pages.data', 4)
                ->where('pages.data.0.title', 'Terms of sale')
                ->where('pages.data.3.title', 'About NLV'),
            );

        $this->get(route('admin.pages.index', ['sort' => 'password']))
            ->assertInertia(fn (Assert $page) => $page->where('sort', null));
    }

    public function test_the_create_form_starts_empty_and_hidden(): void
    {
        $this->actingAs($this->admin())
            ->get(route('admin.pages.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/pages/create')
                ->where('page.id', null)
                ->where('page.title', '')
                ->where('page.is_published', false)
                ->where('html', '')
                ->has('footerGroups', 2),
            );
    }

    public function test_admins_can_create_a_page(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->post(route('admin.pages.store'), [
            'title' => 'Shipping',
            'slug' => 'shipping',
            'summary' => 'How devices reach your store.',
            'body' => "## Delivery\n\nOur team brings the device.",
            'title_ar' => 'الشحن',
            'summary_ar' => 'كيف يصل الجهاز إلى متجرك.',
            'body_ar' => "## التوصيل\n\nيوصل فريقنا الجهاز إليك.",
            'footer_group' => 'company',
            'is_published' => '1',
        ]);

        $page = Page::query()->where('slug', 'shipping')->firstOrFail();

        $response->assertRedirect(route('admin.pages.edit', $page))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.type', 'success')
            ->assertInertiaFlash('toast.message', '“Shipping” is live.');

        $this->assertSame('Shipping', $page->title);
        $this->assertSame('How devices reach your store.', $page->summary);
        $this->assertSame('الشحن', $page->title_ar);
        $this->assertSame('كيف يصل الجهاز إلى متجرك.', $page->summary_ar);
        $this->assertSame("## التوصيل\n\nيوصل فريقنا الجهاز إليك.", $page->body_ar);
        $this->assertSame(FooterGroup::Company, $page->footer_group);
        $this->assertTrue($page->is_published);

        $log = ActivityLog::query()->where('event', 'page.created')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame($page->id, $log->subject_id);
        $this->assertSame([null, 'Shipping'], $log->properties['changes']['title'] ?? null);
        $this->assertSame([null, 'الشحن'], $log->properties['changes']['title_ar'] ?? null);

        $this->assertSame(
            [['title' => 'Shipping', 'slug' => 'shipping', 'group' => 'company', 'url' => '/pages/shipping']],
            LandingContent::build('en')['pages'],
        );
        $this->assertSame(
            [['title' => 'الشحن', 'slug' => 'shipping', 'group' => 'company', 'url' => '/ar/pages/shipping']],
            LandingContent::build('ar')['pages'],
        );
    }

    public function test_an_empty_slug_is_made_from_the_title_and_kept_unique(): void
    {
        Page::factory()->create(['slug' => 'about-us']);
        Page::factory()->create(['slug' => 'about-us-2']);

        $this->actingAs($this->admin())->post(route('admin.pages.store'), [
            'title' => 'About us',
            'slug' => '',
            'body' => 'Hello.',
            'title_ar' => 'من نحن',
            'body_ar' => 'مرحبًا.',
            'is_published' => '0',
        ])->assertSessionHasNoErrors();

        $page = Page::query()->latest('id')->firstOrFail();

        $this->assertSame('about-us-3', $page->slug);
        $this->assertNull($page->summary);
        $this->assertNull($page->summary_ar);
        $this->assertNull($page->footer_group);
        $this->assertFalse($page->is_published);
    }

    public function test_a_typed_slug_is_normalised_but_must_be_free(): void
    {
        Page::factory()->create(['slug' => 'press']);
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.pages.store'), [
            'title' => 'Careers',
            'slug' => ' Work With Us! ',
            'body' => 'Join us.',
            'title_ar' => 'الوظائف',
            'body_ar' => 'انضم إلينا.',
            'is_published' => '1',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('pages', ['title' => 'Careers', 'slug' => 'work-with-us']);

        $this->post(route('admin.pages.store'), [
            'title' => 'Newsroom',
            'slug' => 'Press',
            'body' => 'News.',
            'title_ar' => 'الأخبار',
            'body_ar' => 'أخبار.',
            'is_published' => '1',
        ])->assertSessionHasErrors(['slug' => 'Another page already uses this address.']);

        $this->assertDatabaseMissing('pages', ['title' => 'Newsroom']);
    }

    public function test_the_page_fields_are_validated(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.pages.store'), [
                'title' => '',
                'slug' => '',
                'summary' => str_repeat('a', 201),
                'body' => '',
                'title_ar' => '',
                'summary_ar' => '',
                'body_ar' => '',
                'footer_group' => 'sidebar',
                'is_published' => 'perhaps',
            ])
            ->assertSessionHasErrors([
                'title' => 'Give the page a title.',
                'slug' => 'Give the page an address, or a title to make one from.',
                'summary',
                'body' => 'Write the page before saving it.',
                'title_ar' => 'Give the page an Arabic title.',
                'summary_ar' => 'Add the Arabic summary too, or leave both empty.',
                'body_ar' => 'Write the Arabic page before saving it.',
                'footer_group' => 'Choose Company, Legal or not in the footer.',
                'is_published',
            ]);

        $this->assertDatabaseCount('pages', 0);
        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_the_edit_form_has_the_page_and_its_rendered_preview(): void
    {
        $page = Page::factory()->inFooter(FooterGroup::Legal)->arabic()->create([
            'title' => 'Privacy',
            'slug' => 'privacy',
            'summary' => null,
            'body' => "## Photos\n\nDeleted when the session ends.",
            'summary_ar' => null,
        ]);

        $this->actingAs($this->admin())
            ->get(route('admin.pages.edit', $page))
            ->assertOk()
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->component('admin/pages/edit')
                ->where('page.id', $page->id)
                ->where('page.title', 'Privacy')
                ->where('page.slug', 'privacy')
                ->where('page.summary', '')
                ->where('page.body', "## Photos\n\nDeleted when the session ends.")
                ->where('page.title_ar', 'الخصوصية')
                ->where('page.summary_ar', '')
                ->where('page.body_ar', "## الصور\n\nتُحذف الصور عند انتهاء الجلسة.")
                ->where('page.footer_group', 'legal')
                ->where('page.is_published', true)
                ->whereType('page.updated_at', 'string')
                ->where('html', "<h2>Photos</h2>\n<p>Deleted when the session ends.</p>\n")
                ->where('htmlAr', "<h2>الصور</h2>\n<p>تُحذف الصور عند انتهاء الجلسة.</p>\n"),
            );
    }

    public function test_the_edit_form_has_no_arabic_render_before_the_arabic_is_written(): void
    {
        $page = Page::factory()->create(['title' => 'Press', 'slug' => 'press', 'body' => 'News.']);

        $this->actingAs($this->admin())
            ->get(route('admin.pages.edit', $page))
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->where('page.title_ar', '')
                ->where('page.summary_ar', '')
                ->where('page.body_ar', '')
                ->where('html', "<p>News.</p>\n")
                ->where('htmlAr', ''),
            );

        $this->get(route('admin.pages.create'))
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->where('page.title_ar', '')
                ->where('page.summary_ar', '')
                ->where('page.body_ar', '')
                ->where('htmlAr', ''),
            );
    }

    public function test_admins_can_update_a_page_and_the_change_is_logged(): void
    {
        $page = Page::factory()->inFooter(FooterGroup::Legal)->create([
            'title' => 'Terms',
            'slug' => 'terms',
            'body' => 'Old terms.',
            'title_ar' => 'الشروط',
            'body_ar' => 'الشروط القديمة.',
        ]);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->put(route('admin.pages.update', $page), [
                'title' => 'Terms of sale',
                'slug' => 'terms',
                'summary' => 'The terms for every device.',
                'body' => 'New terms.',
                'title_ar' => 'الشروط',
                'summary_ar' => 'شروط كل جهاز.',
                'body_ar' => 'الشروط القديمة.',
                'footer_group' => 'legal',
                'is_published' => '1',
            ])
            ->assertRedirect(route('admin.pages.edit', $page))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', '“Terms of sale” saved.');

        $page->refresh();
        $this->assertSame('Terms of sale', $page->title);
        $this->assertSame('terms', $page->slug);
        $this->assertSame('New terms.', $page->body);

        $log = ActivityLog::query()->where('event', 'page.updated')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame(['Terms', 'Terms of sale'], $log->properties['changes']['title'] ?? null);
        $this->assertSame(['Old terms.', 'New terms.'], $log->properties['changes']['body'] ?? null);
        $this->assertSame([null, 'شروط كل جهاز.'], $log->properties['changes']['summary_ar'] ?? null);
        $this->assertArrayNotHasKey('slug', $log->properties['changes'] ?? []);
        $this->assertArrayNotHasKey('title_ar', $log->properties['changes'] ?? []);
        $this->assertArrayNotHasKey('body_ar', $log->properties['changes'] ?? []);
    }

    public function test_the_arabic_is_saved_logged_and_served_at_the_arabic_address(): void
    {
        $page = Page::factory()->inFooter(FooterGroup::Company)->create([
            'title' => 'About',
            'slug' => 'about',
            'summary' => 'Who we are.',
            'body' => '## Who we are',
            'title_ar' => 'عن الشركة',
            'summary_ar' => 'من نكون.',
            'body_ar' => '## من نكون',
        ]);
        $admin = $this->admin();

        // Warm the cached payloads: the save must refresh the Arabic one.
        LandingContent::build('en');
        LandingContent::build('ar');

        $this->actingAs($admin)
            ->put(route('admin.pages.update', $page), [
                'title' => 'About',
                'slug' => 'about',
                'summary' => 'Who we are.',
                'body' => '## Who we are',
                'title_ar' => 'من نحن',
                'summary_ar' => 'تعرّف إلى NLV.',
                'body_ar' => "## من نحن\n\nتصنع NLV جهاز **TryOn**.",
                'footer_group' => 'company',
                'is_published' => '1',
            ])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', '“About” saved.');

        $log = ActivityLog::query()->where('event', 'page.updated')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame([
            'title_ar' => ['عن الشركة', 'من نحن'],
            'summary_ar' => ['من نكون.', 'تعرّف إلى NLV.'],
            'body_ar' => ['## من نكون', "## من نحن\n\nتصنع NLV جهاز **TryOn**."],
        ], $log->properties['changes'] ?? null);

        $this->get('/ar/pages/about')
            ->assertOk()
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->component('page')
                ->where('page.title', 'من نحن')
                ->where('page.summary', 'تعرّف إلى NLV.')
                ->where('page.html', "<h2>من نحن</h2>\n<p>تصنع NLV جهاز <strong>TryOn</strong>.</p>\n")
                ->where('landing.locale', 'ar')
                ->where('landing.pages.0.title', 'من نحن')
                ->where('landing.pages.0.url', '/ar/pages/about'),
            );

        // The English page is untouched.
        $this->get('/pages/about')
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->where('page.title', 'About')
                ->where('page.html', "<h2>Who we are</h2>\n")
                ->where('landing.pages.0.title', 'About'),
            );
    }

    public function test_the_arabic_fields_are_required_and_limited_like_the_english(): void
    {
        $page = Page::factory()->create(['title' => 'Press', 'slug' => 'press', 'body' => 'News.']);
        $admin = $this->admin();
        $valid = [
            'title' => 'Press',
            'slug' => 'press',
            'summary' => 'News about NLV.',
            'body' => 'News.',
            'title_ar' => 'المركز الإعلامي',
            'summary_ar' => 'أخبار NLV.',
            'body_ar' => 'أخبار.',
            'is_published' => '1',
        ];

        // Without the Arabic, nothing is saved.
        $this->actingAs($admin)
            ->put(route('admin.pages.update', $page), [...$valid, 'title_ar' => null, 'summary_ar' => '', 'body_ar' => '   '])
            ->assertSessionHasErrors([
                'title_ar' => 'Give the page an Arabic title.',
                'summary_ar' => 'Add the Arabic summary too, or leave both empty.',
                'body_ar' => 'Write the Arabic page before saving it.',
            ])
            ->assertSessionDoesntHaveErrors(['title', 'summary', 'body']);

        // The same limits, named as the Arabic fields.
        $this->put(route('admin.pages.update', $page), [
            ...$valid,
            'title_ar' => str_repeat('ع', 121),
            'summary_ar' => str_repeat('ع', 201),
            'body_ar' => str_repeat('ع', 100001),
        ])->assertSessionHasErrors([
            'title_ar' => 'The Arabic title field must not be greater than 120 characters.',
            'summary_ar' => 'The Arabic summary field must not be greater than 200 characters.',
            'body_ar' => 'The Arabic page text field must not be greater than 100000 characters.',
        ]);

        $this->assertNull($page->fresh()?->title_ar);
        $this->assertSame(0, ActivityLog::query()->where('event', 'page.updated')->count());

        // An Arabic summary is only needed beside an English one.
        $this->put(route('admin.pages.update', $page), [...$valid, 'summary' => '', 'summary_ar' => ''])
            ->assertSessionHasNoErrors();

        $page->refresh();
        $this->assertNull($page->summary);
        $this->assertNull($page->summary_ar);
        $this->assertSame('المركز الإعلامي', $page->title_ar);
        $this->assertSame([], $page->missingArabic());
    }

    public function test_saving_an_unchanged_page_logs_nothing(): void
    {
        $page = Page::factory()->create([
            'title' => 'About',
            'slug' => 'about',
            'summary' => null,
            'body' => 'Hi.',
            'title_ar' => 'من نحن',
            'summary_ar' => null,
            'body_ar' => 'مرحبًا.',
        ]);

        $this->actingAs($this->admin())
            ->put(route('admin.pages.update', $page), [
                'title' => 'About',
                'slug' => 'about',
                'summary' => '',
                'body' => 'Hi.',
                'title_ar' => 'من نحن',
                'summary_ar' => '',
                'body_ar' => 'مرحبًا.',
                'footer_group' => '',
                'is_published' => '1',
            ])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Nothing changed.');

        $this->assertSame(0, ActivityLog::query()->where('event', 'page.updated')->count());
    }

    public function test_a_page_may_not_take_another_pages_address(): void
    {
        Page::factory()->create(['slug' => 'press']);
        $page = Page::factory()->create(['title' => 'Careers', 'slug' => 'careers']);

        $this->actingAs($this->admin())
            ->put(route('admin.pages.update', $page), [
                'title' => 'Careers',
                'slug' => 'press',
                'body' => 'Join us.',
                'title_ar' => 'الوظائف',
                'body_ar' => 'انضم إلينا.',
                'is_published' => '1',
            ])
            ->assertSessionHasErrors(['slug' => 'Another page already uses this address.']);

        $this->assertSame('careers', $page->fresh()?->slug);
    }

    public function test_the_switch_in_the_table_publishes_and_hides_a_page(): void
    {
        $page = Page::factory()->inFooter(FooterGroup::Company)->unpublished()->create(['title' => 'Press', 'slug' => 'press']);
        $admin = $this->admin();

        $this->assertSame([], LandingContent::build()['pages']);

        $this->actingAs($admin)
            ->from(route('admin.pages.index'))
            ->patch(route('admin.pages.publish', $page), ['is_published' => true])
            ->assertRedirect(route('admin.pages.index'))
            ->assertInertiaFlash('toast.message', '“Press” is live at /pages/press.');

        $this->assertTrue($page->fresh()?->is_published);
        $this->assertSame([['title' => 'Press', 'slug' => 'press', 'group' => 'company', 'url' => '/pages/press']], LandingContent::build()['pages']);

        $this->patch(route('admin.pages.publish', $page), ['is_published' => false])
            ->assertInertiaFlash('toast.message', '“Press” is hidden.');

        $this->assertFalse($page->fresh()?->is_published);
        $this->assertSame([], LandingContent::build()['pages']);
        $this->assertSame(2, ActivityLog::query()->where('event', 'page.updated')->where('subject_id', $page->id)->count());

        $this->patch(route('admin.pages.publish', $page), [])->assertSessionHasErrors('is_published');
    }

    public function test_the_footer_order_can_be_changed(): void
    {
        $privacy = Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Privacy', 'slug' => 'privacy']);
        $terms = Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Terms', 'slug' => 'terms']);
        $dpa = Page::factory()->inFooter(FooterGroup::Legal)->create(['title' => 'Data processing', 'slug' => 'data-processing']);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.pages.index'))
            ->post(route('admin.pages.reorder'), ['ids' => [$dpa->id, $privacy->id, $terms->id]])
            ->assertRedirect(route('admin.pages.index'))
            ->assertInertiaFlash('toast.message', 'Footer order saved.');

        $this->assertSame(
            ['data-processing', 'privacy', 'terms'],
            array_column(LandingContent::build()['pages'], 'slug'),
        );

        $log = ActivityLog::query()->where('event', 'page.reordered')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame([$dpa->id, $privacy->id, $terms->id], $log->properties['order'] ?? null);
        $this->assertSame(0, ActivityLog::query()->where('event', 'page.updated')->count());

        $this->post(route('admin.pages.reorder'), ['ids' => [$dpa->id, 9999]])->assertSessionHasErrors('ids.1');
        $this->post(route('admin.pages.reorder'), ['ids' => []])->assertSessionHasErrors('ids');
    }

    public function test_admins_can_delete_a_page(): void
    {
        $page = Page::factory()->inFooter(FooterGroup::Company)->create(['title' => 'Careers', 'slug' => 'careers']);
        $admin = $this->admin();

        $this->assertCount(1, LandingContent::build()['pages']);

        $this->actingAs($admin)
            ->delete(route('admin.pages.destroy', $page))
            ->assertRedirect(route('admin.pages.index'))
            ->assertInertiaFlash('toast.message', '“Careers” deleted.');

        $this->assertModelMissing($page);
        $this->assertSame([], LandingContent::build()['pages']);
        $this->get('/pages/careers')->assertNotFound();

        $log = ActivityLog::query()->where('event', 'page.deleted')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame(['careers', null], $log->properties['changes']['slug'] ?? null);
    }

    public function test_the_preview_renders_markdown_exactly_like_the_public_page(): void
    {
        $body = implode("\n\n", [
            '## Your *photos*',
            '<script>alert("x")</script>',
            '[Click me](javascript:alert(1))',
            '[Safe link](https://nlv.example/terms)',
            '- One',
        ]);
        $page = Activity::withoutModelLogging(fn () => Page::factory()->create(['slug' => 'terms', 'body' => $body]));

        $html = $this->actingAs($this->admin())
            ->postJson(route('admin.pages.preview'), ['body' => $body])
            ->assertOk()
            ->json('html');

        $this->assertSame($page->html(), $html);
        $this->assertStringContainsString('<h2>Your <em>photos</em></h2>', $html);
        $this->assertStringContainsString('<a href="https://nlv.example/terms">Safe link</a>', $html);
        $this->assertStringNotContainsString('<script', $html);
        $this->assertStringNotContainsString('javascript:', $html);

        $this->get('/pages/terms')->assertInertia(fn (Assert $inertia) => $inertia->where('page.html', $html));

        $this->postJson(route('admin.pages.preview'), ['body' => ''])->assertExactJson(['html' => '']);
        $this->postJson(route('admin.pages.preview'), ['body' => str_repeat('a', 100001)])->assertJsonValidationErrors('body');
        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_the_preview_renders_the_arabic_text_like_the_arabic_page(): void
    {
        $body = "## صورك\n\n<script>alert(1)</script>\n\n[رابط](javascript:alert(1)) و**TryOn**";
        Activity::withoutModelLogging(fn () => Page::factory()->create(['slug' => 'privacy', 'body' => 'English.', 'body_ar' => $body]));

        $html = $this->actingAs($this->admin())
            ->postJson(route('admin.pages.preview'), ['body' => $body, 'locale' => 'ar'])
            ->assertOk()
            ->json('html');

        $this->assertStringContainsString('<h2>صورك</h2>', $html);
        $this->assertStringContainsString('<strong>TryOn</strong>', $html);
        $this->assertStringNotContainsString('<script', $html);
        $this->assertStringNotContainsString('javascript:', $html);

        $this->get('/ar/pages/privacy')->assertInertia(fn (Assert $inertia) => $inertia->where('page.html', $html));

        // An empty Arabic text renders nothing (not the English), and the language must be one of the site's.
        $this->postJson(route('admin.pages.preview'), ['body' => '', 'locale' => 'ar'])->assertExactJson(['html' => '']);
        $this->postJson(route('admin.pages.preview'), ['body' => 'Hi', 'locale' => 'fr'])->assertJsonValidationErrors('locale');
        $this->postJson(route('admin.pages.preview'), ['body' => '**Hi**', 'locale' => 'en'])->assertExactJson(['html' => "<p><strong>Hi</strong></p>\n"]);
    }

    public function test_the_index_marks_pages_whose_arabic_is_missing_and_searches_the_arabic(): void
    {
        Page::factory()->arabic()->create(['title' => 'Privacy', 'slug' => 'privacy', 'sort_order' => 0]);
        Page::factory()->create(['title' => 'Press', 'slug' => 'press', 'summary' => 'News.', 'sort_order' => 1, 'title_ar' => 'المركز الإعلامي']);
        Page::factory()->arabic()->create([
            'title' => 'Careers',
            'slug' => 'careers',
            'sort_order' => 2,
            'body' => 'Open roles.',
            'body_ar' => "> **صفحة مؤقتة.** استبدِلها قبل الإطلاق.\n\nنص.",
        ]);

        $this->actingAs($this->admin())
            ->get(route('admin.pages.index'))
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->where('pages.data.0.slug', 'privacy')
                ->where('pages.data.0.missing_arabic', [])
                ->where('pages.data.0.placeholder', false)
                ->where('pages.data.1.slug', 'press')
                ->where('pages.data.1.missing_arabic', ['summary', 'body'])
                ->where('pages.data.2.slug', 'careers')
                ->where('pages.data.2.missing_arabic', [])
                ->where('pages.data.2.placeholder', true),
            );

        $this->get(route('admin.pages.index', ['search' => 'الإعلامي']))
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->has('pages.data', 1)
                ->where('pages.data.0.slug', 'press'),
            );
    }

    /**
     * A verified admin, created without an activity entry.
     */
    private function admin(): User
    {
        return Activity::withoutModelLogging(fn () => User::factory()->admin()->create());
    }
}
