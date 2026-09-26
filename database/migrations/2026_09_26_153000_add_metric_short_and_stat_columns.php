<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * stories.metric_short: the compact metric label in the story list (falls
     * back to metric_label). look_categories.stat_figure / stat_unit: the figure
     * in the Lookbook's "this week" note for that filter ("54" / "most tried size").
     */
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->string('metric_short', 24)->nullable()->after('metric_note');
        });

        Schema::table('look_categories', function (Blueprint $table) {
            $table->string('stat_figure', 16)->nullable()->after('note');
            $table->string('stat_unit', 40)->nullable()->after('stat_figure');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('look_categories', function (Blueprint $table) {
            $table->dropColumn(['stat_figure', 'stat_unit']);
        });

        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn('metric_short');
        });
    }
};
