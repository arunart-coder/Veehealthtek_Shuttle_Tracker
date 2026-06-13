<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDriverRequest;
use App\Models\Driver;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    /**
     * Display a listing of drivers.
     */
    public function index(Request $request)
    {
        $drivers = Driver::orderBy('name', 'asc')->get();

        // Map aggregated virtual statistics matching client requirements
        $structured = $drivers->map(function ($driver) {
            return [
                'id' => $driver->id,
                'employeeId' => $driver->employee_id,
                'name' => $driver->name,
                'gender' => $driver->gender,
                'phone' => $driver->phone,
                'joinDate' => $driver->join_date ? $driver->join_date->format('Y-m-d') : null,
                'status' => $driver->status,
                'totalTrips' => $driver->total_trips,
                'totalKm' => $driver->total_km,
                'createdAt' => $driver->created_at->toISOString()
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $structured
        ]);
    }

    /**
     * Store a newly registered driver.
     */
    public function store(StoreDriverRequest $request)
    {
        $driver = Driver::create([
            'employee_id' => $request->employee_id,
            'name' => $request->name,
            'gender' => $request->gender,
            'phone' => $request->phone,
            'join_date' => $request->join_date,
            'status' => $request->status ?? 'Active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Driver registered successfully',
            'data' => [
                'id' => $driver->id,
                'employeeId' => $driver->employee_id,
                'name' => $driver->name,
                'gender' => $driver->gender,
                'phone' => $driver->phone,
                'joinDate' => $driver->join_date ? $driver->join_date->format('Y-m-d') : null,
                'status' => $driver->status,
                'totalTrips' => 0,
                'totalKm' => 0.0,
                'createdAt' => $driver->created_at->toISOString()
            ]
        ], 201);
    }

    /**
     * Display the specified driver.
     */
    public function show(Driver $driver)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $driver->id,
                'employeeId' => $driver->employee_id,
                'name' => $driver->name,
                'gender' => $driver->gender,
                'phone' => $driver->phone,
                'joinDate' => $driver->join_date ? $driver->join_date->format('Y-m-d') : null,
                'status' => $driver->status,
                'totalTrips' => $driver->total_trips,
                'totalKm' => $driver->total_km,
                'createdAt' => $driver->created_at->toISOString()
            ]
        ]);
    }

    /**
     * Update the specified driver.
     */
    public function update(StoreDriverRequest $request, Driver $driver)
    {
        $driver->update([
            'name' => $request->name,
            'gender' => $request->gender,
            'phone' => $request->phone,
            'join_date' => $request->join_date ?? $driver->join_date,
            'status' => $request->status ?? $driver->status,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Driver record updated successfully',
            'data' => [
                'id' => $driver->id,
                'employeeId' => $driver->employee_id,
                'name' => $driver->name,
                'gender' => $driver->gender,
                'phone' => $driver->phone,
                'joinDate' => $driver->join_date ? $driver->join_date->format('Y-m-d') : null,
                'status' => $driver->status,
                'totalTrips' => $driver->total_trips,
                'totalKm' => $driver->total_km,
                'createdAt' => $driver->created_at->toISOString()
            ]
        ]);
    }

    /**
     * Remove the specified driver.
     */
    public function destroy(Driver $driver)
    {
        try {
            $driver->delete();
            return response()->json([
                'success' => true,
                'message' => 'Driver removed successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete driver: ' . $e->getMessage()
            ], 500);
        }
    }
}
