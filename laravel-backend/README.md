# Enterprise Shuttle Management System Backend (Laravel 10 / MySQL)

This directory contains the production-ready Laravel 10 backend system designed for the corporate **Pickup & Drop / Shuttle Management web application**. It is tailored to match the application flow, data paradigms, and logical validation rules designed inside the React client dashboard.

---

## 1. System Architecture & Tech Stack

This backend follows the modern MVC REST API configuration utilizing modern enterprise tools:
- **Framework:** Laravel 10.x with PSR standards.
- **Language:** PHP 8.2+ (strictly typed).
- **Relational Storage:** MySQL 8.0+ / MariaDB.
- **Session Authentication:** Laravel Sanctum (Lightweight, state-aware token tracking).

---

## 2. Database Schema & Table Relationships

The MySQL database contains structured indices, foreign keys, and relational constraints optimized for fast reporting aggregations, preventing data duplicates.

```
 +------------------+           +------------------+           +----------------------+
 |    locations     |<---+      |     drivers      |      +--->|      employees       |
 +------------------+    |      +------------------+      |    +----------------------+
 | id (PK, string)  |    |      | id (PK, bigint)  |      |    | id (PK, string-EMP)  |
 | label (string)   |    |      | employee_id (UQ) |      |    | name (string)        |
 | name (string)    |    |      | name (string)    |      |    | department (string)  |
 | short_name       |    |      | gender (enum)    |      |    | gender (enum: M,F)   |
 | address (text)   |    |      | phone (string)   |      |    +----------------------+
 | type (enum)      |    |      | join_date (date) |      |               ^
 | is_default (bool)|    |      | status (enum)    |      |               |
 | distance_from_a  |    |      +------------------+      |               |
 | lat, lng         |    |               ^                |               |
 +------------------+    |               |                |               |
          ^              |               |                |               | Many-To-Many
          |              +---------+     |                |               | (Pivot)
          | outbound               |     |                |               |
          |                      +------------------+     |    +----------------------+
          +--------------------->|      trips       |----+     |   trip_passenger     |
          | inbound              +------------------+     |    +----------------------+
          |                      | id (PK, bigint)  |     +--->| id (PK, bigint)      |
          +--------------------->| driver_id (FK)   |          | trip_id (FK)         |
          |                      | trip_type (enum) |          | employee_id (FK)     |
          |                      | from_loc_id (FK) |          +----------------------+
          |                      | to_loc_id (FK)   |
  +----------------------+       | passengers_count |                   ^
  |  distance_overrides  |       | distance_km      |                   |
  +----------------------+       | date (date)      |                   |
  | id (PK)              |       | start_time (time)|                   |
  | from_id (FK)--------->       | end_time (time)  |                   |
  | to_id (FK)----------->       | duration_min     |                   |
  | distance (decimal)   |       | purpose (string) |                   |
  +----------------------+       | notes (text)     |                   |
                                 +------------------+                   |
                                          |                             |
                                          +-----------------------------+
```

### Core Relational Behaviors
1. **Many-to-Many Passenger Mapping:** A shuttle trip (`trips` table) can carry multiple corporate passengers. This is mapped through the `trip_passenger` pivot table referencing custom alphanumeric Corporate IDs (e.g. `EMP1001` in the `employees` table).
2. **Dynamic Route Lookup:** Calculated values on the client are reinforced server-side. Point A (IndiQube) to Point B (Trinity) directional routing is handled by the `distance_overrides` database lookup which registers unique distance limits by coordinate route directions.

---

## 3. Endpoints Registry (REST API Architecture)

All routes (except `/login` and `/register`) mandate a `Bearer <token>` HTTP header parameter.

| HTTP Method | Request Endpoint | Controller/Action | Access Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | `AuthController@register` | Public | Enrolls a supervisor or admin. |
| **POST** | `/api/auth/login` | `AuthController@login` | Public | Verifies credentials, returns API token. |
| **GET** | `/api/auth/me` | `AuthController@me` | Authenticated | Gets current account metadata. |
| **POST** | `/api/auth/logout` | `AuthController@logout` | Authenticated | Terminates active API session token. |
| **GET** | `/api/dashboard/metrics` | `DashboardController@metrics` | Coordinator/Admin | Serves analytics dashboard widgets KPIs. |
| **GET** | `/api/locations` | `LocationController@index` | Authenticated | Fetches active pickup/drop registries. |
| **POST** | `/api/locations` | `LocationController@store` | Coordinator/Admin | Adds a new geocoded station point. |
| **PUT** | `/api/locations/{id}` | `LocationController@update` | Coordinator/Admin | Modifies individual location config. |
| **DELETE**| `/api/locations/{id}` | `LocationController@destroy`| Admin Only | Removes location registry safely. |
| **GET** | `/api/drivers` | `DriverController@index` | Authenticated | Lists drive crews and total driven mileage. |
| **POST** | `/api/drivers` | `DriverController@store` | Coordinator/Admin | Registers a new driver onto the roster. |
| **DELETE**| `/api/drivers/{id}` | `DriverController@destroy` | Admin Only | Deactivates driver or removes profile. |
| **GET** | `/api/distance-overrides`| `DistanceOverrideController@index`| Authenticated | Gets all directional layout exceptions. |
| **POST** | `/api/distance-overrides`| `DistanceOverrideController@store`| Coordinator/Admin | Updates / creates custom mileage per route.|
| **POST** | `/api/employees/sync` | `EmployeeController@syncBatch` | Coordinator/Admin | Batch merges Excel-imported passenger list. |
| **GET** | `/api/trips` | `TripController@index` | Authenticated | Gets paginated logged rides list. |
| **POST** | `/api/trips` | `TripController@store` | Coordinator/Admin | Registers structured trip log. |
| **DELETE**| `/api/trips/{id}` | `TripController@destroy` | Coordinator/Admin | Deletes individual logged trip. |
| **POST** | `/api/admin/clear-trips` | `TripController@clearAllTrips` | Admin Only | Wipes trip database (clean-slate tool). |

