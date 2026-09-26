<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key', 20)->unique();
            $table->string('name', 40);
            $table->string('blurb', 200);
            $table->string('price_mode', 20);
            $table->json('prices')->nullable();
            $table->string('price_caption', 120);
            $table->string('detail_label', 40)->nullable();
            $table->json('detail_prices')->nullable();
            $table->string('detail_value', 20)->nullable();
            $table->string('detail_caption', 60)->nullable();
            $table->string('features_heading', 80)->nullable();
            $table->json('features');
            $table->string('cta_label', 40);
            $table->boolean('is_featured')->default(false);
            $table->string('badge', 40)->nullable();
            $table->string('badge_note', 80)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
