<?php

namespace App\Http\Controllers\Admin;

use App\Enums\FooterGroup;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Content\PagePreviewRequest;
use App\Http\Requests\Admin\Content\PageRequest;
use App\Http\Requests\Admin\Content\ReorderPagesRequest;
use App\Models\Page;
use App\Support\Locales;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

/**
 * /admin/pages: the content pages served at /pages/{slug} (About, Careers,
 * Privacy, Terms...) and in Arabic at /ar/pages/{slug}, their Markdown in
 * both languages, and the order of the footer columns that link to them.
 * Every change is logged by the model (page.created, page.updated,
 * page.deleted, page.reordered), the Arabic columns (`*_ar`) included.
 */
class PageController extends Controller
{
    /**
     * Pages per page in the table.
     */
    private const PER_PAGE = 25;

    /**
     * The note that opens every seeded placeholder page (LandingContentSeeder).
     */
    private const PLACEHOLDER_MARK = '**Placeholder page.**';

    /**
     * The same note in the seeded Arabic text.
     */
    private const PLACEHOLDER_MARK_AR = '**صفحة مؤقتة.**';

    /**
     * Sortable columns: query value => column.
     */
    private const SORTS = [
        'title' => 'title',
        'slug' => 'slug',
        'footer_group' => 'footer_group',
        'updated_at' => 'updated_at',
    ];

    /**
     * The table (searchable, filterable by footer column and status) and
     * the two footer columns in link order.
     */
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $group = $request->query('group');
        $filters = [
            'search' => $this->stringQuery($request, 'search'),
            'group' => in_array($group, [...FooterGroup::values(), 'none'], true) ? $group : null,
            'status' => $status === 'live' || $status === 'hidden' ? $status : null,
        ];
        $sort = $this->sort($request);
        $query = $this->filtered($filters);

        if ($sort === null) {
            $query->ordered();
        } else {
            $query->orderBy(self::SORTS[$sort['column']], $sort['direction'])->orderBy('id');
        }

