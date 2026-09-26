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
        Schema::create('looks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('look_category_id')->constrained()->restrictOnDelete();
            $table->string('title', 80);
            $table->string('city', 60);
            $table->decimal('render_seconds', 3, 1)->default(1.8);
            $table->string('after_image');
            $table->string('before_image')->nullable();
            $table->string('alt', 200);
            $table->decimal('aspect', 5, 3);
            $table->decimal('focus_x', 3, 2)->default(0.5);
            $table->decimal('focus_y', 3, 2)->default(0.5);
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
        Schema::dropIfExists('looks');
    }
};
