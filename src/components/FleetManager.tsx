import React, { useState } from 'react';
import { Database, Driver, Leave } from '../types';
import { storage } from '../lib/storage';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '../lib/utils';

interface FleetManagerProps {
  db: Database;
  onUpdate: () => void;
}

export default function FleetManager({ db, onUpdate }: FleetManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [selectedDriverForLeave, setSelectedDriverForLeave] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<Partial<Driver>>({
    gender: 'Male',
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'Active'
  });
  const [leaveFormData, setLeaveFormData] = useState<Partial<Leave>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    leaveType: 'Full Day'
  });

  // Calculate Stats
  const activeDrivers = db.drivers.filter(d => d.status === 'Active').length;
  const totalTrips = db.trips.length;
  
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const leavesThisMonth = db.leaves.filter(l => 
    isWithinInterval(new Date(l.date), { start: monthStart, end: monthEnd })
  ).length;

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({
      gender: 'Male',
      joinDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'Active'
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ ...driver });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.name) {
      alert('Please fill in both Employee ID and Name');
      return;
    }

    const employeeId = formData.employeeId.trim().toUpperCase();
    
    // Check unique employee ID
    const isDuplicate = db.drivers.some(d => 
      d.employeeId === employeeId && (!editingDriver || d.id !== editingDriver.id)
    );

    if (isDuplicate) {
      alert('Employee ID already exists');
      return;
    }

    if (editingDriver) {
      const updated = db.drivers.map(d => 
        d.id === editingDriver.id ? { ...d, ...formData, employeeId } as Driver : d
      );
      storage.saveDrivers(updated);
    } else {
      const drivers = [...db.drivers];
      drivers.push({
        id: `drv_${Date.now()}`,
        employeeId,
        name: formData.name.trim(),
        gender: formData.gender as any,
        phone: formData.phone?.trim() || '',
        joinDate: formData.joinDate!,
        status: formData.status as any || 'Active',
        createdAt: new Date().toISOString()
      });
      storage.saveDrivers(drivers);
    }

    setIsFormOpen(false);
    onUpdate();
    
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerText = editingDriver ? "Driver details updated!" : "Driver onboarded!";
      toast.classList.add('is-show', 'is-success');
      setTimeout(() => toast.classList.remove('is-show', 'is-success'), 3000);
    }
  };

  const handleOpenLeave = (driver: Driver) => {
    setSelectedDriverForLeave(driver);
    setLeaveFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      leaveType: 'Sick Leave',
      reason: '',
      approvedBy: 'Manager'
    });
    setIsLeaveModalOpen(true);
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverForLeave || !leaveFormData.date) return;

    const leaves = [...db.leaves];
    leaves.push({
      id: `leaf_${Date.now()}`,
      driverId: selectedDriverForLeave.id,
      driverName: selectedDriverForLeave.name,
      employeeId: selectedDriverForLeave.employeeId,
      leaveType: leaveFormData.leaveType!,
      date: leaveFormData.date!,
      reason: leaveFormData.reason || '',
      approvedBy: leaveFormData.approvedBy || 'Manager',
      createdAt: new Date().toISOString()
    });
    storage.saveLeaves(leaves);

    setIsLeaveModalOpen(false);
    onUpdate();

    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerText = "Leave logged for " + selectedDriverForLeave.name;
      toast.classList.add('is-show', 'is-success');
      setTimeout(() => toast.classList.remove('is-show', 'is-success'), 3000);
    }
  };

  const handleDeleteDriver = (id: string) => {
    const drv = db.drivers.find(d => d.id === id);
    if (!drv) return;
    
    if (window.confirm(`Delete driver ${drv.name}? All records will be removed, but trip history is preserved.`)) {
      const updated = db.drivers.filter(d => d.id !== id);
      storage.saveDrivers(updated);
      onUpdate();

      const toast = document.getElementById('toast');
      if (toast) {
        toast.innerText = "Driver deleted successfully";
        toast.classList.add('is-show', 'is-success');
        setTimeout(() => toast.classList.remove('is-show', 'is-success'), 3000);
      }
    }
  };

  const getDriverStats = (driverId: string) => {
    const trips = db.trips.filter(t => t.driverId === driverId);
    const leaves = db.leaves.filter(l => l.driverId === driverId);
    return {
      trips: trips.length,
      km: trips.reduce((sum, t) => sum + t.distanceKm, 0).toFixed(1),
      leaves: leaves.length
    };
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="page-title-row">
        <div className="page-title">
          <h2>Drivers</h2>
          <p>Fleet management and duty roster.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm rounded-full">
           <i className="fa-solid fa-plus"></i> Add Driver
        </button>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card !mb-0 p-3 text-center">
          <div className="text-xl font-black text-[var(--primary)]">{activeDrivers}</div>
          <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Active</div>
        </div>
        <div className="card !mb-0 p-3 text-center">
          <div className="text-xl font-black text-[var(--primary)]">{totalTrips}</div>
          <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Total Trips</div>
        </div>
        <div className="card !mb-0 p-3 text-center border-orange-200 bg-orange-50/30">
          <div className="text-xl font-black text-orange-600">{leavesThisMonth}</div>
          <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Leaves ({format(new Date(), 'MMM')})</div>
        </div>
      </div>

      {/* DRIVER LIST */}
      <div className="space-y-1">
        {db.drivers.map(driver => {
          const stats = getDriverStats(driver.id);
          return (
            <div key={driver.id} className="driver-card">
              <div className="driver-card__top">
                <div className="driver-avatar">{driver.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="driver-name">{driver.name}</div>
                    <div className={cn("badge badge-sm", driver.status === 'Active' ? "badge-success" : "badge-danger")}>
                      {driver.status} {driver.status === 'Active' && <i className="fa-solid fa-check ml-1"></i>}
                    </div>
                  </div>
                  <div className="driver-meta">
                    {driver.employeeId} · {driver.gender} · {driver.phone || 'No Phone'}
                  </div>
                  <div className="driver-meta">
                    Joined {format(new Date(driver.joinDate), 'd MMM yyyy')}
                  </div>
                </div>
              </div>
              
              <div className="driver-stats">
                <div className="driver-stat">
                  <span className="driver-stat__val">{stats.trips}</span>
                  <span className="driver-stat__label">Trips</span>
                </div>
                <div className="driver-stat">
                  <span className="driver-stat__val">{stats.km}</span>
                  <span className="driver-stat__label">Km</span>
                </div>
                <div className="driver-stat">
                  <span className="driver-stat__val">{stats.leaves}</span>
                  <span className="driver-stat__label">Leaves</span>
                </div>
              </div>

              <div className="driver-actions">
                <button onClick={() => handleOpenLeave(driver)} className="btn btn-outline-primary btn-sm rounded-full">
                  <i className="fa-solid fa-calendar-minus mr-1"></i> Log Leave
                </button>
                <button onClick={() => alert('View History for ' + driver.name)} className="btn btn-ghost btn-sm rounded-full">
                  <i className="fa-solid fa-clock-rotate-left mr-1"></i> History
                </button>
                <button onClick={() => handleOpenEdit(driver)} className="btn btn-ghost btn-sm rounded-full">
                  <i className="fa-solid fa-pen mr-1"></i> Edit
                </button>
                <button onClick={() => handleDeleteDriver(driver.id)} className="btn btn-ghost btn-sm rounded-full text-red-500 hover:bg-red-50">
                  <i className="fa-solid fa-trash mr-1"></i> Del
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD/EDIT MODAL */}
      {isFormOpen && (
        <div className="modal-overlay is-open" onClick={() => setIsFormOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">{editingDriver ? 'Edit Driver' : 'Onboard New Driver'}</div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-field">
                <label className="form-label">Employee ID *</label>
                <input 
                  type="text" required className="form-input uppercase" placeholder="e.g. VH-DRV01"
                  value={formData.employeeId || ''} 
                  onChange={e => setFormData({...formData, employeeId: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" required className="form-input" placeholder="e.g. Rajesh Kumar"
                  value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">Gender *</label>
                  <select 
                    className="form-select"
                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="tel" className="form-input" placeholder="10-digit mobile"
                    value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">Join Date</label>
                  <input 
                    type="date" className="form-input"
                    value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE MODAL */}
      {isLeaveModalOpen && selectedDriverForLeave && (
        <div className="modal-overlay is-open" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">Log Leave: {selectedDriverForLeave.name}</div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="form-field">
                <label className="form-label">Driver</label>
                <div className="form-input bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed">
                  {selectedDriverForLeave.name} ({selectedDriverForLeave.employeeId})
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Leave Date *</label>
                <input 
                  type="date" required className="form-input"
                  value={leaveFormData.date || format(new Date(), 'yyyy-MM-dd')} onChange={e => setLeaveFormData({...leaveFormData, date: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Leave Type *</label>
                <select 
                  className="form-select"
                  value={leaveFormData.leaveType} onChange={e => setLeaveFormData({...leaveFormData, leaveType: e.target.value})}
                >
                  <option value="Weekly Off">Weekly Off</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Public Holiday">Public Holiday</option>
                  <option value="Comp Off">Comp Off</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Reason</label>
                <textarea 
                  rows={2} className="form-textarea" placeholder="e.g. Personal matter, out of station..."
                  value={leaveFormData.reason || ''} onChange={e => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Approved By</label>
                <input 
                  type="text" className="form-input"
                  value={leaveFormData.approvedBy || 'Manager'} onChange={e => setLeaveFormData({...leaveFormData, approvedBy: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="btn btn-ghost flex-1">Dismiss</button>
                <button type="submit" className="btn btn-success flex-1">Log Leave</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
