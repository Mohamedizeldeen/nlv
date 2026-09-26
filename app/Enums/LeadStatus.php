<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Where an order request stands in the sales pipeline.
 */
enum LeadStatus: string
{
    use HasOptions;

    case New = 'new';
    case Contacted = 'contacted';
    case Qualified = 'qualified';
    case Won = 'won';
    case Lost = 'lost';

    public function label(): string
    {
        return match ($this) {
            self::New => 'New',
            self::Contacted => 'Contacted',
            self::Qualified => 'Qualified',
            self::Won => 'Won',
            self::Lost => 'Lost',
        };
    }
}
