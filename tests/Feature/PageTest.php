<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PageTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_published_page_is_shown(): void
    {
        Page::factory()->create([
            'title' => 'Privacy',
            'slug' => 'privacy',
            'summary' => 'How NLV handles your data.',
            'body' => "## Photos\n\nPhotos are deleted when the session ends.",
        ]);

        $this->get(route('pages.show', 'privacy'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                // The React page is built by a later phase.
                ->component('page', false)
                ->where('page.title', 'Privacy')
                ->where('page.summary', 'How NLV handles your data.')
                ->where('page.html', "<h2>Photos</h2>\n<p>Photos are deleted when the session ends.</p>\n")
                ->has('landing.pages')
                ->has('landing.content'),
            );
    }

    public function test_pages_are_served_at_their_slug(): void
    {
        $this->assertSame('/pages/terms', route('pages.show', 'terms', absolute: false));
    }

    public function test_an_unknown_page_is_not_found(): void
    {
        $this->get('/pages/nope')->assertNotFound();
    }

    public function test_an_unpublished_page_is_not_found(): void
    {
        Page::factory()->unpublished()->create(['slug' => 'draft']);

        $this->get('/pages/draft')->assertNotFound();
        $this->actingAs(User::factory()->create())->get('/pages/draft')->assertNotFound();
    }

    public function test_admins_can_preview_an_unpublished_page(): void
    {
        Page::factory()->unpublished()->create(['slug' => 'draft']);

        $this->actingAs(User::factory()->admin()->create())->get('/pages/draft')->assertOk();
    }

    public function test_raw_html_and_unsafe_links_are_stripped_from_the_markdown(): void
    {
        Page::factory()->create([
            'slug' => 'terms',
            'body' => implode("\n\n", [
                '# Terms',
                '<script>alert("x")</script>',
                '<img src="x" onerror="alert(1)">',
                '[Click me](javascript:alert(1))',
                '[Safe link](https://nlv.example/terms)',
            ]),
        ]);

        $this->get('/pages/terms')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('page.html', function (string $html): bool {
                    $this->assertStringContainsString('<h1>Terms</h1>', $html);
                    $this->assertStringContainsString('<a href="https://nlv.example/terms">Safe link</a>', $html);
                    $this->assertStringNotContainsString('<script', $html);
                    $this->assertStringNotContainsString('onerror', $html);
                    $this->assertStringNotContainsString('<img', $html);
                    $this->assertStringNotContainsString('javascript:', $html);

                    return true;
                }),
            );
    }
}
