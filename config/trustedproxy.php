<?php

/*
|--------------------------------------------------------------------------
| Trusted proxies
|--------------------------------------------------------------------------
|
| Behind a load balancer, CDN or reverse proxy every request arrives from the
| proxy's address, and the visitor's own IP and the https scheme travel in
| X-Forwarded-* headers. Those headers are believed only when the request
| comes from a proxy listed here; from anyone else they are ignored, so a
| visitor cannot fake an IP to dodge the order form's rate limit or to change
| what the activity log records.
|
| Laravel's TrustProxies middleware (global, see bootstrap/app.php) reads this
| key on every request. It lives here rather than in bootstrap/app.php
| because .env is not loaded yet when that file configures the middleware.
|
| TRUSTED_PROXIES:
|   empty or unset  trust no proxy: the connecting address is the visitor
|   *               trust whichever address connects (only when the app can
|                   be reached through the proxy alone)
|   a list          comma-separated IPs or CIDR ranges of your proxies,
|                   e.g. "10.0.0.0/8,172.16.0.0/12"
|
*/

$proxies = env('TRUSTED_PROXIES');
$proxies = is_string($proxies) ? trim($proxies) : '';

return [

    'proxies' => match ($proxies) {
        // An empty list, not null: with null the framework trusts every
        // proxy on Laravel Cloud and *.on-forge.com / *.on-vapor.com hosts.
        '' => [],
        '*' => '*',
        default => array_values(array_filter(
            array_map(trim(...), explode(',', $proxies)),
            fn (string $proxy): bool => $proxy !== '',
        )),
    },

];
