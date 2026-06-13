import React, { useState, useEffect } from 'react';
import { Database, Trip } from '../types';
import { storage } from '../lib/storage';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface TripTrackerProps {
  db: Database;
  onUpdate: () => void;
}

export default function TripTracker({ db, onUpdate }: TripTrackerProps) {
  const [tripType, setTripType] = useState<'Pickup' | 'Drop'>('Pickup');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Auto-select NARASIMHA MURTHY or first driver
  useEffect(() => {
    if (!selectedDriverId && db.drivers.length > 0) {
      const narasimha = db.drivers.find(d => d.name.toUpperCase().includes('NARASIMHA MURTHY'));
      if (narasimha) {
        setSelectedDriverId(narasimha.id);
      } else if (db.drivers.length === 1) {
        setSelectedDriverId(db.drivers[0].id);
      }
    }
  }, [db.drivers, selectedDriverId]);

  const [fromLocId, setFromLocId] = useState('');
  const [toLocId, setToLocId] = useState('');
  
  const [lastTrip, setLastTrip] = useState<{ fromId: string; toId: string } | null>(null);

  const handleTripTypeChange = (type: 'Pickup' | 'Drop') => {
    setTripType(type);
    const office = db.locations.find(l => l.id === 'loc_default_a');
    const metro = db.locations.find(l => l.id === 'loc_default_b');
    if (office && metro) {
      if (type === 'Pickup') {
        setFromLocId(office.id);
        setToLocId(metro.id);
      } else {
        setFromLocId(metro.id);
        setToLocId(office.id);
      }
    }
  };

  const handleReturnTrip = () => {
    if (!lastTrip) return;
    setFromLocId(lastTrip.fromId);
    setToLocId(lastTrip.toId);
    const newType = tripType === 'Pickup' ? 'Drop' : 'Pickup';
    setTripType(newType);
    setStartTime(format(new Date(), 'HH:mm'));
    
    // Smooth scroll to top to see driver/time
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [paxCount, setPaxCount] = useState(0);
  const [passengerList, setPassengerList] = useState<any[]>([]);
  const [pName, setPName] = useState('');
  const [pId, setPId] = useState('');
  const [pDept, setPDept] = useState('Admin');
  const [pGender, setPGender] = useState<'M' | 'F'>('M');

  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [idSuggestions, setIdSuggestions] = useState<any[]>([]);

  const handleNameChange = (val: string) => {
    setPName(val);
    if (val.length >= 3) {
      const matches = (db.employees || []).filter(e => 
        e.name.toLowerCase().startsWith(val.toLowerCase())
      );
      setNameSuggestions(matches.slice(0, 5));
    } else {
      setNameSuggestions([]);
    }
  };

  const handleIdChange = (val: string) => {
    setPId(val);
    if (val.length >= 3) {
      const matches = (db.employees || []).filter(e => 
        e.id.toLowerCase().startsWith(val.toLowerCase())
      );
      setIdSuggestions(matches.slice(0, 5));
    } else {
      setIdSuggestions([]);
    }
  };

  const selectEmployee = (emp: any) => {
    setPName(emp.name);
    setPId(emp.id);
    setPDept(emp.department);
    setPGender(emp.gender);
    setNameSuggestions([]);
    setIdSuggestions([]);
  };

  const addPassenger = () => {
    if (!pName || !pId) return;
    const newPax = {
      id: pId.toUpperCase(),
      name: pName,
      department: pDept,
      gender: pGender
    };

    // Update employees registry
    const existingIndex = (db.employees || []).findIndex(e => e.id === newPax.id);
    if (existingIndex === -1) {
      const updatedEmployees = [...(db.employees || []), newPax];
      storage.saveEmployees(updatedEmployees);
      onUpdate();
    }

    setPassengerList([...passengerList, newPax]);
    setPaxCount(prev => prev + 1);
    setPName('');
    setPId('');
    setNameSuggestions([]);
    setIdSuggestions([]);
  };

  const removePassenger = (index: number) => {
    const newList = [...passengerList];
    newList.splice(index, 1);
    setPassengerList(newList);
    setPaxCount(prev => Math.max(0, prev - 1));
  };
  const [purpose, setPurpose] = useState('Office Commute');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('—');
  const [tripDate, setTripDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualKm, setManualKm] = useState('');
  const [autoKm, setAutoKm] = useState('');
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newPointName, setNewPointName] = useState('');
  const [newPointKm, setNewPointKm] = useState('');

  // Auto-calculate distance when odometer/kilometer readings change
  useEffect(() => {
    if (startKm !== '' && endKm !== '') {
      const s = parseFloat(startKm);
      const e = parseFloat(endKm);
      if (!isNaN(s) && !isNaN(e)) {
        const diff = e - s;
        if (diff >= 0) {
          setManualKm(diff.toFixed(1));
        }
      }
    } else {
      // Fall back to the default route distance if one or both is empty
      setManualKm(autoKm);
    }
  }, [startKm, endKm, autoKm]);

  const handleAddLocation = () => {
    if (!newPointName) return;
    const loc = storage.addLocation({
      name: newPointName,
      label: newPointName.charAt(0).toUpperCase(),
      shortName: newPointName,
      address: '',
      type: 'other',
      isDefault: false,
      isActive: true,
      distanceFromA: Number(newPointKm) || 0,
    });
    onUpdate();
    setShowAddPoint(false);
    setNewPointName('');
    setNewPointKm('');
    // Auto-select the new location
    setToLocId(loc.id);
  };

  const selectedDriver = db.drivers.find(d => d.id === selectedDriverId);
  const fromLoc = db.locations.find(l => l.id === fromLocId);
  const toLoc = db.locations.find(l => l.id === toLocId);

  // Auto-distance calc when locations change
  useEffect(() => {
    let computedKm = '';
    if (fromLoc && toLoc) {
      // 1. Check for directional override
      const override = (db.distanceOverrides || []).find(ov => ov.fromId === fromLocId && ov.toId === toLocId);
      
      if (override) {
        computedKm = override.distance.toFixed(1);
      } else {
        // 2. Fallback to relative distance from Point A
        computedKm = Math.abs(fromLoc.distanceFromA - toLoc.distanceFromA).toFixed(1);
      }
    }

    setAutoKm(computedKm);

    // Only set manualKm if we do NOT have valid start/end odometer readings
    const s = parseFloat(startKm);
    const e = parseFloat(endKm);
    const hasValidOdo = startKm !== '' && endKm !== '' && !isNaN(s) && !isNaN(e) && (e - s) >= 0;

    if (!hasValidOdo) {
      setManualKm(computedKm);
    }
  }, [fromLocId, toLocId, db.locations, db.distanceOverrides, startKm, endKm]);

  const saveKmToLocation = () => {
    if (!fromLoc || !toLoc || !manualKm) return;
    const kmValue = parseFloat(manualKm);
    if (isNaN(kmValue)) return;

    // Save as directional override
    const current = db.distanceOverrides || [];
    const existingIdx = current.findIndex(ov => ov.fromId === fromLoc.id && ov.toId === toLoc.id);
    
    let updated;
    if (existingIdx > -1) {
      updated = current.map((ov, idx) => idx === existingIdx ? { ...ov, distance: kmValue } : ov);
    } else {
      updated = [...current, { fromId: fromLoc.id, toId: toLoc.id, distance: kmValue }];
    }

    storage.saveDistanceOverrides(updated);
    onUpdate();
    setAutoKm(manualKm);
    
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerText = `Distance for ${fromLoc.shortName || fromLoc.name} → ${toLoc.shortName || toLoc.name} updated!`;
      toast.classList.add('is-show', 'is-success');
      setTimeout(() => toast.classList.remove('is-show', 'is-success'), 3000);
    }
  };

  const handleEndTripNow = () => {
    setEndTime(format(new Date(), 'HH:mm'));
  };

  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 1440; // Handle 24h wrap
      setDuration(`${mins} min`);
    } else {
      setDuration('—');
    }
  }, [startTime, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !fromLoc || !toLoc) {
      alert('Please fill in all mandatory fields');
      return;
    }

    const finalEndTime = endTime || format(new Date(), 'HH:mm');

    storage.addTrip({
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      employeeId: selectedDriver.employeeId,
      gender: selectedDriver.gender,
      tripType: tripType,
      fromLocationId: fromLoc.id,
      toLocationId: toLoc.id,
      fromName: fromLoc.name,
      toName: toLoc.name,
      fromAddress: fromLoc.address,
      toAddress: toLoc.address,
      fromLabel: fromLoc.label,
      toLabel: toLoc.label,
      passengers: paxCount,
      passengerDetails: passengerList,
      distanceKm: Number(manualKm) || 0,
      startKm: startKm ? parseFloat(startKm) : undefined,
      endKm: endKm ? parseFloat(endKm) : undefined,
      date: tripDate,
      startTime,
      endTime: finalEndTime,
      durationMin: parseInt(duration) || 15,
      purpose,
      notes,
    });

    onUpdate();
    setLastTrip({ fromId: toLoc.id, toId: fromLoc.id });

    // Auto swap route for next trip AFTER saving
    const oldFrom = fromLocId;
    setFromLocId(toLocId);
    setToLocId(oldFrom);
    setTripType(prev => prev === 'Pickup' ? 'Drop' : 'Pickup');
    
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerText = "Trip logged successfully!";
      toast.classList.add('is-show', 'is-success');
      setTimeout(() => {
        toast.classList.remove('is-show', 'is-success');
      }, 3000);
    }

    // Partial reset
    setEndTime('');
    setDuration('—');
    setPassengerList([]);
    setPaxCount(0);
    setStartKm(endKm); // Auto-carry over ending kilometer to starting kilometer of next trip
    setEndKm('');
  };

  const swapRoute = () => {
    const oldFrom = fromLocId;
    setFromLocId(toLocId);
    setToLocId(oldFrom);
    setTripType(tripType === 'Pickup' ? 'Drop' : 'Pickup');
  };

  const stepPax = (val: number) => {
    setPaxCount(prev => Math.max(1, Math.min(50, prev + val)));
  };

  return (
    <div className="space-y-4">
      {/* DRIVER SELECTOR */}
      <div className="card">
        <div className="card-header">
          <i className="fa-solid fa-id-card"></i> Driver
        </div>

        <div className="form-field">
          <label className="form-label">Select Driver *</label>
          <select 
            className="form-select"
            value={selectedDriverId}
            onChange={e => setSelectedDriverId(e.target.value)}
          >
            <option value="">— Choose driver —</option>
            {db.drivers.filter(d => d.status === 'Active').map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.employeeId})</option>
            ))}
          </select>
        </div>

        {selectedDriver && (
          <div className="driver-strip">
            <div className="driver-strip__avatar">{selectedDriver.name.charAt(0)}</div>
            <div className="driver-strip__info">
              <div className="driver-strip__name">{selectedDriver.name}</div>
              <div className="driver-strip__meta">{selectedDriver.employeeId} · {selectedDriver.gender}</div>
            </div>
            <span className="badge badge-success">Active</span>
          </div>
        )}
      </div>

      {/* DATE + TIME */}
      <div className="card">
        <div className="card-header">
          <i className="fa-solid fa-calendar-day"></i>
          Date &amp; Time
        </div>
        <div className="form-row-2">
          <div className="form-field">
            <label className="form-label">Date *</label>
            <input 
              type="date" className="form-input" 
              value={tripDate} onChange={e => setTripDate(e.target.value)} 
            />
          </div>
          <div className="form-field">
            <label className="form-label">Start Time *</label>
            <input 
              type="time" className="form-input" 
              value={startTime} onChange={e => setStartTime(e.target.value)} 
            />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-field">
            <label className="form-label flex items-center gap-1">
              <i className="fa-solid fa-gauge-high text-emerald-600 text-[10px]"></i>
              <span>Start Kilometer</span>
            </label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="e.g. 10240.0" 
              step="0.1"
              value={startKm} 
              onChange={e => setStartKm(e.target.value)} 
            />
          </div>
          <div className="form-field">
            <label className="form-label flex items-center gap-1">
              <i className="fa-solid fa-gauge text-indigo-600 text-[10px]"></i>
              <span>End Kilometer</span>
            </label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="e.g. 10255.4" 
              step="0.1"
              value={endKm} 
              onChange={e => setEndKm(e.target.value)} 
            />
          </div>
        </div>

        {startKm !== '' && endKm !== '' && (() => {
          const s = parseFloat(startKm);
          const e = parseFloat(endKm);
          if (!isNaN(s) && !isNaN(e)) {
            const diff = e - s;
            if (diff >= 0) {
              return (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5 mb-3 mx-1 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-calculator text-emerald-600"></i>
                  <span>Calculated Distance: <strong className="font-extrabold text-[#10b981]">{diff.toFixed(1)} km</strong></span>
                </div>
              );
            } else {
              return (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2.5 mb-3 mx-1 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-rose-500"></i>
                  <span>End Km is less than Start Km</span>
                </div>
              );
            }
          }
          return null;
        })()}

        <div className="form-row-2">
          <div className="form-field">
            <label className="form-label">End Time</label>
            <div className="flex gap-2">
              <input 
                type="time" className="form-input flex-1" 
                value={endTime} onChange={e => setEndTime(e.target.value)} 
              />
              <button 
                className="btn btn-primary px-3 text-[10px] font-black uppercase whitespace-nowrap"
                onClick={handleEndTripNow}
                title="End trip at current time"
              >
                End Now
              </button>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Duration</label>
            <div className="form-input form-static">{duration}</div>
          </div>
        </div>
      </div>

      {/* ROUTE SELECTOR */}
      <div className="card">
        <div className="card-header">
          <i className="fa-solid fa-route"></i> Route
        </div>

        <div className="form-field">
          <label className="form-label">Trip Type *</label>
          <div className="trip-type-row">
            <button 
              className={cn("trip-type-btn", tripType === 'Pickup' && "is-active")}
              onClick={() => handleTripTypeChange('Pickup')}
            >
              <i className="fa-solid fa-arrow-right-to-bracket"></i>
              <span>Pickup</span>
              <small>Fetch employees</small>
            </button>
            <button 
              className={cn("trip-type-btn", tripType === 'Drop' && "is-active")}
              onClick={() => handleTripTypeChange('Drop')}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              <span>Drop</span>
              <small>Drop employees</small>
            </button>
          </div>
        </div>

        <div className="form-field">
          <div className="flex justify-between items-center mb-1">
            <label className="form-label mb-0">From *</label>
            <button 
              className="text-[10px] text-[var(--primary)] font-bold uppercase"
              onClick={() => setShowAddPoint(true)}
            >
              + Add Point
            </button>
          </div>
          <select 
            className="form-select"
            value={fromLocId}
            onChange={e => setFromLocId(e.target.value)}
          >
            <option value="">— Select Origin —</option>
            {db.locations.filter(l => l.isActive).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="route-connector">
          <div className="route-connector__line"></div>
          <div className="route-connector__km !flex-col !h-auto py-2">
            <label className="text-[9px] uppercase font-black text-slate-400 mb-1">Km</label>
            <div className="flex flex-col items-center gap-1">
              <input 
                type="number" 
                step="0.1"
                className="w-16 bg-white border-none text-center font-black text-sm p-1 rounded shadow-sm focus:ring-1 focus:ring-[var(--primary)]"
                value={manualKm}
                onChange={e => setManualKm(e.target.value)}
              />
              {manualKm !== autoKm && (
                <button 
                  onClick={saveKmToLocation}
                  className="text-[8px] font-black text-blue-500 hover:underline underline-offset-2 uppercase tracking-tighter"
                >
                  Save as Default
                </button>
              )}
            </div>
          </div>
          <div className="route-connector__line"></div>
        </div>

        <div className="form-field">
          <div className="flex justify-between items-center mb-1">
            <label className="form-label mb-0">To *</label>
            <button 
              className="text-[10px] text-[var(--primary)] font-bold uppercase"
              onClick={() => setShowAddPoint(true)}
            >
              + Add Point
            </button>
          </div>
          <select 
            className="form-select"
            value={toLocId}
            onChange={e => setToLocId(e.target.value)}
          >
            <option value="">— Select Destination —</option>
            {db.locations.filter(l => l.isActive).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {showAddPoint && (
          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Remember New Destination</div>
            <div className="space-y-2">
              <input 
                className="form-input text-xs !py-2"
                placeholder="Destination Name (e.g. Marathahalli)"
                value={newPointName}
                onChange={e => setNewPointName(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="number"
                  className="form-input text-xs !py-2 flex-1"
                  placeholder="Km from Office"
                  value={newPointKm}
                  onChange={e => setNewPointKm(e.target.value)}
                />
                <button 
                  className="btn btn-primary text-xs px-4"
                  onClick={handleAddLocation}
                >
                  Save
                </button>
                <button 
                  className="btn btn-ghost text-xs"
                  onClick={() => setShowAddPoint(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {(fromLoc || toLoc) && (
          <div className="route-preview">
            {fromLoc && (
              <div className="route-preview__point">
                <span className="rdot rdot-a">{fromLoc.label}</span>
                <div className="route-preview__text">
                  <strong>{fromLoc.name}</strong>
                  <small>{fromLoc.address}</small>
                </div>
              </div>
            )}
            <div className="route-preview__arrow">↓ {manualKm || '—'} km</div>
            {toLoc && (
              <div className="route-preview__point">
                <span className="rdot rdot-b">{toLoc.label}</span>
                <div className="route-preview__text">
                  <strong>{toLoc.name}</strong>
                  <small>{toLoc.address}</small>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASSENGER ENTRY */}
      <div className="card">
        <div className="card-header">
          <i className="fa-solid fa-user-plus"></i> Passenger Entry
        </div>
        
        <div className="space-y-3 mt-2">
          <div className="form-row-2">
            <div className="form-field relative">
              <label className="form-label text-[10px]">Employee Name</label>
              <input 
                className="form-input !py-2 text-xs" 
                placeholder="Ex: Arun Poovaiah"
                value={pName}
                onChange={e => handleNameChange(e.target.value)}
              />
              {nameSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                  {nameSuggestions.map(emp => (
                    <button 
                      key={emp.id}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0"
                      onClick={() => selectEmployee(emp)}
                    >
                      <div className="text-[11px] font-bold text-[var(--primary)]">{emp.name}</div>
                      <div className="text-[9px] text-gray-500">{emp.id} · {emp.department}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="form-field relative">
              <label className="form-label text-[10px]">Employee ID</label>
              <input 
                className="form-input !py-2 text-xs" 
                placeholder="Ex: AruVHE300"
                value={pId}
                onChange={e => handleIdChange(e.target.value)}
              />
              {idSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                  {idSuggestions.map(emp => (
                    <button 
                      key={emp.id}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0"
                      onClick={() => selectEmployee(emp)}
                    >
                      <div className="text-[11px] font-bold text-[var(--primary)]">{emp.id}</div>
                      <div className="text-[9px] text-gray-500">{emp.name} · {emp.department}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label text-[10px]">Department</label>
              <select 
                className="form-select !py-2 text-xs"
                value={pDept}
                onChange={e => setPDept(e.target.value)}
              >
                {['HR', 'Admin', 'Finance', 'IT', 'Medical Billing', 'Medical Coding'].map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label text-[10px]">Gender (M/F)</label>
              <select 
                className="form-select !py-2 text-xs"
                value={pGender}
                onChange={e => setPGender(e.target.value as 'M' | 'F')}
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <button 
            className="btn btn-primary btn-full !py-2 text-xs"
            onClick={addPassenger}
          >
            <i className="fa-solid fa-plus mr-2"></i> Add Person
          </button>
        </div>

        {passengerList.length > 0 && (
          <div className="mt-4 border-t pt-3 space-y-2">
            <div className="text-[10px] uppercase font-black text-gray-400">Added People</div>
            {passengerList.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs">
                <div>
                  <div className="font-bold text-[var(--primary)]">{p.name} <span className="text-gray-400 text-[10px]">({p.id})</span></div>
                  <div className="text-[10px] text-gray-500 uppercase font-medium">{p.department} · {p.gender}</div>
                </div>
                <button onClick={() => removePassenger(idx)} className="text-red-400 p-2">
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PASSENGER SUMMARY */}
      <div className="card">
        <div className="card-header">
          <i className="fa-solid fa-users"></i> Trip Occupancy
        </div>
        <div className="passenger-stepper !mt-0">
          <button className="step-btn" onClick={() => stepPax(-1)}>
            <i className="fa-solid fa-minus"></i>
          </button>
          <div className="step-display">
            <span>{paxCount}</span>
            <small>capacity confirmed</small>
          </div>
          <button className="step-btn" onClick={() => stepPax(1)}>
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
        
        {passengerList.length > 0 && (
          <div className="mt-3 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Male: {passengerList.filter(p => p.gender === 'M').length}</span>
            <span>Female: {passengerList.filter(p => p.gender === 'F').length}</span>
          </div>
        )}
      </div>

      {/* PURPOSE + NOTES */}
      <div className="card">
        <div className="card-header">
          <i className="fa-solid fa-note-sticky"></i> Details
        </div>
        <div className="form-field">
          <label className="form-label">Purpose</label>
          <select 
            className="form-select"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          >
            <option value="Office Commute">Office Commute</option>
            <option value="Metro Pickup">Metro Pickup</option>
            <option value="Metro Drop">Metro Drop</option>
            <option value="Client Transfer">Client Transfer</option>
            <option value="Airport Transfer">Airport Transfer</option>
            <option value="Special Duty">Special Duty</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Notes (optional)</label>
          <input 
            type="text" className="form-input" placeholder="e.g. Route diversion, extra stop..." 
            value={notes} onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* SUBMIT */}
      <div className="flex gap-3">
        <button className="btn btn-success flex-1 btn-lg" onClick={handleSubmit}>
          <i className="fa-solid fa-circle-check"></i>
          Log This Trip
        </button>
        {lastTrip && (
          <button 
            className="btn btn-outline-primary px-4" 
            onClick={handleReturnTrip}
            title="Prepare Return Trip"
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
        )}
      </div>

      {fromLocId && toLocId && (
        <button 
          className="btn btn-ghost btn-full text-[10px] font-bold uppercase tracking-widest opacity-60"
          onClick={swapRoute}
        >
          <i className="fa-solid fa-repeat mr-2"></i> Quick Swap Route
        </button>
      )}
    </div>
  );
}
