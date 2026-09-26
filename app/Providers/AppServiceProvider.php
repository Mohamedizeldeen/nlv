<?php

namespace App\Providers;

use App\Models\User;
use App\Support\Locales;
use App\Support\Settings;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\HtmlString;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureAuthorization();
        $this->configureRateLimiting();
        $this->configureFontPreloads();
    }

    /**
     * Configure the application's rate limiters.
     */
    protected function configureRateLimiting(): void
    {
        // The public "Order a device" form: 5 a minute and 20 a day per IP.
        // Each limit needs its own key, or the two would share one counter.
        // Over the limit, the pop-up gets a form error (errors.form) rather
        // than a bare 429 page, in the language of the page it was sent from:
        // the throttle runs before StoreOrderRequest sets the app's locale, so
        // the messages read the pop-up's `locale` field themselves.
        RateLimiter::for('order-requests', function (Request $request): array {
            $locale = Locales::normalize($request->input('locale'));

            return [
                Limit::perMinute(5)->by('minute:'.$request->ip())->response(
                    fn () => back()->withErrors([
                        'form' => __('Too many requests from your connection. Please wait a minute and try again.', [], $locale),
                    ]),
                ),
                Limit::perDay(20)->by('day:'.$request->ip())->response(
                    fn () => back()->withErrors([
                        'form' => __('Too many requests from your connection today. Please email us at :email instead.', ['email' => Settings::string('contact.email')], $locale),
                    ]),
                ),
            ];
        });
    }

    /**
     * Add `Vite::preloadFonts(['alias' => [weights]])`: preload tags for font
     * weights that vite.config.ts does not preload for every page, such as
     * the Arabic faces, which only the Arabic pages preload (app.blade.php).
     * It reads the same fonts manifest as `@fonts` (the build's, or the dev
     * server's), so the URLs are those of its @font-face rules, and renders
     * the tags the way `@fonts` does: once per URL, with the CSP nonce, and
     * listed in the Link header. Only the upright woff2 files are preloaded
     * (every browser that preloads reads woff2); an alias or weight that is
     * not in the manifest (a stale build) adds nothing.
     */
    protected function configureFontPreloads(): void
    {
        Vite::macro('preloadFonts', function (array $fonts): HtmlString {
            $manifest = $this->viteFonts()->manifest(
                $this->isRunningHot(),
                $this->buildDirectory,
                $this->fontsManifestFilename,
                $this->hotFile(),
            );

            if ($manifest === null) {
                return new HtmlString('');
            }

            $preloads = [];

            foreach ($fonts as $alias => $weights) {
                foreach ((array) $weights as $weight) {
                    $files = $manifest['families'][$alias]['variants']["{$weight}:normal"]['files'] ?? [];

                    foreach ($files as $file) {
                        if (($file['format'] ?? null) !== 'woff2') {
                            continue;
                        }

                        $preloads[] = [
                            'alias' => $alias,
                            ...(isset($file['url']) ? ['url' => $file['url']] : ['file' => $file['file']]),
                            'as' => 'font',
                            'type' => 'font/woff2',
                            'crossorigin' => 'anonymous',
                        ];
                    }
                }
            }

            return new HtmlString($this->renderFontPreloads($preloads));
        });
    }

    /**
     * Define the application's authorization gates.
     */
    protected function configureAuthorization(): void
    {
        Gate::define('access-admin', fn (User $user): bool => $user->isAdmin());
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
