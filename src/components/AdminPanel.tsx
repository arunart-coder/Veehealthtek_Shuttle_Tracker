import React, { useState } from 'react';
import { Database, PassengerDetail, Trip, Driver } from '../types';
import { storage } from '../lib/storage';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  db: Database;
  onUpdate: () => void;
}

type AdminTab = 'employees' | 'trips' | 'locations' | 'danger';

export default function AdminPanel({ db, onUpdate }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('employees');
  const [editingEmp, setEditingEmp] = useState<PassengerDetail | null>(null);
  const [originalEmpId, setOriginalEmpId] = useState<string | null>(null);
  const [deletingEmpId, setDeletingEmpId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editingLoc, setEditingLoc] = useState<any | null>(null);
  const [deletingLocId, setDeletingLocId] = useState<string | null>(null);
  const [editingOverride, setEditingOverride] = useState<any | null>(null);
  const [deletingOverrideIdx, setDeletingOverrideIdx] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // --- BACKUP & RESTORE ---
  const handleExportData = () => {
    const dataStr = JSON.stringify(db, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shuttle_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setIsRestoring(true);
        const content = e.target?.result as string;
        if (!content) throw new Error('Empty file');
        
        const imported = JSON.parse(content);
        
        // Robust validation
        if (!imported || typeof imported !== 'object') {
          throw new Error('Invalid JSON format');
        }

        // We require at least locations or employees to consider it a valid backup for our app
        if (!Array.isArray(imported.locations) && !Array.isArray(imported.employees)) {
          throw new Error('This JSON does not appear to be a ShuttleLog backup (missing locations/employees).');
        }

        if (confirm('Importing this backup will OVERWRITE all current data. Are you sure you want to proceed?')) {
          let counts = [];
          
          // Execute saves
          if (Array.isArray(imported.locations)) {
            storage.saveLocations(imported.locations);
            counts.push(`${imported.locations.length} locations`);
          }
          if (Array.isArray(imported.employees)) {
            storage.saveEmployees(imported.employees);
            counts.push(`${imported.employees.length} employees`);
          }
          if (Array.isArray(imported.trips)) {
            storage.saveTrips(imported.trips);
            counts.push(`${imported.trips.length} trips`);
          }
          if (Array.isArray(imported.leaves)) {
            storage.saveLeaves(imported.leaves);
            counts.push(`${imported.leaves.length} leaves`);
          }
          if (Array.isArray(imported.drivers)) {
            storage.saveDrivers(imported.drivers);
            counts.push(`${imported.drivers.length} drivers`);
          }
          if (Array.isArray(imported.distanceOverrides)) {
            storage.saveDistanceOverrides(imported.distanceOverrides);
          }
          
          onUpdate();
          alert(`Backup restored successfully! \nImported: ${counts.join(', ')}. \nThe application will now reload.`);
          
          // Small delay to ensure localStorage is committed and UI state is updated before reload
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } catch (err: any) {
        console.error('Restore Error:', err);
        alert(`Error: ${err.message || 'Failed to parse backup file.'}`);
      } finally {
        setIsRestoring(false);
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      alert('Error reading file');
      setIsRestoring(false);
    };
    reader.readAsText(file);
  };

  // --- EMPLOYEE LOGIC ---
  const handleImportEmployees = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // @ts-ignore
    const XLSX = window.XLSX;
    if (!XLSX) {
      alert('XLSX library not loaded yet. Please wait, or refresh the page.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setIsImporting(true);
        const data = e.target?.result;
        if (!data) {
          throw new Error('Could not read file data.');
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const newEmployees: PassengerDetail[] = rows.map((row: any) => {
          // Robust case-insensitive key helper that strips punctuation
          const getVal = (possibleKeys: string[]): string => {
            for (const key of Object.keys(row)) {
              const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const pk of possibleKeys) {
                if (normalizedKey === pk) {
                  return row[key] !== null && row[key] !== undefined ? String(row[key]).trim() : '';
                }
              }
            }
            return '';
          };

          const empId = getVal(['employeeid', 'empid', 'id', 'passengerid', 'idnumber', 'employeeidnumber', 'emp', 'employee']);
          const name = getVal(['name', 'fullname', 'employeename', 'passengername', 'firstandlastname', 'firstlast', 'drivername']);
          const firstName = getVal(['firstname', 'first']);
          const lastName = getVal(['lastname', 'last']);
          const dept = getVal(['department', 'dept', 'deptname', 'dep', 'buid', 'bu', 'businessunit']);
          const gender = getVal(['gender', 'sex', 'gendermf', 'gendermorf', 'mf']);

          let fullName = name;
          if (!fullName && (firstName || lastName)) {
            fullName = `${firstName} ${lastName}`.trim();
          }

          return {
            id: empId.toUpperCase(),
            name: fullName,
            department: dept,
            gender: gender.toUpperCase().startsWith('F') ? 'F' : 'M'
          };
        }).filter((emp: any) => emp.id && emp.name);

        if (newEmployees.length === 0) {
          alert('No valid employees found in Excel or CSV. Make sure you have column headers like "Employee ID" and "Name".\n\nColumns matched:\n- ID: "Employee ID", "Emp ID", "ID"\n- Name: "Name", "Full Name", "Employee Name"');
          return;
        }

        // Merge with existing - overwrite duplicates by ID
        const existingMap = new Map(db.employees.map(e => [e.id.toUpperCase(), e]));
        newEmployees.forEach(e => existingMap.set(e.id.toUpperCase(), e));
        
        const mergedEmployees = Array.from(existingMap.values());
        storage.saveEmployees(mergedEmployees);
        onUpdate();
        alert(`Successfully imported/updated ${newEmployees.length} employees in the registry.`);
      } catch (err) {
        console.error(err);
        alert('Error parsing Excel file. Please ensure it is a valid .xlsx or .xls file.');
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportLocations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // @ts-ignore
    const XLSX = window.XLSX;
    if (!XLSX) {
      alert('XLSX library not loaded. Please wait...');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setIsImporting(true);
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const newLocations = rows.map((row: any) => {
          // Normalize columns
          // 1. ID
          const rawId = row['ID'] || row['Place ID'] || row['place id'] || row['id'] || row['Station ID'] || '';
          let id = String(rawId).trim().toLowerCase().replace(/\s+/g, '_');
          
          // 2. Name
          const name = String(row['Place Name'] || row['name'] || row['Name'] || row['Station Name'] || '').trim();
          
          if (!id && name) {
            // Slugify name as ID
            id = 'loc_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          }

          // 3. Short Name
          const shortName = String(row['Short Name'] || row['short_name'] || row['shortName'] || row['ShortName'] || row['Code'] || name || '').trim();

          // 4. Label
          const label = String(row['Label'] || row['label'] || shortName || '').trim().substring(0, 10);

          // 5. Distance From A
          const rawDist = row['Relative Km'] || row['Relative KM'] || row['Distance From A'] || row['distanceFromA'] || row['distance'] || row['Distance'] || row['Km'] || row['KM'] || '0';
          const distanceFromA = parseFloat(String(rawDist).replace(/[^\d.]/g, '')) || 0;

          // 6. Type
          const rawType = String(row['Type'] || row['type'] || 'bus_stop').trim().toLowerCase();
          const validTypes = ['office', 'metro', 'bus_stop', 'residential', 'hospital', 'client', 'airport', 'other'];
          const type = validTypes.includes(rawType) ? rawType : 'bus_stop';

          // 7. Address
          const address = String(row['Address'] || row['address'] || row['Addr'] || name || '').trim();

          return {
            id,
            label,
            name,
            shortName,
            address,
            type,
            isDefault: false,
            isActive: true,
            distanceFromA,
            createdAt: new Date().toISOString()
          };
        }).filter((loc: any) => loc.id && loc.name);

        if (newLocations.length === 0) {
          alert('No valid Places found in Excel. Check column headers: "Place Name", "Short Name", "Relative Km", "Type"');
          return;
        }

        const existingMap = new Map<string, any>(db.locations.map(l => [l.id, l]));
        
        newLocations.forEach(newLoc => {
          const existing = existingMap.get(newLoc.id);
          if (existing) {
            existingMap.set(newLoc.id, {
              ...existing,
              ...newLoc,
              isDefault: existing.isDefault,
              isActive: existing.isActive
            });
          } else {
            existingMap.set(newLoc.id, newLoc);
          }
        });

        const merged = Array.from(existingMap.values());
        storage.saveLocations(merged);
        onUpdate();
        alert(`Successfully imported/updated ${newLocations.length} places.`);
      } catch (err) {
        console.error(err);
        alert('Error parsing Excel file for Places: ' + (err as Error).message);
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportDistanceOverrides = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // @ts-ignore
    const XLSX = window.XLSX;
    if (!XLSX) {
      alert('XLSX library not loaded. Please wait...');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setIsImporting(true);
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const newOverrides: any[] = [];

        rows.forEach((row: any) => {
          const rawFrom = row['From ID'] || row['From Place'] || row['From'] || row['fromId'] || row['from_id'] || '';
          const rawTo = row['To ID'] || row['To Place'] || row['To'] || row['toId'] || row['to_id'] || '';
          const rawDist = row['Distance'] || row['Distance Km'] || row['distance'] || row['Km'] || row['KM'] || '0';
          const distance = parseFloat(String(rawDist).replace(/[^\d.]/g, '')) || 0;

          let fromInput = String(rawFrom).trim();
          let toInput = String(rawTo).trim();

          if (!fromInput || !toInput) return;

          // Resolve from
          let fromId = '';
          const matchFrom = db.locations.find(l => 
            l.id.toLowerCase() === fromInput.toLowerCase() ||
            l.name.toLowerCase() === fromInput.toLowerCase() ||
            l.shortName.toLowerCase() === fromInput.toLowerCase()
          );
          if (matchFrom) {
            fromId = matchFrom.id;
          } else {
            fromId = fromInput.toLowerCase().replace(/\s+/g, '_');
          }

          // Resolve to
          let toId = '';
          const matchTo = db.locations.find(l => 
            l.id.toLowerCase() === toInput.toLowerCase() ||
            l.name.toLowerCase() === toInput.toLowerCase() ||
            l.shortName.toLowerCase() === toInput.toLowerCase()
          );
          if (matchTo) {
            toId = matchTo.id;
          } else {
            toId = toInput.toLowerCase().replace(/\s+/g, '_');
          }

          newOverrides.push({
            fromId,
            toId,
            distance
          });
        });

        if (newOverrides.length === 0) {
          alert('No valid Distance Overrides found in Excel. Check column headers: "From", "To", "Distance"');
          return;
        }

        const existingList = db.distanceOverrides || [];
        const mergedList = [...existingList];

        newOverrides.forEach(newOv => {
          const matchIndex = mergedList.findIndex(ov => 
            ov.fromId.toLowerCase() === newOv.fromId.toLowerCase() &&
            ov.toId.toLowerCase() === newOv.toId.toLowerCase()
          );
          if (matchIndex > -1) {
            mergedList[matchIndex] = newOv;
          } else {
            mergedList.push(newOv);
          }
        });

        storage.saveDistanceOverrides(mergedList);
        onUpdate();
        alert(`Successfully imported/updated ${newOverrides.length} directional overrides.`);
      } catch (err) {
        console.error(err);
        alert('Error parsing Excel file for Overrides: ' + (err as Error).message);
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    
    const id = editingEmp.id.trim().toUpperCase();
    const name = editingEmp.name.trim();
    if (!id || !name) {
      alert('Please fill in both Full Name and Employee ID.');
      return;
    }

    const normalizedEmp = {
      ...editingEmp,
      id,
      name,
      department: editingEmp.department?.trim() || ''
    };

    if (originalEmpId) {
      // Editing existing
      const updated = db.employees.map(emp => emp.id === originalEmpId ? normalizedEmp : emp);
      storage.saveEmployees(updated);
    } else {
      // Adding new - check for duplicates
      const exists = db.employees.some(emp => emp.id.toUpperCase() === id);
      if (exists) {
        alert(`Employee with ID ${id} already exists!`);
        return;
      }
      const updated = [...db.employees, normalizedEmp];
      storage.saveEmployees(updated);
    }

    onUpdate();
    setEditingEmp(null);
    setOriginalEmpId(null);
  };

  const handleDeleteEmp = (id: string) => {
    const updated = db.employees.filter(emp => emp.id !== id);
    storage.saveEmployees(updated);
    onUpdate();
    setDeletingEmpId(null);
  };

  // --- TRIP LOGIC ---
  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    
    const updated = db.trips.map(t => t.id === editingTrip.id ? editingTrip : t);
    storage.saveTrips(updated);
    onUpdate();
    setEditingTrip(null);
  };

  const handleDeleteAllTrips = () => {
    if (window.confirm('DANGER: Delete ALL trip history? This cannot be undone.')) {
      storage.saveTrips([]);
      onUpdate();
    }
  };

  // --- LOCATION LOGIC ---
  const handleSaveLoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoc) return;

    const updated = db.locations.map(loc => loc.id === editingLoc.id ? editingLoc : loc);
    storage.saveLocations(updated);
    onUpdate();
    setEditingLoc(null);
  };

  const handleDeleteLoc = (id: string) => {
    const updated = db.locations.filter(loc => loc.id !== id);
    storage.saveLocations(updated);
    onUpdate();
    setDeletingLocId(null);
  };

  // --- OVERRIDE LOGIC ---
  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOverride) return;

    const current = db.distanceOverrides || [];
    let updated;
    
    if (editingOverride.isNew) {
      const { isNew, ...clean } = editingOverride;
      updated = [...current, clean];
    } else {
      updated = current.map((ov, idx) => idx === editingOverride.index ? { fromId: editingOverride.fromId, toId: editingOverride.toId, distance: editingOverride.distance } : ov);
    }
    
    storage.saveDistanceOverrides(updated);
    onUpdate();
    setEditingOverride(null);
  };

  const handleDeleteOverride = (index: number) => {
    const current = db.distanceOverrides || [];
    const updated = current.filter((_, idx) => idx !== index);
    storage.saveDistanceOverrides(updated);
    onUpdate();
    setDeletingOverrideIdx(null);
  };

  return (
    <div className="space-y-4">
      <div className="page-title">
        <h2>Admin Panel</h2>
        <p>Advanced data management and corrections.</p>
      </div>

      <div className="flex bg-white p-1 rounded-xl shadow-sm border mb-4">
        <button 
          className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'employees' ? "bg-[var(--primary)] text-white shadow-md" : "text-gray-500")}
          onClick={() => setActiveTab('employees')}
        >
          Employees
        </button>
        <button 
          className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'trips' ? "bg-[var(--primary)] text-white shadow-md" : "text-gray-500")}
          onClick={() => setActiveTab('trips')}
        >
          Trips
        </button>
        <button 
          className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'locations' ? "bg-[var(--primary)] text-white shadow-md" : "text-gray-500")}
          onClick={() => setActiveTab('locations')}
        >
          Places
        </button>
        <button 
          className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'danger' ? "bg-red-500 text-white shadow-md" : "text-gray-500")}
          onClick={() => setActiveTab('danger')}
        >
          System
        </button>
      </div>

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Registered Passengers ({db.employees.length})</div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleImportEmployees}
                  disabled={isImporting}
                />
                <button className={cn("btn btn-ghost text-[10px] h-7 px-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm", isImporting && "opacity-50")}>
                  <i className="fa-solid fa-file-import mr-1 text-emerald-600"></i> {isImporting ? 'Importing...' : 'Import XL'}
                </button>
              </div>
              <button 
                onClick={() => {
                  setEditingEmp({
                    id: '',
                    name: '',
                    department: '',
                    gender: 'M'
                  });
                  setOriginalEmpId(null);
                }}
                className="btn btn-ghost text-[10px] h-7 px-2 border border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100 shadow-sm"
              >
                <i className="fa-solid fa-plus mr-1 text-blue-600"></i> Add Passenger
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Name</th>
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Emp ID</th>
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Dept</th>
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400 text-center">Gen</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {db.employees.map(emp => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold text-[var(--primary)]">{emp.name}</td>
                    <td className="px-3 py-3 font-mono text-gray-500">{emp.id}</td>
                    <td className="px-3 py-3 text-gray-500">{emp.department}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded", emp.gender === 'F' ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600")}>
                        {emp.gender}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right space-x-2">
                       <button 
                         onClick={() => {
                           setEditingEmp(emp);
                           setOriginalEmpId(emp.id);
                         }} 
                         className="text-blue-500 hover:underline"
                        >
                          Edit
                        </button>
                       <button onClick={() => setDeletingEmpId(emp.id)} className="text-red-400 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {db.employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-400 italic">No employees registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRIPS TAB */}
      {activeTab === 'trips' && (
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Recent Trips ({db.trips.length})</div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b">
                     <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Date/Time</th>
                     <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Driver</th>
                     <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Route</th>
                     <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Pax</th>
                     <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...db.trips]
                    .sort((a, b) => {
                      const dateA = `${a.date}T${a.startTime}`;
                      const dateB = `${b.date}T${b.startTime}`;
                      return dateB.localeCompare(dateA);
                    })
                    .slice(0, 50)
                    .map(t => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-bold">{format(parseISO(t.date), 'dd MMM')}</div>
                        <div className="text-[10px] text-gray-400">{t.startTime} – {t.endTime}</div>
                      </td>
                      <td className="px-3 py-3">
                         <div className="font-bold">{t.driverName}</div>
                         <div className="text-[10px] text-gray-400">{t.employeeId}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="truncate max-w-[150px]">{t.fromName} → {t.toName}</div>
                      </td>
                      <td className="px-3 py-3 font-black text-[var(--primary)]">{t.passengers}</td>
                      <td className="px-3 py-3 text-right">
                         <button onClick={() => setEditingTrip(t)} className="text-blue-500 hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                  {db.trips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-400 italic">No trip history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LOCATIONS TAB */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {/* EXCEL UPLOAD GUIDELINES */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
            <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <i className="fa-solid fa-file-excel text-emerald-600"></i> Excel Upload Formats & Guidelines
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-[11px] leading-relaxed">
              <div className="space-y-1">
                <span className="font-bold text-slate-800">1. Places (Station / Point) Upload:</span>
                <p className="text-slate-500">
                  Provide either <span className="text-emerald-700 font-bold">xlsx/xls</span> files with columns:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">Place Name</code>: Full station name</li>
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">Short Name</code>: Abbreviated label</li>
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">Relative Km</code>: Distance in km from Office</li>
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">Type</code>: <em className="text-gray-400">office, metro, bus_stop, residential, etc.</em></li>
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">Address</code>: Optional detailed address</li>
                </ul>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800">2. Directional Distance Overrides:</span>
                <p className="text-slate-500">
                  Custom fixed point-to-point mileage calculations:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">From</code>: Starting Place ID, Name, or Short Name</li>
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">To</code>: Target Place ID, Name, or Short Name</li>
                  <li><code className="bg-white border rounded px-1 text-slate-700 font-mono">Distance</code>: Precise fixed Km value</li>
                </ul>
                <p className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded p-1 mt-1">
                  <i className="fa-solid fa-circle-question mr-1"></i> Maps names or IDs automatically to existing registry entries.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pickup & Drop Registry ({db.locations.length})</div>
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImportLocations}
                disabled={isImporting}
              />
              <button className={cn("btn btn-ghost text-[10px] h-7 px-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm", isImporting && "opacity-50")}>
                <i className="fa-solid fa-file-import mr-1 text-emerald-600"></i> {isImporting ? 'Importing...' : 'Import Places XL'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Place Name</th>
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400 text-center">Relative Km</th>
                  <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">Type</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {db.locations.map(loc => (
                  <tr key={loc.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="font-bold text-[var(--primary)]">{loc.name}</div>
                      <div className="text-[9px] text-gray-400 uppercase">{loc.id}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-600">
                      {loc.distanceFromA.toFixed(1)} km
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">
                        {loc.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right space-x-2">
                       <button onClick={() => setEditingLoc(loc)} className="text-blue-500 hover:underline">Edit</button>
                       {!loc.isDefault && (
                         <button onClick={() => setDeletingLocId(loc.id)} className="text-red-400 hover:underline">Delete</button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[10px] text-blue-600">
            <i className="fa-solid fa-circle-info mr-2"></i>
            Relative Km is the distance from <strong>{db.locations.find(l => l.id === 'loc_default_a')?.name || 'Default Office'}</strong>.
          </div>

          <div className="pt-4 space-y-3">
             <div className="flex justify-between items-center px-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Directional Distance Overrides</div>
                <div className="flex gap-2">
                   <div className="relative">
                     <input 
                       type="file" 
                       accept=".xlsx, .xls" 
                       className="absolute inset-0 opacity-0 cursor-pointer"
                       onChange={handleImportDistanceOverrides}
                       disabled={isImporting}
                     />
                     <button className={cn("btn btn-ghost text-[10px] h-7 px-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm mr-1", isImporting && "opacity-50")}>
                       <i className="fa-solid fa-file-import mr-1 text-indigo-600"></i> {isImporting ? 'Importing...' : 'Import Overrides XL'}
                     </button>
                   </div>
                   <button 
                     onClick={() => setEditingOverride({ fromId: 'loc_default_a', toId: 'loc_default_b', distance: 0, isNew: true })}
                     className="btn btn-ghost text-[10px] h-7 px-2 border border-blue-100 text-blue-600 bg-blue-50"
                   >
                     <i className="fa-solid fa-plus mr-1"></i> Add Override
                   </button>
                </div>
             </div>
             
             <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                   <thead>
                     <tr className="bg-slate-50 border-b">
                       <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400">From → To</th>
                       <th className="px-3 py-2 font-black uppercase text-[9px] text-slate-400 text-center">Fixed Km</th>
                       <th className="px-3 py-2 text-right"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {(db.distanceOverrides || []).map((ov, idx) => {
                       const from = db.locations.find(l => l.id === ov.fromId);
                       const to = db.locations.find(l => l.id === ov.toId);
                       return (
                         <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                           <td className="px-3 py-3">
                             <div className="flex items-center gap-1.5">
                               <span className="font-bold text-slate-700">{from?.shortName || from?.name || ov.fromId}</span>
                               <i className="fa-solid fa-arrow-right text-[8px] text-slate-300"></i>
                               <span className="font-bold text-slate-700">{to?.shortName || to?.name || ov.toId}</span>
                             </div>
                           </td>
                           <td className="px-3 py-3 text-center font-mono font-black text-blue-600">
                             {ov.distance.toFixed(1)} km
                           </td>
                           <td className="px-3 py-3 text-right space-x-2">
                             <button 
                               onClick={() => setEditingOverride({ ...ov, index: idx })} 
                               className="text-blue-500 hover:underline"
                             >
                               Edit
                             </button>
                             <button 
                               onClick={() => setDeletingOverrideIdx(idx)} 
                               className="text-red-400 hover:underline"
                             >
                               Delete
                             </button>
                           </td>
                         </tr>
                       );
                     })}
                     {(!db.distanceOverrides || db.distanceOverrides.length === 0) && (
                       <tr>
                         <td colSpan={3} className="px-3 py-6 text-center text-gray-400 italic text-[10px]">No overrides set. Normal relative calculation applies.</td>
                       </tr>
                     )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* SYSTEM TAB */}
      {activeTab === 'danger' && (
        <div className="space-y-4">
          <div className="card border-blue-100 bg-blue-50/30">
            <h3 className="text-blue-600 font-black uppercase tracking-widest text-[10px] mb-4">Backup & Export</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                <div>
                  <div className="text-xs font-black">Download Full Backup</div>
                  <div className="text-[10px] text-gray-400">Save all locations, employees and trips to a JSON file.</div>
                </div>
                <button 
                  onClick={handleExportData}
                  className="btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-2 px-4 shadow-sm"
                >
                  <i className="fa-solid fa-download mr-1"></i> Export JSON
                </button>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                <div>
                  <div className="text-xs font-black">Restore from Backup</div>
                  <div className="text-[10px] text-gray-400">Upload a previously exported JSON backup file.</div>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".json" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleRestoreData}
                    disabled={isRestoring}
                  />
                  <button className={cn("btn bg-white border border-blue-200 text-blue-600 text-[10px] py-2 px-4 shadow-sm", isRestoring && "opacity-50")}>
                    <i className="fa-solid fa-upload mr-1"></i> {isRestoring ? 'Restoring...' : 'Import JSON'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-red-100 bg-red-50/30">
            <h3 className="text-red-600 font-black uppercase tracking-widest text-[10px] mb-4">Dangerous Actions</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                <div>
                  <div className="text-xs font-black">Clear All Trips</div>
                  <div className="text-[10px] text-gray-400">Permanently delete all historic trip data.</div>
                </div>
                <button 
                  onClick={handleDeleteAllTrips}
                  className="btn bg-red-500 hover:bg-red-600 text-white text-[10px] py-2 px-4 shadow-sm"
                >
                  Clear Trips
                </button>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                <div>
                  <div className="text-xs font-black">Reset App Registry</div>
                  <div className="text-[10px] text-gray-400">Clear drivers, locations and employees to defaults.</div>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Reset everything? (Trips will also be cleared)')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="btn bg-slate-800 hover:bg-black text-white text-[10px] py-2 px-4 shadow-sm"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-black text-[var(--primary)] mb-4">
                {originalEmpId ? 'Edit Employee' : 'Add Passenger'}
              </h3>
              <form onSubmit={handleSaveEmp} className="space-y-4">
                <div className="form-field">
                  <label className="form-label">Full Name</label>
                  <input 
                    className="form-input"
                    value={editingEmp.name}
                    onChange={e => setEditingEmp({...editingEmp, name: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Employee ID</label>
                  <input 
                    className="form-input"
                    value={editingEmp.id}
                    onChange={e => setEditingEmp({...editingEmp, id: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Department</label>
                  <input 
                    className="form-input"
                    value={editingEmp.department}
                    onChange={e => setEditingEmp({...editingEmp, department: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-select"
                    value={editingEmp.gender}
                    onChange={e => setEditingEmp({...editingEmp, gender: e.target.value as 'M' | 'F'})}
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 btn btn-primary">
                    {originalEmpId ? 'Save Changes' : 'Add Passenger'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingEmp(null);
                      setOriginalEmpId(null);
                    }} 
                    className="flex-1 btn btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEmpId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-trash-can text-xl"></i>
            </div>
            <h3 className="text-lg font-black mb-2">Delete Employee?</h3>
            <p className="text-xs text-gray-500 mb-6">This will remove the employee from the registry permanently.</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleDeleteEmp(deletingEmpId)}
                className="btn bg-red-500 hover:bg-red-600 text-white w-full py-3 h-auto"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setDeletingEmpId(null)}
                className="btn btn-ghost w-full py-3 h-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TRIP MODAL (Limited fields for now) */}
      {editingTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-black text-[var(--primary)] mb-4">Quick Edit Trip</h3>
              <form onSubmit={handleSaveTrip} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-field">
                    <label className="form-label text-[10px]">Start Time</label>
                    <input 
                      type="time"
                      className="form-input !py-1"
                      value={editingTrip.startTime}
                      onChange={e => setEditingTrip({...editingTrip, startTime: e.target.value})}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label text-[10px]">End Time</label>
                    <input 
                      type="time"
                      className="form-input !py-1"
                      value={editingTrip.endTime}
                      onChange={e => setEditingTrip({...editingTrip, endTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-field">
                   <label className="form-label text-[10px]">Passengers Count</label>
                   <input 
                      type="number"
                      className="form-input !py-1"
                      value={editingTrip.passengers}
                      onChange={e => setEditingTrip({...editingTrip, passengers: parseInt(e.target.value) || 0})}
                   />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="form-field">
                      <label className="form-label text-[10px]">Start Km (Odometer)</label>
                      <input 
                         type="number"
                         step="0.1"
                         className="form-input !py-1"
                         placeholder="e.g. 10000.0"
                         value={editingTrip.startKm !== undefined ? editingTrip.startKm : ''}
                         onChange={e => {
                           const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                           const updatedTrip = { ...editingTrip, startKm: val };
                           if (val !== undefined && editingTrip.endKm !== undefined) {
                             const calculated = parseFloat((editingTrip.endKm - val).toFixed(1));
                             if (calculated >= 0) updatedTrip.distanceKm = calculated;
                           }
                           setEditingTrip(updatedTrip);
                         }}
                      />
                   </div>
                   <div className="form-field">
                      <label className="form-label text-[10px]">End Km (Odometer)</label>
                      <input 
                         type="number"
                         step="0.1"
                         className="form-input !py-1"
                         placeholder="e.g. 10015.0"
                         value={editingTrip.endKm !== undefined ? editingTrip.endKm : ''}
                         onChange={e => {
                           const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                           const updatedTrip = { ...editingTrip, endKm: val };
                           if (editingTrip.startKm !== undefined && val !== undefined) {
                             const calculated = parseFloat((val - editingTrip.startKm).toFixed(1));
                             if (calculated >= 0) updatedTrip.distanceKm = calculated;
                           }
                           setEditingTrip(updatedTrip);
                         }}
                      />
                   </div>
                </div>
                <div className="form-field">
                   <label className="form-label text-[10px]">Distance (Km)</label>
                   <input 
                      type="number"
                      step="0.1"
                      className="form-input !py-1"
                      value={editingTrip.distanceKm}
                      onChange={e => setEditingTrip({...editingTrip, distanceKm: parseFloat(e.target.value) || 0})}
                   />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 btn btn-primary">Save</button>
                  <button type="button" onClick={() => setEditingTrip(null)} className="flex-1 btn btn-ghost">Cancel</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* EDIT LOCATION MODAL */}
      {editingLoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-black text-[var(--primary)] mb-4">Edit Location</h3>
              <form onSubmit={handleSaveLoc} className="space-y-4">
                <div className="form-field">
                  <label className="form-label">Place Name</label>
                  <input 
                    className="form-input"
                    value={editingLoc.name}
                    onChange={e => setEditingLoc({...editingLoc, name: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Distance from Office (Km)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editingLoc.distanceFromA}
                    onChange={e => setEditingLoc({...editingLoc, distanceFromA: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 btn btn-primary">Save Changes</button>
                  <button type="button" onClick={() => setEditingLoc(null)} className="flex-1 btn btn-ghost">Cancel</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* DELETE LOCATION CONFIRMATION */}
      {deletingLocId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-map-location-dot text-xl"></i>
            </div>
            <h3 className="text-lg font-black mb-2">Delete Place?</h3>
            <p className="text-xs text-gray-500 mb-6">Remove this place from the registry?</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleDeleteLoc(deletingLocId)}
                className="btn bg-red-500 hover:bg-red-600 text-white w-full py-3 h-auto"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setDeletingLocId(null)}
                className="btn btn-ghost w-full py-3 h-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OVERRIDE MODAL */}
      {editingOverride && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-black text-[var(--primary)] mb-4">{editingOverride.isNew ? 'Add' : 'Edit'} Distance Override</h3>
              <form onSubmit={handleSaveOverride} className="space-y-4">
                <div className="form-field">
                  <label className="form-label">From Location</label>
                  <select 
                    className="form-select"
                    value={editingOverride.fromId}
                    onChange={e => setEditingOverride({...editingOverride, fromId: e.target.value})}
                  >
                    {db.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">To Location</label>
                  <select 
                    className="form-select"
                    value={editingOverride.toId}
                    onChange={e => setEditingOverride({...editingOverride, toId: e.target.value})}
                  >
                    {db.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Fixed Distance (Km)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editingOverride.distance}
                    onChange={e => setEditingOverride({...editingOverride, distance: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 btn btn-primary">Save Override</button>
                  <button type="button" onClick={() => setEditingOverride(null)} className="flex-1 btn btn-ghost">Cancel</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* DELETE OVERRIDE CONFIRMATION */}
      {deletingOverrideIdx !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-arrows-alt-h text-xl"></i>
            </div>
            <h3 className="text-lg font-black mb-2">Delete Override?</h3>
            <p className="text-xs text-gray-500 mb-6">Revert to standard relative calculation for this route?</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleDeleteOverride(deletingOverrideIdx)}
                className="btn bg-red-500 hover:bg-red-600 text-white w-full py-3 h-auto"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setDeletingOverrideIdx(null)}
                className="btn btn-ghost w-full py-3 h-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
