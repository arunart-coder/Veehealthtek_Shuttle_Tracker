<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     * We use employee_id directly as the unique primary string ID.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id', // Employee ID string (e.g. EMP001)
        'name',
        'department',
        'gender'
    ];

    /**
     * Relationship: Many-to-many trips this passenger has logged or ridden as a passenger.
     */
    public function trips()
    {
        return $this->belongsToMany(Trip::class, 'trip_passenger', 'employee_id', 'trip_id');
    }
}
