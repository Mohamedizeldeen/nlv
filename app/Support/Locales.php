<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Routing\Route;

/**
 * The site's two languages. English is the default, at `/` and
 * `/pages/{slug}`; Arabic is the same pages under `/ar` (route names
 * prefixed "ar.", locale set by the SetLocale middleware). The admin panel,
 * the auth pages and the dashboard are English only.
 */
final class Locales
{
    public const ENGLISH = 'en';

    public const ARABIC = 'ar';

    /**
     * Every language the public pages are served in, English first.
     */
    public const SUPPORTED = [self::ENGLISH, self::ARABIC];

    /**
     * The public routes served in both languages (English names; the Arabic
     * twin of "pages.show" is "ar.pages.show").
     */
    public const LOCALIZED_ROUTES = ['home', 'pages.show'];

    /**
     * A supported locale, or English for anything else (null, "fr", "AR ").
     */
    public static function normalize(mixed $locale): string
    {
        $locale = is_string($locale) ? strtolower(trim($locale)) : '';

        return in_array($locale, self::SUPPORTED, true) ? $locale : self::ENGLISH;
    }

    /**
     * Whether the value is a supported locale, exactly.
     */
    public static function supports(mixed $locale): bool
    {
        return in_array($locale, self::SUPPORTED, true);
    }

    /**
     * The language of the current request.
     */
    public static function current(): string
    {
        return self::normalize(app()->getLocale());
    }

    /**
     * Whether the given (default: the current) language is Arabic.
     */
    public static function isArabic(?string $locale = null): bool
    {
        return self::normalize($locale ?? self::current()) === self::ARABIC;
    }

    /**
     * The text direction of the given (default: the current) language.
     *
     * @return 'ltr'|'rtl'
     */
    public static function direction(?string $locale = null): string
    {
        return self::isArabic($locale) ? 'rtl' : 'ltr';
    }

    /**
     * The name of a localized route in a language: ("pages.show", "ar") is
     * "ar.pages.show", ("pages.show", "en") is "pages.show".
     */
    public static function routeName(string $name, ?string $locale = null): string
    {
        return self::isArabic($locale) ? self::ARABIC.'.'.$name : $name;
    }

    /**
     * The URL of a localized route in a language.
     *
     * @param  array<array-key, mixed>|string|int  $parameters
     */
    public static function route(string $name, array|string|int $parameters = [], ?string $locale = null, bool $absolute = true): string
    {
        return route(self::routeName($name, $locale), $parameters, $absolute);
    }

    /**
     * The same page in each language, as absolute URLs, for the language
     * switch and the hreflang links. Null on pages that are not localized
     * (admin, auth, dashboard).
     *
     * @return array{en: string, ar: string}|null
     */
    public static function alternates(Request $request): ?array
    {
        $route = $request->route();

        if (! $route instanceof Route) {
            return null;
        }

        $name = (string) $route->getName();
        $base = str_starts_with($name, self::ARABIC.'.') ? substr($name, strlen(self::ARABIC) + 1) : $name;

        if (! in_array($base, self::LOCALIZED_ROUTES, true)) {
            return null;
        }

        // The parameters as they were in the URL (the slug, not the bound page).
        $parameters = $route->originalParameters();

        return [
            self::ENGLISH => self::route($base, $parameters, self::ENGLISH),
            self::ARABIC => self::route($base, $parameters, self::ARABIC),
        ];
    }
}
