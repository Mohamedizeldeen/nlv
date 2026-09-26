<?php

namespace App\Enums\Concerns;

/**
 * Select options for a backed enum with a label() method.
 *
 * @phpstan-require-implements \BackedEnum
 */
trait HasOptions
{
    /**
     * Every case as a {value, label} pair, in declaration order (for admin selects).
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => (string) $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }

    /**
     * Every case's value, in declaration order.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case): string => (string) $case->value, self::cases());
    }

    /**
     * The human label for this case.
     */
    abstract public function label(): string;
}
