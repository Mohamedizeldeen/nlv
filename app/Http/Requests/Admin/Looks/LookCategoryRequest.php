<?php

namespace App\Http\Requests\Admin\Looks;

use App\Models\LookCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Adding or editing a Lookbook filter, in English and Arabic (`name` +
 * `name_ar`, ...). The name is required in both languages; the note, the
 * figure and its unit are optional but go in pairs (filled in one language,
 * required in the other), so / and /ar always show the same parts of the
 * note. A unit needs its figure in each language. The slug is made from
 * the English name when left empty and
 * always normalised ("Evening Wear!" becomes "evening-wear"); "all" is
 * taken by the lookbook's own "All" filter.
 */
class LookCategoryRequest extends FormRequest
{
    /**
     * Slugs the landing page already uses for something else.
     *
     * @var list<string>
     */
    public const RESERVED_SLUGS = ['all'];

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $category = $this->route('look_category');
        $ignore = $category instanceof LookCategory ? $category->id : null;

        return [
            'name' => ['required', 'string', 'max:40', Rule::unique(LookCategory::class)->ignore($ignore)],
            'name_ar' => ['required', 'string', 'max:40', Rule::unique(LookCategory::class, 'name_ar')->ignore($ignore)],
            'slug' => [
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(self::RESERVED_SLUGS),
                Rule::unique(LookCategory::class)->ignore($ignore),
            ],
            'note' => ['nullable', 'string', 'max:200', 'required_with:note_ar'],
            'note_ar' => ['nullable', 'string', 'max:200', 'required_with:note'],
            // required_with: the unit's figure; required: the other language's figure.
            'stat_figure' => ['nullable', 'string', 'max:16', 'required_with:stat_unit', Rule::requiredIf($this->filled('stat_figure_ar'))],
            'stat_figure_ar' => ['nullable', 'string', 'max:16', 'required_with:stat_unit_ar', Rule::requiredIf($this->filled('stat_figure'))],
            'stat_unit' => ['nullable', 'string', 'max:40', 'required_with:stat_unit_ar'],
            'stat_unit_ar' => ['nullable', 'string', 'max:40', 'required_with:stat_unit'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'There is already a category with this name.',
            'name_ar.unique' => 'There is already a category with this Arabic name.',
            'slug.required' => 'Give the category a name or a slug (letters and numbers).',
            'slug.regex' => 'Use lowercase letters, numbers and single hyphens only.',
            'slug.not_in' => '“all” is the lookbook’s own “All” filter. Choose another slug.',
            'slug.unique' => 'Another category already uses this slug.',
            'note.required_with' => 'Add the English note too, or leave both empty.',
            'note_ar.required_with' => 'Add the Arabic note too, or leave both empty.',
            'stat_figure.required_with' => 'Add the figure this unit belongs to, or clear the unit.',
            'stat_figure.required' => 'Add the English figure too, or leave both empty.',
            'stat_figure_ar.required_with' => 'Add the Arabic figure this unit belongs to, or clear the unit.',
            'stat_figure_ar.required' => 'Add the Arabic figure too (the same digits work), or leave both empty.',
            'stat_unit.required_with' => 'Add the English unit too, or leave both empty.',
            'stat_unit_ar.required_with' => 'Add the Arabic unit too, or leave both empty.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name_ar' => 'Arabic name',
            'note' => 'note',
            'note_ar' => 'Arabic note',
            'stat_figure' => 'figure',
            'stat_figure_ar' => 'Arabic figure',
            'stat_unit' => 'unit',
            'stat_unit_ar' => 'Arabic unit',
        ];
    }

    /**
     * Normalise the slug, making it from the English name when it is left
     * empty.
     */
    protected function prepareForValidation(): void
    {
        $slug = $this->input('slug');
        $name = $this->input('name');
        $source = is_string($slug) && trim($slug) !== '' ? $slug : (is_string($name) ? $name : '');

        $this->merge(['slug' => Str::slug($source) ?: null]);
    }
}
