<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use App\Support\LandingContent;
use App\Support\Locales;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Pipeline\Pipeline;
use Illuminate\Session\Middleware\StartSession;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trusted proxies (TRUSTED_PROXIES in .env) are not set here with
        // $middleware->trustProxies(at: env(...)): this callback runs before
        // .env is loaded, so env() would miss the value in production. The
        // global TrustProxies middleware reads config/trustedproxy.php on
        // every request instead.

        // Every page starts in the default language (English); the /ar
        // group's own SetLocale:ar then switches its pages to Arabic.
        $middleware->web(prepend: [
            SetLocale::class,
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // A 403 anywhere under /admin (a signed-in non-admin, or an action an
        // admin may not take) gets a page in the admin's design instead of the
        // framework's plain one. JSON requests keep their JSON response.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request): Response {
            // A 404 under /admin for a signed-in admin (a mistyped address, a
            // link to a record someone deleted, or an admin action's
            // abort(404)) stays inside the admin shell. Guests and other
            // accounts keep the plain 404: they never see the admin's pages.
            if (
                $response->getStatusCode() === Response::HTTP_NOT_FOUND
                && $request->is('admin', 'admin/*')
                && ! $request->expectsJson()
            ) {
                // A mistyped address matches no route, so no middleware has
                // started the session: it starts here, to know who is asking.
                $middleware = $request->hasSession() ? [] : [
                    EncryptCookies::class,
                    AddQueuedCookiesToResponse::class,
                    StartSession::class,
                ];

                return (new Pipeline(app()))
                    ->send($request)
                    ->through($middleware)
                    ->then(function (Request $request) use ($response): Response {
                        if (! $request->user()?->isAdmin()) {
                            return $response;
                        }

                        // A missing record fails before HandleInertiaRequests
                        // runs, so the admin layout's shared props (auth,
                        // admin) are added here.
                        $inertia = app(HandleInertiaRequests::class);
                        Inertia::version(fn () => $inertia->version($request));
                        Inertia::share($inertia->share($request));

                        return Inertia::render('admin/not-found', ['path' => '/'.$request->path()])
                            ->toResponse($request)
                            ->setStatusCode(Response::HTTP_NOT_FOUND);
                    });
            }

            // Any other page with nothing behind it (an unknown URL, a missing
            // or unpublished /pages/{slug}) gets the landing's not-found page,
            // in the language of the URL: Arabic under /ar. The admin panel,
            // the account and API areas, uploads, JSON requests and anything
            // but a page visit (GET) keep the plain 404.
            if (
                $response->getStatusCode() === Response::HTTP_NOT_FOUND
                && ($request->isMethod('GET') || $request->isMethod('HEAD'))
                && ! $request->expectsJson()
                && ! $request->is('admin', 'admin/*', 'settings', 'settings/*', 'user/*', 'api/*', 'storage/*')
            ) {
                $locale = $request->is('ar', 'ar/*') ? Locales::ARABIC : Locales::ENGLISH;
                app()->setLocale($locale);

                // The same address in the other language, for the language switch.
                $bare = preg_replace('#^/ar(?=/|$)#', '', $request->getPathInfo());
                $bare = $bare === null || $bare === '' ? '/' : $bare;
                $path = '/'.$request->decodedPath();

                // An unknown URL fails before the web middleware runs: the
                // session starts here, so the navbar knows who is signed in and
                // the order form gets its CSRF cookie. A missing page fails
                // before Inertia's middleware runs: it shares its props here.
                $middleware = $request->hasSession() ? [] : [
                    EncryptCookies::class,
                    AddQueuedCookiesToResponse::class,
                    StartSession::class,
                    ValidateCsrfToken::class,
                ];

                return (new Pipeline(app()))
                    ->send($request)
                    ->through([...$middleware, HandleInertiaRequests::class])
                    ->then(fn (Request $request): Response => Inertia::render('not-found', [
                        'path' => mb_check_encoding($path, 'UTF-8') ? $path : '/'.$request->path(),
                        'twins' => [
                            Locales::ENGLISH => url($bare),
                            Locales::ARABIC => url($bare === '/' ? '/ar' : '/ar'.$bare),
                        ],
                        'landing' => LandingContent::build($locale),
                        // No hreflang links in the <head> for a missing page.
                        'alternates' => null,
                    ])->toResponse($request)->setStatusCode(Response::HTTP_NOT_FOUND));
            }

            if (
                $response->getStatusCode() !== Response::HTTP_FORBIDDEN
                || ! $request->is('admin', 'admin/*')
                || $request->expectsJson()
                || ! ($exception instanceof AuthorizationException || $exception instanceof HttpExceptionInterface)
            ) {
                return $response;
            }

            $user = $request->user();
            $isAdmin = (bool) $user?->isAdmin();
            $message = trim($exception->getMessage());

            return Inertia::render('admin/forbidden', [
                'status' => Response::HTTP_FORBIDDEN,
                'reason' => $isAdmin ? 'denied' : 'not-admin',
                // Only an explicit reason is worth showing (not "This action is unauthorized.").
                'message' => $isAdmin && $message !== '' && $message !== 'This action is unauthorized.' ? $message : null,
                'user' => $user === null ? null : ['name' => $user->name, 'email' => $user->email],
            ])->toResponse($request)->setStatusCode(Response::HTTP_FORBIDDEN);
        });
    })->create();
