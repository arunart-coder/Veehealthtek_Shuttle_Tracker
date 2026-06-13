<?php

namespace App\Http\Controllers;

use App\Models\DistanceOverride;
use Illuminate\Http\Request;

class DistanceOverrideController extends Controller
{
    /**
     * Display all custom route distance overrides.
     */
    public function index()
    {
        $overrides = DistanceOverride::with(['origin', 'destination'])->get();

        return response()->json([
            'success' => true,
            'data' => $overrides
        ]);
    }

    /**
     * Update or create a custom directional mileage rule.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'from_id' => 'required|exists:locations,id',
            'to_id' => 'required|exists:locations,id|different:from_id',
            'distance' => 'required|numeric|min:0.0'
        ]);

        $override = DistanceOverride::updateOrCreate(
            [
                'from_id' => $validated['from_id'],
                'to_id' => $validated['to_id']
            ],
            [
                'distance' => $validated['distance']
            ]
        );

        $override->load(['origin', 'destination']);

        return response()->json([
            'success' => true,
            'message' => 'Directional distance rule updated',
            'data' => $override
        ]);
    }

    /**
     * Remove a directional distance exception.
     */
    public function destroy($id)
    {
        $override = DistanceOverride::find($id);

        if (!$override) {
            return response()->json([
                'success' => false,
                'message' => 'Override exception not found'
            ], 404);
        }

        $override->delete();

        return response()->json([
            'success' => true,
            'message' => 'Override rule deleted. Reverted route distance to relative fallback calculations.'
        ]);
    }
}