        $pages = $query
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Page $page): array => $this->row($page));

        return Inertia::render('admin/pages/index', [
            'pages' => $pages,
            'filters' => $filters,
            'sort' => $sort,
            'footer' => $this->footer(),
            'footerGroups' => FooterGroup::options(),
            'total' => Page::query()->count(),
        ]);
    }

    /**
     * The form for a new page.
     */
    public function create(): Response
    {
        return Inertia::render('admin/pages/create', [
            'page' => [
                'id' => null,
                'title' => '',
                'slug' => '',
                'summary' => '',
                'body' => '',
                'title_ar' => '',
                'summary_ar' => '',
                'body_ar' => '',
                'footer_group' => null,
                'is_published' => false,
                'updated_at' => null,
                'created_at' => null,
            ],
            'html' => '',
            'htmlAr' => '',
            'footerGroups' => FooterGroup::options(),
        ]);
    }

    /**
     * Store a new page, then open it in the editor.
     */
    public function store(PageRequest $request): RedirectResponse
    {
        $page = Page::query()->create($request->pageAttributes());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $page->is_published ? "“{$page->title}” is live." : "“{$page->title}” saved as hidden.",
        ]);

        return to_route('admin.pages.edit', $page);
    }

    /**
     * The editor for one page, with the server's render of each language's
     * text for the preview ('' for an Arabic text not written yet).
     */
    public function edit(Page $page): Response
    {
        return Inertia::render('admin/pages/edit', [
            'page' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'summary' => $page->summary ?? '',
                'body' => $page->body,
                'title_ar' => $page->title_ar ?? '',
                'summary_ar' => $page->summary_ar ?? '',
                'body_ar' => $page->body_ar ?? '',
                'footer_group' => $page->footer_group?->value,
                'is_published' => $page->is_published,
                'updated_at' => $page->updated_at?->toIso8601String(),
                'created_at' => $page->created_at?->toIso8601String(),
            ],
            'html' => $page->html(Locales::ENGLISH),
            'htmlAr' => filled($page->body_ar) ? $page->html(Locales::ARABIC) : '',
            'footerGroups' => FooterGroup::options(),
        ]);
    }

    /**
     * Save a page.
     */
    public function update(PageRequest $request, Page $page): RedirectResponse
    {
        $page->update($request->pageAttributes());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $page->wasChanged() ? "“{$page->title}” saved." : 'Nothing changed.',
        ]);

        return to_route('admin.pages.edit', $page);
    }

    /**
     * Show or hide a page (the switch in the table).
     */
    public function publish(Request $request, Page $page): RedirectResponse
    {
        $request->validate(['is_published' => ['required', 'boolean']]);

        $page->update(['is_published' => $request->boolean('is_published')]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $page->is_published
                ? "“{$page->title}” is live at /pages/{$page->slug}."
                : "“{$page->title}” is hidden.",
        ]);

        return back();
    }

    /**
     * Save the order of one footer column (logged as one page.reordered entry).
     */
    public function reorder(ReorderPagesRequest $request): RedirectResponse
    {
        Page::reorder($request->ids());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Footer order saved.']);

        return back();
    }

    /**
     * Delete a page.
     */
    public function destroy(Page $page): RedirectResponse
    {
        $page->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "“{$page->title}” deleted."]);

        return to_route('admin.pages.index');
    }

    /**
     * Render Markdown exactly as /pages/{slug} or /ar/pages/{slug} will
     * (same options, same code path), for the editor's live preview of
     * either language.
     */
    public function preview(PagePreviewRequest $request): JsonResponse
    {
        $locale = $request->locale();
        $page = new Page;
        $page->setAttribute(Locales::isArabic($locale) ? 'body_ar' : 'body', $request->body());

        return response()->json(['html' => $page->html($locale)]);
    }

    /**
     * The pages matching the filters.
     *
     * @param  array{search: string|null, group: string|null, status: string|null}  $filters
     * @return Builder<Page>
     */
    private function filtered(array $filters): Builder
    {
        return Page::query()
            ->when($filters['search'], function (Builder $query, string $search): void {
                // "!" escapes LIKE's wildcards, so "50%" or "data_" mean exactly that.
                $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';

                $query->where(function (Builder $query) use ($like): void {
                    foreach (['title', 'slug', 'summary', 'title_ar', 'summary_ar'] as $column) {
                        $query->orWhereRaw("{$column} like ? escape '!'", [$like]);
                    }
                });
            })
            ->when($filters['group'] === 'none', fn (Builder $query) => $query->whereNull('footer_group'))
            ->when(
                $filters['group'] !== null && $filters['group'] !== 'none',
                fn (Builder $query) => $query->where('footer_group', $filters['group']),
            )
            ->when($filters['status'] !== null, fn (Builder $query) => $query->where('is_published', $filters['status'] === 'live'));
    }

    /**
     * The requested sort, or null for page order.
     *
     * @return array{column: string, direction: 'asc'|'desc'}|null
     */
    private function sort(Request $request): ?array
    {
        $column = $request->query('sort');

        if (! is_string($column) || ! array_key_exists($column, self::SORTS)) {
            return null;
        }

        return [
            'column' => $column,
            'direction' => $request->query('direction') === 'desc' ? 'desc' : 'asc',
        ];
    }

    /**
     * Every page in a footer column, in link order (hidden ones included, so
     * they keep their place).
     *
     * @return array<string, list<array{id: int, title: string, slug: string, is_published: bool}>>
     */
    private function footer(): array
    {
        $columns = array_fill_keys(FooterGroup::values(), []);

        foreach (Page::query()->whereNotNull('footer_group')->ordered()->get() as $page) {
            if ($page->footer_group !== null) {
                $columns[$page->footer_group->value][] = [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                    'is_published' => $page->is_published,
                ];
            }
        }

        return $columns;
    }

    /**
     * One table row. `placeholder`: the English or Arabic text still carries
     * the seeded "Placeholder page." note, so the page needs its real text.
     * `missing_arabic`: the fields written in English but not in Arabic
     * (title, summary, body), which /ar/pages/{slug} shows in English.
     *
     * @return array{id: int, title: string, slug: string, summary: string|null, footer_group: string|null, is_published: bool, placeholder: bool, missing_arabic: list<string>, updated_at: string}
     */
    private function row(Page $page): array
    {
        return [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'summary' => $page->summary,
            'footer_group' => $page->footer_group?->value,
            'is_published' => $page->is_published,
            'placeholder' => str_contains($page->body, self::PLACEHOLDER_MARK)
                || str_contains($page->body_ar ?? '', self::PLACEHOLDER_MARK_AR),
            'missing_arabic' => $page->missingArabic(),
            'updated_at' => ($page->updated_at ?? Date::now())->toIso8601String(),
        ];
    }

    /**
     * A trimmed, non-empty query string value (null otherwise).
     */
    private function stringQuery(Request $request, string $key): ?string
    {
        $value = $request->query($key);

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
