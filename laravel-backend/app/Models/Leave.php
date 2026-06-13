<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Leave extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'driver_id',
        'leave_type', // e.g. 'Casual', 'Sick', 'Privilege', 'Sabbatical'
        'date', // YYYY-MM-DD
        'reason',
        'approved_by'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date' => 'date:Y-m-d'
    ];

    /**
     * Appends list for JSON structures.
     */
    protected $appends = ['driver_name'];

    /**
     * Relationship: The driver requesting the leave.
     */
    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    /**
     * Accessor: Convenient flat helper attribute matching web interface.
     */
    public function getDriverNameAttribute(): string
    {
        return $this->driver ? $this->driver->name : 'Unknown';
    }
}
