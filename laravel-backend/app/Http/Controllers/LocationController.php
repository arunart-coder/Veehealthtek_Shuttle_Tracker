<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocationController extends Controller
{
    /**
     * Display a listing of active and inactive locations.
     */
    public function index(Request $request)
    {
        $query = Location::query();

        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        $locations = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $locations
        ]);
    }

    /**
     * Store a newly created location.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string|max:50|unique:locations,id',
            'label' => 'required|string|max:50',
            'name' => 'required|string|max:150',
            'short_name' => 'required|string|max:50',
            'address' => 'nullable|string|max:255',
            'type' => ['required', Rule::in(['office', 'metro', 'bus_stop', 'residential', 'hospital', 'client', 'airport', 'other'])],
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'distance_from_a' => 'required|numeric|min:0',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180'
        ]);

        // If setting this location as default, deactivate other defaults of type
        if (!empty($validated['is_default']) && $validated['is_default'] && $validated['type'] === 'office') {
            Location::where('is_default', true)->where('type', 'office')->update(['is_default' => false]);
        }

        $location = Location::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Location added successfully',
            'data' => $location
        ], 201);
    }

    /**
     * Display the specified location.
     */
    public function show(Location $location)
    {
        return response()->json([
            'success' => true,
            'data' => $location
        ]);
    }

    /**
     * Update the specified location.
     */
    public function update(Request $request, Location $location)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:50',
            'name' => 'required|string|max:150',
            'short_name' => 'required|string|max:50',
            'address' => 'nullable|string|max:255',
            'type' => ['required', Rule::in(['office', 'metro', 'bus_stop', 'residential', 'hospital', 'client', 'airport', 'other'])],
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'distance_from_a' => 'required|numeric|min:0',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180'
        ]);

        if (isset($validated['is_default']) && $validated['is_default'] && $validated['type'] === 'office') {
            Location::where('id', '!=', $location->id)
                    ->where('is_default', true)
                    ->where('type', 'office')
                    ->update(['is_default' => false]);
        }

        $location->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Location modified successfully',
            'data' => $location
        ]);
    }

    /**
     * Remove the specified location.
     */
    public function destroy(Location $location)
    {
        if ($location->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete default primary station location.'
            ], 422);
        }

        try {
            $location->delete();
            return response()->json([
                'success' => true,
                'message' => 'Location deleted successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete location. There are trips associated with this point.'
            ], 409);
        }
    }
}
