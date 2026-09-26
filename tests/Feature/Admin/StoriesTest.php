<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Story;
use App\Models\User;
use App\Support\ImageUploader;
use App\Support\LandingContent;
use App\Support\MediaRef;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StoriesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    /**
     * Every stories route: [HTTP method, route name, needs a story].
     *
     * @return array<string, array{0: string, 1: string, 2: bool}>
     */
    public static function routes(): array
    {
        return [
            'index' => ['get', 'admin.stories.index', false],
            'create' => ['get', 'admin.stories.create', false],
            'store' => ['post', 'admin.stories.store', false],
            'edit' => ['get', 'admin.stories.edit', true],
            'update' => ['put', 'admin.stories.update', true],
            'destroy' => ['delete', 'admin.stories.destroy', true],
            'reorder' => ['post', 'admin.stories.reorder', false],
            'publish' => ['patch', 'admin.stories.publish', true],
        ];
    }

    #[DataProvider('routes')]
    public function test_guests_are_sent_to_the_login_page(string $method, string $name, bool $needsStory): void
    {
        $this->call(strtoupper($method), $this->routeUrl($name, $needsStory))
            ->assertRedirect(route('login'));
    }

    #[DataProvider('routes')]
    public function test_non_admins_are_forbidden(string $method, string $name, bool $needsStory): void
    {
        $url = $this->routeUrl($name, $needsStory);
        $stories = Story::query()->count();

        $this->actingAs(User::factory()->create())
            ->call(strtoupper($method), $url, $this->payload())
            ->assertForbidden();

        $this->assertSame($stories, Story::query()->count());
    }

    public function test_admins_see_every_story_in_page_order(): void
    {
        $second = Story::factory()->create(['name' => 'Khalid Mansour', 'sort_order' => 1, 'metric_short' => null, 'metric_label' => 'Frames tried']);
        $hidden = Story::factory()->unpublished()->create(['name' => 'Elena Marchetti', 'sort_order' => 2]);
        $first = Story::factory()->arabic()->create(['name' => 'Noura Al-Harbi', 'sort_order' => 0, 'portrait_zoom' => 1.35]);

        $this->actingAs($this->admin())
            ->get(route('admin.stories.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/stories/index')
                ->has('stories', 3)
                ->where('stories.0.id', $first->id)
                ->where('stories.1.id', $second->id)
                ->where('stories.2.id', $hidden->id)
                ->has('stories.0', fn (Assert $story) => $story
                    ->where('id', $first->id)
                    ->where('name', 'Noura Al-Harbi')
                    ->where('role', $first->role)
                    ->where('store', $first->store)
                    ->where('city', $first->city)
                    ->where('quote', $first->quote)
                    ->where('metric', ['figure' => $first->metric_figure, 'label' => 'Sales', 'short' => 'sales'])
                    ->where('portrait', ['kind' => 'unsplash', 'id' => 'photo-1567532939604-b6b5b0db2604'])
                    ->where('focus', [0.5, 0.35])
                    ->where('zoom', 1.35)
                    ->where('is_published', true)
                    ->where('arabic_missing', []),
                )
                // Without a short label the list shows the full one.
                ->where('stories.1.metric.short', 'Frames tried')
                // Untranslated texts are listed, so the row can say so.
                ->where('stories.1.arabic_missing', ['name', 'role', 'store', 'city', 'quote', 'metric_label', 'metric_note'])
                ->where('stories.2.is_published', false),
            );
    }

    public function test_the_create_form_starts_blank_and_places_the_story_last(): void
    {
        Story::factory()->count(4)->create();

        $this->actingAs($this->admin())
            ->get(route('admin.stories.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/stories/create')
                ->where('story.id', null)
                ->where('story.name', '')
                ->where('story.name_ar', '')
                ->where('story.quote_ar', '')
                ->where('story.metric_short_ar', null)
                ->where('story.metric_note_ar', null)
                ->where('story.portrait', null)
                ->where('story.portrait_focus', [0.5, 0.35])
                ->where('story.portrait_zoom', 1)
                ->where('story.is_published', true)
                ->where('position', 5)
                ->where('total', 5)
                ->where('limits', ['quote' => 320, 'zoomMin' => 1, 'zoomMax' => 2.5]),
            );
    }

    public function test_the_edit_form_carries_the_story_its_place_and_its_history(): void
    {
        Story::factory()->create();
        $story = Story::factory()->create([
            'name' => 'Elena Marchetti',
            'name_ar' => 'إيلينا ماركيتي',
            'quote_ar' => 'صار عملاؤنا *يقيسون القطعة أمام المرآة* قبل غرفة القياس.',
            'coordinates' => '45.46° N · 9.19° E',
            'metric_short' => null,
            'portrait_focus_x' => 0.47,
            'portrait_focus_y' => 0.5,
            'portrait_zoom' => 1.3,
        ]);
        Story::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('admin.stories.edit', $story))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/stories/edit')
                ->where('story.id', $story->id)
                ->where('story.name', 'Elena Marchetti')
                ->where('story.coordinates', '45.46° N · 9.19° E')
                ->where('story.quote', $story->quote)
                ->where('story.metric_figure', $story->metric_figure)
                ->where('story.metric_short', null)
                ->where('story.name_ar', 'إيلينا ماركيتي')
                ->where('story.quote_ar', 'صار عملاؤنا *يقيسون القطعة أمام المرآة* قبل غرفة القياس.')
                // Not translated yet: null, so the form shows an empty Arabic input.
                ->where('story.role_ar', null)
                ->where('story.metric_label_ar', null)
                ->where('story.portrait', ['kind' => 'unsplash', 'id' => 'photo-1567532939604-b6b5b0db2604'])
                ->where('story.portrait_focus', [0.47, 0.5])
                ->where('story.portrait_zoom', 1.3)
                ->where('story.is_published', true)
                ->whereType('story.updated_at', 'string')
                ->where('position', 2)
                ->where('total', 3)
                ->has('history', 1)
                ->where('history.0.event', 'story.created')
                ->where('history.0.description', 'Created story “Elena Marchetti”'),
            );
    }

    public function test_a_story_is_added_with_an_uploaded_portrait(): void
    {
        Story::factory()->create();
        $admin = $this->admin();

        $response = $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'portrait' => UploadedFile::fake()->image('amira.jpg', 800, 1000),
            ]));

        $response->assertRedirect(route('admin.stories.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.type', 'success')
            ->assertInertiaFlash('toast.message', 'Story added: Amira Haddad is on the landing page.');

        $story = Story::query()->where('name', 'Amira Haddad')->firstOrFail();

        $this->assertSame('Owner', $story->role);
        $this->assertSame('Maison Amira', $story->store);
        $this->assertSame('Paris', $story->city);
        $this->assertSame('48.86° N · 2.35° E', $story->coordinates);
        $this->assertSame('Shoppers try it on at the mirror first. Sales *rose by a fifth* in one season.', $story->quote);
        $this->assertSame(['+20%', 'Sales', 'sales', 'in one season'], [$story->metric_figure, $story->metric_label, $story->metric_short, $story->metric_note]);
        $this->assertSame([0.4, 0.3, 1.25], [$story->portrait_focus_x, $story->portrait_focus_y, $story->portrait_zoom]);
        $this->assertTrue($story->is_published);
        $this->assertSame(1, $story->sort_order);
        $this->assertSame(
            ['أميرة حدّاد', 'صاحبة المتجر', 'ميزون أميرة', 'باريس', 'المبيعات', 'المبيعات', 'في موسم واحد'],
            [$story->name_ar, $story->role_ar, $story->store_ar, $story->city_ar, $story->metric_label_ar, $story->metric_short_ar, $story->metric_note_ar],
        );
        $this->assertSame('صارت المتسوّقات يجرّبن القطعة أمام المرآة أولًا، وقد *ارتفعت المبيعات بمقدار الخُمس* في موسم واحد.', $story->quote_ar);
        $this->assertSame([], $story->missingArabic());

        $this->assertMatchesRegularExpression('#^landing/stories/[0-9a-f-]{36}\.webp$#', $story->portrait);
        Storage::disk('public')->assertExists($story->portrait);

        $log = ActivityLog::query()->where('event', 'story.created')->where('subject_id', $story->id)->firstOrFail();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame([null, 'Amira Haddad'], $log->properties['changes']['name'] ?? null);
        $this->assertSame([null, 'أميرة حدّاد'], $log->properties['changes']['name_ar'] ?? null);

        $landing = LandingContent::build()['stories'];

        $this->assertSame('Amira Haddad', $landing[1]['name'] ?? null);
        $this->assertSame('upload', $landing[1]['portrait']['kind'] ?? null);
        $this->assertSame(['before' => 'Shoppers try it on at the mirror first. Sales ', 'accent' => 'rose by a fifth', 'after' => ' in one season.'], $landing[1]['quote'] ?? null);
    }

    public function test_a_hidden_story_is_saved_but_left_off_the_landing_page(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.stories.store'), $this->payload([
                'is_published' => '0',
                'coordinates' => '',
                'metric_short' => '',
                'metric_note' => '',
                'metric_short_ar' => '',
                'metric_note_ar' => '',
                'portrait' => UploadedFile::fake()->image('amira.png', 600, 600),
            ]))
            ->assertRedirect(route('admin.stories.index'))
            ->assertInertiaFlash('toast.message', 'Story added: Amira Haddad is saved, hidden from the landing page.');

        $story = Story::query()->firstOrFail();

        $this->assertFalse($story->is_published);
        $this->assertNull($story->coordinates);
        $this->assertNull($story->metric_short);
        $this->assertNull($story->metric_note);
        $this->assertNull($story->metric_short_ar);
        $this->assertNull($story->metric_note_ar);
        $this->assertSame([], LandingContent::build()['stories']);
        $this->assertSame([], LandingContent::build('ar')['stories']);
    }

    public function test_every_required_field_is_checked(): void
    {
        $this->actingAs($this->admin())
            ->from(route('admin.stories.create'))
            ->post(route('admin.stories.store'), [])
            ->assertRedirect(route('admin.stories.create'))
            ->assertSessionHasErrors([
                'name', 'role', 'store', 'city', 'quote', 'metric_figure', 'metric_label',
                'name_ar', 'role_ar', 'store_ar', 'city_ar', 'quote_ar', 'metric_label_ar',
                'portrait', 'portrait_focus_x', 'portrait_focus_y', 'portrait_zoom', 'is_published',
            ])
            ->assertSessionHasErrors(['portrait' => 'Add a portrait of the store owner.'])
            ->assertSessionDoesntHaveErrors(['coordinates', 'metric_short', 'metric_note', 'metric_short_ar', 'metric_note_ar']);

        $this->assertSame(0, Story::query()->count());
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    public function test_lengths_and_ranges_are_checked(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.stories.store'), $this->payload([
                'name' => Str::repeat('a', 81),
                'role' => Str::repeat('a', 81),
                'store' => Str::repeat('a', 81),
                'city' => Str::repeat('a', 61),
                'coordinates' => Str::repeat('a', 41),
                'quote' => 'A *phrase* '.Str::repeat('a', 320),
                'metric_figure' => Str::repeat('9', 17),
                'metric_label' => Str::repeat('a', 41),
                'metric_short' => Str::repeat('a', 25),
                'metric_note' => Str::repeat('a', 41),
                'name_ar' => Str::repeat('ن', 81),
                'role_ar' => Str::repeat('ن', 81),
                'store_ar' => Str::repeat('ن', 81),
                'city_ar' => Str::repeat('ن', 61),
                'quote_ar' => 'عبارة *مميّزة* '.Str::repeat('ن', 320),
                'metric_label_ar' => Str::repeat('ن', 41),
                'metric_short_ar' => Str::repeat('ن', 25),
                'metric_note_ar' => Str::repeat('ن', 41),
                'portrait_focus_x' => '1.2',
                'portrait_focus_y' => '-0.1',
                'portrait_zoom' => '2.6',
                'is_published' => 'maybe',
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors([
                'name', 'role', 'store', 'city', 'coordinates', 'quote', 'metric_figure', 'metric_label',
                'metric_short', 'metric_note', 'portrait_focus_x', 'portrait_focus_y', 'portrait_zoom', 'is_published',
                'name_ar', 'role_ar', 'store_ar', 'city_ar', 'quote_ar', 'metric_label_ar', 'metric_short_ar', 'metric_note_ar',
            ]);

        $this->actingAs($this->admin())
            ->post(route('admin.stories.store'), $this->payload([
                'portrait_zoom' => '0.9',
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors(['portrait_zoom' => 'Set the zoom between 1× and 2.5×.']);

        $this->assertSame(0, Story::query()->count());
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function quotesWithoutOneAccent(): array
    {
        return [
            'no accent' => ['Sales rose by a third in one season.', 'Mark the phrase to set in mint with asterisks, *like this*.'],
            'unpaired asterisk' => ['Sales *rose by a third in one season.', 'One asterisk has no partner: wrap the highlighted phrase *like this*.'],
            'two accents' => ['Sales *rose* by *a third*.', 'Highlight one phrase only: the story card sets a single phrase in mint.'],
        ];
    }

    #[DataProvider('quotesWithoutOneAccent')]
    public function test_the_quote_highlights_exactly_one_phrase(string $quote, string $message): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.stories.store'), $this->payload([
                'quote' => $quote,
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors(['quote' => $message]);

        $this->assertSame(0, Story::query()->count());
    }

    public function test_arabic_is_required_for_every_visitor_facing_text_with_readable_names(): void
    {
        $this->actingAs($this->admin())
            ->from(route('admin.stories.create'))
            ->post(route('admin.stories.store'), $this->payload([
                'name_ar' => '',
                'role_ar' => '',
                'store_ar' => '',
                'city_ar' => '',
                'quote_ar' => '',
                'metric_label_ar' => '',
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertRedirect(route('admin.stories.create'))
            ->assertSessionHasErrors([
                'name_ar' => 'The Arabic name field is required.',
                'role_ar' => 'The Arabic role field is required.',
                'store_ar' => 'The Arabic store field is required.',
                'city_ar' => 'The Arabic city field is required.',
                'quote_ar' => 'The Arabic quote field is required.',
                'metric_label_ar' => 'The Arabic label field is required.',
            ])
            // The English is untouched, so it has no errors.
            ->assertSessionDoesntHaveErrors(['name', 'role', 'store', 'city', 'quote', 'metric_label']);

        $this->assertSame(0, Story::query()->count());
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    public function test_arabic_texts_have_the_english_limits(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'name_ar' => Str::repeat('ن', 81),
                'city_ar' => Str::repeat('ن', 61),
                'metric_label_ar' => Str::repeat('ن', 41),
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors([
                'name_ar' => 'The Arabic name field must not be greater than 80 characters.',
                'city_ar' => 'The Arabic city field must not be greater than 60 characters.',
                'metric_label_ar' => 'The Arabic label field must not be greater than 40 characters.',
            ]);

        // Exactly at the limits, counted in characters (not bytes): saved.
        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'name_ar' => Str::repeat('ن', 80),
                'city_ar' => Str::repeat('ن', 60),
                'quote_ar' => '*'.Str::repeat('ن', 318).'*',
                'metric_label_ar' => Str::repeat('ن', 40),
                'metric_short_ar' => Str::repeat('ن', 24),
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasNoErrors();

        $this->assertSame(80, mb_strlen((string) Story::query()->sole()->name_ar));
    }

    #[DataProvider('quotesWithoutOneAccent')]
    public function test_the_arabic_quote_highlights_exactly_one_phrase_too(string $quote, string $message): void
    {
        $arabic = strtr($quote, [
            'Sales rose by a third in one season.' => 'ارتفعت المبيعات بمقدار الثلث في موسم واحد.',
            'Sales *rose by a third in one season.' => 'ارتفعت المبيعات *بمقدار الثلث في موسم واحد.',
            'Sales *rose* by *a third*.' => 'ارتفعت *المبيعات* بمقدار *الثلث*.',
        ]);

        $this->actingAs($this->admin())
            ->post(route('admin.stories.store'), $this->payload([
                'quote_ar' => $arabic,
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors(['quote_ar' => $message])
            ->assertSessionDoesntHaveErrors(['quote']);

        $this->assertSame(0, Story::query()->count());
    }

    public function test_an_optional_text_is_in_both_languages_or_neither(): void
    {
        $admin = $this->admin();

        // English short label and note without their Arabic: /ar would show the English.
        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'metric_short_ar' => '',
                'metric_note_ar' => '',
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors([
                'metric_short_ar' => 'Add the short label in Arabic too, or clear the English one.',
                'metric_note_ar' => 'Add the note in Arabic too, or clear the English one.',
            ]);

        // An Arabic note without the English one: the English page would have none.
        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'metric_note' => '',
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasErrors(['metric_note' => 'Add the note in English too, or clear the Arabic one.'])
            ->assertSessionDoesntHaveErrors(['metric_note_ar']);

        $this->assertSame(0, Story::query()->count());

        // An Arabic short label alone is fine: the English list uses the label.
        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'metric_short' => '',
                'metric_short_ar' => 'المبيعات',
                'portrait' => UploadedFile::fake()->image('p.jpg', 800, 1000),
            ]))
            ->assertSessionHasNoErrors();

        $story = Story::query()->sole();

        $this->assertNull($story->metric_short);
        $this->assertSame('المبيعات', $story->metric_short_ar);
    }

    public function test_an_arabic_edit_is_logged_and_shown_on_the_arabic_page_only(): void
    {
        $admin = $this->admin();
        $story = Story::factory()->create($this->attributes());

        $this->get('/ar')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.stories.0.quote.accent', 'ارتفعت المبيعات بمقدار الخُمس'),
        );

        $this->actingAs($admin)
            ->put(route('admin.stories.update', $story), $this->payload([
                'quote_ar' => 'صار المتسوّقون يجرّبون أمام المرآة أولًا، و*زادت المبيعات بمقدار الخُمس* في موسم واحد.',
                'city_ar' => 'مدينة باريس',
                'metric_note_ar' => 'خلال موسم واحد',
            ]))
            ->assertRedirect(route('admin.stories.edit', $story))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Story saved.']);

        $story->refresh();

        $this->assertSame('مدينة باريس', $story->city_ar);
        $this->assertSame('Paris', $story->city);

        $log = ActivityLog::query()->where('event', 'story.updated')->where('subject_id', $story->id)->sole();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame([
            'city_ar' => ['باريس', 'مدينة باريس'],
            'quote_ar' => [
                'صارت المتسوّقات يجرّبن القطعة أمام المرآة أولًا، وقد *ارتفعت المبيعات بمقدار الخُمس* في موسم واحد.',
                'صار المتسوّقون يجرّبون أمام المرآة أولًا، و*زادت المبيعات بمقدار الخُمس* في موسم واحد.',
            ],
            'metric_note_ar' => ['في موسم واحد', 'خلال موسم واحد'],
        ], $log->properties['changes'] ?? null);
        $this->assertSame('Updated story “Amira Haddad” (city_ar, quote_ar, metric_note_ar)', $log->description);

        // The Arabic page (fresh payload: the save cleared the cache) shows the new Arabic…
        $this->get('/ar')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.locale', 'ar')
            ->where('landing.stories.0.name', 'أميرة حدّاد')
            ->where('landing.stories.0.city', 'مدينة باريس')
            ->where('landing.stories.0.quote', [
                'before' => 'صار المتسوّقون يجرّبون أمام المرآة أولًا، و',
                'accent' => 'زادت المبيعات بمقدار الخُمس',
                'after' => ' في موسم واحد.',
            ])
            ->where('landing.stories.0.metric', ['figure' => '+20%', 'label' => 'المبيعات', 'note' => 'خلال موسم واحد', 'short' => 'المبيعات'])
            // The portrait's alt text is built from the Arabic too (its wording belongs to lang/ar.json).
            ->where('landing.stories.0.portraitAlt', fn (string $alt): bool => str_contains($alt, 'أميرة حدّاد')
                && str_contains($alt, 'صاحبة المتجر') && str_contains($alt, 'ميزون أميرة')),
        );

        // …and the English page keeps the English.
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.stories.0.city', 'Paris')
            ->where('landing.stories.0.quote.accent', 'rose by a fifth')
            ->where('landing.stories.0.metric.note', 'in one season'),
        );
    }

    public function test_the_edit_page_history_lists_arabic_changes(): void
    {
        $admin = $this->admin();
        $story = Story::factory()->create($this->attributes());

        $this->actingAs($admin)
            ->put(route('admin.stories.update', $story), $this->payload(['role_ar' => 'مالكة المتجر']))
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)
            ->get(route('admin.stories.edit', $story))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('story.role_ar', 'مالكة المتجر')
                ->where('history.0.event', 'story.updated')
                ->where('history.0.description', 'Updated story “Amira Haddad” (role_ar)'),
            );
    }

    public function test_the_portrait_must_be_an_image_of_at_least_400_pixels(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'portrait' => UploadedFile::fake()->image('small.jpg', 399, 800),
            ]))
            ->assertSessionHasErrors(['portrait' => 'The portrait needs to be at least 400 × 400 px.']);

        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'portrait' => UploadedFile::fake()->create('portrait.pdf', 200, 'application/pdf'),
            ]))
            ->assertSessionHasErrors(['portrait' => 'Use a JPG, PNG, WebP or AVIF image.']);

        $this->actingAs($admin)
            ->post(route('admin.stories.store'), $this->payload([
                'portrait' => UploadedFile::fake()->image('huge.jpg', 800, 1000)->size(9000),
            ]))
            ->assertSessionHasErrors(['portrait' => 'The portrait may be at most 8 MB.']);

        $this->assertSame(0, Story::query()->count());
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    public function test_a_story_is_updated_and_keeps_its_portrait_without_a_new_file(): void
    {
        $story = Story::factory()->create(['name' => 'Noura Al-Harbi']);
        $portrait = $story->portrait;
        $admin = $this->admin();

        $this->actingAs($admin)
            ->put(route('admin.stories.update', $story), $this->payload([
                'name' => 'Noura Al-Harbi',
                'quote' => 'Now they try it on at the mirror first. Abaya sales *rose by a third* in one season.',
                'portrait_zoom' => '1.35',
            ]))
            ->assertRedirect(route('admin.stories.edit', $story))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Story saved.']);

        $story->refresh();

        $this->assertSame($portrait, $story->portrait);
        $this->assertSame('Maison Amira', $story->store);
        $this->assertSame(1.35, $story->portrait_zoom);

        $log = ActivityLog::query()->where('event', 'story.updated')->where('subject_id', $story->id)->latest('id')->firstOrFail();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertArrayHasKey('quote', $log->properties['changes'] ?? []);
        $this->assertArrayHasKey('portrait_zoom', $log->properties['changes'] ?? []);
        $this->assertArrayNotHasKey('portrait', $log->properties['changes'] ?? []);
        $this->assertArrayNotHasKey('name', $log->properties['changes'] ?? []);
    }

    public function test_a_new_portrait_replaces_the_old_upload_and_deletes_its_file(): void
    {
        $old = ImageUploader::store(UploadedFile::fake()->image('old.jpg', 800, 1000), 'landing/stories');
        $story = Story::factory()->create(['portrait' => $old]);

        $this->actingAs($this->admin())
            ->put(route('admin.stories.update', $story), $this->payload([
                'portrait' => UploadedFile::fake()->image('new.jpg', 900, 1100),
            ]))
            ->assertRedirect(route('admin.stories.edit', $story))
            ->assertSessionHasNoErrors();

        $story->refresh();

        $this->assertNotSame($old, $story->portrait);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($story->portrait);
        $this->assertSame([900, 1100], array_slice((array) getimagesize(Storage::disk('public')->path($story->portrait)), 0, 2));

        $log = ActivityLog::query()->where('event', 'story.updated')->latest('id')->firstOrFail();

        $this->assertSame([$old, $story->portrait], $log->properties['changes']['portrait'] ?? null);
    }

    public function test_saving_an_unchanged_story_writes_nothing(): void
    {
        $admin = $this->admin();
        $story = Story::factory()->create($this->attributes());
        $logged = ActivityLog::query()->count();
        $updatedAt = $story->updated_at?->toIso8601String();

        $this->travel(5)->minutes();

        $this->actingAs($admin)
            ->put(route('admin.stories.update', $story), $this->payload())
            ->assertRedirect(route('admin.stories.edit', $story))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.type', 'info');

        $this->assertSame($logged, ActivityLog::query()->count());
        $this->assertSame($updatedAt, $story->refresh()->updated_at?->toIso8601String());
    }

    public function test_a_failed_update_changes_nothing(): void
    {
        $admin = $this->admin();
        $story = Story::factory()->create(['name' => 'Noura Al-Harbi']);
        $logged = ActivityLog::query()->count();

        $this->actingAs($admin)
            ->from(route('admin.stories.edit', $story))
            ->put(route('admin.stories.update', $story), $this->payload(['name' => '', 'quote' => 'No accent here.']))
            ->assertRedirect(route('admin.stories.edit', $story))
            ->assertSessionHasErrors(['name', 'quote']);

        $this->assertSame('Noura Al-Harbi', $story->refresh()->name);
        $this->assertSame($logged, ActivityLog::query()->count());
    }

    public function test_a_story_is_deleted_with_its_uploaded_portrait(): void
    {
        $portrait = ImageUploader::store(UploadedFile::fake()->image('p.jpg', 800, 1000), 'landing/stories');
        $story = Story::factory()->create(['name' => 'Amira Haddad', 'portrait' => $portrait]);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->delete(route('admin.stories.destroy', $story))
            ->assertRedirect(route('admin.stories.index'))
            ->assertInertiaFlash('toast.message', 'Story deleted: Amira Haddad.');

        $this->assertModelMissing($story);
        Storage::disk('public')->assertMissing($portrait);

        $log = ActivityLog::query()->where('event', 'story.deleted')->firstOrFail();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('Deleted story “Amira Haddad”', $log->description);
        $this->assertSame([], LandingContent::build()['stories']);
    }

    public function test_deleting_a_stock_portrait_story_leaves_other_files_alone(): void
    {
        $other = ImageUploader::store(UploadedFile::fake()->image('p.jpg', 800, 1000), 'landing/stories');
        Story::factory()->create(['portrait' => $other]);
        $story = Story::factory()->create(['portrait' => MediaRef::unsplash('photo-1588178454780-441fa5b99fa5')]);

        $this->actingAs($this->admin())
            ->delete(route('admin.stories.destroy', $story))
            ->assertRedirect(route('admin.stories.index'));

        Storage::disk('public')->assertExists($other);
    }

    public function test_the_page_order_is_saved_and_logged_once(): void
    {
        $admin = $this->admin();
        [$a, $b, $c] = Story::factory()->count(3)->sequence(['name' => 'A'], ['name' => 'B'], ['name' => 'C'])->create()->all();
        $logged = ActivityLog::query()->count();

        $this->actingAs($admin)
            ->post(route('admin.stories.reorder'), ['ids' => [$c->id, $a->id, $b->id]])
            ->assertRedirect(route('admin.stories.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Page order saved.']);

        $this->assertSame([$c->id, $a->id, $b->id], Story::query()->ordered()->pluck('id')->all());
        $this->assertSame(['C', 'A', 'B'], array_column(LandingContent::build()['stories'], 'name'));

        $this->assertSame($logged + 1, ActivityLog::query()->count());
        $this->assertSame(['order' => [$c->id, $a->id, $b->id]], ActivityLog::query()->where('event', 'story.reordered')->firstOrFail()->properties);
    }

    public function test_stories_missing_from_a_reorder_follow_the_ones_sent(): void
    {
        [$a, $b, $c, $d] = Story::factory()->count(4)->create()->all();

        $this->actingAs($this->admin())
            ->post(route('admin.stories.reorder'), ['ids' => [$d->id, $b->id]])
            ->assertSessionHasNoErrors();

        $this->assertSame([$d->id, $b->id, $a->id, $c->id], Story::query()->ordered()->pluck('id')->all());
    }

    public function test_a_reorder_with_unknown_or_repeated_ids_is_rejected(): void
    {
        $admin = $this->admin();
        [$a, $b] = Story::factory()->count(2)->create()->all();
        $logged = ActivityLog::query()->count();

        $this->actingAs($admin)
            ->post(route('admin.stories.reorder'), ['ids' => [$b->id, 999]])
            ->assertSessionHasErrors(['ids.1']);

        $this->actingAs($admin)
            ->post(route('admin.stories.reorder'), ['ids' => [$b->id, $b->id]])
            ->assertSessionHasErrors(['ids.0']);

        $this->actingAs($admin)
            ->post(route('admin.stories.reorder'), [])
            ->assertSessionHasErrors(['ids']);

        $this->assertSame([$a->id, $b->id], Story::query()->ordered()->pluck('id')->all());
        $this->assertSame($logged, ActivityLog::query()->count());
    }

    public function test_the_publish_switch_hides_and_shows_a_story(): void
    {
        $story = Story::factory()->create(['name' => 'Noura Al-Harbi']);
        Story::factory()->create(['name' => 'Khalid Mansour']);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.stories.index'))
            ->patch(route('admin.stories.publish', $story), ['is_published' => false])
            ->assertRedirect(route('admin.stories.index'))
            ->assertInertiaFlash('toast.message', 'Noura Al-Harbi is hidden from the landing page.');

        $this->assertFalse($story->refresh()->is_published);
        $this->assertSame(['Khalid Mansour'], array_column(LandingContent::build()['stories'], 'name'));

        $log = ActivityLog::query()->where('event', 'story.updated')->where('subject_id', $story->id)->firstOrFail();

        $this->assertSame(['is_published' => [true, false]], $log->properties['changes'] ?? null);
        $this->assertSame($admin->id, $log->user_id);

        $this->actingAs($admin)
            ->from(route('admin.stories.index'))
            ->patch(route('admin.stories.publish', $story), ['is_published' => true])
            ->assertRedirect(route('admin.stories.index'))
            ->assertInertiaFlash('toast.message', 'Noura Al-Harbi is live on the landing page.');

        $this->assertSame(['Noura Al-Harbi', 'Khalid Mansour'], array_column(LandingContent::build()['stories'], 'name'));
    }

    public function test_the_publish_switch_needs_a_yes_or_no(): void
    {
        $story = Story::factory()->create();

        $this->actingAs($this->admin())
            ->patch(route('admin.stories.publish', $story), ['is_published' => 'soon'])
            ->assertSessionHasErrors(['is_published']);

        $this->assertTrue($story->refresh()->is_published);
    }

    /**
     * A verified admin.
     */
    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    /**
     * The URL of a stories route (with a story when it needs one).
     */
    private function routeUrl(string $name, bool $needsStory): string
    {
        return $needsStory ? route($name, Story::factory()->create()) : route($name);
    }

    /**
     * The model attributes matching payload().
     *
     * @return array<string, mixed>
     */
    private function attributes(): array
    {
        return [
            'name' => 'Amira Haddad',
            'role' => 'Owner',
            'store' => 'Maison Amira',
            'city' => 'Paris',
            'coordinates' => '48.86° N · 2.35° E',
            'quote' => 'Shoppers try it on at the mirror first. Sales *rose by a fifth* in one season.',
            'metric_figure' => '+20%',
            'metric_label' => 'Sales',
            'metric_short' => 'sales',
            'metric_note' => 'in one season',
            'name_ar' => 'أميرة حدّاد',
            'role_ar' => 'صاحبة المتجر',
            'store_ar' => 'ميزون أميرة',
            'city_ar' => 'باريس',
            'quote_ar' => 'صارت المتسوّقات يجرّبن القطعة أمام المرآة أولًا، وقد *ارتفعت المبيعات بمقدار الخُمس* في موسم واحد.',
            'metric_label_ar' => 'المبيعات',
            'metric_short_ar' => 'المبيعات',
            'metric_note_ar' => 'في موسم واحد',
            'portrait_focus_x' => 0.4,
            'portrait_focus_y' => 0.3,
            'portrait_zoom' => 1.25,
            'is_published' => true,
        ];
    }

    /**
     * A valid form submission (without a portrait file), as the browser sends it.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            ...array_map(fn (mixed $value): mixed => match (true) {
                is_bool($value) => $value ? '1' : '0',
                is_float($value) => number_format($value, 2, '.', ''),
                default => $value,
            }, $this->attributes()),
            ...$overrides,
        ];
    }
}
