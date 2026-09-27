<?php

namespace Tests\Feature\Landing;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotFoundPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_missing_content_page_gets_the_landing_not_found_page(): void
    {
        $this->get('/pages/nope')
            ->assertNotFound()
            ->assertSee('<html lang="en" dir="ltr"', false)
            ->assertDontSee('hreflang', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('not-found')
                ->where('path', '/pages/nope')
                ->where('twins', ['en' => url('/pages/nope'), 'ar' => url('/ar/pages/nope')])
                ->where('locale', 'en')
                ->where('dir', 'ltr')
                ->where('alternates', null)
                ->where('landing.locale', 'en')
                ->has('landing.content')
                ->has('auth'),
            );
    }

    public function test_the_arabic_site_gets_it_in_arabic_right_to_left(): void
    {
        $this->get('/ar/pages/nope')
            ->assertNotFound()
            ->assertSee('<html lang="ar" dir="rtl"', false)
            ->assertDontSee('hreflang', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('not-found')
                ->where('path', '/ar/pages/nope')
                ->where('twins', ['en' => url('/pages/nope'), 'ar' => url('/ar/pages/nope')])
                ->where('locale', 'ar')
                ->where('dir', 'rtl')
                ->where('alternates', null)
                ->where('landing.locale', 'ar'),
            );

        // The next request in the same app instance is English again.
        $this->get('/')->assertOk()->assertSee('<html lang="en" dir="ltr"', false);
    }

    public function test_unknown_urls_get_it_in_the_language_of_the_url(): void
    {
        $this->get('/no/such/page')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('not-found')
                ->where('path', '/no/such/page')
                ->where('twins', ['en' => url('/no/such/page'), 'ar' => url('/ar/no/such/page')])
                ->where('locale', 'en')
                ->where('landing.locale', 'en'),
            );

        foreach (['/ar/no/such/page' => '/no/such/page', '/ar/pricing' => '/pricing'] as $path => $english) {
            $this->get($path)
                ->assertNotFound()
                ->assertSee('<html lang="ar" dir="rtl"', false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('not-found')
                    ->where('path', $path)
                    ->where('twins', ['en' => url($english), 'ar' => url($path)])
                    ->where('locale', 'ar')
                    ->where('landing.locale', 'ar'),
                );
        }

        // "/arabic" is not under /ar.
        $this->get('/arabic')->assertNotFound()->assertInertia(fn (Assert $page) => $page
            ->where('locale', 'en')
            ->where('twins', ['en' => url('/arabic'), 'ar' => url('/ar/arabic')]),
        );
    }

    public function test_the_address_is_shown_decoded(): void
    {
        $this->get('/ar/pages/'.rawurlencode('من-نحن'))
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->where('path', '/ar/pages/من-نحن')
                ->where('twins.en', url('/pages/'.rawurlencode('من-نحن'))),
            );
    }

    public function test_unpublished_pages_and_404s_from_public_routes_get_it_too(): void
    {
        Page::factory()->unpublished()->create(['slug' => 'draft']);
        Route::middleware('web')->get('/__test/missing', fn () => abort(404));

        foreach (['/pages/draft', '/ar/pages/draft', '/__test/missing'] as $path) {
            $this->get($path)
                ->assertNotFound()
                ->assertInertia(fn (Assert $page) => $page->component('not-found'));
        }

        // Admins still preview the draft.
        $this->actingAs(User::factory()->admin()->create())->get('/pages/draft')->assertOk();
    }

    public function test_an_unknown_url_starts_the_session_for_the_order_form(): void
    {
        // Nothing matched, so the web middleware never ran: the page still
        // hands out the session and CSRF cookies the order form posts with.
        $this->get('/no/such/page')
            ->assertNotFound()
            ->assertCookie('XSRF-TOKEN')
            ->assertCookie((string) config('session.cookie'));
    }

    public function test_signed_in_visitors_keep_their_account_link(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)
            ->get('/no/such/page')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('not-found')
                ->where('auth.user.id', $user->id),
            );
    }

    public function test_inertia_visits_get_it_as_an_inertia_response(): void
    {
        $this->get('/pages/nope', [
            'X-Inertia' => 'true',
            'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
            'X-Requested-With' => 'XMLHttpRequest',
        ])
            ->assertNotFound()
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'not-found')
            ->assertJsonPath('props.path', '/pages/nope');
    }

    public function test_json_requests_head_and_other_methods_keep_the_plain_404(): void
    {
        $this->getJson('/pages/nope')
            ->assertNotFound()
            ->assertHeaderMissing('X-Inertia')
            ->assertJsonStructure(['message']);

        $response = $this->post('/no/such/page');
        $response->assertNotFound();
        $this->assertStringNotContainsString('not-found', (string) $response->getContent());

        $this->call('HEAD', '/no/such/page')->assertNotFound();
    }

    public function test_the_admin_and_account_areas_keep_their_own_404(): void
    {
        foreach (['/admin/no-such-module', '/settings/no-such-page', '/user/no-such-thing', '/api/nope'] as $path) {
            $response = $this->get($path);

            $response->assertNotFound();
            $this->assertStringNotContainsString('"component":"not-found"', (string) $response->getContent(), $path);
            $this->assertStringNotContainsString('&quot;component&quot;:&quot;not-found&quot;', (string) $response->getContent(), $path);
        }
    }
}
