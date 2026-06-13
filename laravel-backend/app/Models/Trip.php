<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'driver_id',
        'trip_type', // 'Pickup' or 'Drop'
        'from_location_id',
        'to_location_id',
        'passengers_count',
        'distance_km',
        'date',
        'start_time',
        'end_time',
        'duration_min',
        'purpose',
        'notes'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date' => 'date:Y-m-d',
        'distance_km' => 'float',
        'passengers_count' => 'integer',
        'duration_min' => 'integer',
    ];

    /**
     * Appends list for automatic representation in API outputs.
     */
    protected $appends = ['passenger_details', 'driver_name', 'from_name', 'to_name'];

    /**
     * Relationship: The Driver assigned to this shuttle trip.
     */
    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    /**
     * Relationship: The starting Location of the trip.
     */
    public function fromLocation()
    {
        return $this->belongsTo(Location::class, 'from_location_id');
    }

    /**
     * Relationship: The terminating Location of the trip.
     */
    public function toLocation()
    {
        return $this->belongsTo(Location::class, 'to_location_id');
    }

    /**
     * Relationship: Many-to-many list of Employees riding in this trip.
     */
    public function passengers()
    {
        return $this->belongsToMany(Employee::class, 'trip_passenger', 'trip_id', 'employee_id');
    }

    /**
     * Accessor: Support matching frontend's 'passengerDetails' camelCase / snake_case representation.
     */
    public function getPassengerDetailsAttribute()
    {
        return $this->passengers()->get()->map(function($emp) {
            return [
                'id' => $emp->id,
                'name' => $emp->name,
                'department' => $emp->department,
                'gender' => $emp->gender
            ];
        });
    }

    /**
     * Accessor: Support matching frontend's plain driver name output.
     */
    public function getDriverNameAttribute(): string
    {
        return $this->driver ? $this->driver->name : 'Unknown';
    }

    /**
     * Accessors to support flat descriptive fields expected by reporting tools.
     */
    public function getFromNameAttribute(): string
    {
        return $this->fromLocation ? $this->fromLocation->name : '';
    }

    public function getToNameAttribute(): string
    {
        return $this->toLocation ? $this->toLocation->name : '';
    }
}
