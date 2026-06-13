import React, { useState, useMemo } from 'react';
import { Database } from '../types';
import { storage } from '../lib/storage';
import { 
  format, 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  parseISO,
  isAfter,
  subDays 
} from 'date-fns';
import { cn } from '../lib/utils';

interface DashboardProps {
  db: Database;
  onUpdate: () => void;
}

type FilterType = 'Today' | 'This Week' | 'This Month' | 'Custom';
type TabType = 'trips' | 'leaves';

export default function Dashboard({ db, onUpdate }: DashboardProps) {
  const [filter, setFilter] = useState<FilterType>('Today');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('trips');

  const filteredData = useMemo(() => {
    let trips = [...db.trips];
    let leaves = [...db.leaves];

    // Filter by Time
    const now = new Date();
    const filterFn = (dateStr: string) => {
      const date = parseISO(dateStr);
      if (filter === 'Today') return isToday(date);
      if (filter === 'This Week') return isThisWeek(date, { weekStartsOn: 1 });
      if (filter === 'This Month') return isThisMonth(date);
      return true; // Custom (all for now)
    };

    trips = trips.filter(t => filterFn(t.date));
    leaves = leaves.filter(l => filterFn(l.date));

    // Search by Driver Name or Emp ID
    if (search.trim()) {
      const s = search.toLowerCase();
      trips = trips.filter(t => 
        t.driverName.toLowerCase().includes(s) || 
        t.employeeId.toLowerCase().includes(s)
      );
      leaves = leaves.filter(l => 
        l.driverName.toLowerCase().includes(s) || 
        l.employeeId.toLowerCase().includes(s)
      );
    }

    // Sort by date/time descending
    trips.sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.startTime.localeCompare(a.startTime);
    });
    leaves.sort((a, b) => b.date.localeCompare(a.date));

    return { trips, leaves };
  }, [db, filter, search]);

  const summary = useMemo(() => {
    const trips = filteredData.trips;
    return {
      trips: trips.length,
      km: trips.reduce((sum, t) => sum + t.distanceKm, 0).toFixed(1),
      pax: trips.reduce((sum, t) => sum + t.passengers, 0),
      leaves: filteredData.leaves.length
    };
  }, [filteredData]);

  const handleDeleteTrip = (id: string) => {
    if (confirm('Delete this trip record?')) {
      storage.deleteTrip(id);
      onUpdate();
    }
  };

  const handleDeleteLeave = (id: string) => {
    if (confirm('Delete this leave record?')) {
      storage.deleteLeave(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-0">
      <div className="page-title mb-4">
        <h2>History</h2>
        <p>Review and audit past movements.</p>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        {(['Today', 'This Week', 'This Month', 'Custom'] as FilterType[]).map(f => (
          <div 
            key={f} 
            className={cn("filter-chip", filter === f && "is-active")}
            onClick={() => setFilter(f)}
          >
            {f}
          </div>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="search-bar">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input 
          type="text" 
          placeholder="Driver name or Employee ID..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* TOGGLE ROW */}
      <div className="toggle-row">
        <button 
          className={cn("toggle-btn", activeTab === 'trips' && "is-active")}
          onClick={() => setActiveTab('trips')}
        >
          Trips {activeTab === 'trips' && '●'}
        </button>
        <button 
          className={cn("toggle-btn", activeTab === 'leaves' && "is-active")}
          onClick={() => setActiveTab('leaves')}
        >
          Leaves {activeTab === 'leaves' && '●'}
        </button>
      </div>

      {/* SUMMARY STRIP */}
      <div className="summary-strip">
        <div className="summary-stat">
          <span className="summary-stat__val">{summary.trips}</span>
          <span className="summary-stat__label">Trips</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__val">{summary.km}</span>
          <span className="summary-stat__label">Km</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__val">{summary.pax}</span>
          <span className="summary-stat__label">Pax</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__val text-orange-600">{summary.leaves}</span>
          <span className="summary-stat__label">Leaves</span>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-2">
        {activeTab === 'trips' ? (
          filteredData.trips.map(trip => (
            <div key={trip.id} className="trip-card">
              <div className="trip-card__header">
                <div className={cn(
                  "trip-type-label", 
                  trip.tripType === 'Pickup' ? "trip-type-label--pickup" : "trip-type-label--drop"
                )}>
                  {trip.tripType}
                </div>
                <div className="text-right">
                  <div className="trip-time">{trip.startTime} {trip.endTime && `– ${trip.endTime}`}</div>
                  <div className="trip-date">{format(parseISO(trip.date), 'EEE d MMM')}</div>
                </div>
              </div>

              <div className="trip-route">
                <div className="trip-route__from">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black", `loc-label-${trip.fromLabel?.toLowerCase() || 'a'}`)}>
                    {trip.fromLabel || 'A'}
                  </div>
                  <span>{trip.fromName}</span>
                </div>
                <div className="trip-route__mid flex flex-col items-center">
                  <span className="font-bold">↓ {trip.distanceKm} km · {trip.durationMin} mins</span>
                  {trip.startKm !== undefined && trip.endKm !== undefined && (
                    <span className="text-[9px] font-mono text-slate-400 mt-0.5 bg-slate-50 border px-1 rounded">
                      Odo: {trip.startKm} → {trip.endKm}
                    </span>
                  )}
                </div>
                <div className="trip-route__to">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black", `loc-label-${trip.toLabel?.toLowerCase() || 'b'}`)}>
                    {trip.toLabel || 'B'}
                  </div>
                  <span>{trip.toName}</span>
                </div>
              </div>

              <div className="trip-footer mt-2 pt-2 border-t border-gray-50">
                <div className="trip-driver-info">
                  <i className="fa-solid fa-user-circle"></i>
                  <span>{trip.driverName} · {trip.employeeId} · {trip.gender} · {trip.passengers} pax</span>
                </div>
                {trip.passengerDetails && trip.passengerDetails.length > 0 && (
                  <div className="mt-2 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100 flex flex-wrap gap-x-2 gap-y-1">
                    {trip.passengerDetails.map((p, i) => (
                      <span key={i} className="text-slate-600 font-bold">
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleDeleteTrip(trip.id)}
                    className="text-red-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider mt-2"
                  >
                    <i className="fa-solid fa-trash mr-1"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredData.leaves.map(leave => (
            <div key={leave.id} className="leave-card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">🟡</span>
                  <span className="text-sm font-bold text-[var(--text)]">{leave.leaveType}</span>
                </div>
                <div className="text-[11px] font-bold text-[var(--text-muted)]">
                  {format(parseISO(leave.date), 'EEE d MMM yyyy')}
                </div>
              </div>
              <div className="text-xs font-semibold text-[var(--text-mid)] mb-1">
                {leave.driverName} · {leave.employeeId}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] italic mb-3">
                Reason: {leave.reason || 'No reason provided'}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <div className="text-[10px] font-bold text-[var(--text-muted)]">
                  Approved: {leave.approvedBy}
                </div>
                <button 
                  onClick={() => handleDeleteLeave(leave.id)}
                  className="text-red-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider"
                >
                  <i className="fa-solid fa-trash mr-1"></i> Delete
                </button>
              </div>
            </div>
          ))
        )}

        {(activeTab === 'trips' ? filteredData.trips : filteredData.leaves).length === 0 && (
          <div className="card text-center py-16 opacity-50 border-dashed">
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm font-bold">No records found</div>
            <div className="text-[10px]">Try changing filters or search query</div>
          </div>
        )}
      </div>
    </div>
  );
}
