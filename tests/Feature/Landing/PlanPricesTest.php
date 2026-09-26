<?php

namespace Tests\Feature\Landing;

use App\Models\ActivityLog;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanPricesTest extends TestCase
{
    use RefreshDatabase;

    public function test_price_maps_are_saved_with_sorted_currency_codes(): void
    {
        $plan = Plan::factory()->create([
            'prices' => ['USD' => 249, 'EUR' => 229, 'AED' => 919],
            'detail_prices' => ['USD' => 79, 'AED' => 289],
        ]);

        $plan->refresh();

        $this->assertSame(['AED', 'EUR', 'USD'], array_keys($plan->prices ?? []));
        $this->assertSame(['AED', 'USD'], array_keys($plan->detail_prices ?? []));
    }

    public function test_saving_the_same_prices_in_another_order_is_not_a_change(): void
    {
        $plan = Plan::factory()->create(['prices' => ['USD' => 249, 'EUR' => 229]]);
        $logged = ActivityLog::query()->count();

        $plan->update(['prices' => ['EUR' => 229, 'USD' => 249]]);
        $plan->update(['prices' => ['USD' => 249, 'EUR' => 229]]);

        $this->assertSame($logged, ActivityLog::query()->count());
    }
}
