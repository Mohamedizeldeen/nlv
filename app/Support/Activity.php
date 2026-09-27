<?php

namespace App\Support;

use App\Models\ActivityLog;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use JsonSerializable;
use Stringable;
use UnitEnum;

/**
 * The activity log ("log everything", ADMIN.md section 3).
 *
 * Model changes are recorded automatically by the RecordsActivity trait;
 * everything else (logins, order requests, grouped settings saves, exports,
 * admin grants...) is recorded explicitly with Activity::record().
 */
class Activity
{
    /**
     * Longest string kept in a logged value; longer ones are cut with an ellipsis.
     */
    public const MAX_VALUE_LENGTH = 300;

    /**
     * Whether the RecordsActivity trait currently records model events.
     */
    private static bool $modelLogging = true;

    /**
     * Longest acting user's name kept on an entry (activity_logs.causer_name).
     */
    public const MAX_CAUSER_NAME_LENGTH = 120;

    /**
     * Record an activity entry. The acting user (the signed-in user unless one is
     * given), the IP address and the user agent are filled in automatically.
     *
     * The acting user's name is kept with the entry, so the log still says who
     * did it once that account is deleted (user_id then becomes null). A user
     * who is already deleted (deleting their own account) is recorded by name
     * only.
     *
     * @param  array<string, mixed>  $properties
     */
    public static function record(
        string $event,
        ?Model $subject,
        string $description,
        array $properties = [],
        ?Authenticatable $causer = null,
    ): ActivityLog {
        // Artisan commands, seeders and queued jobs run with a placeholder
        // request (127.0.0.1, "Symfony"): that is not where the change came
        // from, so the console records no IP address or browser.
        $console = app()->runningInConsole() && ! app()->runningUnitTests();
        $request = ! $console && app()->bound('request') ? app(Request::class) : null;
        $causer ??= Auth::user();
        $userAgent = $request?->userAgent();
        $deleted = $causer instanceof Model && ! $causer->exists;
        $name = $causer instanceof Model ? $causer->getAttribute('name') : null;
        $name = is_string($name) ? trim($name) : '';

        $log = new ActivityLog;
        $log->forceFill([
            'user_id' => $deleted ? null : $causer?->getAuthIdentifier(),
            'causer_name' => $causer === null || $name === '' ? null : self::truncate($name, self::MAX_CAUSER_NAME_LENGTH),
            'event' => mb_substr($event, 0, 60),
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'description' => self::truncate($description, 255),
            'properties' => $properties === [] ? null : self::normalize($properties),
            'ip_address' => $request?->ip(),
            'user_agent' => is_string($userAgent) && $userAgent !== '' ? mb_substr($userAgent, 0, 255) : null,
        ])->save();

        return $log;
    }

    /**
     * A visitor-typed value for a log description. Right-to-left text
     * (an Arabic name or company) is wrapped in Unicode isolates
     * (U+2068 … U+2069), so "from نورة الحربي, رمال للعبايات" keeps its
     * order and punctuation in the English admin instead of the two
     * Arabic parts swapping places. Left-to-right text is returned as is.
     */
    public static function isolate(string $text): string
    {
        return preg_match('/[\x{0590}-\x{08FF}\x{FB1D}-\x{FDFF}\x{FE70}-\x{FEFF}]/u', $text) === 1
            ? "\u{2068}{$text}\u{2069}"
            : $text;
    }

    /**
     * Run the callback without the automatic model logging (created / updated /
     * deleted). Explicit Activity::record() calls inside it are still written.
     *
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    public static function withoutModelLogging(callable $callback): mixed
    {
        $previous = self::$modelLogging;
        self::$modelLogging = false;

        try {
            return $callback();
        } finally {
            self::$modelLogging = $previous;
        }
    }

    /**
     * Whether model events are currently being logged.
     */
    public static function logsModelEvents(): bool
    {
        return self::$modelLogging;
    }

    /**
     * The fields that differ between two snapshots, as {field: [old, new]}
     * with log-safe values. Keys missing from one side count as null.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array<string, array{0: mixed, 1: mixed}>
     */
    public static function changes(array $before, array $after): array
    {
        $changes = [];

        foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $key) {
            $old = self::normalize($before[$key] ?? null);
            $new = self::normalize($after[$key] ?? null);

            if ($old !== $new) {
                $changes[$key] = [$old, $new];
            }
        }

        return $changes;
    }

    /**
     * Turn a value into something small and JSON-friendly for the log:
     * enums become their value, dates a timestamp, long strings are cut.
     */
    public static function normalize(mixed $value): mixed
    {
        return match (true) {
            $value === null, is_bool($value), is_int($value), is_float($value) => $value,
            is_string($value) => self::truncate($value, self::MAX_VALUE_LENGTH),
            $value instanceof BackedEnum => $value->value,
            $value instanceof UnitEnum => $value->name,
            $value instanceof DateTimeInterface => $value->format('Y-m-d H:i:s'),
            is_array($value) => array_map(self::normalize(...), $value),
            $value instanceof Arrayable => self::normalize($value->toArray()),
            $value instanceof JsonSerializable => self::normalize($value->jsonSerialize()),
            $value instanceof Stringable => self::truncate((string) $value, self::MAX_VALUE_LENGTH),
            default => get_debug_type($value),
        };
    }

    /**
     * Cut a string to at most $length characters, ending with an ellipsis when cut.
     */
    private static function truncate(string $value, int $length): string
    {
        return mb_strlen($value) > $length
            ? rtrim(mb_substr($value, 0, $length - 1)).'…'
            : $value;
    }
}
