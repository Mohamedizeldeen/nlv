<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Looks\LookCategoryRequest;
use App\Http\Requests\Admin\Looks\ReorderRequest;
use App\Models\Look;
use App\Models\LookCategory;
use App\Support\Locales;
use App\Support\MediaRef;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * /admin/look-categories: the Lookbook's filters (Abayas, Everyday...), in
 * page order, each with its "this week" note and figure, in English and
 * Arabic (`name` + `name_ar`, ...). A category that still has looks cannot
 * be deleted.
 */
class LookCategoryController extends Controller
{
    /**
     * Cover photos shown per category in the list.
     */
    private const COVERS = 3;

    /**
     * Every category in page order, with its look counts and a few covers.
     */
    public function index(): Response
    {
        $covers = $this->covers();

        $categories = LookCategory::query()
            ->withCount([
                'looks',
                'looks as live_count' => fn ($query) => $query->where('is_published', true),
            ])
            ->ordered()
            ->get()
            ->map(fn (LookCategory $category): array => [
                ...$this->fields($category),
                'looks_count' => (int) $category->getAttribute('looks_count'),
                'live_count' => (int) $category->getAttribute('live_count'),
                'covers' => $covers[$category->id] ?? [],
                // Written in English but not in Arabic: /ar shows the English there.
                'arabic_missing' => $category->missingArabic(),
            ]);

        return Inertia::render('admin/look-categories/index', [
            'categories' => array_values($categories->all()),
            // The "All" filter's note, edited in Site content (for the preview).
            'all' => [
                'kicker' => $this->setting('sections.lookbook.all_kicker'),
                'line' => $this->setting('sections.lookbook.all_note'),
                'unit' => $this->setting('sections.lookbook.all_unit'),
                'live' => Look::query()->published()->count(),
            ],
            'suffix' => $this->setting('sections.lookbook.category_suffix'),
        ]);
    }

    /**
     * The form for a new category.
     */
    public function create(): Response
    {
        return Inertia::render('admin/look-categories/create', [
            'category' => [
                'id' => null,
                'name' => '',
                'name_ar' => '',
                'slug' => '',
                'note' => null,
                'note_ar' => null,
                'stat_figure' => null,
                'stat_figure_ar' => null,
                'stat_unit' => null,
                'stat_unit_ar' => null,
                'looks_count' => 0,
                'live_count' => 0,
                'covers' => [],
            ],
            'siblings' => $this->siblings(),
            'suffix' => $this->setting('sections.lookbook.category_suffix'),
        ]);
    }

    /**
     * Store a new category (placed after the last one).
     */
    public function store(LookCategoryRequest $request): RedirectResponse
    {
        $category = LookCategory::query()->create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "“{$category->name}” added. It appears on the page once it has a live look.",
        ]);

        return to_route('admin.look-categories.index');
    }

    /**
     * The form for an existing category.
     */
    public function edit(LookCategory $lookCategory): Response
    {
        $lookCategory->loadCount([
            'looks',
            'looks as live_count' => fn ($query) => $query->where('is_published', true),
        ]);

        return Inertia::render('admin/look-categories/edit', [
            'category' => [
                ...$this->fields($lookCategory),
                'looks_count' => (int) $lookCategory->getAttribute('looks_count'),
                'live_count' => (int) $lookCategory->getAttribute('live_count'),
                'covers' => $this->covers($lookCategory->id)[$lookCategory->id] ?? [],
            ],
            'siblings' => $this->siblings(),
            'suffix' => $this->setting('sections.lookbook.category_suffix'),
        ]);
    }

    /**
     * Save a category.
     */
    public function update(LookCategoryRequest $request, LookCategory $lookCategory): RedirectResponse
    {
        $lookCategory->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "“{$lookCategory->name}” saved."]);

        return to_route('admin.look-categories.index');
    }

    /**
     * Save the page order of the filters (logged once as
     * `look_category.reordered`). Categories the list left out (added in
     * another tab meanwhile) keep their relative order after the ones sent.
     */
    public function reorder(ReorderRequest $request): RedirectResponse
    {
        LookCategory::reorder(LookCategory::completeOrder($request->ids()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Filter order saved.']);

        return back();
    }

    /**
     * Delete an empty category. One that still has looks is kept, with a
     * message saying what to do first.
     */
    public function destroy(LookCategory $lookCategory): RedirectResponse
    {
        $count = $lookCategory->looks()->count();

        if ($count > 0) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => "“{$lookCategory->name}” still has ".$count.' '.Str::plural('look', $count)
                    .'. Move them to another category or delete them first.',
            ]);

            return back();
        }

        $lookCategory->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "“{$lookCategory->name}” deleted."]);

        return to_route('admin.look-categories.index');
    }

    /**
     * Every category's name (both languages) in page order, for the
     * filter-bar preview.
     *
     * @return list<array{id: int, name: string, name_ar: string|null}>
     */
    private function siblings(): array
    {
        return array_values(LookCategory::query()->ordered()->get(['id', 'name', 'name_ar', 'sort_order'])
            ->map(fn (LookCategory $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'name_ar' => $category->name_ar,
            ])
            ->all());
    }

    /**
     * The editable fields of a category, in both languages.
     *
     * @return array{id: int, name: string, name_ar: string, slug: string, note: string|null, note_ar: string|null, stat_figure: string|null, stat_figure_ar: string|null, stat_unit: string|null, stat_unit_ar: string|null}
     */
    private function fields(LookCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'name_ar' => $category->name_ar ?? '',
            'slug' => $category->slug,
            'note' => $category->note,
            'note_ar' => $category->note_ar,
            'stat_figure' => $category->stat_figure,
            'stat_figure_ar' => $category->stat_figure_ar,
            'stat_unit' => $category->stat_unit,
            'stat_unit_ar' => $category->stat_unit_ar,
        ];
    }

    /**
     * A lookbook setting (edited in Site content) as each page shows it,
     * for the previews: {en, ar}.
     *
     * @return array{en: string, ar: string}
     */
    private function setting(string $key): array
    {
        return [
            'en' => Settings::string($key, Locales::ENGLISH),
            'ar' => Settings::string($key, Locales::ARABIC),
        ];
    }

    /**
     * The first few looks of each category (live ones first, then page
     * order), as small covers: category id => list of {media, focus}.
     *
     * @return array<int, list<array{media: array<string, mixed>, focus: array{0: float, 1: float}}>>
     */
    private function covers(?int $categoryId = null): array
    {
        $covers = [];

        $looks = Look::query()
            ->when($categoryId, fn ($query, int $id) => $query->where('look_category_id', $id))
            ->orderByDesc('is_published')
            ->ordered()
            ->get(['id', 'look_category_id', 'after_image', 'focus_x', 'focus_y', 'is_published', 'sort_order']);

        foreach ($looks as $look) {
            if (count($covers[$look->look_category_id] ?? []) >= self::COVERS) {
                continue;
            }

            $media = MediaRef::toArray($look->after_image);

            if ($media !== null) {
                $covers[$look->look_category_id][] = [
                    'media' => $media,
                    'focus' => [(float) $look->focus_x, (float) $look->focus_y],
                ];
            }
        }

        return $covers;
    }
}
