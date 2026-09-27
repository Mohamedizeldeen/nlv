<?php

namespace App\Http\Responses\Concerns;

trait RedirectsToAdminPanel
{
    /**
     * Where a freshly signed-in user lands when no intended URL is stored:
     * the admin panel. Every account is meant to work there; one without
     * admin access sees the panel's 403 page, which offers Log out.
     */
    protected function home(): string
    {
        return route('admin.dashboard', absolute: false);
    }
}
