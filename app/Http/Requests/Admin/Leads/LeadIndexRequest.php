<?php

namespace App\Http\Requests\Admin\Leads;

use App\Enums\LeadPlan;
use App\Enums\LeadStatus;
use App\Support\Locales;
use DateTimeImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The query of the leads list and its CSV export: search, filters and sort.
 *
 * Nothing here fails validation: a filter URL is something admins bookmark
 * and share, so an unknown or malformed value is dropped (the list simply
 * ignores it) instead of bouncing the admin to another page.
 *
 * @phpstan-type LeadFilters array{search: string|null, status: string|null, plan: string|null, country: string|null, locale: string|null, from: string|null, to: string|null}
 * @phpstan-type LeadSort array{column: string, direction: 'asc'|'desc'}
 */
class LeadIndexRequest extends FormRequest
{
    /**
     * The pseudo status that lists soft-deleted leads.
     */
    public const DELETED = 'deleted';

    /**
     * The columns the list can be sorted by.
     */
    public const SORTABLE = ['created_at', 'name', 'company', 'country', 'devices'];

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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * The active filters, normalised (null = not filtered).
     *
     * @return LeadFilters
     */
    public function filters(): array
    {
        $status = $this->text('status', 20);
        $plan = $this->text('plan', 20);
        $locale = $this->text('locale', 10);

        return [
            'search' => $this->text('search', 100),
            'status' => in_array($status, [...LeadStatus::values(), self::DELETED], true) ? $status : null,
            'plan' => in_array($plan, LeadPlan::values(), true) ? $plan : null,
            'country' => $this->text('country', 80),
            // The language of the page the visitor ordered from: "en" or "ar".
            'locale' => Locales::supports($locale) ? $locale : null,
            'from' => $this->day('from'),
            'to' => $this->day('to'),
        ];
    }

    /**
     * The sort: newest first unless a known column is asked for.
     *
     * @return LeadSort
     */
    public function sort(): array
    {
        $column = $this->text('sort', 20);

        if (! in_array($column, self::SORTABLE, true)) {
            return ['column' => 'created_at', 'direction' => 'desc'];
        }

        return [
            'column' => $column,
            'direction' => $this->text('direction', 4) === 'asc' ? 'asc' : 'desc',
        ];
    }

    /**
     * A trimmed, non-empty query string value of at most $max characters.
     */
    private function text(string $key, int $max): ?string
    {
        $value = $this->query($key);

        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    /**
     * A real calendar day in Y-m-d form.
     */
    private function day(string $key): ?string
    {
        $value = $this->text($key, 10);

        if ($value === null) {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value ? $value : null;
    }
}
