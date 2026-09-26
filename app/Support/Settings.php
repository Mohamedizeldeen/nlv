<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * Typed access to the site settings (config/landing.php → settings).
 *
 * Values are the stored ones overlaid on the schema defaults; a stored null
 * means "use the default". Reads are cached forever and the cache is cleared
 * whenever a setting changes.
 *
 * Copy settings are translatable: stored as {"en": ..., "ar": ...} (a plain
 * stored value, as older rows have and as a value without Arabic is kept,
 * is the English). In Arabic a translatable setting reads its stored Arabic,
 * else its `default_ar`, else the English value, so it is never blank when
 * the English is not. Reads take a locale; without one they use the current
 * request's language.
 *
 * @phpstan-type SettingDefinition array{group: string, label: string, type: string, default: mixed, default_ar: mixed, translatable: bool, help: string|null, public: bool}
 */
class Settings
{
    /**
     * The cache key holding the stored values.
     */
    public const CACHE_KEY = 'landing.settings';

    /**
     * The setting types the schema may use.
     */
    public const TYPES = ['text', 'textarea', 'accent', 'email', 'url', 'phone', 'number', 'currencies'];

    /**
     * The types of copy, the only ones that can be translatable.
     */
    public const COPY_TYPES = ['text', 'textarea', 'accent'];

    /**
     * Appended to a translatable key to name its Arabic input: "hero.title_ar"
     * (a form sends it nested, {hero: {title_ar: ...}}). See rules() and fromInput().
     */
    public const ARABIC_SUFFIX = '_ar';

    /**
     * Phone numbers: digits, spaces, + ( ) -, with 7 to 20 digits in all.
     */
    public const PHONE_PATTERN = '/^(?=(?:\D*\d){7,20}\D*$)[0-9 +()\-]+$/';

    /**
     * Every setting's definition, keyed by its dot key, in schema order.
     *
     * @return array<string, SettingDefinition>
     */
    public static function schema(): array
    {
        $schema = [];

        foreach ((array) config('landing.settings', []) as $key => $definition) {
            $definition = (array) $definition;
            $type = in_array($definition['type'] ?? null, self::TYPES, true) ? (string) $definition['type'] : 'text';

            $schema[(string) $key] = [
                'group' => (string) ($definition['group'] ?? strtok((string) $key, '.')),
                'label' => (string) ($definition['label'] ?? $key),
                'type' => $type,
                'default' => $definition['default'] ?? null,
                'default_ar' => $definition['default_ar'] ?? null,
                'translatable' => (bool) ($definition['translatable'] ?? false) && in_array($type, self::COPY_TYPES, true),
                'help' => isset($definition['help']) ? (string) $definition['help'] : null,
                'public' => (bool) ($definition['public'] ?? true),
            ];
        }

        return $schema;
    }

    /**
     * The setting groups (key => {label, help, site_content}), in display order.
     *
     * @return array<string, array{label: string, help: string|null, site_content: bool}>
     */
    public static function groups(): array
    {
        $groups = [];

        foreach ((array) config('landing.groups', []) as $key => $group) {
            $group = (array) $group;

            $groups[(string) $key] = [
                'label' => (string) ($group['label'] ?? $key),
                'help' => isset($group['help']) ? (string) $group['help'] : null,
                'site_content' => (bool) ($group['site_content'] ?? true),
            ];
        }

        return $groups;
    }

    /**
     * Whether the key is in the schema.
     */
    public static function has(string $key): bool
    {
        return array_key_exists($key, self::schema());
    }

    /**
     * Whether the setting has an Arabic version (copy).
     */
    public static function translatable(string $key): bool
    {
        return self::schema()[$key]['translatable'] ?? false;
    }

    /**
     * Every setting's current value in a language (stored, else default),
     * keyed by dot key.
     *
     * @return array<string, mixed>
     */
    public static function all(?string $locale = null): array
    {
        $locale = Locales::normalize($locale ?? Locales::current());
        $stored = self::stored();
        $values = [];

        foreach (self::schema() as $key => $definition) {
            $values[$key] = self::resolve($definition, $stored[$key] ?? null, $locale);
        }

        return $values;
    }

