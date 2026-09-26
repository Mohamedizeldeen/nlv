<?php

namespace App\Models\Concerns;

use App\Support\Activity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Logs created / updated / deleted (and restored) as `<subject>.<action>`
 * with properties.changes = {field: [old, new]} (ADMIN.md section 3).
 *
 * Timestamps and remember tokens are skipped; passwords, two-factor columns
 * and hidden attributes are logged as changed but never with their value.
 *
 * @mixin Model
 */
trait RecordsActivity
{
    /**
     * What a secret attribute's value is logged as.
     */
    public const REDACTED = '[redacted]';

    /**
     * Register the model event listeners.
     */
    public static function bootRecordsActivity(): void
    {
        foreach (['created', 'updated', 'deleted', 'restored'] as $action) {
            static::registerModelEvent($action, function (Model $model) use ($action): void {
                if (method_exists($model, 'recordModelActivity')) {
                    $model->recordModelActivity($action);
                }
            });
        }
    }

    /**
     * The subject part of the event name: story, look, look_category, lead...
     */
    public function activitySubject(): string
    {
        return Str::snake(class_basename($this));
    }

    /**
     * What this kind of record is called in log descriptions: "story",
     * "look category". Override for names that are not plain words ("FAQ").
     */
    public static function activityNoun(): string
    {
        return str_replace('_', ' ', Str::snake(class_basename(static::class)));
    }

    /**
     * The plural of activityNoun(): "stories", "look categories".
     */
    public static function activityPluralNoun(): string
    {
        return Str::plural(static::activityNoun());
    }

    /**
     * A short human name for this record, used in log descriptions.
     */
    public function activityLabel(): string
    {
        $attributes = $this->getAttributes();

        foreach (['name', 'title', 'question', 'reference', 'key'] as $attribute) {
            $value = $attributes[$attribute] ?? null;

            if (is_string($value) && $value !== '') {
                return Str::limit($value, 80);
            }
        }

        return '#'.$this->getKey();
    }

    /**
     * Write the log entry for a model event.
     */
    public function recordModelActivity(string $action): void
    {
        if (! Activity::logsModelEvents()) {
            return;
        }

        $changes = $this->activityChanges($action);

        if ($action === 'updated' && $changes === []) {
            return;
        }

        $properties = $changes === [] ? [] : ['changes' => $changes];

        if ($action === 'deleted' && method_exists($this, 'isForceDeleting') && $this->isForceDeleting()) {
            $properties['force'] = true;
        }

        Activity::record(
            "{$this->activitySubject()}.{$action}",
            $this,
            $this->activityDescription($action, $changes),
            $properties,
        );
    }

    /**
     * The changed fields for the given action, as {field: [old, new]}.
     *
     * @return array<string, array{0: mixed, 1: mixed}>
     */
    protected function activityChanges(string $action): array
    {
        $keys = match ($action) {
            'updated' => array_keys($this->getChanges()),
            'created', 'deleted' => array_keys($this->getAttributes()),
            default => [],
        };

        $ignored = $this->activityIgnoredAttributes();
        $redacted = $this->activityRedactedAttributes();
        $changes = [];

        foreach ($keys as $key) {
            if (in_array($key, $ignored, true) || $key === $this->getKeyName()) {
                continue;
            }

            [$old, $new] = match ($action) {
                'created' => [null, $this->getAttribute($key)],
                'deleted' => [$this->getAttribute($key), null],
                default => [$this->getOriginal($key), $this->getAttribute($key)],
            };

            if ($old === null && $new === null) {
                continue;
            }

            $changes[$key] = in_array($key, $redacted, true)
                ? [$old === null ? null : self::REDACTED, $new === null ? null : self::REDACTED]
                : [Activity::normalize($old), Activity::normalize($new)];
        }

        return $changes;
    }

    /**
     * The log line: "Updated story “Noura Al-Harbi” (quote, sort_order)".
     *
     * @param  array<string, array{0: mixed, 1: mixed}>  $changes
     */
    protected function activityDescription(string $action, array $changes): string
    {
        $subject = static::activityNoun();
        $description = ucfirst($action)." {$subject} “{$this->activityLabel()}”";

        if ($action === 'updated') {
            $description .= ' ('.implode(', ', array_keys($changes)).')';
        }

        return $description;
    }

    /**
     * Attributes never logged at all.
     *
     * @return list<string>
     */
    protected function activityIgnoredAttributes(): array
    {
        return ['created_at', 'updated_at', 'deleted_at', 'remember_token'];
    }

    /**
     * Attributes logged as changed, but without their value.
     *
     * @return list<string>
     */
    protected function activityRedactedAttributes(): array
    {
        return array_values(array_unique([
            'password',
            'two_factor_secret',
            'two_factor_recovery_codes',
            'two_factor_confirmed_at',
            ...$this->getHidden(),
        ]));
    }
}
