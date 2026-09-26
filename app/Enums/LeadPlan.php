<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * The plan a visitor picked on the order form.
 */
enum LeadPlan: string
{
    use HasOptions;

    case Buy = 'buy';
    case Lease = 'lease';
    case Chain = 'chain';
    case Unsure = 'unsure';

    public function label(): string
    {
        return match ($this) {
            self::Buy => 'Buy',
            self::Lease => 'Lease',
            self::Chain => 'Chain',
            self::Unsure => 'Not sure yet',
        };
    }
}
