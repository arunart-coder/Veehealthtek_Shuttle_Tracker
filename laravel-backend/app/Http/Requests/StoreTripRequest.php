<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTripRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Controlled by Sanctum middleware at the route level
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'driver_id' => 'required|exists:drivers,id',
            'trip_type' => ['required', Rule::in(['Pickup', 'Drop'])],
            'from_location_id' => 'required|exists:locations,id',
            'to_location_id' => 'required|exists:locations,id',
            'distance_km' => 'required|numeric|min:0.1',
            'date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'duration_min' => 'required|integer|min:0',
            'purpose' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            
            // Validate passenger list mapping to Employees
            'passenger_ids' => 'required|array|min:1',
            'passenger_ids.*' => 'required|exists:employees,id'
        ];
    }
}
