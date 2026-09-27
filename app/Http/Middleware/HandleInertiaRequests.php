<?php

namespace App\Http\Middleware;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Support\Locales;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'admin' => fn () => $this->admin($request),
            // Resolved when the page renders: the /ar group's SetLocale runs
            // after this middleware has shared its props.
            'locale' => fn (): string => Locales::current(),
            'dir' => fn (): string => Locales::direction(),
            'alternates' => fn (): ?array => Locales::alternates($request),
        ];
    }

    /**
     * Admin-only shared data (null for everyone else), resolved lazily.
     *
     * @return array{newLeads: int}|null
     */
    private function admin(Request $request): ?array
    {
        if (! $request->user()?->isAdmin()) {
            return null;
        }

        return [
            'newLeads' => Lead::query()->where('status', LeadStatus::New)->count(),
        ];
    }
}
