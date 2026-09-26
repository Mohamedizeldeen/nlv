<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * TRUSTED_PROXIES (config/trustedproxy.php): the visitor's IP from
 * X-Forwarded-For counts for the order form's rate limit and the activity
 * log only when the request comes from a trusted proxy.
 */
class TrustedProxiesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The load balancer's address, as the app sees the connection.
     */
    private const PROXY = '10.0.0.5';

    /**
     * The visitor's address, as the load balancer reports it.
     */
    private const VISITOR = '203.0.113.9';

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    public function test_forwarded_headers_are_ignored_when_no_proxy_is_trusted(): void
    {
        config(['trustedproxy.proxies' => []]);

        $this->orderThrough(self::PROXY, self::VISITOR)->assertSessionHasNoErrors();

        $this->assertSame(self::PROXY, Lead::query()->sole()->ip_address);
        $this->assertSame(self::PROXY, ActivityLog::query()->sole()->ip_address);
    }

    public function test_a_trusted_proxy_passes_on_the_visitors_address(): void
    {
        config(['trustedproxy.proxies' => ['10.0.0.0/8']]);

        $this->orderThrough(self::PROXY, self::VISITOR)->assertSessionHasNoErrors();

        $this->assertSame(self::VISITOR, Lead::query()->sole()->ip_address);
        $this->assertSame(self::VISITOR, ActivityLog::query()->sole()->ip_address);
    }

    public function test_forwarded_headers_from_an_address_outside_the_list_are_ignored(): void
    {
        config(['trustedproxy.proxies' => ['10.0.0.0/8']]);

        $this->orderThrough('198.51.100.20', self::VISITOR)->assertSessionHasNoErrors();

        $this->assertSame('198.51.100.20', Lead::query()->sole()->ip_address);
        $this->assertSame('198.51.100.20', ActivityLog::query()->sole()->ip_address);
    }

    public function test_a_wildcard_trusts_whichever_address_connects(): void
    {
        config(['trustedproxy.proxies' => '*']);

        $this->orderThrough('198.51.100.20', self::VISITOR)->assertSessionHasNoErrors();

        $this->assertSame(self::VISITOR, Lead::query()->sole()->ip_address);
        $this->assertSame(self::VISITOR, ActivityLog::query()->sole()->ip_address);
    }

    public function test_behind_a_trusted_proxy_the_rate_limit_counts_each_visitor(): void
    {
        config(['trustedproxy.proxies' => ['10.0.0.0/8']]);

        for ($i = 0; $i < 5; $i++) {
            $this->orderThrough(self::PROXY, self::VISITOR)->assertSessionHasNoErrors();
        }

        $this->orderThrough(self::PROXY, self::VISITOR)->assertSessionHasErrors('form');

        // Another visitor behind the same load balancer is not held back.
        $this->orderThrough(self::PROXY, '203.0.113.10')->assertSessionHasNoErrors();

        $this->assertSame(6, Lead::query()->count());
    }

    public function test_a_forged_header_does_not_dodge_the_rate_limit_without_a_trusted_proxy(): void
    {
        config(['trustedproxy.proxies' => []]);

        for ($i = 1; $i <= 5; $i++) {
            $this->orderThrough(self::PROXY, "203.0.113.{$i}")->assertSessionHasNoErrors();
        }

        $this->orderThrough(self::PROXY, '203.0.113.99')->assertSessionHasErrors('form');

        $this->assertSame(5, Lead::query()->count());
    }

    /**
     * TRUSTED_PROXIES values and the config they give.
     *
     * @return array<string, array{0: string|null, 1: list<string>|string}>
     */
    public static function environmentValues(): array
    {
        return [
            'unset' => [null, []],
            'empty' => ['', []],
            'blank' => ['   ', []],
            'wildcard' => ['*', '*'],
            'one address' => ['10.0.0.5', ['10.0.0.5']],
            'a list with spaces and a trailing comma' => [' 10.0.0.0/8 , 172.16.0.0/12,, 2001:db8::/32 ,', ['10.0.0.0/8', '172.16.0.0/12', '2001:db8::/32']],
        ];
    }

    /**
     * @param  list<string>|string  $expected
     */
    #[DataProvider('environmentValues')]
    public function test_the_trusted_proxies_are_read_from_the_environment(?string $value, array|string $expected): void
    {
        $saved = [$_SERVER['TRUSTED_PROXIES'] ?? null, $_ENV['TRUSTED_PROXIES'] ?? null, getenv('TRUSTED_PROXIES')];

        try {
            unset($_SERVER['TRUSTED_PROXIES'], $_ENV['TRUSTED_PROXIES']);
            putenv('TRUSTED_PROXIES');

            if ($value !== null) {
                $_SERVER['TRUSTED_PROXIES'] = $value;
            }

            $this->assertSame(['proxies' => $expected], require config_path('trustedproxy.php'));
        } finally {
            unset($_SERVER['TRUSTED_PROXIES'], $_ENV['TRUSTED_PROXIES']);
            putenv('TRUSTED_PROXIES');

            [$server, $env, $putenv] = $saved;

            if ($server !== null) {
                $_SERVER['TRUSTED_PROXIES'] = $server;
            }

            if ($env !== null) {
                $_ENV['TRUSTED_PROXIES'] = $env;
            }

            if ($putenv !== false) {
                putenv("TRUSTED_PROXIES={$putenv}");
            }
        }
    }

    /**
     * Submit a valid order request that reached the app from $connecting,
     * carrying X-Forwarded-For: $forwarded.
     */
    private function orderThrough(string $connecting, string $forwarded): TestResponse
    {
        return $this->from(route('home'))
            ->withServerVariables(['REMOTE_ADDR' => $connecting])
            ->withHeader('X-Forwarded-For', $forwarded)
            ->post(route('order-requests.store'), [
                'name' => 'Amira Haddad',
                'company' => 'Maison Rimal',
                'email' => 'amira@maisonrimal.test',
                'phone' => '+966 12 345 6789',
                'country' => 'Saudi Arabia',
                'city' => 'Jeddah',
                'devices' => '3',
                'plan' => 'lease',
                'message' => 'We would like two devices for the Tahlia Street store and one for the mall.',
                'consent' => '1',
                'source' => 'pricing-lease',
                'website' => '',
            ]);
    }
}
