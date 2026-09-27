<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Stories\PublishStoryRequest;
use App\Http\Requests\Admin\Stories\ReorderStoriesRequest;
use App\Http\Requests\Admin\Stories\StoreStoryRequest;
use App\Http\Requests\Admin\Stories\StoryRequest;
use App\Http\Requests\Admin\Stories\UpdateStoryRequest;
use App\Models\ActivityLog;
use App\Models\Story;
use App\Support\ImageUploader;
use App\Support\MediaRef;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * /admin/stories: the store owners quoted in the landing page's Stories
 * section. A short, hand-ordered list (drag to reorder, publish inline),
 * and a form with a live preview of the story card. Every text is edited
 * in English and Arabic (`<field>_ar`); the list marks stories whose
 * Arabic is incomplete, since /ar shows the English there.
 *
 * Every change is logged by the model (story.created / updated / deleted,
 * story.reordered) and clears the cached landing payload.
 */
class StoryController extends Controller
{
    /**
     * How many activity entries the edit page shows.
     */
    private const HISTORY_LIMIT = 5;

    /**
     * The stories in page order.
     */
    public function index(): Response
    {
        $stories = Story::query()->ordered()->get()
            ->map(fn (Story $story): array => [
                'id' => $story->id,
                'name' => $story->name,
                'role' => $story->role,
                'store' => $story->store,
                'city' => $story->city,
                'quote' => $story->quote,
                'metric' => [
                    'figure' => $story->metric_figure,
                    'label' => $story->metric_label,
                    'short' => filled($story->metric_short) ? $story->metric_short : $story->metric_label,
                ],
                'portrait' => MediaRef::toArray($story->portrait),
                'focus' => [(float) $story->portrait_focus_x, (float) $story->portrait_focus_y],
                'zoom' => (float) $story->portrait_zoom,
                'is_published' => $story->is_published,
                'arabic_missing' => $story->missingArabic(),
            ]);

        return Inertia::render('admin/stories/index', [
            'stories' => array_values($stories->all()),
        ]);
    }

    /**
     * The form for a new story (placed last on the page).
     */
    public function create(): Response
    {
        $total = Story::query()->count() + 1;

        return Inertia::render('admin/stories/create', [
            'story' => $this->blankForm(),
            'position' => $total,
            'total' => $total,
            'limits' => $this->limits(),
        ]);
    }

    /**
     * Save a new story.
     */
    public function store(StoreStoryRequest $request): RedirectResponse
    {
        $portrait = $request->storePortrait();

        try {
            $story = Story::query()->create([...$request->storyAttributes(), 'portrait' => $portrait]);
        } catch (Throwable $exception) {
            ImageUploader::delete($portrait);

            throw $exception;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $story->is_published
                ? "Story added: {$story->name} is on the landing page."
                : "Story added: {$story->name} is saved, hidden from the landing page.",
        ]);

