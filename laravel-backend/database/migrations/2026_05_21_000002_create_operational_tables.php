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
        // 1. Trips Table
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->onDelete('cascade');
            $table->enum('trip_type', ['Pickup', 'Drop']);
            
            $table->string('from_location_id');
            $table->foreign('from_location_id')->references('id')->on('locations')->onDelete('cascade');
            
            $table->string('to_location_id');
            $table->foreign('to_location_id')->references('id')->on('locations')->onDelete('cascade');
            
            $table->integer('passengers_count')->default(1);
            $table->decimal('distance_km', 8, 2);
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time')->nullable();
            $table->integer('duration_min')->default(0);
            $table->string('purpose')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes for fast reports filtering by date range & trip types
            $table->index(['date', 'trip_type']);
            $table->index('driver_id');
        });

        // 2. Many-To-Many Trip Passengers Pivot Table
        Schema::create('trip_passenger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained('trips')->onDelete('cascade');
            $table->string('employee_id');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->timestamps();

            // Unique composite index to prevent twin logs
            $table->unique(['trip_id', 'employee_id']);
        });

        // 3. Driver Leaves Table
        Schema::create('leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->onDelete('cascade');
            $table->string('leave_type');
            $table->date('date');
            $table->text('reason')->nullable();
            $table->string('approved_by')->nullable();
            $table->timestamps();

            $table->index(['date', 'driver_id']);
        });

        // 4. Directional Distance Overrides Table
        Schema::create('distance_overrides', function (Blueprint $table) {
            $table->id();
            $table->string('from_id');
            $table->foreign('from_id')->references('id')->on('locations')->onDelete('cascade');
            
            $table->string('to_id');
            $table->foreign('to_id')->references('id')->on('locations')->onDelete('cascade');
            
            $table->decimal('distance', 8, 1);
            $table->timestamps();

            // Direct route override index to prevent redundant definitions
            $table->unique(['from_id', 'to_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('distance_overrides');
        Schema::dropIfExists('leaves');
        Schema::dropIfExists('trip_passenger');
        Schema::dropIfExists('trips');
    }
};
