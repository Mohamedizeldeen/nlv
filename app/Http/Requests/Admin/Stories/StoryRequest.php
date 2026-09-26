<?php

namespace App\Http\Requests\Admin\Stories;

use App\Support\ImageUploader;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * The story form, shared by create and edit. The quote marks exactly one
 * phrase with *asterisks* (the landing page sets it in mint), and the
 * portrait's focal point and zoom decide how the story card crops it.
 *
 * Every visitor-facing text is written in English and Arabic (`<field>_ar`,
 * same limits): the Arabic page (/ar) shows the Arabic. The optional texts
 * (short label, note) are optional in both, but a language may not leave
 * out what the other shows, or /ar would print the English there.
 */
abstract class StoryRequest extends FormRequest
{
    /**
     * Longest quote, asterisks included: longer ones overflow the story card.
     */
    public const QUOTE_MAX = 320;

    /**
     * Portrait zoom range (1 = the whole photo, cropped to the card).
     */
    public const ZOOM_MIN = 1;

    public const ZOOM_MAX = 2.5;

    /**
     * Where uploaded portraits are stored on the public disk.
     */
    public const PORTRAIT_FOLDER = 'landing/stories';

    /**
     * Whether a new portrait file must be sent (creating) or may be omitted
     * to keep the current one (editing).
     */
    abstract protected function portraitRequired(): bool;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'role' => ['required', 'string', 'max:80'],
            'store' => ['required', 'string', 'max:80'],
            'city' => ['required', 'string', 'max:60'],
            'coordinates' => ['nullable', 'string', 'max:40'],
            'quote' => ['required', 'string', 'max:'.self::QUOTE_MAX, $this->oneAccentPhrase(...)],
            'metric_figure' => ['required', 'string', 'max:16'],
            'metric_label' => ['required', 'string', 'max:40'],
            'metric_short' => ['nullable', 'string', 'max:24'],
            'metric_note' => ['nullable', 'required_with:metric_note_ar', 'string', 'max:40'],
            'name_ar' => ['required', 'string', 'max:80'],
            'role_ar' => ['required', 'string', 'max:80'],
            'store_ar' => ['required', 'string', 'max:80'],
            'city_ar' => ['required', 'string', 'max:60'],
            'quote_ar' => ['required', 'string', 'max:'.self::QUOTE_MAX, $this->oneAccentPhrase(...)],
            'metric_label_ar' => ['required', 'string', 'max:40'],
            'metric_short_ar' => ['nullable', 'required_with:metric_short', 'string', 'max:24'],
            'metric_note_ar' => ['nullable', 'required_with:metric_note', 'string', 'max:40'],
            'portrait' => ImageUploader::rules($this->portraitRequired()),
            'portrait_focus_x' => ['required', 'numeric', 'between:0,1'],
            'portrait_focus_y' => ['required', 'numeric', 'between:0,1'],
            'portrait_zoom' => ['required', 'numeric', 'between:'.self::ZOOM_MIN.','.self::ZOOM_MAX],
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
            'portrait.required' => 'Add a portrait of the store owner.',
            'portrait.image' => 'Use a JPG, PNG, WebP or AVIF image.',
            'portrait.mimes' => 'Use a JPG, PNG, WebP or AVIF image.',
            'portrait.max' => 'The portrait may be at most 8 MB.',
            'portrait.dimensions' => 'The portrait needs to be at least 400 × 400 px.',
            'portrait.uploaded' => 'The portrait did not reach the server, which accepts files up to '
                .self::uploadLimit().'. Try a smaller image.',
            'portrait_focus_x.*' => 'Click the portrait to set its focal point.',
            'portrait_focus_y.*' => 'Click the portrait to set its focal point.',
            'portrait_zoom.between' => 'Set the zoom between 1× and 2.5×.',
            'metric_short_ar.required_with' => 'Add the short label in Arabic too, or clear the English one.',
            'metric_note_ar.required_with' => 'Add the note in Arabic too, or clear the English one.',
            'metric_note.required_with' => 'Add the note in English too, or clear the Arabic one.',
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
            'metric_figure' => 'figure',
            'metric_label' => 'label',
            'metric_short' => 'short label',
            'metric_note' => 'note',
            'name_ar' => 'Arabic name',
            'role_ar' => 'Arabic role',
            'store_ar' => 'Arabic store',
            'city_ar' => 'Arabic city',
            'quote_ar' => 'Arabic quote',
            'metric_label_ar' => 'Arabic label',
            'metric_short_ar' => 'Arabic short label',
            'metric_note_ar' => 'Arabic note',
            'portrait_zoom' => 'zoom',
            'is_published' => 'visibility',
        ];
    }

    /**
     * The validated columns, typed for the model (the portrait file is
     * stored separately with storePortrait()).
     *
     * @return array<string, mixed>
     */
    public function storyAttributes(): array
    {
        $data = $this->safe()->except(['portrait']);

        foreach (['portrait_focus_x', 'portrait_focus_y', 'portrait_zoom'] as $key) {
            $data[$key] = round((float) $data[$key], 2);
        }

        $data['is_published'] = $this->boolean('is_published');

        return $data;
    }

    /**
     * Store the uploaded portrait (re-encoded to WebP) and return its media
     * ref, or null when no new file was sent.
     *
     * @throws ValidationException when the file cannot be read as an image
     */
    public function storePortrait(): ?string
    {
        $file = $this->file('portrait');

        if (! $file instanceof UploadedFile) {
            return null;
        }

        try {
            return ImageUploader::store($file, self::PORTRAIT_FOLDER);
        } catch (RuntimeException) {
            throw ValidationException::withMessages([
                'portrait' => 'This image could not be read. Export it again as a JPG or PNG and retry.',
            ]);
        }
    }

    /**
     * The quote must highlight exactly one phrase, written *like this*.
     */
    protected function oneAccentPhrase(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $phrases = preg_match_all('/\*[^*]+\*/u', $value);
        $rest = (string) preg_replace('/\*[^*]+\*/u', '', $value);

        if (str_contains($rest, '*')) {
            $fail('One asterisk has no partner: wrap the highlighted phrase *like this*.');
        } elseif ($phrases === 0) {
            $fail('Mark the phrase to set in mint with asterisks, *like this*.');
        } elseif ($phrases > 1) {
            $fail('Highlight one phrase only: the story card sets a single phrase in mint.');
        }
    }

    /**
     * PHP's per-file upload limit, for people: "2 MB".
     */
    private static function uploadLimit(): string
    {
        $limit = trim((string) ini_get('upload_max_filesize'));

        return preg_match('/^(\d+)\s*([KMG])$/i', $limit, $matches) === 1
            ? $matches[1].' '.strtoupper($matches[2]).'B'
            : ($limit === '' ? 'the server limit' : $limit.' bytes');
    }
}