    /**
     * One setting's current value in a language ($default for an unknown key).
     */
    public static function get(string $key, ?string $locale = null, mixed $default = null): mixed
    {
        $values = self::all($locale);

        return array_key_exists($key, $values) ? $values[$key] : $default;
    }

    /**
     * A setting as a string ('' when empty).
     */
    public static function string(string $key, ?string $locale = null): string
    {
        $value = self::get($key, $locale);

        return is_scalar($value) ? (string) $value : '';
    }

    /**
     * A setting as an integer (0 when empty or not numeric).
     */
    public static function integer(string $key): int
    {
        $value = self::get($key);

        return is_numeric($value) ? (int) $value : 0;
    }

    /**
     * A setting as a list of strings.
     *
     * @return list<string>
     */
    public static function list(string $key): array
    {
        $value = self::get($key);

        return is_array($value)
            ? array_values(array_map(fn (mixed $item): string => is_scalar($item) ? (string) $item : '', $value))
            : [];
    }

    /**
     * A setting's default in a language: `default_ar` in Arabic when the
     * schema has one, else the English default.
     */
    public static function defaultFor(string $key, ?string $locale = null): mixed
    {
        $definition = self::schema()[$key] ?? null;

        if ($definition === null) {
            return null;
        }

        return $definition['translatable'] && Locales::isArabic($locale) && filled($definition['default_ar'])
            ? $definition['default_ar']
            : $definition['default'];
    }

    /**
     * What an admin has stored for each setting in a language, keyed by dot
     * key (null or missing: the default is in use). In Arabic only the
     * translatable settings are listed.
     *
     * @return array<string, mixed>
     */
    public static function storedValues(string $locale = Locales::ENGLISH): array
    {
        $arabic = Locales::isArabic($locale);
        $schema = self::schema();
        $values = [];

        foreach (self::stored() as $key => $value) {
            if (! isset($schema[$key])) {
                continue;
            }

            if ($schema[$key]['translatable']) {
                $values[$key] = self::split($value)[$arabic ? Locales::ARABIC : Locales::ENGLISH];
            } elseif (! $arabic) {
                $values[$key] = $value;
            }
        }

        return $values;
    }

    /**
     * The enabled currencies, in display order, as {code, name}, named in
     * the given language (default: the current one).
     *
     * @return list<array{code: string, name: string}>
     */
    public static function currencies(?string $locale = null): array
    {
        $names = (array) config('landing.currencies', []);
        $localNames = Locales::isArabic($locale) ? (array) config('landing.currencies_ar', []) : [];

        $currencies = [];

        foreach (self::list('pricing.currencies') as $code) {
            if (isset($names[$code])) {
                $currencies[] = ['code' => $code, 'name' => (string) ($localNames[$code] ?? $names[$code])];
            }
        }

        return $currencies;
    }

    /**
     * Store one setting (logged as `settings.updated`). With a locale, a
     * translatable setting's value is stored for that language only.
     */
    public static function set(string $key, mixed $value, ?string $locale = null): void
    {
        if ($locale !== null && self::translatable($key)) {
            $value = [Locales::normalize($locale) => $value];
        }

        self::setMany([$key => $value]);
    }

