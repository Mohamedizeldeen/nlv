<?php

namespace App\Models\Concerns;

use App\Support\ImageUploader;
use Illuminate\Database\Eloquent\Model;

/**
 * Deletes uploaded image files that a record no longer points at: the old
 * file when a media column is replaced or cleared, and every file when the
 * record is deleted. Unsplash refs are never touched.
 *
 * The model lists its media columns in `mediaAttributes()`.
 *
 * @mixin Model
 */
trait HasMedia
{
    /**
     * The columns that hold media refs.
     *
     * @return list<string>
     */
    abstract public function mediaAttributes(): array;

    /**
     * Register the model event listeners.
     */
    public static function bootHasMedia(): void
    {
        static::updated(function (Model $model): void {
            if (! method_exists($model, 'mediaAttributes')) {
                return;
            }

            foreach ($model->mediaAttributes() as $attribute) {
                if ($model->wasChanged($attribute)) {
                    $old = $model->getOriginal($attribute);

                    ImageUploader::delete(is_string($old) ? $old : null);
                }
            }
        });

        static::deleted(function (Model $model): void {
            if (! method_exists($model, 'mediaAttributes')) {
                return;
            }

            foreach ($model->mediaAttributes() as $attribute) {
                $ref = $model->getAttribute($attribute);

                ImageUploader::delete(is_string($ref) ? $ref : null);
            }
        });
    }
}
