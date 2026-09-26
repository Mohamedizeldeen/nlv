<?php

namespace App\Http\Requests\Admin\Content;

use App\Support\Settings;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Save one group of site settings (/admin/content, one tab). An empty field
 * arrives as null, which puts the setting back to its default.
 *
 * The inputs are named by dot key ("contact.email"), which the form sends
 * nested ({contact: {email: ...}}), exactly what Settings::rules() expects.
 * Copy has an Arabic input beside the English, "<key>_ar" ("hero.title_ar"),
 * validated with the same limits; empty, it puts the Arabic default back.
 */
class SiteContentRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return Settings::rules($this->group());
    }

    /**
     * Get custom messages for validator errors, worded per field type.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $messages = [];

        foreach ($this->definitions() as $key => $definition) {
            $messages += match ($definition['type']) {
                'email' => ["{$key}.email" => 'Enter an email address, like hello@example.com.'],
                'url' => ["{$key}.url" => 'Enter a full web address starting with https://.'],
                'phone' => ["{$key}.regex" => 'Use digits, spaces and + ( ) - only, with 7 to 20 digits.'],
                'number' => [
                    "{$key}.integer" => 'Enter a whole number, without commas.',
                    "{$key}.min" => 'Enter 0 or more.',
                ],
                default => [],
            };
        }

        return $messages;
    }

    /**
     * Get custom attributes for validator errors: the field labels, and
     * "Arabic kicker" / "How it works: Arabic title" for the Arabic inputs.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        $attributes = [];

        foreach ($this->definitions() as $key => $definition) {
            $attributes[$key] = $definition['label'];

            if ($definition['translatable']) {
                $attributes[$key.Settings::ARABIC_SUFFIX] = self::arabicLabel($definition['label']);
            }
        }

        return $attributes;
    }

    /**
     * The name of a label's Arabic input: "Kicker" → "Arabic kicker",
     * "How it works: title" → "How it works: Arabic title".
     */
    public static function arabicLabel(string $label): string
    {
        $split = strpos($label, ': ');
        $prefix = $split === false ? '' : substr($label, 0, $split + 2);
        $name = $split === false ? $label : substr($label, $split + 2);

        return $prefix.'Arabic '.lcfirst($name);
    }

    /**
     * The group being saved (the {group} route parameter).
     */
    public function group(): string
    {
        $group = $this->route('group');

        return is_string($group) ? $group : '';
    }

    /**
     * The submitted settings of the group, as dot key => value (null = default).
     *
     * @return array<string, mixed>
     */
    public function settings(): array
    {
        return Settings::fromInput($this->validated(), $this->group());
    }

    /**
     * The schema entries of the group being saved.
     *
     * @return array<string, array{group: string, label: string, type: string, default: mixed, default_ar: mixed, translatable: bool, help: string|null, public: bool}>
     */
    private function definitions(): array
    {
        $group = $this->group();

        return array_filter(Settings::schema(), fn (array $definition): bool => $definition['group'] === $group);
    }
}
