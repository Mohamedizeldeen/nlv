<?php

namespace App\Models\Concerns;

use App\Support\Locales;
use Illuminate\Database\Eloquent\Model;

/**
 * The Arabic version of a model's visitor-facing text: every translatable
 * attribute has an `<attribute>_ar` column beside it, and the attribute
 * itself is the English. `localized()` reads the Arabic on the Arabic page
 * and falls back to the English whenever the Arabic is empty, so a missing
 * translation never leaves the page blank.
 *
 * The model lists its translatable attributes (English names) in
 * `translatableAttributes()`.
 *
 * @mixin Model
 */
trait HasArabic
{
    /**
     * The attributes that have an Arabic column, by their English name.
     *
     * @return list<string>
     */
    abstract public function translatableAttributes(): array;

    /**
     * The Arabic column of an attribute: "quote" => "quote_ar".
     */
    public static function arabicColumn(string $attribute): string
    {
        return $attribute.'_ar';
    }

    /**
     * Every Arabic column of the model: ["name_ar", "quote_ar", ...].
     *
     * @return list<string>
     */
    public function arabicAttributes(): array
    {
        return array_map(static::arabicColumn(...), $this->translatableAttributes());
    }

    /**
     * An attribute in a language (default: the current one): the Arabic
     * when the language is Arabic and the Arabic is filled in, else the
     * English.
     */
    public function localized(string $attribute, ?string $locale = null): mixed
    {
        $english = $this->getAttribute($attribute);

        if (! Locales::isArabic($locale)) {
            return $english;
        }

        $arabic = $this->getAttribute(static::arabicColumn($attribute));

        return self::isFilledIn($arabic) ? $arabic : $english;
    }

    /**
     * The translatable attributes that have English but no Arabic yet.
     *
     * @return list<string>
     */
    public function missingArabic(): array
    {
        return array_values(array_filter(
            $this->translatableAttributes(),
            fn (string $attribute): bool => self::isFilledIn($this->getAttribute($attribute))
                && ! self::isFilledIn($this->getAttribute(static::arabicColumn($attribute))),
        ));
    }

    /**
     * Whether a value is there: a non-blank string, or a list (plan
     * features) with at least one item and no blank ones.
     */
    private static function isFilledIn(mixed $value): bool
    {
        if (is_array($value)) {
            return $value !== [] && array_filter($value, blank(...)) === [];
        }

        return filled($value);
    }
}
