<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * activity_logs.causer_name: the acting user's name when the entry was
     * written. user_id becomes null when that account is deleted; the name
     * stays, so the log still says who did it. Existing entries take the
     * name of their user, where that account still exists.
     */
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->string('causer_name', 120)->nullable()->after('user_id');
        });

        $names = DB::table('users')
            ->whereIn('id', DB::table('activity_logs')->select('user_id')->whereNotNull('user_id')->distinct())
            ->pluck('name', 'id');

        foreach ($names as $id => $name) {
            $name = trim((string) $name);

            if ($name === '') {
                continue;
            }

            DB::table('activity_logs')
                ->where('user_id', $id)
                ->whereNull('causer_name')
                ->update(['causer_name' => mb_substr($name, 0, 120)]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn('causer_name');
        });
    }
};
