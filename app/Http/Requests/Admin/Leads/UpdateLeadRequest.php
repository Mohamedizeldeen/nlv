<?php

namespace App\Http\Requests\Admin\Leads;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * One of the lead page's three forms: the status (with an optional note for
 * the timeline), the assignee, or the admin notes. Each form sends only its
 * own fields, so every field is `sometimes`.
 */
class UpdateLeadRequest extends FormRequest
{
    /**
     * Longest note that goes on the timeline with a status change.
     */
    public const NOTE_MAX = 1000;

    /**
     * Longest admin notes.
     */
    public const NOTES_MAX = 5000;

    /**
     * Access is decided by the admin route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $lead = $this->route('lead');
        $current = $lead instanceof Lead ? $lead->assigned_to : null;

        return [
            'status' => ['sometimes', 'required', Rule::enum(LeadStatus::class)],
            'note' => ['nullable', 'string', 'max:'.self::NOTE_MAX],
            'assigned_to' => [
                'sometimes',
                'nullable',
                'integer',
                // An admin, or whoever already holds the lead (even if no longer an admin).
                Rule::exists('users', 'id')->where(function (Builder $query) use ($current): void {
                    $query->where('is_admin', true);

                    if ($current !== null) {
                        $query->orWhere('id', $current);
                    }
                }),
            ],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:'.self::NOTES_MAX],
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
            'assigned_to' => 'assignee',
            'admin_notes' => 'notes',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.required' => 'Choose a status.',
            'status.enum' => 'Choose one of the listed statuses.',
            'assigned_to.exists' => 'Choose one of the admins in the list.',
        ];
    }
}
