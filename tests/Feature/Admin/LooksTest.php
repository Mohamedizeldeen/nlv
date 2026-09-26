<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\User;
use App\Support\LandingContent;
use App\Support\MediaRef;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LooksTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    /**
     * Every Lookbook route: [method, route name, needs a look].
     *
     * @return array<string, array{0: string, 1: string, 2: bool}>
     */
    public static function routes(): array
    {
        return [
            'index' => ['get', 'admin.looks.index', false],
            'create' => ['get', 'admin.looks.create', false],
            'store' => ['post', 'admin.looks.store', false],
            'edit' => ['get', 'admin.looks.edit', true],
            'update' => ['put', 'admin.looks.update', true],
            'publish' => ['patch', 'admin.looks.publish', true],
            'reorder' => ['post', 'admin.looks.reorder', false],
            'destroy' => ['delete', 'admin.looks.destroy', true],
        ];
    }

    #[DataProvider('routes')]
    public function test_guests_are_sent_to_the_login_page(string $method, string $name, bool $withLook): void
    {
        $url = route($name, $withLook ? Look::factory()->create() : []);

        $this->{$method}($url)->assertRedirect(route('login'));
    }

    #[DataProvider('routes')]
    public function test_non_admins_are_forbidden(string $method, string $name, bool $withLook): void
    {
        $url = route($name, $withLook ? Look::factory()->create() : []);

        $this->actingAs(User::factory()->create())->{$method}($url)->assertForbidden();
    }

    public function test_admins_see_the_grid_in_page_order(): void
    {
        $abayas = LookCategory::factory()->create(['name' => 'Abayas', 'slug' => 'abayas']);
        $second = Look::factory()->for($abayas, 'category')->create(['title' => 'Second', 'sort_order' => 2]);
        $first = Look::factory()->for($abayas, 'category')->create(['title' => 'First', 'sort_order' => 1]);
        Look::factory()->for($abayas, 'category')->unpublished()->create(['title' => 'Third', 'sort_order' => 3]);

        $this->actingAs($this->admin())
            ->get(route('admin.looks.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/looks/index')
                ->where('view', 'grid')
                ->where('order', null)
                ->where('counts', ['total' => 3, 'live' => 2])
                ->has('looks.data', 3)
                ->where('looks.data.0.id', $first->id)
                ->where('looks.data.0.position', 1)
                ->where('looks.data.0.category.slug', 'abayas')
                ->where('looks.data.0.after', ['kind' => 'unsplash', 'id' => 'photo-1762605135318-f34a993cbcf0'])
                ->where('looks.data.0.before', null)
                ->where('looks.data.1.id', $second->id)
                ->where('looks.data.2.is_published', false)
                ->where('looks.data.0.arabic_missing', ['title', 'city', 'alt'])
                ->has('categories', 1)
                ->where('categories.0.looks_count', 3),
            );
    }

    public function test_the_grid_marks_looks_whose_arabic_is_missing(): void
    {
        $translated = Look::factory()->arabic()->create(['sort_order' => 0]);
        $partly = Look::factory()->arabic()->create(['sort_order' => 1, 'alt_ar' => null]);

        $this->actingAs($this->admin())
            ->get(route('admin.looks.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('looks.data.0.id', $translated->id)
                ->where('looks.data.0.arabic_missing', [])
                ->where('looks.data.1.id', $partly->id)
                ->where('looks.data.1.arabic_missing', ['alt']));

        $this->actingAs($this->admin())
            ->get(route('admin.looks.index', ['view' => 'order']))
            ->assertInertia(fn (Assert $page) => $page->where('order.1.arabic_missing', ['alt']));
    }

    public function test_the_grid_can_be_searched_and_filtered(): void
    {
        $abayas = LookCategory::factory()->create(['slug' => 'abayas']);
        $eyewear = LookCategory::factory()->create(['slug' => 'eyewear']);
        $riyadh = Look::factory()->for($abayas, 'category')->create(['title' => 'Quilted abaya', 'city' => 'Riyadh']);
        $london = Look::factory()->for($eyewear, 'category')->create(['title' => 'Round acetate', 'city' => 'London']);
        $hidden = Look::factory()->for($eyewear, 'category')->unpublished()->create(['title' => 'Clear frames', 'city' => 'Tokyo']);

        $admin = $this->admin();
        $ids = fn (array $query) => collect($this->actingAs($admin)->get(route('admin.looks.index', $query))
            ->viewData('page')['props']['looks']['data'])->pluck('id')->all();

        $this->assertSame([$riyadh->id], $ids(['search' => 'riyadh']));
        $london->update(['title_ar' => 'إطار أسيتات دائري', 'city_ar' => 'لندن']);
        $this->assertSame([$london->id], $ids(['search' => 'لندن']));
        $this->assertSame([$london->id, $hidden->id], $ids(['category' => 'eyewear']));
        $this->assertSame([$hidden->id], $ids(['status' => 'hidden']));
        $this->assertSame([$london->id], $ids(['category' => 'eyewear', 'status' => 'live']));
        $this->assertSame([], $ids(['search' => '100%']));

        $this->actingAs($admin)->get(route('admin.looks.index', ['search' => 'tokyo', 'status' => 'nonsense']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', ['search' => 'tokyo', 'category' => null, 'status' => null])
                ->has('looks.data', 1));
    }

    public function test_the_search_takes_wildcards_literally(): void
    {
        $percent = Look::factory()->create(['title' => 'Linen shirt', 'city' => 'Milan', 'alt' => 'A linen shirt, 50% cotton.']);
        Look::factory()->create(['title' => 'Silk gown', 'city' => 'Paris', 'alt' => 'A silk gown with 500 pleats.']);
        $underscore = Look::factory()->create(['title' => 'Frames SKU_204', 'city' => 'Tokyo', 'alt' => 'Round frames.']);
        $space = Look::factory()->create(['title' => 'Frames SKU 204', 'city' => 'Seoul', 'alt' => 'Square frames.']);
        $bang = Look::factory()->create(['title' => 'Try it now!', 'city' => 'London', 'alt' => 'A camel coat.']);
        Look::factory()->create(['title' => 'Nowhere coat', 'city' => 'Oslo', 'alt' => 'A wool coat.']);

        $admin = $this->admin();
        $ids = fn (string $search) => collect($this->actingAs($admin)->get(route('admin.looks.index', ['search' => $search]))
            ->viewData('page')['props']['looks']['data'])->pluck('id')->all();

        // "%" and "_" are not wildcards, and "!" (the escape character) is plain text too.
        $this->assertSame([$percent->id], $ids('50%'));
        $this->assertSame([$underscore->id], $ids('sku_204'));
        $this->assertSame([$bang->id], $ids('now!'));
        $this->assertSame([$underscore->id, $space->id], $ids('SKU'));
    }

    public function test_the_order_view_lists_every_look(): void
    {
        $looks = Look::factory()->count(3)->sequence(
            ['sort_order' => 2], ['sort_order' => 0], ['sort_order' => 1],
        )->create();

        $this->actingAs($this->admin())
            ->get(route('admin.looks.index', ['view' => 'order']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('view', 'order')
                ->where('looks', null)
                ->has('order', 3)
                ->where('order.0.id', $looks[1]->id)
                ->where('order.1.id', $looks[2]->id)
                ->where('order.2.id', $looks[0]->id)
                ->where('order.2.position', 3));
    }

    public function test_the_create_form_can_preselect_a_category(): void
    {
        $category = LookCategory::factory()->create(['slug' => 'evening']);
        Look::factory()->count(2)->create();

        $this->actingAs($this->admin())
            ->get(route('admin.looks.create', ['category' => 'evening']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/looks/create')
                ->where('look.id', null)
                ->where('look.look_category_id', $category->id)
                ->where('look.focus', [0.5, 0.5])
                ->where('position', 3)
                ->has('categories', 3));
    }

    public function test_a_look_is_created_from_uploads(): void
    {
        $category = LookCategory::factory()->create();
        Look::factory()->create(['sort_order' => 4]);
        $admin = $this->admin();

        $response = $this->actingAs($admin)->post(route('admin.looks.store'), [
            ...$this->payload($category),
            'after_image' => UploadedFile::fake()->image('result.jpg', 800, 1000),
            'before_image' => UploadedFile::fake()->image('shopper.png', 600, 600),
        ]);

        $look = Look::query()->latest('id')->firstOrFail();

        $response->assertRedirect(route('admin.looks.edit', $look))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.type', 'success');

        $this->assertSame('Linen shirt, sand', $look->title);
        $this->assertSame('قميص كتان، رملي', $look->title_ar);
        $this->assertSame('لشبونة', $look->city_ar);
        $this->assertSame('رجل في قميص كتان رملي في شارع مشمس', $look->alt_ar);
        $this->assertSame($category->id, $look->look_category_id);
        $this->assertSame(1.6, $look->render_seconds);
        $this->assertSame(0.8, $look->aspect);
        $this->assertSame([0.3, 0.25], [$look->focus_x, $look->focus_y]);
        $this->assertSame(5, $look->sort_order);
        $this->assertTrue($look->is_published);
        $this->assertMatchesRegularExpression('#^landing/looks/[0-9a-f-]{36}\.webp$#', $look->after_image);
        $this->assertNotNull($look->before_image);
        Storage::disk('public')->assertExists([$look->after_image, $look->before_image]);

        $log = ActivityLog::query()->where('event', 'look.created')->where('subject_id', $look->id)->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('Linen shirt, sand', $log->properties['changes']['title'][1] ?? null);
        $this->assertSame([null, 'قميص كتان، رملي'], $log->properties['changes']['title_ar'] ?? null);

        $landing = LandingContent::build()['lookbook']['looks'];
        $this->assertSame('Linen shirt, sand', collect($landing)->firstWhere('id', $look->id)['title'] ?? null);
        $arabic = LandingContent::build('ar')['lookbook']['looks'];
        $this->assertSame('قميص كتان، رملي', collect($arabic)->firstWhere('id', $look->id)['title'] ?? null);
    }

    public function test_the_try_on_result_is_required_for_a_new_look(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.looks.store'), $this->payload(LookCategory::factory()->create()))
            ->assertSessionHasErrors(['after_image' => 'Add the try-on result: it is the photo shoppers see.']);

        $this->assertSame(0, Look::query()->count());
    }

    public function test_every_field_is_validated(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.looks.store'), [])->assertSessionHasErrors([
            'look_category_id', 'title', 'title_ar', 'city', 'city_ar', 'render_seconds', 'alt', 'alt_ar',
            'after_image', 'focus_x', 'focus_y', 'is_published',
        ]);

        $this->actingAs($admin)->post(route('admin.looks.store'), [
            ...$this->payload(LookCategory::factory()->create()),
            'look_category_id' => 999,
            'title' => str_repeat('a', 81),
            'city' => str_repeat('a', 61),
            'render_seconds' => 1.85,
            'alt' => str_repeat('a', 201),
            'focus_x' => 1.5,
            'focus_y' => -0.1,
            'after_image' => UploadedFile::fake()->image('small.jpg', 300, 300),
            'before_image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])->assertSessionHasErrors([
            'look_category_id' => 'That category no longer exists. Choose another one.',
            'title', 'city',
            'render_seconds' => 'Use one decimal place, e.g. 1.8.',
            'alt', 'focus_x', 'focus_y',
            'after_image' => 'The try-on result needs to be at least 400 × 400 pixels.',
            'before_image',
        ]);

        $this->actingAs($admin)->post(route('admin.looks.store'), [
            ...$this->payload(LookCategory::factory()->create()),
            'render_seconds' => 12,
        ])->assertSessionHasErrors(['render_seconds' => 'The render time can be at most 9.9 seconds.']);

        $this->assertSame(0, Look::query()->count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_the_arabic_caption_is_required_with_readable_messages(): void
    {
        $admin = $this->admin();
        $category = LookCategory::factory()->create();

        $this->actingAs($admin)->post(route('admin.looks.store'), [
            ...$this->payload($category),
            'title_ar' => '',
            'city_ar' => '   ',
            'alt_ar' => null,
            'after_image' => UploadedFile::fake()->image('result.jpg', 800, 1000),
        ])->assertSessionHasErrors([
            'title_ar' => 'The Arabic title field is required.',
            'city_ar' => 'The Arabic city field is required.',
            'alt_ar' => 'The Arabic alt text field is required.',
        ]);

        $this->actingAs($admin)->post(route('admin.looks.store'), [
            ...$this->payload($category),
            'title_ar' => str_repeat('ع', 81),
            'city_ar' => str_repeat('ع', 61),
            'alt_ar' => str_repeat('ع', 201),
            'after_image' => UploadedFile::fake()->image('result.jpg', 800, 1000),
        ])->assertSessionHasErrors([
            'title_ar' => 'The Arabic title field must not be greater than 80 characters.',
            'city_ar' => 'The Arabic city field must not be greater than 60 characters.',
            'alt_ar' => 'The Arabic alt text field must not be greater than 200 characters.',
        ]);

        // At the limit (counted in characters, not bytes) it is accepted.
        $this->actingAs($admin)->post(route('admin.looks.store'), [
            ...$this->payload($category),
            'title_ar' => str_repeat('ع', 80),
            'after_image' => UploadedFile::fake()->image('result.jpg', 800, 1000),
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Look::query()->count());
    }

    public function test_the_edit_form_shows_the_look(): void
    {
        $look = Look::factory()->create(['title' => 'Camel coat', 'focus_x' => 0.4, 'focus_y' => 0.3, 'sort_order' => 1]);
        Look::factory()->create(['sort_order' => 0]);

        $this->actingAs($this->admin())
            ->get(route('admin.looks.edit', $look))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/looks/edit')
                ->where('look.id', $look->id)
                ->where('look.title', 'Camel coat')
                ->where('look.title_ar', '')
                ->where('look.city_ar', '')
                ->where('look.alt_ar', '')
                ->where('look.focus', [0.4, 0.3])
                ->where('look.after.kind', 'unsplash')
                ->where('look.before', null)
                ->where('position', 2)
                ->has('categories', 2));
    }

    public function test_saving_without_new_files_keeps_the_images(): void
    {
        $look = Look::factory()->create(['title' => 'Old title', 'aspect' => 0.667]);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->put(route('admin.looks.update', $look), [
                ...$this->payload($look->category),
                'title' => 'New title',
            ])
            ->assertRedirect(route('admin.looks.edit', $look))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Look saved.');

        $look->refresh();
        $this->assertSame('New title', $look->title);
        $this->assertSame(MediaRef::unsplash('photo-1762605135318-f34a993cbcf0'), $look->after_image);
        $this->assertSame(0.667, $look->aspect);

        $log = ActivityLog::query()->where('event', 'look.updated')->sole();
        $this->assertSame(['Old title', 'New title'], $log->properties['changes']['title'] ?? null);
        $this->assertArrayNotHasKey('after_image', $log->properties['changes'] ?? []);
    }

    public function test_the_arabic_caption_is_saved_logged_and_shown_on_the_arabic_page(): void
    {
        $look = Look::factory()->arabic()->create(['title' => 'Quilted abaya, navy', 'city' => 'Riyadh']);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('admin.looks.edit', $look))
            ->assertInertia(fn (Assert $page) => $page
                ->where('look.title_ar', 'عباءة مبطّنة، كحلي')
                ->where('look.city_ar', 'الرياض'));

        $this->actingAs($admin)
            ->put(route('admin.looks.update', $look), [
                ...$this->payload($look->category),
                'title' => 'Quilted abaya, navy',
                'city' => 'Riyadh',
                'title_ar' => 'عباية مبطّنة، كحلية',
                'city_ar' => 'جدة',
            ])
            ->assertRedirect(route('admin.looks.edit', $look))
            ->assertSessionHasNoErrors();

        $look->refresh();
        $this->assertSame('عباية مبطّنة، كحلية', $look->title_ar);
        $this->assertSame('جدة', $look->city_ar);

        $changes = ActivityLog::query()->where('event', 'look.updated')->sole()->properties['changes'] ?? [];
        $this->assertSame(['عباءة مبطّنة، كحلي', 'عباية مبطّنة، كحلية'], $changes['title_ar'] ?? null);
        $this->assertSame(['الرياض', 'جدة'], $changes['city_ar'] ?? null);
        $this->assertArrayNotHasKey('title', $changes);

        $this->get('/ar')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.lookbook.looks.0.title', 'عباية مبطّنة، كحلية')
            ->where('landing.lookbook.looks.0.city', 'جدة')
            ->where('landing.lookbook.looks.0.alt', 'رجل في قميص كتان رملي في شارع مشمس'));

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.lookbook.looks.0.title', 'Quilted abaya, navy')
            ->where('landing.lookbook.looks.0.city', 'Riyadh'));
    }

    public function test_a_new_try_on_result_replaces_the_old_upload_and_its_aspect(): void
    {
        $look = Look::factory()->create();
        $admin = $this->admin();

        $this->actingAs($admin)->put(route('admin.looks.update', $look), [
            ...$this->payload($look->category),
            'after_image' => UploadedFile::fake()->image('wide.jpg', 1200, 800),
        ])->assertSessionHasNoErrors();

        $first = $look->refresh()->after_image;
        $this->assertSame(1.5, $look->aspect);
        Storage::disk('public')->assertExists($first);

        $this->actingAs($admin)->put(route('admin.looks.update', $look), [
            ...$this->payload($look->category),
            'after_image' => UploadedFile::fake()->image('tall.jpg', 600, 900),
        ])->assertSessionHasNoErrors();

        $look->refresh();
        $this->assertNotSame($first, $look->after_image);
        $this->assertSame(0.667, $look->aspect);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($look->after_image);
    }

    public function test_the_before_photo_can_be_added_and_removed(): void
    {
        $look = Look::factory()->create();
        $admin = $this->admin();

        $this->actingAs($admin)->put(route('admin.looks.update', $look), [
            ...$this->payload($look->category),
            'before_image' => UploadedFile::fake()->image('shopper.jpg', 700, 900),
        ])->assertSessionHasNoErrors();

        $before = $look->refresh()->before_image;
        $this->assertNotNull($before);
        Storage::disk('public')->assertExists($before);
        $this->assertSame('upload', LandingContent::build()['lookbook']['looks'][0]['before']['kind'] ?? null);

        $this->actingAs($admin)->put(route('admin.looks.update', $look), [
            ...$this->payload($look->category),
            'remove_before_image' => '1',
        ])->assertSessionHasNoErrors();

        $this->assertNull($look->refresh()->before_image);
        Storage::disk('public')->assertMissing($before);
        $this->assertNull(LandingContent::build()['lookbook']['looks'][0]['before']);
    }

    public function test_a_look_can_be_hidden_and_shown_from_the_grid(): void
    {
        $look = Look::factory()->create(['title' => 'Silk gown']);
        $admin = $this->admin();

        $this->assertCount(1, LandingContent::build()['lookbook']['looks']);

        $this->actingAs($admin)
            ->from(route('admin.looks.index'))
            ->patch(route('admin.looks.publish', $look), ['is_published' => false])
            ->assertRedirect(route('admin.looks.index'))
            ->assertInertiaFlash('toast.message', '“Silk gown” is hidden from the landing page.');

        $this->assertFalse($look->refresh()->is_published);
        $this->assertSame([], LandingContent::build()['lookbook']['looks']);
        $this->assertSame(
            ['is_published' => [true, false]],
            ActivityLog::query()->where('event', 'look.updated')->sole()->properties['changes'] ?? null,
        );

        $this->actingAs($admin)->patch(route('admin.looks.publish', $look), ['is_published' => true]);
        $this->assertTrue($look->refresh()->is_published);

        $this->actingAs($admin)->patch(route('admin.looks.publish', $look), [])->assertSessionHasErrors('is_published');
    }

    public function test_the_page_order_is_saved(): void
    {
        [$a, $b, $c] = Look::factory()->count(3)->create()->all();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.looks.index', ['view' => 'order']))
            ->post(route('admin.looks.reorder'), ['ids' => [$c->id, $a->id, $b->id]])
            ->assertRedirect(route('admin.looks.index', ['view' => 'order']))
            ->assertInertiaFlash('toast.type', 'success');

        $this->assertSame([$c->id, $a->id, $b->id], Look::query()->ordered()->pluck('id')->all());
        $this->assertSame([$c->id, $a->id, $b->id], array_column(LandingContent::build()['lookbook']['looks'], 'id'));
        $this->assertSame(
            [$c->id, $a->id, $b->id],
            ActivityLog::query()->where('event', 'look.reordered')->sole()->properties['order'] ?? null,
        );

        $this->actingAs($admin)->post(route('admin.looks.reorder'), ['ids' => []])->assertSessionHasErrors('ids');
        $this->actingAs($admin)->post(route('admin.looks.reorder'), ['ids' => [$a->id, $a->id]])->assertSessionHasErrors('ids.0');
    }

    public function test_looks_missing_from_a_reorder_follow_the_ones_sent(): void
    {
        [$a, $b, $c, $d] = Look::factory()->count(4)->create()->all();

        // A list from a page opened before $c and $d were added, with a look
        // deleted meanwhile (9999).
        $this->actingAs($this->admin())
            ->post(route('admin.looks.reorder'), ['ids' => [$b->id, 9999, $a->id]])
            ->assertSessionHasNoErrors();

        $this->assertSame([$b->id, $a->id, $c->id, $d->id], Look::query()->ordered()->pluck('id')->all());
        $this->assertSame([0, 1, 2, 3], Look::query()->ordered()->pluck('sort_order')->all());
        $this->assertSame(
            [$b->id, $a->id, $c->id, $d->id],
            ActivityLog::query()->where('event', 'look.reordered')->sole()->properties['order'] ?? null,
        );
    }

    public function test_a_look_and_its_uploads_are_deleted(): void
    {
        $look = Look::factory()->create([
            'after_image' => UploadedFile::fake()->image('a.jpg', 500, 500)->store('landing/looks', 'public'),
            'before_image' => UploadedFile::fake()->image('b.jpg', 500, 500)->store('landing/looks', 'public'),
        ]);
        $files = [$look->after_image, (string) $look->before_image];
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.looks.edit', $look))
            ->delete(route('admin.looks.destroy', $look))
            ->assertRedirect(route('admin.looks.index'))
            ->assertInertiaFlash('toast.type', 'success');

        $this->assertModelMissing($look);
        Storage::disk('public')->assertMissing($files);
        $this->assertSame(1, ActivityLog::query()->where('event', 'look.deleted')->count());

        // From the grid, the admin stays where they were.
        $other = Look::factory()->create();

        $this->actingAs($admin)
            ->from(route('admin.looks.index', ['category' => $other->category->slug]))
            ->delete(route('admin.looks.destroy', $other))
            ->assertRedirect(route('admin.looks.index', ['category' => $other->category->slug]));
    }

    /**
     * A valid form submission without files.
     *
     * @return array<string, mixed>
     */
    private function payload(LookCategory $category): array
    {
        return [
            'look_category_id' => $category->id,
            'title' => 'Linen shirt, sand',
            'title_ar' => 'قميص كتان، رملي',
            'city' => 'Lisbon',
            'city_ar' => 'لشبونة',
            'render_seconds' => '1.6',
            'alt' => 'A man in a sand linen shirt on a sunny street',
            'alt_ar' => 'رجل في قميص كتان رملي في شارع مشمس',
            'focus_x' => '0.30',
            'focus_y' => '0.25',
            'is_published' => '1',
        ];
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }
}