    /**
     * Store several settings at once and log ONE entry with the grouped diff
     * (properties: {groups: [...], changes: {key: [old, new]}}). Unchanged
     * values are skipped; nothing is logged when nothing changed. Returns the
     * changes that were made.
     *
     * A translatable setting takes a plain value (the English; its Arabic is
     * kept) or {en?: ..., ar?: ...} (only the languages given change). An
     * Arabic change is listed as "<key>_ar", like the `*_ar` model columns.
     *
     * @param  array<string, mixed>  $values  dot key => value (null = back to the default)
     * @return array<string, array{0: mixed, 1: mixed}>
     *
     * @throws InvalidArgumentException for a key that is not in the schema
     */
    public static function setMany(array $values, string $event = 'settings.updated', ?string $description = null): array
    {
        $schema = self::schema();
        $stored = self::stored();
        $changes = [];
        $groups = [];

        foreach ($values as $key => $value) {
            if (! isset($schema[$key])) {
                throw new InvalidArgumentException("Unknown setting [{$key}].");
            }

            $definition = $schema[$key];
            $current = $stored[$key] ?? null;

            if ($definition['translatable']) {
                [$next, $keyChanges] = self::translatedChange($key, $definition, $current, $value);
            } else {
                $next = self::coerce($definition['type'], $value);
                $before = $current ?? $definition['default'];
                $after = $next ?? $definition['default'];
                $keyChanges = $before === $after ? [] : [$key => [Activity::normalize($before), Activity::normalize($after)]];
            }

            if ($keyChanges === []) {
                continue;
            }

            Activity::withoutModelLogging(fn () => Setting::query()->updateOrCreate(['key' => $key], ['value' => $next]));

            $changes += $keyChanges;
            $groups[$definition['group']] = true;
        }

        if ($changes === []) {
            return [];
        }

        self::forget();
        LandingContent::forget();

        $groups = array_keys($groups);
        $groupLabels = array_map(fn (string $group): string => self::groups()[$group]['label'] ?? $group, $groups);

        Activity::record(
            $event,
            null,
            $description ?? 'Updated site settings: '.implode(', ', $groupLabels),
            ['groups' => $groups, 'changes' => $changes],
        );

        return $changes;
    }

    /**
     * Validation rules for the settings (optionally one group), keyed by dot
     * key. Laravel reads dot keys as nesting, so the form sends
     * {contact: {email: ...}} (an Inertia <Form> input named "contact.email"
     * does exactly that). A translatable setting's Arabic is validated like
     * its English under "<key>_ar". Pass the validated data to fromInput().
     *
     * @return array<string, list<mixed>>
     */
    public static function rules(?string $group = null): array
    {
        $rules = [];

        foreach (self::schema() as $key => $definition) {
            if ($group !== null && $definition['group'] !== $group) {
                continue;
            }

            $rules[$key] = match ($definition['type']) {
                'textarea' => ['nullable', 'string', 'max:2000'],
                'email' => ['nullable', 'string', 'email:rfc', 'max:190'],
                'url' => ['nullable', 'string', 'url:http,https', 'max:255'],
                'phone' => ['nullable', 'string', 'max:40', 'regex:'.self::PHONE_PATTERN],
                'number' => ['nullable', 'integer', 'min:0', 'max:2000000000'],
                'currencies' => ['nullable', 'array', 'min:1'],
                default => ['nullable', 'string', 'max:255'],
            };

            if ($definition['translatable']) {
                $rules[$key.self::ARABIC_SUFFIX] = $rules[$key];
            }

            if ($definition['type'] === 'currencies') {
                $rules["{$key}.*"] = ['string', 'distinct', Rule::in(array_keys((array) config('landing.currencies', [])))];
            }
        }

        return $rules;
    }

    /**
     * Pick the schema keys present in (nested) validated input, as dot key =>
     * value. A translatable setting sent with its Arabic ("<key>_ar") comes
     * out as {en?: ..., ar: ...}, which setMany() takes as is.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function fromInput(array $input, ?string $group = null): array
    {
        $values = [];

        foreach (self::schema() as $key => $definition) {
            if ($group !== null && $definition['group'] !== $group) {
                continue;
            }

            $hasEnglish = Arr::has($input, $key);

            if ($definition['translatable'] && Arr::has($input, $key.self::ARABIC_SUFFIX)) {
                $values[$key] = [
                    ...($hasEnglish ? [Locales::ENGLISH => Arr::get($input, $key)] : []),
                    Locales::ARABIC => Arr::get($input, $key.self::ARABIC_SUFFIX),
                ];
            } elseif ($hasEnglish) {
                $values[$key] = Arr::get($input, $key);
            }
        }

        return $values;
    }

    /**
     * Clear the settings cache.
     */
    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * The stored values (cached), keyed by dot key.
     *
     * @return array<string, mixed>
     */
    private static function stored(): array
    {
        /** @var array<string, mixed> */
        return Cache::rememberForever(self::CACHE_KEY, fn (): array => Setting::query()
            ->get(['key', 'value'])
            ->mapWithKeys(fn (Setting $setting): array => [$setting->key => $setting->value])
            ->all());
    }

