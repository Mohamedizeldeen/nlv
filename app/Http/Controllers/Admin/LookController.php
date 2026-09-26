<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Looks\LookRequest;
use App\Http\Requests\Admin\Looks\ReorderRequest;
use App\Models\Look;
use App\Models\LookCategory;
use App\Support\ImageUploader;
use App\Support\MediaRef;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

/**
 * /admin/looks: the Lookbook's try-on photos (after image, optional before
 * image), their captions in English and Arabic (`title` + `title_ar`, ...),
 * their page order and whether they are live on the landing page.
 */
class LookController extends Controller
{
    /**
     * Looks per page in the grid.
     */
    private const PER_PAGE = 24;

    /**
     * Where uploads are stored on the public disk.
     */
    private const FOLDER = 'landing/looks';

    /**
     * The grid (filterable, paginated) or, with `?view=order`, every look in
     * page order for drag-and-drop.
     */
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $filters = [
            'search' => $this->stringQuery($request, 'search'),
            'category' => $this->stringQuery($request, 'category'),
            'status' => $status === 'live' || $status === 'hidden' ? $status : null,
        ];
        $view = $request->query('view') === 'order' ? 'order' : 'grid';
        $positions = $this->positions();

        $looks = null;
        $order = null;

        if ($view === 'order') {
            $order = Look::query()->with('category')->ordered()->get()
                ->map(fn (Look $look): array => $this->row($look, $positions))
                ->values()
                ->all();
        } else {
            $looks = $this->filtered($filters)
                ->with('category')
                ->ordered()
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Look $look): array => $this->row($look, $positions));
        }

        return Inertia::render('admin/looks/index', [
            'view' => $view,
            'looks' => $looks,
            'order' => $order,
            'categories' => $this->categoryOptions(),
            'filters' => $filters,
            'counts' => [
                'total' => Look::query()->count(),
                'live' => Look::query()->published()->count(),
            ],
        ]);
    }

    /**
     * The form for a new look (`?category=<slug>` preselects its filter).
     */
    public function create(Request $request): Response
    {
        $slug = $this->stringQuery($request, 'category');
        $category = $slug === null ? null : LookCategory::query()->where('slug', $slug)->first();

        return Inertia::render('admin/looks/create', [
            'look' => [
                'id' => null,
                'look_category_id' => $category?->id,
                'title' => '',
                'title_ar' => '',
                'city' => '',
                'city_ar' => '',
                'render_seconds' => 1.8,
                'alt' => '',
                'alt_ar' => '',
                'after' => null,
                'before' => null,
                'aspect' => 0.8,
                'focus' => [0.5, 0.5],
                'is_published' => true,
                'updated_at' => null,
            ],
            'categories' => $this->categoryOptions(),
            'position' => Look::query()->count() + 1,
        ]);
    }

    /**
     * Store a new look and its images.
     */
    public function store(LookRequest $request): RedirectResponse
    {
        $after = $request->afterImage();

        if ($after === null) {
            throw ValidationException::withMessages(['after_image' => 'Add the try-on result: it is the photo shoppers see.']);
        }

        $stored = [];

        try {
            $stored['after_image'] = $this->upload($after, 'after_image');

            if ($before = $request->beforeImage()) {
                $stored['before_image'] = $this->upload($before, 'before_image');
            }

            $look = Look::query()->create([
                ...$request->lookAttributes(),
                ...$stored,
                'aspect' => MediaRef::aspect($stored['after_image']) ?? 0.8,
            ]);
        } catch (Throwable $exception) {
            array_map(ImageUploader::delete(...), $stored);

            throw $exception;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $look->is_published ? 'Look added to the lookbook.' : 'Look saved, hidden from the page.',
        ]);

        return to_route('admin.looks.edit', $look);
    }

    /**
     * The form for an existing look.
     */
    public function edit(Look $look): Response
    {
        return Inertia::render('admin/looks/edit', [
            'look' => [
                'id' => $look->id,
                'look_category_id' => $look->look_category_id,
                'title' => $look->title,
                'title_ar' => $look->title_ar ?? '',
                'city' => $look->city,
                'city_ar' => $look->city_ar ?? '',
                'render_seconds' => (float) $look->render_seconds,
                'alt' => $look->alt,
                'alt_ar' => $look->alt_ar ?? '',
                'after' => MediaRef::toArray($look->after_image),
                'before' => MediaRef::toArray($look->before_image),
                'aspect' => (float) $look->aspect,
                'focus' => [(float) $look->focus_x, (float) $look->focus_y],
                'is_published' => $look->is_published,
                'updated_at' => $look->updated_at?->toIso8601String(),
            ],
            'categories' => $this->categoryOptions(),
            'position' => ($this->positions()[$look->id] ?? 0) + 1,
        ]);
    }

    /**
     * Save a look. A new after image replaces the stored one (and resets the
     * aspect); the before photo can be replaced or removed. Old uploads are
     * deleted by the model (HasMedia).
     */
    public function update(LookRequest $request, Look $look): RedirectResponse
    {
        $stored = [];

        try {
            if ($after = $request->afterImage()) {
                $stored['after_image'] = $this->upload($after, 'after_image');
            }

            if ($before = $request->beforeImage()) {
                $stored['before_image'] = $this->upload($before, 'before_image');
            }

            $look->fill($request->lookAttributes())->fill($stored);

            if (isset($stored['after_image'])) {
                $look->aspect = MediaRef::aspect($stored['after_image']) ?? $look->aspect;
            }

            if ($request->removesBeforeImage()) {
                $look->before_image = null;
            }

            $look->save();
        } catch (Throwable $exception) {
            array_map(ImageUploader::delete(...), $stored);

            throw $exception;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Look saved.']);

        return to_route('admin.looks.edit', $look);
    }

    /**
     * Show or hide a look on the landing page (the grid's inline switch).
     */
    public function publish(Request $request, Look $look): RedirectResponse
    {
        $validated = $request->validate(['is_published' => ['required', 'boolean']]);

        $look->update(['is_published' => (bool) $validated['is_published']]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $look->is_published
                ? "“{$look->title}” is live on the landing page."
                : "“{$look->title}” is hidden from the landing page.",
        ]);

        return back();
    }

    /**
     * Save the page order (logged once as `look.reordered`). Looks the list
     * left out (added in another tab meanwhile) keep their relative order
     * after the ones that were sent.
     */
    public function reorder(ReorderRequest $request): RedirectResponse
    {
        Look::reorder(Look::completeOrder($request->ids()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lookbook order saved.']);

        return back();
    }

    /**
     * Delete a look and its uploaded images. From its own edit page the
     * admin lands on the grid; from the grid, back where they were.
     */
    public function destroy(Request $request, Look $look): RedirectResponse
    {
        $look->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "“{$look->title}” deleted."]);

        $previous = (string) parse_url(url()->previous(), PHP_URL_PATH);

        return Str::startsWith($previous, "/admin/looks/{$look->id}")
            ? to_route('admin.looks.index')
            : back();
    }

    /**
     * Store an upload, turning an unreadable file into a validation error.
     */
    private function upload(UploadedFile $file, string $field): string
    {
        try {
            return ImageUploader::store($file, self::FOLDER);
        } catch (RuntimeException) {
            throw ValidationException::withMessages([
                $field => 'This file could not be read as an image. Try saving it again as JPG or PNG.',
            ]);
        }
    }

    /**
     * The grid's query with the filters applied (the search reads both
     * languages).
     *
     * @param  array{search: string|null, category: string|null, status: 'live'|'hidden'|null}  $filters
     * @return Builder<Look>
     */
    private function filtered(array $filters): Builder
    {
        return Look::query()
            ->when($filters['search'], function (Builder $query, string $search): void {
                // "!" escapes LIKE's wildcards, so "50%" or "look_12" mean exactly
                // that (MySQL and SQLite disagree about backslashes).
                $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';

                $query->where(function (Builder $query) use ($like): void {
                    foreach (['title', 'city', 'alt', 'title_ar', 'city_ar', 'alt_ar'] as $column) {
                        $query->orWhereRaw("{$column} like ? escape '!'", [$like]);
                    }
                });
            })
            ->when($filters['category'], fn (Builder $query, string $slug) => $query
                ->whereHas('category', fn (Builder $category) => $category->where('slug', $slug)))
            ->when($filters['status'], fn (Builder $query, string $status) => $query
                ->where('is_published', $status === 'live'));
    }

    /**
     * Every look's place in the page order: id => 0-based index.
     *
     * @return array<int, int>
     */
    private function positions(): array
    {
        /** @var list<int> $ids */
        $ids = Look::query()->ordered()->pluck('id')->map(intval(...))->all();

        return array_flip($ids);
    }

    /**
     * A look as the grid and the order list show it.
     *
     * @param  array<int, int>  $positions
     * @return array<string, mixed>
     */
    private function row(Look $look, array $positions): array
    {
        return [
            'id' => $look->id,
            'position' => ($positions[$look->id] ?? 0) + 1,
            'title' => $look->title,
            'city' => $look->city,
            'seconds' => (float) $look->render_seconds,
            'category' => [
                'id' => $look->category->id,
                'name' => $look->category->name,
                'slug' => $look->category->slug,
            ],
            'after' => MediaRef::toArray($look->after_image),
            'before' => MediaRef::toArray($look->before_image),
            'alt' => $look->alt,
            'aspect' => (float) $look->aspect,
            'focus' => [(float) $look->focus_x, (float) $look->focus_y],
            'is_published' => $look->is_published,
            // Written in English but not in Arabic: /ar shows the English there.
            'arabic_missing' => $look->missingArabic(),
            'updated_at' => $look->updated_at?->toIso8601String(),
        ];
    }

    /**
     * The categories in page order, for the filter and the form.
     *
     * @return list<array{id: int, name: string, slug: string, looks_count: int}>
     */
    private function categoryOptions(): array
    {
        return array_values(LookCategory::query()->withCount('looks')->ordered()->get()
            ->map(fn (LookCategory $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'looks_count' => (int) $category->getAttribute('looks_count'),
            ])
            ->all());
    }

    /**
     * A trimmed, non-empty query string value (or null).
     */
    private function stringQuery(Request $request, string $key): ?string
    {
        $value = $request->query($key);

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
