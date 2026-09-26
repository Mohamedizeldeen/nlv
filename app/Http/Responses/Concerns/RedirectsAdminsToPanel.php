<?php

namespace App\Http\Responses\Concerns;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Fortify\Fortify;

trait RedirectsAdminsToPanel
{
    /**
     * Where a freshly signed-in user lands when no intended URL is stored:
     * admins go to the admin panel, everyone else to Fortify's home (/dashboard).
     */
    protected function home(Request $request): string
    {
        $user = $request->user();

        return $user instanceof User && $user->isAdmin()
            ? route('admin.dashboard', absolute: false)
            : (string) Fortify::redirects('login');
    }
}
