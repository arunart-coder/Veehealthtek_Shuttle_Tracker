<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    /**
     * Display a listing of passenger employees.
     */
    public function index(Request $request)
    {
        $query = Employee::query();

        if ($request->has('department')) {
            $query->where('department', $request->department);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'LIKE', "%{$search}%")
                  ->orWhere('name', 'LIKE', "%{$search}%")
                  ->orWhere('department', 'LIKE', "%{$search}%");
            });
        }

        $employees = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }

    /**
     * Store a newly created employee.
     */
    public function store(StoreEmployeeRequest $request)
    {
        $employee = Employee::create([
            'id' => strtoupper(trim($request->id)),
            'name' => trim($request->name),
            'department' => trim($request->department),
            'gender' => strtoupper($request->gender)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Employee passenger registered successfully.',
            'data' => $employee
        ], 201);
    }

    /**
     * Display the specified employee.
     */
    public function show(Employee $employee)
    {
        return response()->json([
            'success' => true,
            'data' => $employee
        ]);
    }

    /**
     * Update the specified employee.
     */
    public function update(StoreEmployeeRequest $request, Employee $employee)
    {
        $employee->update([
            'name' => trim($request->name),
            'department' => trim($request->department),
            'gender' => strtoupper($request->gender)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Employee passenger details updated successfully.',
            'data' => $employee
        ]);
    }

    /**
     * Remove the specified employee.
     */
    public function destroy(Employee $employee)
    {
        try {
            $employee->delete();
            return response()->json([
                'success' => true,
                'message' => 'Employee passenger deleted successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete employee. They possess trip log records on file.'
            ], 409);
        }
    }

    /**
     * Batch import / Sync Employees (from parsed Client-Side XLSX / Excel rows json payload)
     */
    public function syncBatch(Request $request)
    {
        $request->validate([
            'employees' => 'required|array|min:1',
            'employees.*.id' => 'required|string',
            'employees.*.name' => 'required|string',
            'employees.*.department' => 'required|string',
            'employees.*.gender' => 'required|string|in:M,F,m,f,Male,Female,male,female'
        ]);

        try {
            DB::beginTransaction();

            $importedCount = 0;
            $items = $request->employees;

            foreach ($items as $item) {
                // Normalize gender parameter
                $genderSymbol = strtoupper(substr(trim($item['gender']), 0, 1)) === 'F' ? 'F' : 'M';
                $id = strtoupper(trim($item['id']));

                // Auto update-or-insert to avoid duplicate keys error
                Employee::updateOrCreate(
                    ['id' => $id],
                    [
                        'name' => trim($item['name']),
                        'department' => trim($item['department']),
                        'gender' => $genderSymbol
                    ]
                );
                
                $importedCount++;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Successfully merged and synchronized {$importedCount} employee records.",
                'data' => [
                    'count' => $importedCount
                ]
            ]);

        } catch(\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Batch processing aborted: ' . $e->getMessage()
            ], 500);
        }
    }
}
