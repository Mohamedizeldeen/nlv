<?php

namespace App\Http\Requests;

use App\Enums\LeadPlan;
use App\Enums\LeadSource;
use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The landing page's "Order a device" pop-up. Every visible field is required.
 * `website` is a honeypot: when it is filled nothing is validated and the
 * controller quietly discards the request.
 *
 * `locale` is the language of the page the pop-up was on ("en" or "ar"; a
 * missing or unknown one is English). The error messages are in that
 * language (lang/ar.json), and it is stored on the lead.
 */
class StoreOrderRequest extends FormRequest
{
    /**
     * Whether a bot filled the honeypot.
     */
    public function isSpam(): bool
    {
        return filled($this->input('website'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        if ($this->isSpam()) {
            return [];
        }

        return [
            'name' => ['required', 'string', 'max:120'],
            'company' => ['required', 'string', 'max:160'],
            'email' => ['required', 'string', 'email:rfc', 'max:190'],
            'phone' => ['required', 'string', 'max:40', 'regex:'.Settings::PHONE_PATTERN],
            'country' => ['required', 'string', 'max:80'],
            'city' => ['required', 'string', 'max:80'],
            'devices' => ['required', 'integer', 'min:1', 'max:999'],
            'plan' => ['required', Rule::enum(LeadPlan::class)],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'consent' => ['accepted'],
            'source' => ['nullable', Rule::enum(LeadSource::class)],
            'locale' => ['required', Rule::in(Locales::SUPPORTED)],
        ];
    }

    /**
     * Get custom messages for validator errors, in the visitor's language.
     * Every rule has one, so no framework message (English only) is shown.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('Enter your full name.'),
            'company.required' => __('Enter your company or store name.'),
            'email.required' => __('Enter your work email.'),
            'email.email' => __('Enter a complete email address, like name@yourstore.com.'),
            'phone.required' => __('Enter a phone number our team can call.'),
            'phone.regex' => __('Enter a phone number with 7 to 20 digits (digits, spaces, + ( ) and - only).'),
            'country.required' => __('Enter the country your store is in.'),
            'city.required' => __('Enter the city your store is in.'),
            'devices.required' => __('Enter how many devices you need.'),
            'devices.integer' => __('Enter a whole number of devices.'),
            'devices.min' => __('Order at least one device.'),
            'devices.max' => __('For more than 999 devices, write to us and we will plan the rollout with you.'),
            'plan.required' => __('Choose how you would like to own the device.'),
            'plan.enum' => __('Choose one of the ways to own the device.'),
            'message.required' => __('Tell us a little about your store and what you need.'),
            'message.min' => __('Tell us a little more (at least 10 characters).'),
            'consent.accepted' => __('Please agree to be contacted about this order.'),
            // Any field: text sent as something else, or text that is too long.
            'string' => __('Enter this as plain text.'),
            'max' => __('Keep this to :max characters or fewer.'),
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
            'company' => __('company or store name'),
            'email' => __('work email'),
            'phone' => __('phone number'),
            'devices' => __('number of devices'),
        ];
    }

    /**
     * The validated fields to store on the lead.
     *
     * @return array<string, mixed>
     */
    public function leadAttributes(): array
    {
        return $this->safe()->only([
            'name', 'company', 'email', 'phone', 'country', 'city', 'devices', 'plan', 'message', 'source', 'locale',
        ]);
    }

    /**
     * An unknown source (an old or mistyped CTA) is dropped, and an unknown
     * language read as English, rather than failing a visitor's order over a
     * field they never see. The messages are then given in that language.
     */
    protected function prepareForValidation(): void
    {
        $source = $this->input('source');

        if ($source !== null && (! is_string($source) || LeadSource::tryFrom($source) === null)) {
            $this->merge(['source' => null]);
        }

        $locale = Locales::normalize($this->input('locale'));

        $this->merge(['locale' => $locale]);

        app()->setLocale($locale);
    }
}
