<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * The three fixed pricing plans (seeded; never created or deleted from the admin).
 */
enum PlanKey: string
{
    use HasOptions;

    case Buy = 'buy';
    case Lease = 'lease';
    case Chain = 'chain';

    public function label(): string
    {
        return match ($this) {
            self::Buy => 'Buy',
            self::Lease => 'Lease',
            self::Chain => 'Chain',
        };
    }
}
