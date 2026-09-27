<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\ActivityLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One entry of the activity log. Write entries with App\Support\Activity::record().
 *
 * @property int $id
 * @property int|null $user_id
 * @property string|null $causer_name
 * @property string $event
 * @property string|null $subject_type
 * @property int|null $subject_id
 * @property string $description
 * @property array<string, mixed>|null $properties
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property CarbonImmutable|null $created_at
 * @property-read User|null $user
 * @property-read Model|null $subject
 */
#[Fillable(['user_id', 'causer_name', 'event', 'subject_type', 'subject_id', 'description', 'properties', 'ip_address', 'user_agent'])]
class ActivityLog extends Model
{
    /** @use HasFactory<ActivityLogFactory> */
    use HasFactory;

    /**
     * Entries are written once and never updated.
     */
    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'properties' => 'json:unicode',
            'created_at' => 'datetime',
        ];
    }

    /**
     * The user who did it (null for guests, the console and deleted users;
     * a deleted user's name is kept in causer_name).
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The record it was done to, if any (null once that record is deleted).
     *
     * @return MorphTo<Model, $this>
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Who did it, for the admin: the user's current name, "Jane Doe (deleted
     * account)" once that account is gone, or null for visitors and the
     * console. Load the `user` relation first when listing entries.
     */
    public function causerLabel(): ?string
    {
        if ($this->user !== null) {
            return $this->user->name;
        }

        return $this->causedByDeletedAccount() ? "{$this->causer_name} (deleted account)" : null;
    }

    /**
     * Whether a signed-in user did it whose account has since been deleted.
     */
    public function causedByDeletedAccount(): bool
    {
        return $this->user_id === null && $this->causer_name !== null && $this->causer_name !== '';
    }

    /**
     * The event's group: "lead" for "lead.submitted", "auth" for "auth.login".
     */
    public function group(): string
    {
        return explode('.', $this->event, 2)[0];
    }
}
