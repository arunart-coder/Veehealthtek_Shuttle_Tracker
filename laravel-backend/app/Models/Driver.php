<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'employee_id',
        'name',
        'gender',
        'phone',
        'join_date',
        'status'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'join_date' => 'date:Y-m-d',
    ];

    /**
     * Relationship: Active trip history for this driver.
     */
    public function trips()
    {
        return $this->hasMany(Trip::class);
    }

    /**
     * Relationship: Registered leave schedules/history.
     */
    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    /**
     * Aggregated attribute: Calculate total trips driven.
     */
    public function getTotalTripsAttribute(): int
    {
        return $this->trips()->count();
    }

    /**
     * Aggregated attribute: Calculate total kilometers driven.
     */
    public function getTotalKmAttribute(): float
    {
        return (float) $this->trips()->sum('distance_km');
    }

    /**
     * Scope a query to only include active drivers.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }
}
