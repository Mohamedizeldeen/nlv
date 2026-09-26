<?php

namespace Tests\Feature\Admin;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Router;
use Tests\TestCase;

/**
 * A safety net for every admin module: whatever routes/admin/*.php adds must
 * sit behind the admin middleware and use the admin name and path prefix.
 */
class AdminRoutesTest extends TestCase
{
    /**
     * The middleware every admin route needs (ADMIN.md section 2).
     */
    private const REQUIRED_MIDDLEWARE = ['web', 'auth', 'verified', 'can:access-admin'];

    public function test_every_admin_route_requires_a_verified_admin(): void
    {
        $routes = $this->adminRoutes();

        $this->assertNotEmpty($routes);

        foreach ($routes as $route) {
            $middleware = $route->gatherMiddleware();

            foreach (self::REQUIRED_MIDDLEWARE as $required) {
                $this->assertContains(
                    $required,
                    $middleware,
                    "Route [{$route->uri()}] is missing the [{$required}] middleware.",
                );
            }
        }
    }

    public function test_every_admin_route_is_named_under_admin(): void
    {
        foreach ($this->adminRoutes() as $route) {
            $this->assertStringStartsWith(
                'admin.',
                (string) $route->getName(),
                "Route [{$route->uri()}] must be named admin.* (define it in routes/admin/*.php).",
            );
        }
    }

    public function test_admin_named_routes_live_under_the_admin_path(): void
    {
        foreach (Router::getRoutes()->getRoutes() as $route) {
            if (str_starts_with((string) $route->getName(), 'admin.')) {
                $this->assertTrue(
                    $route->uri() === 'admin' || str_starts_with($route->uri(), 'admin/'),
                    "Route [{$route->getName()}] must be served under /admin.",
                );
            }
        }
    }

    /**
     * Every route served under /admin.
     *
     * @return list<Route>
     */
    private function adminRoutes(): array
    {
        return array_values(array_filter(
            Router::getRoutes()->getRoutes(),
            fn (Route $route): bool => $route->uri() === 'admin' || str_starts_with($route->uri(), 'admin/'),
        ));
    }
}
