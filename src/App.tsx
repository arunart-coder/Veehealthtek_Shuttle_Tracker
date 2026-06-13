import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { storage } from './lib/storage';
import { Database } from './types';
import Dashboard from './components/Dashboard';
import TripTracker from './components/TripTracker';
import FleetManager from './components/FleetManager';
import LocationHub from './components/LocationHub';
import Reports from './components/Reports';
import AdminPanel from './components/AdminPanel';
import { cn } from './lib/utils';

type Page = 'log' | 'locations' | 'drivers' | 'history' | 'reports' | 'admin';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('log');
  const [db, setDb] = useState<Database>(storage.getDB());
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    storage.seedIfEmpty();
    
    // One-time migration to remove old placeholders if they exist
    const currentDrivers = storage.getDB().drivers;
    const obsoleteIds = ['EMP001', 'EMP002'];
    const filtered = currentDrivers.filter(d => !obsoleteIds.includes(d.employeeId));
    
    if (filtered.length !== currentDrivers.length) {
      storage.saveDrivers(filtered);
    }

    // Correct Arun Poovaiah ID if exists
    const currentEmps = storage.getDB().employees;
    let empUpdated = false;
    const fixedEmps = currentEmps.map(e => {
      if (e.name.toLowerCase().includes('arun poovaiah') && e.id !== 'VHE300036') {
        empUpdated = true;
        return { ...e, id: 'VHE300036' };
      }
      return e;
    });
    if (empUpdated) {
      storage.saveEmployees(fixedEmps);
    }

    setDb(storage.getDB());
    
    const handleStorage = () => setDb(storage.getDB());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const refreshData = () => {
    setDb(storage.getDB());
  };

  const todayTrips = db.trips.filter(t => t.date === format(new Date(), 'yyyy-MM-dd'));
  const todayKm = todayTrips.reduce((sum, t) => sum + t.distanceKm, 0);

  return (
    <div id="app" className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* STICKY HEADER */}
      <header className="app-header">
        <div className="header-top flex justify-between items-start">
          <div className="brand flex items-center gap-3">
            <div className="brand-icon bg-[var(--primary)] text-white h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-lg">
              <i className="fa-solid fa-van-shuttle"></i>
            </div>
            <div>
              <h1 className="brand-name text-lg font-black leading-tight text-[var(--primary)]">ShuttleLog</h1>
              <p className="brand-tagline text-[10px] uppercase font-bold tracking-widest text-[#94a3b8]">IndiQube Platina Fleet</p>
            </div>
          </div>
          <div className="header-stats text-right text-[11px] font-bold text-[var(--text-muted)] leading-tight pt-1">
            Today: {todayTrips.length} trips<br />{todayKm.toFixed(1)} km
          </div>
        </div>
        <div className="header-date mt-3 pt-3 border-t border-slate-100 text-[13px] font-bold text-[var(--text-mid)]">
          {format(new Date(), 'eeee, d MMMM yyyy')}
        </div>
      </header>

      {/* TAB PANELS */}
      <main className="app-body flex-1">
        <AnimatePresence mode="wait">
          <motion.section
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activePage === 'log' && <TripTracker db={db} onUpdate={refreshData} />}
            {activePage === 'locations' && <LocationHub db={db} onUpdate={refreshData} />}
            {activePage === 'drivers' && <FleetManager db={db} onUpdate={refreshData} />}
            {activePage === 'history' && <Dashboard db={db} onUpdate={refreshData} />}
            {activePage === 'reports' && <Reports db={db} />}
            {activePage === 'admin' && <AdminPanel db={db} onUpdate={refreshData} />}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <button 
          className={cn("bnav-btn", activePage === 'log' && "is-active")}
          onClick={() => setActivePage('log')}
        >
          <i className="fa-solid fa-circle-plus"></i>
          <span>Log Trip</span>
        </button>
        <button 
          className={cn("bnav-btn", activePage === 'locations' && "is-active")}
          onClick={() => setActivePage('locations')}
        >
          <i className="fa-solid fa-map-location-dot"></i>
          <span>Locations</span>
        </button>
        <button 
          className={cn("bnav-btn", activePage === 'drivers' && "is-active")}
          onClick={() => setActivePage('drivers')}
        >
          <i className="fa-solid fa-id-badge"></i>
          <span>Drivers</span>
        </button>
        <button 
          className={cn("bnav-btn", activePage === 'history' && "is-active")}
          onClick={() => setActivePage('history')}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>History</span>
        </button>
        <button 
          className={cn("bnav-btn", activePage === 'reports' && "is-active")}
          onClick={() => setActivePage('reports')}
        >
          <i className="fa-solid fa-chart-bar"></i>
          <span>Reports</span>
        </button>
        <button 
          className={cn("bnav-btn", activePage === 'admin' && "is-active")}
          onClick={() => setActivePage('admin')}
        >
          <i className="fa-solid fa-gears"></i>
          <span>Admin</span>
        </button>
      </nav>

      {/* GLOBAL TOAST */}
      <div id="toast" className="toast"></div>

      {/* MODAL OVERLAY */}
      <div id="modal-overlay" className="modal-overlay">
        <div id="modal-box" className="modal-box"></div>
      </div>
    </div>
  );
}
