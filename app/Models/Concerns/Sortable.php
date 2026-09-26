<?php

namespace App\Models\Concerns;

use App\Support\Activity;
use App\Support\LandingContent;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * An unsigned `sort_order` column: `ordered()` sorts by it (then id), a new
 * record without one is placed after the last, and `reorder()` saves a
 * drag-and-drop order in one go (`completeOrder()` first when the list may
 * leave records out). Used together with RecordsActivity (the
 * reorder entry names the records with its activityPluralNoun()).
 *
 * @mixin Model
 */
trait Sortable
{
    /**
     * Register the model event listeners.
     */
    public static function bootSortable(): void
    {
        static::creating(function (Model $model): void {
            if ($model->getAttribute('sort_order') === null) {
                $max = $model->newQuery()->max('sort_order');

                $model->setAttribute('sort_order', is_numeric($max) ? (int) $max + 1 : 0);
            }
        });
    }

    /**
     * Save a new order: the given ids get sort_order 0, 1, 2... Logged as ONE
     * `<subject>.reordered` entry (not one `updated` entry per row), and the
     * landing page cache is cleared. Ids of other records are ignored.
     *
     * @param  array<int, int|string>  $ids
     */
    public static function reorder(array $ids): void
    {
        $ids = array_values(array_map(intval(...), $ids));

        // Through the base query builder: a new position is not an edit of the
        // record, so updated_at ("updated 2 min ago" on its form) is left alone.
        // Rows already in place are not written at all.
        DB::transaction(function () use ($ids): void {
            foreach ($ids as $position => $id) {
                static::query()
                    ->whereKey($id)
                    ->where('sort_order', '!=', $position)
                    ->toBase()
                    ->update(['sort_order' => $position]);
            }
        });

        LandingContent::forget();

        $subject = Str::snake(class_basename(static::class));

        Activity::record(
            "{$subject}.reordered",
            null,
            'Reordered '.static::activityPluralNoun(),
            ['order' => $ids],
        );
    }

    /**
     * A complete order for reorder(): the given ids first (ids of records
     * that no longer exist are dropped, a repeated id counts once), then
     * every record the list left out, in its current order. A list sent from
     * a page opened before another record was added therefore never leaves
     * two records sharing a position.
     *
     * @param  array<int, int|string>  $ids
     * @return list<int>
     */
    public static function completeOrder(array $ids): array
    {
        $query = static::query();

        $current = array_values(array_map(intval(...), $query->ordered()->pluck($query->getModel()->getKeyName())->all()));
        $sent = array_values(array_unique(array_intersect(array_map(intval(...), $ids), $current)));

        return [...$sent, ...array_values(array_diff($current, $sent))];
    }

    /**
     * Sort by sort_order, then by id.
     *
     * @param  Builder<static>  $query
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy($this->qualifyColumn('sort_order'))->orderBy($this->qualifyColumn($this->getKeyName()));
    }
}
