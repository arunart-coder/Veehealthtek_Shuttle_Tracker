<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DistanceOverride extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'from_id',
        'to_id',
        'distance'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'distance' => 'float'
    ];

    /**
     * Relationship: Origin Location link
     */
    public function origin()
    {
        return $this->belongsTo(Location::class, 'from_id');
    }

    /**
     * Relationship: Destination Location link
     */
    public function destination()
    {
        return $this->belongsTo(Location::class, 'to_id');
    }

    /**
     * Find a specific custom directional override between two locations.
     */
    public static function findOverride(string $fromId, string $toId): ?float
    {
        $override = self::where('from_id', $fromId)
                        ->where('to_id', $toId)
                        ->first();

        return $override ? $override->distance : null;
    }
}
