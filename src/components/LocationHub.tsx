import React, { useState } from 'react';
import { Database, Location } from '../types';
import { storage } from '../lib/storage';
import { cn } from '../lib/utils';

interface LocationHubProps {
  db: Database;
  onUpdate: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  office: '🏢',
  metro: '🚇',
  bus_stop: '🚌',
  residential: '🏘',
  hospital: '🏥',
  client: '💼',
  airport: '✈',
  other: '📍',
};

const TYPE_LABELS: Record<string, string> = {
  office: 'Office / Workplace',
  metro: 'Metro Station',
  bus_stop: 'Bus Stop',
  residential: 'Residential Area',
  hospital: 'Hospital / Clinic',
  client: 'Client Office',
  airport: 'Airport',
  other: 'Other',
};

export default function LocationHub({ db, onUpdate }: LocationHubProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [formData, setFormData] = useState<Partial<Location>>({
    type: 'office',
    distanceFromA: 0,
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingLoc(null);
    setFormData({
      type: 'office',
      distanceFromA: 0,
      isActive: true,
      label: String.fromCharCode(65 + db.locations.length),
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLoc(loc);
    setFormData({ ...loc });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      const updated = db.locations.filter(l => l.id !== id);
      storage.saveLocations(updated);
      onUpdate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) return;

    if (editingLoc) {
      const updated = db.locations.map(l => 
        l.id === editingLoc.id ? { ...l, ...formData } as Location : l
      );
      storage.saveLocations(updated);
    } else {
      storage.addLocation({
        label: formData.label || '?',
        name: formData.name!,
        shortName: formData.shortName || formData.name!,
        address: formData.address!,
        type: formData.type as any,
        isDefault: false,
        isActive: formData.isActive ?? true,
        distanceFromA: Number(formData.distanceFromA) || 0,
      });
    }

    setIsFormOpen(false);
    onUpdate();

    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerText = editingLoc ? "Location updated!" : "Location added!";
      toast.classList.add('is-show', 'is-success');
      setTimeout(() => toast.classList.remove('is-show', 'is-success'), 3000);
    }
  };

  const defaultLocs = db.locations.filter(l => l.isDefault);
  const otherLocs = db.locations.filter(l => !l.isDefault);

  return (
    <div className="space-y-4">
      <div className="page-title-row">
        <div className="page-title">
          <h2>Locations</h2>
          <p>Pickup and drop-off points management.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm rounded-full">
           <i className="fa-solid fa-plus"></i> Add Location
        </button>
      </div>

      <div className="loc-section-title">Default Locations</div>
      {defaultLocs.map(loc => (
        <div key={loc.id} className="loc-card loc-card--default">
          <div className={cn("loc-label", loc.label === 'A' ? "loc-label-a" : "loc-label-b")}>
            {loc.label}
          </div>
          <div className="loc-body">
            <div className="flex justify-between items-start">
              <div className="loc-name">{loc.name} — {TYPE_LABELS[loc.type]}</div>
              <div className="lock-badge">
                <i className="fa-solid fa-lock"></i> Default
              </div>
            </div>
            <div className="loc-address">
              {loc.address}
            </div>
            <div className="loc-meta">
              {loc.label === 'A' ? '📍 Origin point' : `${TYPE_ICONS[loc.type]} ${TYPE_LABELS[loc.type]}`} · {loc.distanceFromA} km from A
            </div>
            <div className="loc-actions">
              <button onClick={() => handleOpenEdit(loc)} className="btn btn-ghost btn-sm">Edit Details</button>
            </div>
          </div>
        </div>
      ))}

      <div className="loc-section-title">Additional Locations</div>
      {otherLocs.map((loc, idx) => {
        const labelClass = `loc-label-${String.fromCharCode(99 + idx)}`; // c, d, e...
        return (
          <div key={loc.id} className="loc-card">
            <div className={cn("loc-label", `loc-label-${loc.label.toLowerCase()}`)}>
              {loc.label}
            </div>
            <div className="loc-body">
              <div className="flex justify-between items-start">
                <div className="loc-name">{loc.name}</div>
                {!loc.isActive && <span className="badge badge-danger">Inactive</span>}
                {loc.isActive && <span className="badge badge-success">Active <i className="fa-solid fa-check ml-1"></i></span>}
              </div>
              <div className="loc-address">
                {loc.address}
              </div>
              <div className="loc-meta">
                {TYPE_ICONS[loc.type]} {TYPE_LABELS[loc.type]} · {loc.distanceFromA} km from IndiQube Platina
              </div>
              <div className="loc-actions">
                <button onClick={() => handleOpenEdit(loc)} className="btn btn-ghost btn-sm">Edit</button>
                <button onClick={() => handleDelete(loc.id)} className="btn btn-ghost btn-sm text-red-600">Delete</button>
              </div>
            </div>
          </div>
        );
      })}

      {isFormOpen && (
        <div className="modal-overlay is-open" onClick={() => setIsFormOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">{editingLoc ? 'Edit Location' : 'Add New Location'}</div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-field">
                <label className="form-label">Location Name *</label>
                <input 
                  type="text" required className="form-input" placeholder="e.g. Trinity Metro"
                  value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Short Name (max 15 chars)</label>
                <input 
                  type="text" maxLength={15} className="form-input" placeholder="e.g. Trinity"
                  value={formData.shortName || ''} onChange={e => setFormData({...formData, shortName: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Full Address *</label>
                <textarea 
                  rows={2} required className="form-textarea" placeholder="Street name, landmark..."
                  value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Location Type *</label>
                <select 
                  className="form-select"
                  value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}
                >
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Distance from Point A (km) *</label>
                <input 
                  type="number" step="0.1" required className="form-input"
                  value={formData.distanceFromA} onChange={e => setFormData({...formData, distanceFromA: Number(e.target.value)})}
                />
                <div className="form-hint">Road distance from IndiQube Platina</div>
              </div>

              <div className="form-field flex items-center gap-3">
                <label className="form-label !mb-0">Status:</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" className="sr-only peer" 
                    checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--success)]"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">{formData.isActive ? 'Active' : 'Inactive'}</span>
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
