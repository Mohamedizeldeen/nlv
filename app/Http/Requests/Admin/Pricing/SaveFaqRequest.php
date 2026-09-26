<?php

namespace App\Http\Requests\Admin\Pricing;

use App\Models\Faq;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creates or updates a question under the pricing plans, in English and
 * Arabic (`question` + `question_ar`, `answer` + `answer_ar`): both
 * languages are required, with the same limits.
 */
class SaveFaqRequest extends FormRequest
{
    /**
     * Longest answer accepted: the landing sets them three to a row.
     */
    public const MAX_ANSWER = 1000;

    /**
     * Longest question accepted, in either language.
     */
    public const MAX_QUESTION = 200;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $faq = $this->route('faq');

        $ignore = $faq instanceof Faq ? $faq->id : null;

        return [
            'question' => ['required', 'string', 'max:'.self::MAX_QUESTION, Rule::unique('faqs', 'question')->ignore($ignore)],
            'answer' => ['required', 'string', 'max:'.self::MAX_ANSWER],
            'question_ar' => ['required', 'string', 'max:'.self::MAX_QUESTION, Rule::unique('faqs', 'question_ar')->ignore($ignore)],
            'answer_ar' => ['required', 'string', 'max:'.self::MAX_ANSWER],
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
            'question.required' => 'Write the question.',
            'question.unique' => 'This question is already in the list.',
            'answer.required' => 'Write the answer.',
            'question_ar.required' => 'Write the question in Arabic too.',
            'question_ar.unique' => 'This Arabic question is already in the list.',
            'answer_ar.required' => 'Write the answer in Arabic too.',
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
            'question_ar' => 'Arabic question',
            'answer_ar' => 'Arabic answer',
            'is_published' => 'visibility',
        ];
    }

    /**
     * The validated attributes to store.
     *
     * @return array{question: string, answer: string, question_ar: string, answer_ar: string, is_published: bool}
     */
    public function faqAttributes(): array
    {
        return [
            'question' => (string) $this->validated('question'),
            'answer' => (string) $this->validated('answer'),
            'question_ar' => (string) $this->validated('question_ar'),
            'answer_ar' => (string) $this->validated('answer_ar'),
            'is_published' => $this->boolean('is_published'),
        ];
    }
}
