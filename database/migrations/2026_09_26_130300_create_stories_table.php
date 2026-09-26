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
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('role', 80);
            $table->string('store', 80);
            $table->string('city', 60);
            $table->string('coordinates', 40)->nullable();
            $table->text('quote');
            $table->string('metric_figure', 16);
            $table->string('metric_label', 40);
            $table->string('metric_note', 40)->nullable();
            $table->string('portrait');
            $table->decimal('portrait_focus_x', 3, 2)->default(0.5);
            $table->decimal('portrait_focus_y', 3, 2)->default(0.35);
            $table->decimal('portrait_zoom', 3, 2)->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['is_published', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
