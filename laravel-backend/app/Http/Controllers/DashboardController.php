<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Employee;
use App\Models\Location;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Retrieve aggregated statistics for the corporate shuttle panel.
     */
    public function metrics(Request $request)
    {
        $todayStr = Carbon::now()->format('Y-m-d');
        $monthStart = Carbon::now()->startOfMonth()->format('Y-m-d');
        $monthEnd = Carbon::now()->endOfMonth()->format('Y-m-d');

        // Calculated stats
        $totalEmployees = Employee::count();
        $totalDrivers = Driver::where('status', 'Active')->count();
        $totalLocations = Location::count();

        // Today's specific metrics
        $todayTripsQuery = Trip::where('date', $todayStr);
        $todayTripsCount = $todayTripsQuery->count();
        $todayKm = (float) $todayTripsQuery->sum('distance_km');
        $todayPassengersCount = (integer) $todayTripsQuery->sum('passengers_count');

        // Current Month's metrics
        $monthTripsQuery = Trip::whereBetween('date', [$monthStart, $monthEnd]);
        $monthTripsCount = $monthTripsQuery->count();
        $monthKm = (float) $monthTripsQuery->sum('distance_km');

        // Latest logged trips (limit 5)
        $recentTrips = Trip::with(['driver', 'fromLocation', 'toLocation'])
                            ->orderBy('date', 'desc')
                            ->orderBy('start_time', 'desc')
                            ->limit(5)
                            ->get()
                            ->map(function ($trip) {
                                return [
                                    'id' => $trip->id,
                                    'date' => $trip->date->format('Y-m-d'),
                                    'driver' => $trip->driver_name,
                                    'from' => $trip->from_name,
                                    'to' => $trip->to_name,
                                    'type' => $trip->trip_type,
                                    'passengers' => $trip->passengers_count,
                                    'distance' => $trip->distance_km,
                                    'start' => substr($trip->start_time, 0, 5),
                                    'end' => $trip->end_time ? substr($trip->end_time, 0, 5) : '—'
                                ];
                            });

        // Top 5 active drivers (by total logged trips)
        $topDrivers = Driver::where('status', 'Active')
                            ->withCount('trips')
                            ->orderBy('trips_count', 'desc')
                            ->limit(5)
                            ->get()
                            ->map(function ($driver) {
                                return [
                                    'id' => $driver->id,
                                    'name' => $driver->name,
                                    'tripsCount' => $driver->trips_count,
                                    'totalKm' => $driver->total_km
                                ];
                            });

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'registered_passengers' => $totalEmployees,
                    'active_drivers' => $totalDrivers,
                    'total_points' => $totalLocations,
                    'today_trips' => $todayTripsCount,
                    'today_km' => round($todayKm, 1),
                    'today_passengers' => $todayPassengersCount,
                    'month_trips' => $monthTripsCount,
                    'month_km' => round($monthKm, 1)
                ],
                'recent_trips' => $recentTrips,
                'top_drivers' => $topDrivers,
                'timestamp' => Carbon::now()->toIso8601String()
            ]
        ]);
    }
}
