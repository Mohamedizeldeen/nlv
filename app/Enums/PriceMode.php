<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * How a plan's headline price reads.
 */
enum PriceMode: string
{
    use HasOptions;

    case OneOff = 'one_off';
    case Monthly = 'monthly';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::OneOff => 'One-off payment',
            self::Monthly => 'Monthly fee',
            self::Custom => 'Custom quote',
        };
    }
}
