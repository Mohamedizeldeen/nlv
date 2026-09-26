<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Look;
use App\Models\LookCategory;
use App\Models\User;
use App\Support\LandingContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LookCategoriesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Every category route: [method, route name, needs a category].
     *
     * @return array<string, array{0: string, 1: string, 2: bool}>
     */
    public static function routes(): array
    {
        return [
            'index' => ['get', 'admin.look-categories.index', false],
            'create' => ['get', 'admin.look-categories.create', false],
            'store' => ['post', 'admin.look-categories.store', false],
            'edit' => ['get', 'admin.look-categories.edit', true],
            'update' => ['put', 'admin.look-categories.update', true],
            'reorder' => ['post', 'admin.look-categories.reorder', false],
            'destroy' => ['delete', 'admin.look-categories.destroy', true],
        ];
    }

    #[DataProvider('routes')]
    public function test_guests_are_sent_to_the_login_page(string $method, string $name, bool $withCategory): void
    {
        $url = route($name, $withCategory ? LookCategory::factory()->create() : []);

        $this->{$method}($url)->assertRedirect(route('login'));
    }

    #[DataProvider('routes')]
    public function test_non_admins_are_forbidden(string $method, string $name, bool $withCategory): void
    {
        $url = route($name, $withCategory ? LookCategory::factory()->create() : []);

        $this->actingAs(User::factory()->create())->{$method}($url)->assertForbidden();
    }

    public function test_admins_see_the_categories_in_page_order_with_their_looks(): void
    {
        $evening = LookCategory::factory()->create(['name' => 'Evening', 'slug' => 'evening', 'sort_order' => 1]);
        $abayas = LookCategory::factory()->arabic()->create(['name' => 'Abayas', 'slug' => 'abayas', 'sort_order' => 0, 'stat_figure' => '54', 'stat_unit' => 'most tried size', 'stat_figure_ar' => '54']);
        Look::factory()->count(4)->for($abayas, 'category')->create();
        Look::factory()->for($abayas, 'category')->unpublished()->create();
        Look::factory()->for($evening, 'category')->unpublished()->create();

        $this->actingAs($this->admin())
            ->get(route('admin.look-categories.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/look-categories/index')
                ->has('categories', 2)
                ->where('categories.0.id', $abayas->id)
                ->where('categories.0.stat_figure', '54')
                ->where('categories.0.name_ar', 'عباءات')
                ->where('categories.0.stat_figure_ar', '54')
                ->where('categories.0.arabic_missing', [])
                ->where('categories.0.looks_count', 5)
                ->where('categories.0.live_count', 4)
                ->has('categories.0.covers', 3)
                ->where('categories.0.covers.0.media.kind', 'unsplash')
                ->where('categories.1.id', $evening->id)
                ->where('categories.1.arabic_missing', ['name', 'note', 'stat_figure', 'stat_unit'])
                ->where('categories.1.looks_count', 1)
                ->where('categories.1.live_count', 0)
                ->has('categories.1.covers', 1)
                ->where('all.kicker', ['en' => 'This week’s edit', 'ar' => 'مختارات هذا الأسبوع'])
                ->where('all.unit', ['en' => 'looks', 'ar' => 'إطلالة'])
                ->where('all.line.ar', 'اخترناها من بين 71,400 تجربة في اثنتي عشرة مدينة هذا الأسبوع.')
                ->where('all.live', 4)
                ->where('suffix', ['en' => 'this week', 'ar' => 'هذا الأسبوع']));
    }

    public function test_a_category_is_created_with_a_slug_from_its_name(): void
    {
        LookCategory::factory()->create(['sort_order' => 3]);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.look-categories.store'), [
                'name' => 'Evening Wear',
                'name_ar' => 'أزياء السهرة',
                'slug' => '',
                'note' => 'Occasion wear peaks before Eid.',
                'note_ar' => 'يبلغ الإقبال على أزياء المناسبات ذروته قبل العيد.',
                'stat_figure' => 'Sat',
                'stat_figure_ar' => 'السبت',
                'stat_unit' => 'peak try-on day',
                'stat_unit_ar' => 'يوم ذروة التجارب',
            ])
            ->assertRedirect(route('admin.look-categories.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.type', 'success');

        $category = LookCategory::query()->where('name', 'Evening Wear')->sole();
        $this->assertSame('evening-wear', $category->slug);
        $this->assertSame(4, $category->sort_order);
        $this->assertSame('peak try-on day', $category->stat_unit);
        $this->assertSame('أزياء السهرة', $category->name_ar);
        $this->assertSame('يبلغ الإقبال على أزياء المناسبات ذروته قبل العيد.', $category->note_ar);
        $this->assertSame('السبت', $category->stat_figure_ar);
        $this->assertSame('يوم ذروة التجارب', $category->stat_unit_ar);

        $log = ActivityLog::query()->where('event', 'look_category.created')->where('subject_id', $category->id)->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame([null, 'السبت'], $log->properties['changes']['stat_figure_ar'] ?? null);
    }

    public function test_a_typed_slug_is_normalised(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.look-categories.store'), ['name' => 'Eyewear', 'name_ar' => 'النظارات', 'slug' => '  Frames & Sun!  '])
            ->assertSessionHasNoErrors();

        $this->assertSame('frames-sun', LookCategory::query()->sole()->slug);
    }

    public function test_the_category_fields_are_validated(): void
    {
        LookCategory::factory()->create(['name' => 'Abayas', 'slug' => 'abayas']);
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.look-categories.store'), [])
            ->assertSessionHasErrors(['name', 'name_ar', 'slug']);

        $this->actingAs($admin)->post(route('admin.look-categories.store'), [
            'name' => 'Abayas',
            'name_ar' => 'العبايات',
            'slug' => 'abayas',
            'note' => str_repeat('a', 201),
            'note_ar' => str_repeat('ع', 201),
            'stat_figure' => str_repeat('9', 17),
            'stat_figure_ar' => str_repeat('9', 17),
            'stat_unit' => str_repeat('a', 41),
            'stat_unit_ar' => str_repeat('ع', 41),
        ])->assertSessionHasErrors([
            'name' => 'There is already a category with this name.',
            'slug' => 'Another category already uses this slug.',
            'note', 'stat_figure', 'stat_unit',
            'note_ar' => 'The Arabic note field must not be greater than 200 characters.',
            'stat_figure_ar' => 'The Arabic figure field must not be greater than 16 characters.',
            'stat_unit_ar' => 'The Arabic unit field must not be greater than 40 characters.',
        ]);

        $this->actingAs($admin)->post(route('admin.look-categories.store'), ['name' => 'All', 'name_ar' => 'الكل'])
            ->assertSessionHasErrors(['slug' => '“all” is the lookbook’s own “All” filter. Choose another slug.']);

        $this->actingAs($admin)->post(route('admin.look-categories.store'), [
            'name' => 'Knitwear', 'name_ar' => 'التريكو', 'stat_unit' => 'sizes', 'stat_unit_ar' => 'مقاسات',
        ])->assertSessionHasErrors([
            'stat_figure' => 'Add the figure this unit belongs to, or clear the unit.',
            'stat_figure_ar' => 'Add the Arabic figure this unit belongs to, or clear the unit.',
        ]);

        $this->assertSame(1, LookCategory::query()->count());
    }

    public function test_the_arabic_name_is_required_and_unique(): void
    {
        LookCategory::factory()->arabic()->create(['name' => 'Abayas', 'slug' => 'abayas']);
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.look-categories.store'), ['name' => 'Knitwear'])
            ->assertSessionHasErrors(['name_ar' => 'The Arabic name field is required.']);

        $this->actingAs($admin)->post(route('admin.look-categories.store'), ['name' => 'Knitwear', 'name_ar' => str_repeat('ع', 41)])
            ->assertSessionHasErrors(['name_ar' => 'The Arabic name field must not be greater than 40 characters.']);

        $this->actingAs($admin)->post(route('admin.look-categories.store'), ['name' => 'Knitwear', 'name_ar' => 'عباءات'])
            ->assertSessionHasErrors(['name_ar' => 'There is already a category with this Arabic name.']);

        $this->assertSame(1, LookCategory::query()->count());

        // Saving a category with its own Arabic name is fine.
        $category = LookCategory::query()->sole();
        $this->actingAs($admin)->put(route('admin.look-categories.update', $category), [
            'name' => 'Abayas', 'name_ar' => 'عباءات', 'slug' => 'abayas',
        ])->assertSessionHasNoErrors();
    }

    public function test_the_note_figure_and_unit_come_in_both_languages_or_neither(): void
    {
        $admin = $this->admin();
        $base = ['name' => 'Knitwear', 'name_ar' => 'التريكو'];

        $this->actingAs($admin)->post(route('admin.look-categories.store'), [
            ...$base, 'note' => 'Chunky knits lead in Copenhagen.', 'stat_figure' => '38%', 'stat_unit' => 'went into the bag',
        ])->assertSessionHasErrors([
            'note_ar' => 'Add the Arabic note too, or leave both empty.',
            'stat_figure_ar' => 'Add the Arabic figure too (the same digits work), or leave both empty.',
            'stat_unit_ar' => 'Add the Arabic unit too, or leave both empty.',
        ]);

        $this->actingAs($admin)->post(route('admin.look-categories.store'), [
            ...$base, 'note_ar' => 'التريكو الثقيل يتصدّر في كوبنهاغن.', 'stat_figure_ar' => '38%', 'stat_unit_ar' => 'دخلت حقيبة التسوّق',
        ])->assertSessionHasErrors([
            'note' => 'Add the English note too, or leave both empty.',
            'stat_figure' => 'Add the English figure too, or leave both empty.',
            'stat_unit' => 'Add the English unit too, or leave both empty.',
        ]);

        // A figure without a unit is fine, in both languages.
        $this->actingAs($admin)->post(route('admin.look-categories.store'), [
            ...$base, 'stat_figure' => '38%', 'stat_figure_ar' => '38%',
        ])->assertSessionHasNoErrors();

        $this->assertSame('38%', LookCategory::query()->sole()->stat_figure_ar);
    }

    public function test_the_edit_form_shows_the_category(): void
    {
        $first = LookCategory::factory()->create(['name' => 'Abayas', 'sort_order' => 0]);
        $category = LookCategory::factory()->create(['name' => 'Eyewear', 'name_ar' => 'النظارات', 'sort_order' => 1]);
        Look::factory()->count(2)->for($category, 'category')->create();

        $this->actingAs($this->admin())
            ->get(route('admin.look-categories.edit', $category))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/look-categories/edit')
                ->where('category.id', $category->id)
                ->where('category.name', 'Eyewear')
                ->where('category.name_ar', 'النظارات')
                ->where('category.note_ar', null)
                ->where('category.looks_count', 2)
                ->where('category.live_count', 2)
                ->has('category.covers', 2)
                ->where('siblings', [
                    ['id' => $first->id, 'name' => 'Abayas', 'name_ar' => null],
                    ['id' => $category->id, 'name' => 'Eyewear', 'name_ar' => 'النظارات'],
                ])
                ->where('suffix', ['en' => 'this week', 'ar' => 'هذا الأسبوع']));

        $this->actingAs($this->admin())
            ->get(route('admin.look-categories.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/look-categories/create')
                ->where('category.id', null)
                ->where('category.name_ar', '')
                ->has('siblings', 2)
                ->has('suffix'));
    }

    public function test_a_category_is_updated_and_the_landing_page_follows(): void
    {
        $category = LookCategory::factory()->create(['name' => 'Abayas', 'slug' => 'abayas', 'note' => 'Old note']);
        Look::factory()->for($category, 'category')->create();
        $admin = $this->admin();

        $this->assertSame('Old note', LandingContent::build()['lookbook']['categories'][0]['note']);

        $this->actingAs($admin)
            ->put(route('admin.look-categories.update', $category), [
                'name' => 'Abayas',
                'name_ar' => 'العبايات',
                'slug' => 'abayas',
                'note' => 'Sizes run 52 to 60.',
                'note_ar' => 'المقاسات من 52 إلى 60.',
                'stat_figure' => '54',
                'stat_figure_ar' => '54',
                'stat_unit' => 'most tried size',
                'stat_unit_ar' => 'المقاس الأكثر تجربة',
            ])
            ->assertRedirect(route('admin.look-categories.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', '“Abayas” saved.');

        $this->assertSame('Sizes run 52 to 60.', $category->refresh()->note);
        $this->assertSame(
            ['figure' => '54', 'unit' => 'most tried size'],
            LandingContent::build()['lookbook']['categories'][0]['stat'],
        );

        $log = ActivityLog::query()->where('event', 'look_category.updated')->sole();
        $this->assertSame(['Old note', 'Sizes run 52 to 60.'], $log->properties['changes']['note'] ?? null);
        $this->assertSame([null, 'المقاسات من 52 إلى 60.'], $log->properties['changes']['note_ar'] ?? null);
        $this->assertSame([null, 'العبايات'], $log->properties['changes']['name_ar'] ?? null);

        // The Arabic page shows the Arabic; the English page is unchanged.
        $this->get('/ar')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.lookbook.categories.0.name', 'العبايات')
            ->where('landing.lookbook.categories.0.note', 'المقاسات من 52 إلى 60.')
            ->where('landing.lookbook.categories.0.stat', ['figure' => '54', 'unit' => 'المقاس الأكثر تجربة']));

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('landing.lookbook.categories.0.name', 'Abayas')
            ->where('landing.lookbook.categories.0.note', 'Sizes run 52 to 60.'));
    }

    public function test_the_filter_order_is_saved(): void
    {
        [$a, $b, $c] = LookCategory::factory()->count(3)->create()->all();

        $this->actingAs($this->admin())
            ->from(route('admin.look-categories.index'))
            ->post(route('admin.look-categories.reorder'), ['ids' => [$b->id, $c->id, $a->id]])
            ->assertRedirect(route('admin.look-categories.index'))
            ->assertInertiaFlash('toast.type', 'success');

        $this->assertSame([$b->id, $c->id, $a->id], LookCategory::query()->ordered()->pluck('id')->all());
        $this->assertSame(1, ActivityLog::query()->where('event', 'look_category.reordered')->count());
    }

    public function test_categories_missing_from_a_reorder_follow_the_ones_sent(): void
    {
        [$a, $b, $c, $d] = LookCategory::factory()->count(4)->create()->all();

        // A list from a page opened before $b and $d were added, with a
        // category deleted meanwhile (9999).
        $this->actingAs($this->admin())
            ->post(route('admin.look-categories.reorder'), ['ids' => [$c->id, 9999, $a->id]])
            ->assertSessionHasNoErrors();

        $this->assertSame([$c->id, $a->id, $b->id, $d->id], LookCategory::query()->ordered()->pluck('id')->all());
        $this->assertSame([0, 1, 2, 3], LookCategory::query()->ordered()->pluck('sort_order')->all());
        $this->assertSame(
            [$c->id, $a->id, $b->id, $d->id],
            ActivityLog::query()->where('event', 'look_category.reordered')->sole()->properties['order'] ?? null,
        );
    }

    public function test_an_empty_category_is_deleted(): void
    {
        $category = LookCategory::factory()->create(['name' => 'Knitwear']);

        $this->actingAs($this->admin())
            ->from(route('admin.look-categories.edit', $category))
            ->delete(route('admin.look-categories.destroy', $category))
            ->assertRedirect(route('admin.look-categories.index'))
            ->assertInertiaFlash('toast.message', '“Knitwear” deleted.');

        $this->assertModelMissing($category);
        $this->assertSame(1, ActivityLog::query()->where('event', 'look_category.deleted')->count());
    }

    public function test_a_category_with_looks_is_kept_with_a_friendly_error(): void
    {
        $category = LookCategory::factory()->create(['name' => 'Abayas']);
        Look::factory()->count(3)->for($category, 'category')->unpublished()->create();

        $this->actingAs($this->admin())
            ->from(route('admin.look-categories.index'))
            ->delete(route('admin.look-categories.destroy', $category))
            ->assertRedirect(route('admin.look-categories.index'))
            ->assertInertiaFlash('toast.type', 'error')
            ->assertInertiaFlash(
                'toast.message',
                '“Abayas” still has 3 looks. Move them to another category or delete them first.',
            );

        $this->assertModelExists($category);
        $this->assertSame(0, ActivityLog::query()->where('event', 'look_category.deleted')->count());
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }
}
