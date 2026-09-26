<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ \App\Support\Locales::direction() }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
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
