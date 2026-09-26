<?php

namespace App\Models;

use App\Enums\LeadPlan;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Models\Concerns\GeneratesReference;
use App\Models\Concerns\RecordsActivity;
use App\Support\Locales;
use Carbon\CarbonImmutable;
use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An "Order a device" request from the landing page pop-up. `locale` is the
 * language of the page it was sent from ("en" or "ar").
 *
 * @property int $id
 * @property string $reference
 * @property string $name
 * @property string $company
 * @property string $email
 * @property string $phone
 * @property string $country
 * @property string $city
 * @property int $devices
 * @property LeadPlan $plan
 * @property string $message
 * @property LeadStatus $status
 * @property LeadSource|null $source
 * @property string $locale
 * @property CarbonImmutable|null $consent_at
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property string|null $admin_notes
 * @property int|null $assigned_to
 * @property CarbonImmutable|null $contacted_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property CarbonImmutable|null $deleted_at
 * @property-read User|null $assignee
 */
#[Fillable([
    'name', 'company', 'email', 'phone', 'country', 'city', 'devices', 'plan', 'message',
    'status', 'source', 'locale', 'consent_at', 'ip_address', 'user_agent', 'admin_notes', 'assigned_to', 'contacted_at',
])]
class Lead extends Model
{
    /** @use HasFactory<LeadFactory> */
    use GeneratesReference, HasFactory, RecordsActivity, SoftDeletes;

    /**
     * The model's default attribute values: a lead is in English unless the
     * pop-up on the Arabic page sent it.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'locale' => Locales::ENGLISH,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'devices' => 'integer',
            'plan' => LeadPlan::class,
            'status' => LeadStatus::class,
            'source' => LeadSource::class,
            'consent_at' => 'datetime',
            'contacted_at' => 'datetime',
            'assigned_to' => 'integer',
        ];
    }

    /**
     * The admin following this lead up.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Whether the visitor ordered from the Arabic page (answer them in Arabic).
     */
    public function isArabic(): bool
    {
        return $this->locale === Locales::ARABIC;
    }

    /**
     * Leads are named by their reference in the activity log.
     */
    public function activityLabel(): string
    {
        return $this->reference;
    }
}
