export interface Location {
  id: string;
  label: string;
  name: string;
  shortName: string;
  address: string;
  type: 'office' | 'metro' | 'bus_stop' | 'residential' | 'hospital' | 'client' | 'airport' | 'other';
  isDefault: boolean;
  isActive: boolean;
  distanceFromA: number; // km from Point A
  createdAt: string;
  lat?: number;
  lng?: number;
}

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  joinDate: string; // YYYY-MM-DD
  status: 'Active' | 'Inactive';
  totalTrips?: number;
  totalKm?: number;
  createdAt: string;
}

export interface PassengerDetail {
  id: string; // Employee ID
  name: string;
  department: string;
  gender: 'M' | 'F';
}

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  employeeId: string;
  gender: string;
  tripType: 'Pickup' | 'Drop';
  fromLocationId: string;
  toLocationId: string;
  fromName: string;
  toName: string;
  fromAddress: string;
  toAddress: string;
  fromLabel: string;
  toLabel: string;
  passengers: number;
  passengerDetails?: PassengerDetail[];
  distanceKm: number;
  startKm?: number;
  endKm?: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMin: number;
  purpose: string;
  notes: string;
  createdAt: string;
}

export interface Leave {
  id: string;
  driverId: string;
  driverName: string;
  employeeId: string;
  leaveType: string;
  date: string;
  reason: string;
  approvedBy: string;
  createdAt: string;
}

export interface DistanceOverride {
  fromId: string;
  toId: string;
  distance: number;
}

export interface Database {
  locations: Location[];
  drivers: Driver[];
  trips: Trip[];
  leaves: Leave[];
  employees: PassengerDetail[];
  distanceOverrides?: DistanceOverride[];
}
