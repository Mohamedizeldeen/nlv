<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use App\Models\Concerns\RefreshesLandingContent;
use App\Support\Settings;
use Carbon\CarbonImmutable;
use Database\Factories\SettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One stored site setting (dot key, JSON value). Read and write settings
 * through App\Support\Settings, which knows the schema and the defaults.
 *
 * @property int $id
 * @property string $key
 * @property mixed $value
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['key', 'value'])]
class Setting extends Model
{
    /** @use HasFactory<SettingFactory> */
    use HasFactory, RecordsActivity, RefreshesLandingContent;

    /**
     * Bootstrap the model: any change clears the settings cache.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Settings::forget());
        static::deleted(fn () => Settings::forget());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'json:unicode',
        ];
    }
}
