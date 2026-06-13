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
        // 1. Locations Table
        Schema::create('locations', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. loc_default_a, loc_default_b or uuid
            $table->string('label');
            $table->string('name');
            $table->string('short_name');
            $table->text('address')->nullable();
            $table->enum('type', ['office', 'metro', 'bus_stop', 'residential', 'hospital', 'client', 'airport', 'other'])->default('other');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->decimal('distance_from_a', 8, 2)->default(0.00); // km from Point A
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->timestamps();

            // Indexing for performance
            $table->index('is_active');
            $table->index('is_default');
        });

        // 2. Drivers Table
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id')->unique();
            $table->string('name');
            $table->enum('gender', ['Male', 'Female', 'Other'])->default('Male');
            $table->string('phone')->nullable();
            $table->date('join_date')->nullable();
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();

            $table->index('status');
        });

        // 3. Employees (Passengers) Table
        Schema::create('employees', function (Blueprint $table) {
            $table->string('id')->primary(); // Corporate Employee ID string (e.g. EMP123)
            $table->string('name');
            $table->string('department');
            $table->enum('gender', ['M', 'F'])->default('M');
            $table->timestamps();

            $table->index('department');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
        Schema::dropIfExists('drivers');
        Schema::dropIfExists('locations');
    }
};
