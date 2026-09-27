<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Every screen (the landing, its content pages, sign-in, the admin panel and
 * the account pages) is dark: there is no light/dark/system appearance
 * setting. The HTML shell paints the landing's ink before any stylesheet or
 * script arrives, whatever the visitor's system prefers.
 */
class DarkShellTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pages_are_dark_from_the_first_paint(): void
    {
        $this->assertDarkShell($this->get('/'), 'en', 'ltr');
        $this->assertDarkShell($this->get('/ar'), 'ar', 'rtl');
        $this->assertDarkShell($this->get('/login'), 'en', 'ltr');
    }

    public function test_the_admin_and_account_pages_are_dark_from_the_first_paint(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->assertDarkShell($this->get('/admin'), 'en', 'ltr');
        $this->assertDarkShell($this->get('/settings/profile'), 'en', 'ltr');
    }

    public function test_a_left_over_appearance_cookie_changes_nothing(): void
    {
        foreach (['light', 'dark', 'system'] as $appearance) {
            $this->assertDarkShell(
                $this->withUnencryptedCookie('appearance', $appearance)->get('/'),
                'en',
                'ltr',
            );
        }
    }

    /**
     * @param  TestResponse<Response>  $response
     */
    private function assertDarkShell(TestResponse $response, string $lang, string $dir): void
    {
        $response
            ->assertOk()
            // No theme class on <html>: the pages add their own look.
            ->assertSee("<html lang=\"{$lang}\" dir=\"{$dir}\">", false)
            ->assertSee('background-color: oklch(0.145 0.014 200);', false)
            ->assertSee('color-scheme: dark;', false)
            // No script choosing a theme from the system preference.
            ->assertDontSee('prefers-color-scheme', false);
    }
}
