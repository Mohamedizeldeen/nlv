<?php

namespace App\Http\Controllers;

use App\Support\LandingContent;
use App\Support\Locales;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    /**
     * Show the landing page with everything the admin panel controls, in the
     * language of the URL (`/` English, `/ar` Arabic).
     */
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'landing' => LandingContent::build(Locales::current()),
        ]);
    }
}
