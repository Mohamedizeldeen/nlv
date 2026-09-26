<?php

namespace App\Http\Requests\Admin\Content;

use App\Enums\FooterGroup;
use App\Models\Page;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Create or update a content page (/admin/pages). An empty slug is made
 * from the title (and kept unique); a typed one is normalised to a slug
 * and must not be taken by another page.
 *
 * The page is written in English and Arabic (`title` + `title_ar`, ...,
 * served at /pages/{slug} and /ar/pages/{slug}): the Arabic title and text
 * are required like the English, and the Arabic summary whenever there is
 * an English one. The slug is shared.
 */
class PageRequest extends FormRequest
{
    /**
     * What a slug looks like: lowercase words joined by single hyphens.
     */
    public const SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    /**
     * Longest Markdown body accepted (characters).
     */
    public const BODY_MAX = 100000;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'slug' => [
                'required',
                'string',
                'max:120',
                'regex:'.self::SLUG_PATTERN,
                Rule::unique('pages', 'slug')->ignore($this->page()?->id),
            ],
            'summary' => ['nullable', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:'.self::BODY_MAX],
            'title_ar' => ['required', 'string', 'max:120'],
            'summary_ar' => ['nullable', 'required_with:summary', 'string', 'max:200'],
            'body_ar' => ['required', 'string', 'max:'.self::BODY_MAX],
            'footer_group' => ['nullable', Rule::enum(FooterGroup::class)],
            'is_published' => ['required', 'boolean'],
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
            'title.required' => 'Give the page a title.',
            'slug.required' => 'Give the page an address, or a title to make one from.',
            'slug.regex' => 'Use lowercase letters, numbers and single hyphens only.',
            'slug.unique' => 'Another page already uses this address.',
            'body.required' => 'Write the page before saving it.',
            'title_ar.required' => 'Give the page an Arabic title.',
            'summary_ar.required_with' => 'Add the Arabic summary too, or leave both empty.',
            'body_ar.required' => 'Write the Arabic page before saving it.',
            'footer_group.enum' => 'Choose Company, Legal or not in the footer.',
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
            'slug' => 'address',
            'summary' => 'summary',
            'body' => 'page text',
            'title_ar' => 'Arabic title',
            'summary_ar' => 'Arabic summary',
            'body_ar' => 'Arabic page text',
            'footer_group' => 'footer column',
            'is_published' => 'published',
        ];
    }

    /**
     * The validated page attributes, ready for create() / update().
     *
     * @return array{title: string, slug: string, summary: string|null, body: string, title_ar: string, summary_ar: string|null, body_ar: string, footer_group: string|null, is_published: bool}
     */
    public function pageAttributes(): array
    {
        $group = $this->validated('footer_group');

        return [
            'title' => (string) $this->validated('title'),
            'slug' => (string) $this->validated('slug'),
            'summary' => $this->optionalText('summary'),
            'body' => (string) $this->validated('body'),
            'title_ar' => (string) $this->validated('title_ar'),
            'summary_ar' => $this->optionalText('summary_ar'),
            'body_ar' => (string) $this->validated('body_ar'),
            'footer_group' => is_string($group) && $group !== '' ? $group : null,
            'is_published' => $this->boolean('is_published'),
        ];
    }

    /**
     * A validated optional text: null when it was left empty.
     */
    private function optionalText(string $key): ?string
    {
        $value = $this->validated($key);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * Normalise the slug before validation: a typed one becomes a slug
     * ("About us" → "about-us"); an empty one is made from the title,
     * with -2, -3... when that address is taken.
     */
    protected function prepareForValidation(): void
    {
        $typed = $this->input('slug');
        $slug = is_string($typed) ? Str::slug($typed) : '';

        if ($slug === '') {
            $title = $this->input('title');
            $slug = $this->uniqueSlug(Str::slug(is_string($title) ? $title : ''));
        }

        $this->merge(['slug' => $slug === '' ? null : $slug]);
    }

    /**
     * The page being updated (null when creating one).
     */
    private function page(): ?Page
    {
        $page = $this->route('page');

        return $page instanceof Page ? $page : null;
    }

    /**
     * The first free address based on $base: base, base-2, base-3...
     */
    private function uniqueSlug(string $base): string
    {
        if ($base === '') {
            return '';
        }

        $base = rtrim(Str::limit($base, 110, ''), '-');
        $ignore = $this->page()?->id;
        $taken = Page::query()
            ->where(fn ($query) => $query->where('slug', $base)->orWhere('slug', 'like', $base.'-%'))
            ->when($ignore !== null, fn ($query) => $query->whereKeyNot($ignore))
            ->pluck('slug')
            ->all();

        $slug = $base;

        for ($suffix = 2; in_array($slug, $taken, true); $suffix++) {
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }
}