    /**
     * A setting's value in a language, from its stored value and definition.
     *
     * @param  SettingDefinition  $definition
     */
    private static function resolve(array $definition, mixed $stored, string $locale): mixed
    {
        if (! $definition['translatable']) {
            return $stored ?? $definition['default'];
        }

        $parts = self::split($stored);
        $english = $parts[Locales::ENGLISH] ?? $definition['default'];

        if ($locale !== Locales::ARABIC) {
            return $english;
        }

        foreach ([$parts[Locales::ARABIC], $definition['default_ar']] as $arabic) {
            if (is_scalar($arabic) && trim((string) $arabic) !== '') {
                return $arabic;
            }
        }

        return $english;
    }

    /**
     * A translatable setting's stored value as {en, ar} (null: not set). A
     * plain stored value is the English.
     *
     * @return array{en: mixed, ar: mixed}
     */
    private static function split(mixed $stored): array
    {
        if (is_array($stored)) {
            return [
                Locales::ENGLISH => $stored[Locales::ENGLISH] ?? null,
                Locales::ARABIC => $stored[Locales::ARABIC] ?? null,
            ];
        }

        return [Locales::ENGLISH => $stored, Locales::ARABIC => null];
    }

    /**
     * The value to store for a translatable setting, and what changed.
     * Each language is compared by its effective value (the stored one, else
     * its default), so setting a default explicitly is not a change.
     *
     * @param  SettingDefinition  $definition
     * @return array{0: mixed, 1: array<string, array{0: mixed, 1: mixed}>}
     */
    private static function translatedChange(string $key, array $definition, mixed $current, mixed $value): array
    {
        $before = self::split($current);
        $after = $before;

        foreach (self::translationInput($value) as $locale => $part) {
            $part = self::coerce($definition['type'], $part);

            // An empty Arabic is no Arabic: the page shows the default or the English.
            $after[$locale] = $locale === Locales::ARABIC && $part === '' ? null : $part;
        }

        $defaults = [
            Locales::ENGLISH => $definition['default'],
            Locales::ARABIC => filled($definition['default_ar']) ? $definition['default_ar'] : null,
        ];
        $changes = [];

        foreach ([Locales::ENGLISH => $key, Locales::ARABIC => $key.self::ARABIC_SUFFIX] as $locale => $logKey) {
            $old = $before[$locale] ?? $defaults[$locale];
            $new = $after[$locale] ?? $defaults[$locale];

            if ($old !== $new) {
                $changes[$logKey] = [Activity::normalize($old), Activity::normalize($new)];
            }
        }

        // Without Arabic the English is stored plain, as before translations existed.
        $next = $after[Locales::ARABIC] === null
            ? $after[Locales::ENGLISH]
            : [Locales::ENGLISH => $after[Locales::ENGLISH], Locales::ARABIC => $after[Locales::ARABIC]];

        return [$next, $changes];
    }

    /**
     * The languages a value for a translatable setting sets: {en?, ar?} as
     * given, or a plain value as the English.
     *
     * @return array<string, mixed>
     */
    private static function translationInput(mixed $value): array
    {
        if (is_array($value) && $value !== [] && array_diff(array_keys($value), Locales::SUPPORTED) === []) {
            return $value;
        }

        return [Locales::ENGLISH => $value];
    }

    /**
     * Normalise a value for its type before it is stored (null = default).
     */
    private static function coerce(string $type, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if ($type === 'number') {
            return is_numeric($value) ? (int) $value : null;
        }

        if ($type === 'currencies') {
            $known = array_keys((array) config('landing.currencies', []));
            $codes = array_values(array_unique(array_filter(
                array_map(fn (mixed $code): string => is_scalar($code) ? strtoupper((string) $code) : '', (array) $value),
                fn (string $code): bool => in_array($code, $known, true),
            )));

            return $codes === [] ? null : $codes;
        }

        return is_scalar($value) ? trim((string) $value) : null;
    }
}
