<?php

namespace App\Http\Requests\Admin\Looks;

use App\Models\Look;
use App\Models\LookCategory;
use App\Support\ImageUploader;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

/**
 * Adding or editing a Lookbook entry, with its caption in English and
 * Arabic (`title` + `title_ar`, `city` + `city_ar`, `alt` + `alt_ar`: all
 * required, same limits). The try-on result (`after_image`) is
 * required for a new look; on edit an empty file field keeps the stored one.
 * The shopper's own photo (`before_image`) is optional and can be removed
 * with `remove_before_image`. `aspect` is never taken from the browser: the
 * controller measures the stored after image.
 */
class LookRequest extends FormRequest
{
    /**
     * Longest render time the caption can show ("9.9 s").
     */
    public const MAX_SECONDS = 9.9;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'look_category_id' => ['required', 'integer', Rule::exists(LookCategory::class, 'id')],
            'title' => ['required', 'string', 'max:80'],
            'title_ar' => ['required', 'string', 'max:80'],
            'city' => ['required', 'string', 'max:60'],
            'city_ar' => ['required', 'string', 'max:60'],
            'render_seconds' => ['required', 'numeric', 'min:0.1', 'max:'.self::MAX_SECONDS, 'decimal:0,1'],
            'alt' => ['required', 'string', 'max:200'],
            'alt_ar' => ['required', 'string', 'max:200'],
            'after_image' => ImageUploader::rules(required: ! $this->editing()),
            'before_image' => ImageUploader::rules(),
            'remove_before_image' => ['sometimes', 'boolean'],
            'focus_x' => ['required', 'numeric', 'between:0,1'],
            'focus_y' => ['required', 'numeric', 'between:0,1'],
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
        $messages = [
            'look_category_id.required' => 'Choose the filter this look appears under.',
            'look_category_id.exists' => 'That category no longer exists. Choose another one.',
            'render_seconds.decimal' => 'Use one decimal place, e.g. 1.8.',
            'render_seconds.min' => 'The render time must be at least 0.1 seconds.',
            'render_seconds.max' => 'The render time can be at most '.self::MAX_SECONDS.' seconds.',
            'after_image.required' => 'Add the try-on result: it is the photo shoppers see.',
            'focus_x.required' => 'Set the focal point on the try-on result.',
            'focus_y.required' => 'Set the focal point on the try-on result.',
        ];

        foreach (['after_image' => 'try-on result', 'before_image' => 'before photo'] as $field => $label) {
            $messages += [
                "{$field}.image" => "The {$label} must be an image.",
                "{$field}.mimes" => "The {$label} must be a JPG, PNG, WebP or AVIF file.",
                "{$field}.max" => "The {$label} may not be larger than 8 MB.",
                "{$field}.dimensions" => "The {$label} needs to be at least 400 × 400 pixels.",
                "{$field}.uploaded" => "The {$label} did not arrive. It may be too large: try a smaller file.",
            ];
        }

        return $messages;
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'look_category_id' => 'category',
            'render_seconds' => 'render time',
            'title_ar' => 'Arabic title',
            'city_ar' => 'Arabic city',
            'alt' => 'alt text',
            'alt_ar' => 'Arabic alt text',
            'after_image' => 'try-on result',
            'before_image' => 'before photo',
            'focus_x' => 'focal point',
            'focus_y' => 'focal point',
        ];
    }

    /**
     * The validated fields that go straight onto the look (images and the
     * aspect ratio are handled by the controller).
     *
     * @return array<string, mixed>
     */
    public function lookAttributes(): array
    {
        return $this->safe()->only([
            'look_category_id', 'title', 'title_ar', 'city', 'city_ar', 'render_seconds', 'alt', 'alt_ar',
            'focus_x', 'focus_y', 'is_published',
        ]);
    }

    /**
     * The new try-on result, if one was chosen.
     */
    public function afterImage(): ?UploadedFile
    {
        $file = $this->file('after_image');

        return $file instanceof UploadedFile ? $file : null;
    }

    /**
     * The new before photo, if one was chosen.
     */
    public function beforeImage(): ?UploadedFile
    {
        $file = $this->file('before_image');

        return $file instanceof UploadedFile ? $file : null;
    }

    /**
     * Whether the stored before photo should be removed (a new file wins).
     */
    public function removesBeforeImage(): bool
    {
        return $this->beforeImage() === null && $this->boolean('remove_before_image');
    }

    /**
     * Whether an existing look is being edited.
     */
    private function editing(): bool
    {
        return $this->route('look') instanceof Look;
    }
}
