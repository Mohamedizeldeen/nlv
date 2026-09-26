<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Pricing\ReorderFaqsRequest;
use App\Http\Requests\Admin\Pricing\SaveFaqRequest;
use App\Models\Faq;
use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The questions under the pricing plans (/admin/faqs): add, edit, delete,
 * publish and put in page order.
 *
 * Each question and answer is written in English and Arabic
 * (`question_ar`, `answer_ar`); /ar shows the Arabic.
 *
 * @phpstan-type AdminFaq array{
 *     id: int, question: string, answer: string, question_ar: string|null, answer_ar: string|null,
 *     missing_arabic: list<string>, is_published: bool, sort_order: int, updated_at: string|null
 * }
 * @phpstan-type PublishedFaq array{id: int, question: string, answer: string, question_ar: string|null, answer_ar: string|null, sort_order: int}
 */
class FaqController extends Controller
{
    /**
     * The status filter values.
     */
    private const STATUSES = ['live', 'hidden'];

    /**
     * Every question in page order (the list is short and ordered by hand,
     * so it is not paginated), with a search and a status filter.
     */
    public function index(Request $request): Response
    {
        $search = Str::limit(trim((string) $request->string('search')), 100, '');
        $status = in_array($request->query('status'), self::STATUSES, true) ? (string) $request->query('status') : null;

        $faqs = Faq::query()
            ->ordered()
            ->when($search !== '', function (Builder $query) use ($search): void {
                // "!" escapes LIKE's wildcards, so "10%" or "a_b" mean exactly
                // that (MySQL and SQLite disagree about backslashes).
                $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';

                // Either language: an admin may search in Arabic.
                $query->where(function (Builder $query) use ($term): void {
                    foreach (['question', 'answer', 'question_ar', 'answer_ar'] as $column) {
                        $query->orWhereRaw("{$column} like ? escape '!'", [$term]);
                    }
                });
            })
            ->when($status !== null, fn (Builder $query) => $query->where('is_published', $status === 'live'))
            ->get();

        return Inertia::render('admin/faqs/index', [
            'faqs' => array_values($faqs->map(fn (Faq $faq): array => $this->present($faq))->all()),
            'filters' => ['search' => $search === '' ? null : $search, 'status' => $status],
            'counts' => [
                'all' => Faq::query()->count(),
                'live' => Faq::query()->published()->count(),
            ],
            'published' => $this->published(),
            'heading' => $this->heading(),
        ]);
    }

    /**
     * The form for a new question.
     */
    public function create(): Response
    {
        return Inertia::render('admin/faqs/create', [
            'published' => $this->published(),
            'heading' => $this->heading(),
        ]);
    }

    /**
     * Add a question at the end of the list.
     */
    public function store(SaveFaqRequest $request): RedirectResponse
    {
        Faq::query()->create($request->faqAttributes());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question added.']);

        return to_route('admin.faqs.index');
    }

    /**
     * The form for an existing question.
     */
    public function edit(Faq $faq): Response
    {
        return Inertia::render('admin/faqs/edit', [
            'faq' => $this->present($faq),
            'published' => $this->published(),
            'heading' => $this->heading(),
        ]);
    }

    /**
     * Save a question.
     */
    public function update(SaveFaqRequest $request, Faq $faq): RedirectResponse
    {
        $faq->update($request->faqAttributes());

        Inertia::flash('toast', $faq->wasChanged()
            ? ['type' => 'success', 'message' => 'Question saved.']
            : ['type' => 'info', 'message' => 'No changes to save.']);

        return to_route('admin.faqs.index');
    }

    /**
     * Show or hide a question on the landing page (the switch in the list).
     */
    public function publish(Request $request, Faq $faq): RedirectResponse
    {
        $validated = $request->validate(['is_published' => ['required', 'boolean']]);

        $faq->update(['is_published' => (bool) $validated['is_published']]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $faq->is_published ? 'The question is live on the page.' : 'The question is hidden from the page.',
        ]);

        return back();
    }

    /**
     * Save the page order.
     */
    public function reorder(ReorderFaqsRequest $request): RedirectResponse
    {
        Faq::reorder($request->orderedIds());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Order saved.']);

        return back();
    }

    /**
     * Delete a question.
     */
    public function destroy(Faq $faq): RedirectResponse
    {
        $faq->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question deleted.']);

        return to_route('admin.faqs.index');
    }

    /**
     * A question as the admin pages use it.
     *
     * @return AdminFaq
     */
    private function present(Faq $faq): array
    {
        return [
            'id' => $faq->id,
            'question' => $faq->question,
            'answer' => $faq->answer,
            'question_ar' => $faq->question_ar,
            'answer_ar' => $faq->answer_ar,
            // English texts with no Arabic yet (the /ar page shows the English there).
            'missing_arabic' => $faq->missingArabic(),
            'is_published' => $faq->is_published,
            'sort_order' => $faq->sort_order,
            'updated_at' => $faq->updated_at?->toIso8601String(),
        ];
    }

    /**
     * The questions the landing page shows, in order (for the previews).
     *
     * @return list<PublishedFaq>
     */
    private function published(): array
    {
        return array_values(Faq::query()->published()->ordered()->get()
            ->map(fn (Faq $faq): array => [
                'id' => $faq->id,
                'question' => $faq->question,
                'answer' => $faq->answer,
                'question_ar' => $faq->question_ar,
                'answer_ar' => $faq->answer_ar,
                'sort_order' => $faq->sort_order,
            ])
            ->all());
    }

    /**
     * The kicker beside the questions on each landing page.
     *
     * @return array{en: string, ar: string}
     */
    private function heading(): array
    {
        return [
            Locales::ENGLISH => Settings::string('sections.pricing.faq_title', Locales::ENGLISH),
            Locales::ARABIC => Settings::string('sections.pricing.faq_title', Locales::ARABIC),
        ];
    }
}
