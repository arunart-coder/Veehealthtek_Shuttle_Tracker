import { Database, Location, Driver, Trip, Leave, PassengerDetail } from '../types';

const STORE = {
  LOC: 'shuttle_locations',
  DRIVERS: 'shuttle_drivers',
  TRIPS: 'shuttle_trips',
  LEAVES: 'shuttle_leaves',
  EMPLOYEES: 'shuttle_employees',
  OVERRIDES: 'shuttle_overrides'
};

const DEFAULT_LOCATIONS: Location[] = [
  {
    id: 'loc_default_a',
    label: 'A',
    name: 'IndiQube Platina — Office',
    shortName: 'IndiQube Platina',
    address: 'No.15, IndiQube Platina, Commissariat Rd, Ashok Nagar, Bengaluru, Karnataka 560025',
    type: 'office',
    isDefault: true,
    isActive: true,
    distanceFromA: 0,
    lat: 12.9748,
    lng: 77.5997,
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc_default_b',
    label: 'B',
    name: 'Trinity Metro Station',
    shortName: 'Trinity Metro',
    address: 'MG Road, Yellappa Chetty Layout, Sivanchetti Gardens, Bengaluru, Karnataka 560001',
    type: 'metro',
    isDefault: true,
    isActive: true,
    distanceFromA: 1.0,
    lat: 12.9753,
    lng: 77.6157,
    createdAt: new Date().toISOString()
  }
];

export const storage = {
  getDB: (): Database => {
    return {
      locations: JSON.parse(localStorage.getItem(STORE.LOC) || '[]'),
      drivers: JSON.parse(localStorage.getItem(STORE.DRIVERS) || '[]'),
      trips: JSON.parse(localStorage.getItem(STORE.TRIPS) || '[]'),
      leaves: JSON.parse(localStorage.getItem(STORE.LEAVES) || '[]'),
      employees: JSON.parse(localStorage.getItem(STORE.EMPLOYEES) || '[]'),
      distanceOverrides: JSON.parse(localStorage.getItem(STORE.OVERRIDES) || '[]'),
    };
  },

  seedIfEmpty: () => {
    if (!localStorage.getItem(STORE.LOC)) {
      localStorage.setItem(STORE.LOC, JSON.stringify(DEFAULT_LOCATIONS));
    }
    if (!localStorage.getItem(STORE.OVERRIDES)) {
      localStorage.setItem(STORE.OVERRIDES, JSON.stringify([
        { fromId: 'loc_default_a', toId: 'loc_default_b', distance: 3.8 }, // IndiQube -> Trinity
        { fromId: 'loc_default_b', toId: 'loc_default_a', distance: 1.0 }  // Trinity -> IndiQube
      ]));
    }
    if (!localStorage.getItem(STORE.DRIVERS)) {
      localStorage.setItem(STORE.DRIVERS, JSON.stringify([
        { 
          id: 'drv_default_1', 
          employeeId: 'VHE3000', 
          name: 'NARASIMHA MURTHY', 
          gender: 'Male', 
          phone: '', 
          joinDate: new Date().toISOString().split('T')[0], 
          status: 'Active', 
          createdAt: new Date().toISOString() 
        }
      ]));
    }
  },

  saveLocations: (locations: Location[]) => localStorage.setItem(STORE.LOC, JSON.stringify(locations)),
  saveDrivers: (drivers: Driver[]) => localStorage.setItem(STORE.DRIVERS, JSON.stringify(drivers)),
  saveTrips: (trips: Trip[]) => localStorage.setItem(STORE.TRIPS, JSON.stringify(trips)),
  saveLeaves: (leaves: Leave[]) => localStorage.setItem(STORE.LEAVES, JSON.stringify(leaves)),
  saveEmployees: (employees: PassengerDetail[]) => localStorage.setItem(STORE.EMPLOYEES, JSON.stringify(employees)),
  saveDistanceOverrides: (overrides: any[]) => localStorage.setItem(STORE.OVERRIDES, JSON.stringify(overrides)),

  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => {
    const trips = JSON.parse(localStorage.getItem(STORE.TRIPS) || '[]');
    const newTrip: Trip = {
      ...trip,
      id: `trip_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    trips.unshift(newTrip);
    localStorage.setItem(STORE.TRIPS, JSON.stringify(trips));
    return newTrip;
  },

  addLocation: (loc: Omit<Location, 'id' | 'createdAt'>) => {
    const locations = JSON.parse(localStorage.getItem(STORE.LOC) || '[]');
    const newLoc: Location = {
      ...loc,
      id: `loc_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    locations.push(newLoc);
    localStorage.setItem(STORE.LOC, JSON.stringify(locations));
    return newLoc;
  },

  deleteTrip: (id: string) => {
    const trips = JSON.parse(localStorage.getItem(STORE.TRIPS) || '[]');
    const updated = (trips as Trip[]).filter(t => t.id !== id);
    localStorage.setItem(STORE.TRIPS, JSON.stringify(updated));
  },

  deleteLeave: (id: string) => {
    const leaves = JSON.parse(localStorage.getItem(STORE.LEAVES) || '[]');
    const updated = (leaves as Leave[]).filter(l => l.id !== id);
    localStorage.setItem(STORE.LEAVES, JSON.stringify(updated));
  }
};
