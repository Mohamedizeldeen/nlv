<?php

namespace App\Http\Controllers;

use App\Enums\LeadStatus;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Lead;
use App\Notifications\NewOrderRequest;
use App\Support\Activity;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class OrderRequestController extends Controller
{
    /**
     * Store an "Order a device" request from the landing page pop-up, in
     * either language (the lead keeps the page's `locale`).
     */
    public function store(StoreOrderRequest $request): RedirectResponse
    {
        // A filled honeypot is a bot: answer as if it worked, keep nothing.
        if ($request->isSpam()) {
            Log::notice('Order request discarded: honeypot filled.', ['ip' => $request->ip()]);

            Inertia::flash('orderRequest', ['reference' => null]);

            return back();
        }

        $lead = DB::transaction(function () use ($request): Lead {
            $lead = Activity::withoutModelLogging(fn (): Lead => Lead::query()->create([
                ...$request->leadAttributes(),
                'status' => LeadStatus::New,
                'consent_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 255) ?: null,
            ]));

            Activity::record(
                'lead.submitted',
                $lead,
                sprintf(
                    'Order request %s from %s, %s (%d %s)',
                    $lead->reference,
                    Activity::isolate($lead->name),
                    Activity::isolate($lead->company),
                    $lead->devices,
                    $lead->devices === 1 ? 'device' : 'devices',
                ),
                [
                    'source' => $lead->source?->value,
                    'plan' => $lead->plan->value,
                    'devices' => $lead->devices,
                    'locale' => $lead->locale,
                ],
            );

            return $lead;
        });

        $recipient = Settings::string('contact.lead_notify_email');

        if ($recipient !== '') {
            Notification::route('mail', $recipient)->notify(new NewOrderRequest($lead));
        }

        Inertia::flash('orderRequest', ['reference' => $lead->reference]);

        return back();
    }
}
