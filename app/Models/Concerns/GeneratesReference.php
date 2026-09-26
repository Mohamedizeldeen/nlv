<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A public reference derived from the id (NLV-000142). The row is inserted with
 * a unique placeholder, then given its real reference as soon as the id exists.
 *
 * List this trait before RecordsActivity so the "created" log entry already
 * carries the final reference.
 *
 * @mixin Model
 */
trait GeneratesReference
{
    /**
     * The reference for a given id.
     */
    public static function referenceFor(int $id): string
    {
        return sprintf('NLV-%06d', $id);
    }

    /**
     * Register the model event listeners.
     */
    public static function bootGeneratesReference(): void
    {
        static::creating(function (Model $model): void {
            if (blank($model->getAttribute('reference'))) {
                $model->setAttribute('reference', 'TMP-'.Str::lower(Str::random(16)));
            }
        });

        static::created(function (Model $model): void {
            $reference = $model->getAttribute('reference');

            if (is_string($reference) && str_starts_with($reference, 'TMP-')) {
                $model->setAttribute('reference', static::referenceFor((int) $model->getKey()));
                $model->saveQuietly();
            }
        });
    }
}
