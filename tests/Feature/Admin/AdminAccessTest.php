<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\Lead;
use App\Models\Look;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Story;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Router;
use Tests\TestCase;

/**
 * Every route under /admin, every method, requested for real against records
 * that exist: guests are sent to sign in and signed-in accounts without admin
 * access get a 403, whatever module adds the route. (AdminRoutesTest checks
 * the middleware is declared; this checks it answers.)
 */
class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string> Route parameter => value that exists. */
    private array $parameters = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->parameters = Activity::withoutModelLogging(function (): array {
            $look = Look::factory()->create();

            return [
                'story' => (string) Story::factory()->create()->id,
                'look' => (string) $look->id,
                'look_category' => (string) $look->look_category_id,
                'faq' => (string) Faq::factory()->create()->id,
                'page' => (string) Page::factory()->create()->id,
                'lead' => (string) Lead::factory()->create()->id,
                'activity' => (string) ActivityLog::factory()->create()->id,
                'user' => (string) User::factory()->create()->id,
                'plan' => Plan::factory()->create()->key->value,
                'group' => 'contact',
            ];
        });
    }

    public function test_guests_are_sent_to_sign_in_from_every_admin_route(): void
    {
        foreach ($this->requests() as [$method, $uri]) {
            $response = $this->call($method, $uri);

            $this->assertTrue(
                $response->isRedirect(route('login')),
                "Guest {$method} {$uri} answered {$response->getStatusCode()} instead of a redirect to sign in.",
            );
        }
    }

    public function test_accounts_without_admin_access_get_a_403_on_every_admin_route(): void
    {
        $member = Activity::withoutModelLogging(fn () => User::factory()->create());

        foreach ($this->requests() as [$method, $uri]) {
            $response = $this->actingAs($member)->call($method, $uri);

            $this->assertSame(
                403,
                $response->getStatusCode(),
                "Non-admin {$method} {$uri} answered {$response->getStatusCode()} instead of 403.",
            );
        }
    }

    /**
     * One request per admin route and method, parameters filled in.
     *
     * @return list<array{0: string, 1: string}>
     */
    private function requests(): array
    {
        $requests = [];

        foreach (Router::getRoutes()->getRoutes() as $route) {
            if (! $this->isAdmin($route)) {
                continue;
            }

            $uri = '/'.preg_replace_callback(
                '/\{(\w+)(?::\w+)?\??\}/',
                fn (array $match): string => $this->parameters[$match[1]]
                    ?? $this->fail("No test value for the route parameter [{$match[1]}] in {$route->uri()}."),
                $route->uri(),
            );

            foreach ($route->methods() as $method) {
                if ($method !== 'HEAD') {
                    $requests[] = [$method, $uri];
                }
            }
        }

        $this->assertGreaterThan(40, count($requests));

        return $requests;
    }

    private function isAdmin(Route $route): bool
    {
        return $route->uri() === 'admin' || str_starts_with($route->uri(), 'admin/');
    }
}
