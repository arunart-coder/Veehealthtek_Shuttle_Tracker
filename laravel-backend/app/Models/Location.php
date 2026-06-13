<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'label',
        'name',
        'short_name',
        'address',
        'type',
        'is_default',
        'is_active',
        'distance_from_a',
        'lat',
        'lng'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'distance_from_a' => 'float',
        'lat' => 'float',
        'lng' => 'float'
    ];

    /**
     * Scope a query to only include active locations.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to get default starting Point A (office).
     */
    public function scopeDefaultOffice($query)
    {
        return $query->where('is_default', true)->where('type', 'office');
    }

    /**
     * Relationship: Destinations of trips originating here.
     */
    public function outboundTrips()
    {
        return $this->hasMany(Trip::class, 'from_location_id');
    }

    /**
     * Relationship: Origins of trips terminating here.
     */
    public function inboundTrips()
    {
        return $this->hasMany(Trip::class, 'to_location_id');
    }
}
