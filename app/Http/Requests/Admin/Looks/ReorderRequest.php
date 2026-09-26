<?php

namespace App\Http\Requests\Admin\Looks;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A new page order from a drag-and-drop list: `ids` in their new order.
 * Sortable::completeOrder() drops unknown ids and appends the records the
 * list left out.
 */
class ReorderRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:1000'],
            'ids.*' => ['required', 'integer', 'min:1', 'distinct'],
        ];
    }

    /**
     * The ids in their new order.
     *
     * @return list<int>
     */
    public function ids(): array
    {
        $ids = $this->validated('ids');

        return array_values(array_map(intval(...), is_array($ids) ? $ids : []));
    }
}
