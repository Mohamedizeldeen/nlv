<?php

namespace App\Http\Middleware;

use App\Support\Locales;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the language of a request. In the `web` group without a parameter:
 * every page starts in English, even when the app instance is reused (tests,
 * long-running servers; app()->setLocale() also rewrites config app.locale,
 * so that can't be the reset value). On the `/ar` route group as
 * `SetLocale::class.':ar'`: its pages are in Arabic.
 */
class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $locale = null): Response
    {
        app()->setLocale(Locales::normalize($locale ?? Locales::ENGLISH));

        return $next($request);
    }
}
