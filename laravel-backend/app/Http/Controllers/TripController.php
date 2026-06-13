<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTripRequest;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TripController extends Controller
{
    /**
     * Display a listing of trips with pagination and keyword filtering.
     */
    public function index(Request $request)
    {
        $query = Trip::with(['driver', 'fromLocation', 'toLocation', 'passengers']);

        // Date range filtering
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        } elseif ($request->has('date')) {
            $query->where('date', $request->date);
        }

        // Driver filter
        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }

        // Trip Type filter (Pickup / Drop)
        if ($request->has('trip_type')) {
            $query->where('trip_type', $request->trip_type);
        }

        // Passenger name / employee ID search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('purpose', 'LIKE', "%{$search}%")
                  ->orWhere('notes', 'LIKE', "%{$search}%")
                  ->orWhereHas('passengers', function ($pQ) use ($search) {
                      $pQ->where('name', 'LIKE', "%{$search}%")
                         ->orWhere('id', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Sort decending by default to show latest trips
        $trips = $query->orderBy('date', 'desc')
                       ->orderBy('start_time', 'desc')
                       ->paginate($request->get('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $trips
        ]);
    }

    /**
     * Store a newly created trip.
     */
    public function store(StoreTripRequest $request)
    {
        try {
            DB::beginTransaction();

            // Create Trip instance
            $trip = Trip::create([
                'driver_id' => $request->driver_id,
                'trip_type' => $request->trip_type,
                'from_location_id' => $request->from_location_id,
                'to_location_id' => $request->to_location_id,
                'passengers_count' => count($request->passenger_ids),
                'distance_km' => $request->distance_km,
                'date' => $request->date,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'duration_min' => $request->duration_min,
                'purpose' => $request->purpose,
                'notes' => $request->notes,
            ]);

            // Sync passengers to pivot table
            $trip->passengers()->sync($request->passenger_ids);

            DB::commit();

            // Reload relationships to return the structured model
            $trip->load(['driver', 'fromLocation', 'toLocation', 'passengers']);

            return response()->json([
                'success' => true,
                'message' => 'Trip logged successfully!',
                'data' => $trip
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to record trip logging: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified trip.
     */
    public function show(Trip $trip)
    {
        $trip->load(['driver', 'fromLocation', 'toLocation', 'passengers']);

        return response()->json([
            'success' => true,
            'data' => $trip
        ]);
    }

    /**
     * Update the specified trip.
     */
    public function update(StoreTripRequest $request, Trip $trip)
    {
        try {
            DB::beginTransaction();

            $trip->update([
                'driver_id' => $request->driver_id,
                'trip_type' => $request->trip_type,
                'from_location_id' => $request->from_location_id,
                'to_location_id' => $request->to_location_id,
                'passengers_count' => count($request->passenger_ids),
                'distance_km' => $request->distance_km,
                'date' => $request->date,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'duration_min' => $request->duration_min,
                'purpose' => $request->purpose,
                'notes' => $request->notes,
            ]);

            // Re-sync many-to-many passenger details
            $trip->passengers()->sync($request->passenger_ids);

            DB::commit();

            $trip->load(['driver', 'fromLocation', 'toLocation', 'passengers']);

            return response()->json([
                'success' => true,
                'message' => 'Trip modified successfully!',
                'data' => $trip
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to modify trip: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified trip.
     */
    public function destroy(Trip $trip)
    {
        try {
            $trip->delete();

            return response()->json([
                'success' => true,
                'message' => 'Trip record deleted successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Delete operation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clean slate deletion of all trips in the app.
     */
    public function clearAllTrips(Request $request)
    {
        // Controlled at middleware level to make sure only Admins access this path
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            DB::table('trip_passenger')->truncate();
            Trip::truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            return response()->json([
                'success' => true,
                'message' => 'All ride logs have been wiped successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Clear action aborted: ' . $e->getMessage()
            ], 500);
        }
    }
}