---

## 4. Sample JSON Payloads Model

### A. Authentication Request & Response
**POST** `/api/auth/login`
```json
// Request Payload (Raw Input JSON)
{
  "email": "coordinator@shuttle.com",
  "password": "password123"
}
```

```json
// Successful Response (200 OK)
{
  "success": true,
  "message": "User authenticated successfully",
  "data": {
    "user": {
      "id": 2,
      "name": "Transport Coordinator",
      "email": "coordinator@shuttle.com",
      "role": "coordinator"
    },
    "token": "3|aH9PzkU87Oqp011Nmlv1X98H...c42",
    "token_type": "Bearer"
  }
}
```

---

### B. Save Trip Log Request & Response
**POST** `/api/trips`
```json
// Request Payload (Tracks a Multi-Passenger Trip)
{
  "driver_id": 1,
  "trip_type": "Pickup",
  "from_location_id": "loc_default_b",
  "to_location_id": "loc_default_a",
  "distance_km": 1.0,
  "date": "2026-05-21",
  "start_time": "18:30",
  "end_time": "18:45",
  "duration_min": 15,
  "purpose": "Evening Drop Shift",
  "notes": "Route traffic clearing normal.",
  "passenger_ids": ["EMP1003", "EMP1004"] // Links to pivot table
}
```

```json
// Successful Response (201 Created)
{
  "success": true,
  "message": "Trip logged successfully!",
  "data": {
    "id": 142,
    "driver_id": 1,
    "trip_type": "Pickup",
    "from_location_id": "loc_default_b",
    "to_location_id": "loc_default_a",
    "passengers_count": 2,
    "distance_km": 1.0,
    "date": "2026-05-21",
    "start_time": "18:30:00",
    "end_time": "18:45:00",
    "duration_min": 15,
    "purpose": "Evening Drop Shift",
    "notes": "Route traffic clearing normal.",
    "created_at": "2026-05-21T10:36:12Z",
    "passenger_details": [
      {
        "id": "EMP1003",
        "name": "Tony Stark",
        "department": "R&D Engineering",
        "gender": "M"
      },
      {
        "id": "EMP1004",
        "name": "Bruce Banner",
        "department": "Data Analytics",
        "gender": "M"
      }
    ],
    "driver_name": "Rajesh Kumar",
    "from_name": "Trinity Metro Station",
    "to_name": "IndiQube Orchid"
  }
}
```

---

### C. Dashboard Metrics Analytics Response
**GET** `/api/dashboard/metrics`
```json
// Successful Response (200 OK)
{
  "success": true,
  "data": {
    "kpis": {
      "registered_passengers": 520,
      "active_drivers": 6,
      "total_points": 12,
      "today_trips": 18,
      "today_km": 42.6,
      "today_passengers": 24,
      "month_trips": 320,
      "month_km": 845.2
    },
    "recent_trips": [
      {
        "id": 142,
        "date": "2026-05-21",
        "driver": "Rajesh Kumar",
        "from": "Trinity Metro Station",
        "to": "IndiQube Orchid",
        "type": "Pickup",
        "passengers": 2,
        "distance": 1.0,
        "start": "18:30",
        "end": "18:45"
      }
    ],
    "top_drivers": [
      {
        "id": 1,
        "name": "Rajesh Kumar",
        "tripsCount": 110,
        "totalKm": 240.5
      }
    ],
    "timestamp": "2026-05-21T10:45:10Z"
  }
}
```

---

## 5. Security & Scaling Considerations

1. **Transaction Integrity (ACID):** Complex creation endpoints like `TripController@store` are wrapped in `DB::beginTransaction()` database transactions. This guarantees the pivot list `trip_passenger` records and parent `trips` table entries exist completely or get aborted altogether in case of an application runtime exception.
2. **Prepared Statements (No SQL Injection):** Uses Laravel's Eloquent ORM which leverages PDO parameterized query string parsing natively to prevent code injections.
3. **Route Rate Limiting:** Configured on API endpoints group to route a max of 60 requests/minute per authenticated token. This mitigates robot/script brute-forcing attacks:
   ```php
   RateLimiter::for('api', function (Request $request) {
       return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
   });
   ```
4. **Optimized Aggregation Indexes:** Compound indices are instantiated on highly queried filter parameters such as `['date', 'trip_type']` in the migrations to speed up multi-year Excel download reports queries.

---

## 6. Installation & Deployment Guidelines

### Setup Instructions
1. Navigate to the folder in the clean host terminal:
   ```bash
   cd laravel-backend
   ```
2. Fetch package dependencies:
   ```bash
   composer install
   ```
3. Copy environment credentials:
   ```bash
   cp .env.example .env
   ```
4. Set encryption key parameter:
   ```bash
   php artisan key:generate
   ```
5. Specify your local MySQL credentials in the newly generated `.env` configuration file:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=shuttle_system_db
   DB_USERNAME=root
   DB_PASSWORD=your_secure_password
   ```
6. Trigger the optimized database migrations and initial seeders:
   ```bash
   php artisan migrate --seed
   ```
7. Fire up your PHP development server matching port rules:
   ```bash
   php artisan serve --port=8000
   ```
   *Your backend API registry is now online and listening at `http://127.0.0.1:8000`!*
