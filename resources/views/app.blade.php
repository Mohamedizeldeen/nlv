<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ \App\Support\Locales::direction() }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Every screen is dark (the landing's ink): the first paint too,
             before the stylesheet and the page's own classes arrive. --}}
        <style>
            html {
                background-color: oklch(0.145 0.014 200);
                color-scheme: dark;
            }
        </style>

        <link rel="icon" href="/favicon.ico?v=nlv1" sizes="any">
        <link rel="icon" href="/favicon.svg?v=nlv1" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=nlv1">

        {{-- The same public page in the other language (English is the default). --}}
        @if (is_array($page['props']['alternates'] ?? null))
            <link rel="alternate" hreflang="en" href="{{ $page['props']['alternates']['en'] }}">
            <link rel="alternate" hreflang="ar" href="{{ $page['props']['alternates']['ar'] }}">
            <link rel="alternate" hreflang="x-default" href="{{ $page['props']['alternates']['en'] }}">
        @endif

        {{-- The Arabic pages also preload the regular weight of their Arabic faces
             (Amiri for display, IBM Plex Sans Arabic for text). English pages
             don't: the browser fetches them there only if Arabic is on screen. --}}
        @if (\App\Support\Locales::isArabic())
            {{ \Illuminate\Support\Facades\Vite::preloadFonts(['amiri' => [400], 'ibm-plex-sans-arabic' => [400]]) }}
        @endif

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
