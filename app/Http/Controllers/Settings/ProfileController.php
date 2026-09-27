<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Lead;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information. A new email address has to be
     * confirmed again, so the confirmation link is sent to it straight away.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $user->fill($request->validated());

        $emailChanged = $user->isDirty('email');

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if (! $emailChanged) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

            return to_route('profile.edit');
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            report($exception);

            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => __('Profile updated, but the confirmation email couldn’t be sent. Ask for a new link below.'),
            ]);

            return to_route('profile.edit');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Profile updated. A confirmation link is on its way to :email.', ['email' => $user->email]),
        ]);

        return to_route('profile.edit')->with('status', 'verification-link-sent');
    }

    /**
     * Delete the user's profile. The last admin can't (checked again here
     * under a lock, as on /admin/users). Leads assigned to the account become
     * unassigned, and the log keeps the name of who did what.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();
        $snapshot = ['name' => $user->name, 'email' => $user->email, 'is_admin' => $user->isAdmin()];

        $leads = DB::transaction(function () use ($user): Collection {
            if ($user->isAdmin()) {
                $others = User::query()
                    ->where('is_admin', true)
                    ->whereKeyNot($user->getKey())
                    ->lockForUpdate()
                    ->count();

                if ($others === 0) {
                    throw ValidationException::withMessages(['account' => ProfileDeleteRequest::lastAdminMessage()]);
                }
            }

            // Signed out while the account still exists: signing out saves
            // it (a new remember token).
            Auth::logout();

            // The foreign key would do this too; done here to log each lead.
            $leads = Lead::withTrashed()->where('assigned_to', $user->id)->get(['id', 'reference', 'deleted_at']);

            if ($leads->isNotEmpty()) {
                Lead::withTrashed()->whereKey($leads->modelKeys())->toBase()->update(['assigned_to' => null]);
            }

            Password::deleteToken($user);
            // One user.deleted entry below, credited to the user by name.
            Activity::withoutModelLogging(fn (): ?bool => $user->delete());

            return $leads;
        });

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $this->endOtherSessions($user);

        $name = Activity::isolate($snapshot['name']);

        Activity::record(
            'user.deleted',
            $user,
            "{$name} deleted their own account ({$snapshot['email']})",
            [
                'via' => 'settings',
                'unassigned_leads' => $leads->count(),
                'changes' => [
                    'name' => [$snapshot['name'], null],
                    'email' => [$snapshot['email'], null],
                    'is_admin' => [$snapshot['is_admin'], null],
                ],
            ],
            $user,
        );

        foreach ($leads as $lead) {
            Activity::record(
                'lead.unassigned',
                $lead,
                "Unassigned {$lead->reference} (was {$name}): the account was deleted",
                ['via' => 'settings', 'changes' => ['assignee' => [$snapshot['name'], null]]],
                $user,
            );
        }

        return redirect('/');
    }

    /**
     * Sign the deleted account out of its other browsers (database sessions
     * only; other drivers find no account at their next request).
     */
    private function endOtherSessions(User $user): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        $connection = config('session.connection');
        $table = config('session.table');

        DB::connection(is_string($connection) ? $connection : null)
            ->table(is_string($table) ? $table : 'sessions')
            ->where('user_id', $user->id)
            ->delete();
    }
}
