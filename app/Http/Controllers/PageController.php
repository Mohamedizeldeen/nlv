<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Support\LandingContent;
use App\Support\Locales;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    /**
     * Show a published content page (About, Privacy, Terms...) in the
     * language of the URL (`/pages/{slug}` English, `/ar/pages/{slug}`
     * Arabic, the English where no Arabic is filled in). Admins can also
     * preview pages that are not published yet.
     */
    public function show(Request $request, Page $page): Response
    {
        abort_unless($page->is_published || $request->user()?->isAdmin(), 404);

        $locale = Locales::current();
        $summary = $page->localized('summary', $locale);

        return Inertia::render('page', [
            'page' => [
                'title' => (string) $page->localized('title', $locale),
                'summary' => is_string($summary) && $summary !== '' ? $summary : null,
                'html' => $page->html($locale),
            ],
            'landing' => LandingContent::build($locale),
        ]);
    }
}
