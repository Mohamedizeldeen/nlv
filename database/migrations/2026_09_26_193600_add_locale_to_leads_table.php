<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * leads.locale: the language of the page the visitor ordered from ("en" or
     * "ar"), so the team answers in it. Existing leads came from the English page.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('locale', 2)->default('en')->after('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
