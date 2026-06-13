<?php

namespace Database\Seeders;

use App\Models\DistanceOverride;
use App\Models\Driver;
use App\Models\Employee;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ShuttleSystemSeeder extends Seeder
{
    /**
     * Seed the application's database with core defaults.
     */
    public function run(): void
    {
        // 1. Seed Core Administrative Users
        User::updateOrCreate(
            ['email' => 'admin@shuttle.com'],
            [
                'name' => 'System Manager',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'is_active' => true
            ]
        );

        User::updateOrCreate(
            ['email' => 'coordinator@shuttle.com'],
            [
                'name' => 'Transport Coordinator',
                'password' => Hash::make('password123'),
                'role' => 'coordinator',
                'is_active' => true
            ]
        );

        // 2. Seed Default Locations (matching React client config)
        $locations = [
            [
                'id' => 'loc_default_a',
                'label' => 'Office (IndiQube)',
                'name' => 'IndiQube Orchid',
                'short_name' => 'IndiQube',
                'address' => 'IndiQube Orchid Building, Outer Ring Road, Bangalore',
                'type' => 'office',
                'is_default' => true,
                'is_active' => true,
                'distance_from_a' => 0.0,
                'lat' => 12.9234,
                'lng' => 77.6845
            ],
            [
                'id' => 'loc_default_b',
                'label' => 'Metro (Trinity)',
                'name' => 'Trinity Metro Station',
                'short_name' => 'Trinity',
                'address' => 'MG Road, Trinity Circuit, Bangalore',
                'type' => 'metro',
                'is_default' => false,
                'is_active' => true,
                'distance_from_a' => 1.0, // relative fallback from Point A
                'lat' => 12.9733,
                'lng' => 77.6171
            ],
            [
                'id' => 'loc_hhal',
                'label' => 'Hindustan Airport',
                'name' => 'HAL Airport Road Entrance',
                'short_name' => 'HAL Road',
                'address' => 'Old Airport Road, Kodihalli, Bangalore',
                'type' => 'bus_stop',
                'is_default' => false,
                'is_active' => true,
                'distance_from_a' => 3.5,
                'lat' => 12.9592,
                'lng' => 77.6436
            ],
            [
                'id' => 'loc_silkbord',
                'label' => 'Silk Board Junction',
                'name' => 'Silk Board Bus stop point A',
                'short_name' => 'Silk Board',
                'address' => 'Hosur Road, Bangalore',
                'type' => 'bus_stop',
                'is_default' => false,
                'is_active' => true,
                'distance_from_a' => 6.2,
                'lat' => 12.9172,
                'lng' => 77.6228
            ]
        ];

        foreach ($locations as $loc) {
            Location::updateOrCreate(['id' => $loc['id']], $loc);
        }

        // 3. Seed Default Active Drivers
        $drivers = [
            [
                'employee_id' => 'DRV001',
                'name' => 'Rajesh Kumar',
                'gender' => 'Male',
                'phone' => '+919876543210',
                'status' => 'Active',
                'join_date' => '2025-01-10'
            ],
            [
                'employee_id' => 'DRV002',
                'name' => 'Amit Sharma',
                'gender' => 'Male',
                'phone' => '+919123456789',
                'status' => 'Active',
                'join_date' => '2025-03-15'
            ],
            [
                'employee_id' => 'DRV003',
                'name' => 'Sunita Rao',
                'gender' => 'Female',
                'phone' => '+919988776655',
                'status' => 'Active',
                'join_date' => '2025-05-20'
            ]
        ];

        foreach ($drivers as $driver) {
            Driver::updateOrCreate(['employee_id' => $driver['employee_id']], $driver);
        }

        // 4. Seed Standard Sample Employees (Corporate passengers list)
        $employees = [
            ['id' => 'EMP1001', 'name' => 'John Doe', 'department' => 'Software Eng', 'gender' => 'M'],
            ['id' => 'EMP1002', 'name' => 'Sarah Connor', 'department' => 'Product Mgmt', 'gender' => 'F'],
            ['id' => 'EMP1003', 'name' => 'Tony Stark', 'department' => 'R&D Engineering', 'gender' => 'M'],
            ['id' => 'EMP1004', 'name' => 'Bruce Banner', 'department' => 'Data Analytics', 'gender' => 'M'],
            ['id' => 'EMP1005', 'name' => 'Diana Prince', 'department' => 'Quality Cert', 'gender' => 'F']
        ];

        foreach ($employees as $emp) {
            Employee::updateOrCreate(['id' => $emp['id']], $emp);
        }

        // 5. Seed Core Directional Distance Overrides (IndiQube <-> Trinity)
        // IndiQube (Point A) to Trinity (Point B) has different routing distances:
        // A -> B: 3.8 km
        // B -> A: 1.0 km
        DistanceOverride::updateOrCreate(
            ['from_id' => 'loc_default_a', 'to_id' => 'loc_default_b'],
            ['distance' => 3.8]
        );

        DistanceOverride::updateOrCreate(
            ['from_id' => 'loc_default_b', 'to_id' => 'loc_default_a'],
            ['distance' => 1.0]
        );
    }
}
