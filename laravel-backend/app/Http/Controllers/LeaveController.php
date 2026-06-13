<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    /**
     * Display leaf listings.
     */
    public function index(Request $request)
    {
        $query = Leave::with('driver');

        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }

        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        $leaves = $query->orderBy('date', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $leaves
        ]);
    }

    /**
     * Log a driver's leave.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'driver_id' => 'required|exists:drivers,id',
            'leave_type' => 'required|string|max:50',
            'date' => 'required|date_format:Y-m-d',
            'reason' => 'nullable|string|max:255',
            'approved_by' => 'nullable|string|max:100'
        ]);

        // Check if leave already registered for driver on that date
        $exists = Leave::where('driver_id', $validated['driver_id'])
                        ->where('date', $validated['date'])
                        ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Leave record already exists for this driver on the specified date'
            ], 422);
        }

        $leave = Leave::create($validated);
        $leave->load('driver');

        return response()->json([
            'success' => true,
            'message' => 'Leave logged successfully',
            'data' => $leave
        ], 201);
    }

    /**
     * Remove or rescind a leave log.
     */
    public function destroy($id)
    {
        $leave = Leave::find($id);

        if (!$leave) {
            return response()->json([
                'success' => false,
                'message' => 'Leave record not found'
            ], 404);
        }

        $leave->delete();

        return response()->json([
            'success' => true,
            'message' => 'Leave record removed'
        ]);
    }
}
