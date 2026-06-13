<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DistanceOverrideController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\TripController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// --- Public Authentication Routes ---
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// --- Secure Token Protected Routes ---
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth profile metadata
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Real-Time Analytics Dashboard
    Route::get('/dashboard/metrics', [DashboardController::class, 'metrics']);

    // Locations Registry CRUD
    Route::apiResource('locations', LocationController::class);

    // Fleet Drivers Registry & Profile CRUD
    Route::apiResource('drivers', DriverController::class);

    // Driver leaves logging
    Route::get('/leaves', [LeaveController::class, 'index']);
    Route::post('/leaves', [LeaveController::class, 'store']);
    Route::delete('/leaves/{id}', [LeaveController::class, 'destroy']);

    // Interactive custom directional routes overrides
    Route::get('/distance-overrides', [DistanceOverrideController::class, 'index']);
    Route::post('/distance-overrides', [DistanceOverrideController::class, 'store']);
    Route::delete('/distance-overrides/{id}', [DistanceOverrideController::class, 'destroy']);

    // Corporate Registered Passengers CRUD & Batch Import
    Route::post('/employees/sync', [EmployeeController::class, 'syncBatch']);
    Route::apiResource('employees', EmployeeController::class);

    // Shuttle Trips Logging CRUD
    Route::apiResource('trips', TripController::class);

    // Dynamic clean slate batch wipe option (Admin Only restricted)
    Route::post('/admin/clear-trips', [TripController::class, 'clearAllTrips'])->middleware(\App\Http\Middleware\CheckAdmin::class);
});
