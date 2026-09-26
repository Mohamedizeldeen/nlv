<?php

namespace App\Http\Requests\Admin\Stories;

use App\Models\Story;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A new page order for the stories, from the drag-and-drop list: `ids` in
 * the order the landing page should show them.
 */
class ReorderStoriesRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct', Rule::exists(Story::class, 'id')],
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
            'ids.required' => 'Send the stories in their new order.',
            'ids.*.exists' => 'One of these stories no longer exists. Reload the page and try again.',
            'ids.*.distinct' => 'A story appears twice in the new order. Reload the page and try again.',
        ];
    }

    /**
     * Every story id in its new order: the ones sent first, then any story
     * the list did not include (added meanwhile in another tab), in their
     * current order, so no two stories end up sharing a position.
     *
     * @return list<int>
     */
    public function orderedIds(): array
    {
        /** @var array<int, int|string> $sent */
        $sent = $this->validated('ids');
        $ids = array_values(array_map(intval(...), $sent));

        $rest = Story::query()->ordered()->whereKeyNot($ids)->pluck('id')->map(fn (mixed $id): int => (int) $id)->all();

        return [...$ids, ...array_values($rest)];
    }
}
