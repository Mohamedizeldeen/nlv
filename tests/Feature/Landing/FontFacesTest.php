<?php

namespace Tests\Feature\Landing;

use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

/**
 * Every font face is downloaded once, as a WOFF2. Bunny serves each face
 * as a WOFF2 with a WOFF fallback; woff2First() in vite.config.ts keeps the
 * two in one @font-face rule (WOFF2 first), where the fonts plugin would
 * write two rules and browsers would fetch the WOFF too.
 */
class FontFacesTest extends TestCase
{
    public function test_each_font_face_is_one_rule_listing_its_woff2_first(): void
    {
        $css = $this->servedFontCss();
        preg_match_all('/@font-face\s*\{([^}]*)\}/', $css, $rules);

        $this->assertNotEmpty($rules[1], 'The fonts manifest has no @font-face rules.');

        $faces = [];

        foreach ($rules[1] as $rule) {
            preg_match('/src:\s*([^;]*);/', $rule, $src);
            $face = trim((string) preg_replace('/\s*src:[^;]*;/', '', $rule));

            $this->assertArrayNotHasKey($face, $faces, "Two @font-face rules for the same face:\n{$face}");
            $faces[$face] = true;

            $formats = [];
            preg_match_all('/format\("?([\w-]+)"?\)/', $src[1] ?? '', $formats);

            if (in_array('woff', $formats[1], true)) {
                $this->assertSame('woff2', $formats[1][0], "The WOFF2 must come first:\n{$rule}");
            }
        }
    }

    /**
     * The @font-face CSS that @fonts prints: the dev server's manifest while
     * it runs, else the build's.
     */
    private function servedFontCss(): string
    {
        if (Vite::isRunningHot()) {
            $manifest = public_path('fonts-manifest.dev.json');

            if (! is_file($manifest)) {
                $this->markTestSkipped('The Vite dev server has not written its fonts manifest yet.');
            }

            return (string) (json_decode((string) file_get_contents($manifest), true)['style']['inline'] ?? '');
        }

        $manifest = public_path('build/fonts-manifest.json');

        if (! is_file($manifest)) {
            $this->markTestSkipped('No fonts manifest: run `npm run build` (or `npm run dev`).');
        }

        $file = json_decode((string) file_get_contents($manifest), true)['style']['file'] ?? null;

        return is_string($file) ? (string) file_get_contents(public_path('build/'.$file)) : '';
    }
}
