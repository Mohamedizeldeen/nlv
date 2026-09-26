<?php

namespace App\Http\Requests\Admin\Content;

use App\Support\Locales;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The Markdown the page editor wants rendered for its live preview, and the
 * language it is written in (`en` when not given).
 */
class PagePreviewRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:'.PageRequest::BODY_MAX],
            'locale' => ['nullable', 'string', Rule::in(Locales::SUPPORTED)],
        ];
    }

    /**
     * The Markdown to render ('' when empty).
     */
    public function body(): string
    {
        $body = $this->validated('body');

        return is_string($body) ? $body : '';
    }

    /**
     * The language of the Markdown: "en" or "ar".
     */
    public function locale(): string
    {
        return Locales::normalize($this->validated('locale'));
    }
}
