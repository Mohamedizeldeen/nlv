<?php

namespace App\Models\Concerns;

use App\Support\LandingContent;
use Illuminate\Database\Eloquent\Model;

/**
 * Clears the cached landing page payload whenever a record is saved or deleted.
 *
 * @mixin Model
 */
trait RefreshesLandingContent
{
    /**
     * Register the model event listeners.
     */
    public static function bootRefreshesLandingContent(): void
    {
        static::saved(fn () => LandingContent::forget());
        static::deleted(fn () => LandingContent::forget());
    }
}
