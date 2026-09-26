<?php

namespace App\Http\Requests\Admin\Pricing;

use App\Models\Faq;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A new order for the questions, from the drag-and-drop list.
 */
class ReorderFaqsRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'list', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:faqs,id'],
        ];
    }

    /**
     * Every question's id in the new order. Questions the list did not
     * include (added in another tab meanwhile) keep their relative order
     * after the ones that were sent.
     *
     * @return list<int>
     */
    public function orderedIds(): array
    {
        $ids = array_values(array_map(intval(...), (array) $this->validated('ids')));

        $rest = Faq::query()->ordered()->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->reject(fn (int $id): bool => in_array($id, $ids, true))
            ->values()
            ->all();

        return [...$ids, ...$rest];
    }
}
