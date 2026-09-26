<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * The landing footer column a content page is listed in.
 */
enum FooterGroup: string
{
    use HasOptions;

    case Company = 'company';
    case Legal = 'legal';

    public function label(): string
    {
        return match ($this) {
            self::Company => 'Company',
            self::Legal => 'Legal',
        };
    }
}