        return to_route('admin.stories.index');
    }

    /**
     * The form for an existing story.
     */
    public function edit(Story $story): Response
    {
        $order = array_values(Story::query()->ordered()->pluck('id')->map(fn (mixed $id): int => (int) $id)->all());
        $position = array_search($story->id, $order, true);

        return Inertia::render('admin/stories/edit', [
            'story' => $this->form($story),
            'position' => $position === false ? count($order) : $position + 1,
            'total' => count($order),
            'limits' => $this->limits(),
            'history' => $this->history($story),
        ]);
    }

    /**
     * Save changes to a story. A new portrait replaces the old one (whose
     * upload is deleted by the model).
     */
    public function update(UpdateStoryRequest $request, Story $story): RedirectResponse
    {
        $story->fill($request->storyAttributes());

        $portrait = $request->storePortrait();

        if ($portrait !== null) {
            $story->portrait = $portrait;
        }

        if (! $story->isDirty()) {
            Inertia::flash('toast', ['type' => 'info', 'message' => 'Nothing to save: the story is unchanged.']);

            return to_route('admin.stories.edit', $story);
        }

        try {
            $story->save();
        } catch (Throwable $exception) {
            ImageUploader::delete($portrait);

            throw $exception;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Story saved.']);

        return to_route('admin.stories.edit', $story);
    }

    /**
     * Delete a story (and its uploaded portrait).
     */
    public function destroy(Story $story): RedirectResponse
    {
        $story->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Story deleted: {$story->name}."]);

        return to_route('admin.stories.index');
    }

    /**
     * Save the order from the drag-and-drop list (one `story.reordered` entry).
     */
    public function reorder(ReorderStoriesRequest $request): RedirectResponse
    {
        Story::reorder($request->orderedIds());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Page order saved.']);

        return to_route('admin.stories.index');
    }

    /**
     * Show or hide one story on the landing page (the list's inline switch).
     */
    public function publish(PublishStoryRequest $request, Story $story): RedirectResponse
    {
        $story->update(['is_published' => $request->boolean('is_published')]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $story->is_published
                ? "{$story->name} is live on the landing page."
                : "{$story->name} is hidden from the landing page.",
        ]);

        return back();
    }

    /**
     * A story as the form edits it (field names match the inputs; the
     * Arabic columns are null until translated).
     *
     * @return array<string, mixed>
     */
    private function form(Story $story): array
    {
        return [
            'id' => $story->id,
            'name' => $story->name,
            'role' => $story->role,
            'store' => $story->store,
            'city' => $story->city,
            'coordinates' => $story->coordinates,
            'quote' => $story->quote,
            'metric_figure' => $story->metric_figure,
            'metric_label' => $story->metric_label,
            'metric_short' => $story->metric_short,
            'metric_note' => $story->metric_note,
            'name_ar' => $story->name_ar,
            'role_ar' => $story->role_ar,
            'store_ar' => $story->store_ar,
            'city_ar' => $story->city_ar,
            'quote_ar' => $story->quote_ar,
            'metric_label_ar' => $story->metric_label_ar,
            'metric_short_ar' => $story->metric_short_ar,
            'metric_note_ar' => $story->metric_note_ar,
            'portrait' => MediaRef::toArray($story->portrait),
            'portrait_focus' => [(float) $story->portrait_focus_x, (float) $story->portrait_focus_y],
            'portrait_zoom' => (float) $story->portrait_zoom,
            'is_published' => $story->is_published,
            'updated_at' => $story->updated_at?->toIso8601String(),
        ];
    }

    /**
     * The form of a new story: the column defaults, published.
     *
     * @return array<string, mixed>
     */
    private function blankForm(): array
    {
        return [
            'id' => null,
            'name' => '',
            'role' => '',
            'store' => '',
            'city' => '',
            'coordinates' => null,
            'quote' => '',
            'metric_figure' => '',
            'metric_label' => '',
            'metric_short' => null,
            'metric_note' => null,
            'name_ar' => '',
            'role_ar' => '',
            'store_ar' => '',
            'city_ar' => '',
            'quote_ar' => '',
            'metric_label_ar' => '',
            'metric_short_ar' => null,
            'metric_note_ar' => null,
            'portrait' => null,
            'portrait_focus' => [0.5, 0.35],
            'portrait_zoom' => 1.0,
            'is_published' => true,
            'updated_at' => null,
        ];
    }

    /**
     * The server's limits, so the form checks the same bounds.
     *
     * @return array{quote: int, zoomMin: float, zoomMax: float}
     */
    private function limits(): array
    {
        return [
            'quote' => StoryRequest::QUOTE_MAX,
            'zoomMin' => (float) StoryRequest::ZOOM_MIN,
            'zoomMax' => (float) StoryRequest::ZOOM_MAX,
        ];
    }

    /**
     * The latest log entries about this story, newest first.
     *
     * @return list<array{id: int, event: string, description: string, user: string|null, createdAt: string}>
     */
    private function history(Story $story): array
    {
        $entries = ActivityLog::query()
            ->with('user:id,name')
            ->where('subject_type', $story->getMorphClass())
            ->where('subject_id', $story->id)
            ->latest('created_at')
            ->orderByDesc('id')
            ->limit(self::HISTORY_LIMIT)
            ->get()
            ->map(fn (ActivityLog $entry): array => [
                'id' => $entry->id,
                'event' => $entry->event,
                'description' => $entry->description,
                'user' => $entry->causerLabel(),
                'createdAt' => ($entry->created_at ?? Date::now())->toIso8601String(),
            ]);

        return array_values($entries->all());
    }
}
