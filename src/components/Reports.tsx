import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Database, Trip, Leave } from '../types';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths,
  eachDayOfInterval,
  isSameDay,
  parseISO
} from 'date-fns';
import { cn } from '../lib/utils';

// --- HELPERS ---
const getDayName = (dateStr: string) => format(parseISO(dateStr), 'EEEE');
const getWeekNum = (dateStr: string) => {
  const d = parseISO(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
};
const fmtTime = (t: string) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 || 12;
  return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
};

interface ReportsProps {
  db: Database;
}

type PeriodType = 'Weekly' | 'Monthly';

export default function Reports({ db }: ReportsProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('Weekly');
  const [baseDate, setBaseDate] = useState(new Date());
  
  const chartKMRef = useRef<HTMLCanvasElement>(null);
  const chartPaxRef = useRef<HTMLCanvasElement>(null);
  const chartTypeRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<any[]>([]);

  const dateRange = useMemo(() => {
    if (periodType === 'Weekly') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = endOfWeek(baseDate, { weekStartsOn: 1 });
      return { start, end, label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}` };
    } else {
      const start = startOfMonth(baseDate);
      const end = endOfMonth(baseDate);
      return { start, end, label: format(baseDate, 'MMMM yyyy') };
    }
  }, [baseDate, periodType]);

  const filteredData = useMemo(() => {
    const trips = db.trips.filter(t => {
      const d = parseISO(t.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const leaves = db.leaves.filter(l => {
      const d = parseISO(l.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
    return { trips, leaves };
  }, [db, dateRange]);

  const kpis = useMemo(() => {
    const trips = filteredData.trips;
    const totalKm = trips.reduce((sum, t) => sum + t.distanceKm, 0);
    const pickups = trips.filter(t => t.tripType === 'Pickup').length;
    const drops = trips.filter(t => t.tripType === 'Drop').length;
    const totalPax = trips.reduce((sum, t) => sum + t.passengers, 0);
    const avgKm = trips.length > 0 ? (totalKm / trips.length).toFixed(1) : '0';

    return {
      totalKm: totalKm.toFixed(1),
      trips: trips.length,
      pax: totalPax,
      pickups,
      drops,
      avgKm
    };
  }, [filteredData]);

  const driverStats = useMemo(() => {
    const stats: Record<string, { name: string, trips: number, km: number, pax: number, leaves: number }> = {};
    
    db.drivers.forEach(d => {
      stats[d.id] = { name: d.name, trips: 0, km: 0, pax: 0, leaves: 0 };
    });

    filteredData.trips.forEach(t => {
      if (stats[t.driverId]) {
        stats[t.driverId].trips++;
        stats[t.driverId].km += t.distanceKm;
        stats[t.driverId].pax += t.passengers;
      }
    });

    filteredData.leaves.forEach(l => {
      if (stats[l.driverId]) {
        stats[l.driverId].leaves++;
      }
    });

    return Object.values(stats).filter(s => s.trips > 0 || s.leaves > 0);
  }, [db.drivers, filteredData]);

  const leaveSummary = useMemo(() => {
    const summary: Record<string, number> = {
      'Weekly Off': 0,
      'Sick Leave': 0,
      'Casual Leave': 0,
      'Emergency Leave': 0,
      'Public Holiday': 0,
      'Comp Off': 0
    };
    filteredData.leaves.forEach(l => {
      if (summary[l.leaveType] !== undefined) summary[l.leaveType]++;
    });
    return summary;
  }, [filteredData]);

  const flatTripsForView = useMemo(() => {
    const list: any[] = [];
    filteredData.trips.forEach(t => {
      if (t.passengerDetails && t.passengerDetails.length > 0) {
        t.passengerDetails.forEach((p, idx) => {
          list.push({
            id: `${t.id}-${p.id}-${idx}`,
            date: t.date,
            startTime: t.startTime,
            endTime: t.endTime,
            durationMin: t.durationMin,
            driverName: t.driverName,
            driverId: t.driverId,
            tripType: t.tripType,
            fromLabel: t.fromLabel,
            toLabel: t.toLabel,
            toName: t.toName,
            passengerName: p.name,
            passengerId: p.id,
            passengerDept: p.department,
            passengerGender: p.gender,
            distanceKm: idx === 0 ? t.distanceKm : undefined,
            startKm: idx === 0 ? t.startKm : undefined,
            endKm: idx === 0 ? t.endKm : undefined,
            isFirstPassenger: idx === 0,
            paxCountDisplay: idx === 0 ? t.passengers : '—',
            notes: t.notes,
            purpose: t.purpose,
            createdAt: t.createdAt
          });
        });
      } else {
        list.push({
          id: t.id,
          date: t.date,
          startTime: t.startTime,
          endTime: t.endTime,
          durationMin: t.durationMin,
          driverName: t.driverName,
          driverId: t.driverId,
          tripType: t.tripType,
          fromLabel: t.fromLabel,
          toLabel: t.toLabel,
          toName: t.toName,
          passengerName: t.driverName,
          passengerId: t.employeeId,
          passengerDept: '—',
          passengerGender: t.gender || '—',
          distanceKm: t.distanceKm,
          startKm: t.startKm,
          endKm: t.endKm,
          isFirstPassenger: true,
          paxCountDisplay: t.passengers,
          notes: t.notes,
          purpose: t.purpose,
          createdAt: t.createdAt
        });
      }
    });
    return list;
  }, [filteredData.trips]);

  useEffect(() => {
    // Kill old charts
    chartInstances.current.forEach(ci => ci.destroy());
    chartInstances.current = [];

    // @ts-ignore
    const Chart = window.Chart;
    if (!Chart) return;

    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const labels = days.map(d => format(d, periodType === 'Weekly' ? 'EEE d' : 'd'));

    const dailyKm = days.map(day => {
      return filteredData.trips
        .filter(t => isSameDay(parseISO(t.date), day))
        .reduce((sum, t) => sum + t.distanceKm, 0);
    });

    const dailyPax = days.map(day => {
      return filteredData.trips
        .filter(t => isSameDay(parseISO(t.date), day))
        .reduce((sum, t) => sum + t.passengers, 0);
    });

    // 1. Daily KM Bar
    if (chartKMRef.current) {
      const ci = new Chart(chartKMRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ 
            data: dailyKm, 
            backgroundColor: '#1E3A5F', 
            borderRadius: 4,
            label: 'KM'
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { display: false } } }
        }
      });
      chartInstances.current.push(ci);
    }

    // 2. Daily Pax Bar
    if (chartPaxRef.current) {
      const ci = new Chart(chartPaxRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ 
            data: dailyPax, 
            backgroundColor: '#F4A124', 
            borderRadius: 4,
            label: 'Pax'
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { display: false } } }
        }
      });
      chartInstances.current.push(ci);
    }

    // 3. Type Doughnut
    if (chartTypeRef.current) {
      const ci = new Chart(chartTypeRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Pickups', 'Drops'],
          datasets: [{
            data: [kpis.pickups, kpis.drops],
            backgroundColor: ['#1E3A5F', '#0E6B45'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { 
            legend: { 
              position: 'bottom',
              labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } }
            } 
          }
        }
      });
      chartInstances.current.push(ci);
    }

  }, [filteredData, dateRange, periodType, kpis]);

  const handleExport = (type: 'current_week' | 'current_month' | 'all') => {
    // @ts-ignore
    const XLSX = window.XLSX;
    if (!XLSX) {
      alert('Exporter library not loaded. Please wait...');
      return;
    }

    let exportTrips = [...db.trips];
    let exportLeaves = [...db.leaves];
    let fileName = `All_Data_${format(new Date(), 'yyyy-MM-dd')}`;

    if (type === 'current_week') {
      const sw = startOfWeek(new Date(), { weekStartsOn: 1 });
      const ew = endOfWeek(new Date(), { weekStartsOn: 1 });
      exportTrips = db.trips.filter(t => {
        const d = parseISO(t.date);
        return d >= sw && d <= ew;
      });
      exportLeaves = db.leaves.filter(l => {
        const d = parseISO(l.date);
        return d >= sw && d <= ew;
      });
      fileName = `Weekly_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    } else if (type === 'current_month') {
      const sm = startOfMonth(new Date());
      const em = endOfMonth(new Date());
      exportTrips = db.trips.filter(t => {
        const d = parseISO(t.date);
        return d >= sm && d <= em;
      });
      exportLeaves = db.leaves.filter(l => {
        const d = parseISO(l.date);
        return d >= sm && d <= em;
      });
      fileName = `Monthly_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    }

    const wb = XLSX.utils.book_new();
    
    // Sheet 1 — Detailed Trip Log
    const tripRows = [];
    
    let srNo = 1;
    exportTrips.forEach((t) => {
      if (t.passengerDetails && t.passengerDetails.length > 0) {
        t.passengerDetails.forEach((p, idx) => {
          const row = {
            'Sr No': srNo++,
            'Date': t.date,
            'Day': getDayName(t.date),
            'Start Time': fmtTime(t.startTime),
            'End Time': fmtTime(t.endTime),
            'Duration (min)': t.durationMin || '—',
            'Employee ID': t.employeeId,
            'Driver Name': t.driverName,
            'Gender': t.gender,
            'Trip Type': t.tripType,
            'From Location': t.fromName,
            'To Location': t.toName,
            'Distance (km)': idx === 0 ? t.distanceKm : '',
            'Start Km (Odometer)': idx === 0 && t.startKm !== undefined ? t.startKm : '',
            'End Km (Odometer)': idx === 0 && t.endKm !== undefined ? t.endKm : '',
            'Passengers': idx === 0 ? t.passengers : '',
            'Passenger Name': p.name,
            'Emp ID': p.id,
            'Dept': p.department,
            'Pax Gen': p.gender,
            'Purpose': t.purpose || '',
            'Notes': t.notes || '',
            'Week No': getWeekNum(t.date),
            'Month': format(parseISO(t.date), 'MMMM yyyy'),
            'Logged At': format(parseISO(t.createdAt), 'yyyy-MM-dd HH:mm:ss')
          };
          tripRows.push(row);
        });
      } else {
        const row = {
          'Sr No': srNo++,
          'Date': t.date,
          'Day': getDayName(t.date),
          'Start Time': fmtTime(t.startTime),
          'End Time': fmtTime(t.endTime),
          'Duration (min)': t.durationMin || '—',
          'Employee ID': t.employeeId,
          'Driver Name': t.driverName,
          'Gender': t.gender,
          'Trip Type': t.tripType,
          'From Location': t.fromName,
          'To Location': t.toName,
          'Distance (km)': t.distanceKm,
          'Start Km (Odometer)': t.startKm !== undefined ? t.startKm : '',
          'End Km (Odometer)': t.endKm !== undefined ? t.endKm : '',
          'Passengers': t.passengers,
          'Passenger Name': t.driverName, // fallback
          'Emp ID': t.employeeId,         // fallback
          'Dept': '—',
          'Pax Gen': t.gender || '—',
          'Purpose': t.purpose || '',
          'Notes': t.notes || '',
          'Week No': getWeekNum(t.date),
          'Month': format(parseISO(t.date), 'MMMM yyyy'),
          'Logged At': format(parseISO(t.createdAt), 'yyyy-MM-dd HH:mm:ss')
        };
        tripRows.push(row);
      }
    });

    // Sheet 2 — Leave Log
    const leaveRows = exportLeaves.map((l, i) => ({
      'Sr No': i + 1,
      'Date': l.date,
      'Day': getDayName(l.date),
      'Employee ID': l.employeeId,
      'Driver Name': l.driverName,
      'Leave Type': l.leaveType,
      'Reason': l.reason || '',
      'Approved By': l.approvedBy || '',
      'Logged At': format(parseISO(l.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    // Sheet 3 — Driver Summary
    const driverRows = db.drivers.map(d => {
      const dt = exportTrips.filter(t => t.driverId === d.id);
      const dl = exportLeaves.filter(l => l.driverId === d.id);
      const km = dt.reduce((s, t) => s + t.distanceKm, 0);
      const px = dt.reduce((s, t) => s + t.passengers, 0);
      return {
        'Employee ID': d.employeeId,
        'Driver Name': d.name,
        'Gender': d.gender,
        'Phone': d.phone || '',
        'Status': d.status,
        'Total Trips': dt.length,
        'Pickup Trips': dt.filter(t => t.tripType === 'Pickup').length,
        'Drop Trips': dt.filter(t => t.tripType === 'Drop').length,
        'Total Km': km.toFixed(1),
        'Total Passengers': px,
        'Avg Km/Trip': dt.length ? (km / dt.length).toFixed(1) : '0',
        'Weekly Off': dl.filter(l => l.leaveType === 'Weekly Off').length,
        'Sick Leave': dl.filter(l => l.leaveType === 'Sick Leave').length,
        'Casual Leave': dl.filter(l => l.leaveType === 'Casual Leave').length,
        'Emergency Leave': dl.filter(l => l.leaveType === 'Emergency Leave').length,
        'Total Leaves': dl.length
      };
    });

    // Sheet 4 — Report Summary
    const totalKm = exportTrips.reduce((s, t) => s + t.distanceKm, 0);
    const totalPax = exportTrips.reduce((s, t) => s + t.passengers, 0);
    const summaryRows = [
      { Metric: 'Report Type', Value: type.replace('_', ' ').toUpperCase() },
      { Metric: 'Generated On', Value: format(new Date(), 'yyyy-MM-dd HH:mm:ss') },
      { Metric: 'Total Trips', Value: exportTrips.length },
      { Metric: 'Total Distance (km)', Value: totalKm.toFixed(1) },
      { Metric: 'Total Passengers', Value: totalPax },
      { Metric: 'Pickup Trips', Value: exportTrips.filter(t => t.tripType === 'Pickup').length },
      { Metric: 'Drop Trips', Value: exportTrips.filter(t => t.tripType === 'Drop').length },
      { Metric: 'Total Leave Days', Value: exportLeaves.length },
      { Metric: 'Active Drivers', Value: db.drivers.filter(d => d.status === 'Active').length },
      { Metric: 'Company', Value: 'IndiQube Platina, Bengaluru' },
      { Metric: 'Point A', Value: 'No.15, IndiQube Platina, Commissariat Rd, Ashok Nagar, Bengaluru 560025' },
      { Metric: 'Point B', Value: 'Trinity Metro Station, MG Road, Bengaluru 560001' },
    ];

    const mkSheet = (rows: any[], name: string) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      // Set column widths
      const wscols = Array(20).fill({ wch: 18 });
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    mkSheet(tripRows, 'Detailed Trip Log');
    mkSheet(leaveRows, 'Leave Log');
    mkSheet(driverRows, 'Driver Summary');
    mkSheet(summaryRows, 'Report Summary');

    XLSX.writeFile(wb, `${fileName}.xlsx`);

    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerText = "Excel report downloaded!";
      toast.classList.add('is-show', 'is-success');
      setTimeout(() => toast.classList.remove('is-show', 'is-success'), 3000);
    }
  };

  const navNext = () => {
    if (periodType === 'Weekly') setBaseDate(addWeeks(baseDate, 1));
    else setBaseDate(addMonths(baseDate, 1));
  };
  const navPrev = () => {
    if (periodType === 'Weekly') setBaseDate(subWeeks(baseDate, 1));
    else setBaseDate(subMonths(baseDate, 1));
  };

  return (
    <div className="space-y-4">
      <div className="page-title">
        <h2>Reports</h2>
        <p>Operational analytics and compliance exports.</p>
      </div>

      {/* PERIOD TOGGLE & NAV */}
      <div className="card !mb-2">
        <div className="toggle-row !mb-3">
          <button 
            className={cn("toggle-btn", periodType === 'Weekly' && "is-active")}
            onClick={() => setPeriodType('Weekly')}
          >
            Weekly
          </button>
          <button 
            className={cn("toggle-btn", periodType === 'Monthly' && "is-active")}
            onClick={() => setPeriodType('Monthly')}
          >
            Monthly
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={navPrev} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
             <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div className="text-sm font-bold text-[var(--text)]">{dateRange.label}</div>
          <button onClick={navNext} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
             <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <i className="fa-solid fa-road kpi-icon text-blue-500"></i>
          <span className="kpi-val">{kpis.totalKm}</span>
          <span className="kpi-label">Total km</span>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-route kpi-icon text-indigo-500"></i>
          <span className="kpi-val">{kpis.trips}</span>
          <span className="kpi-label">Trips</span>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-users kpi-icon text-orange-500"></i>
          <span className="kpi-val">{kpis.pax}</span>
          <span className="kpi-label">Pax</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-val text-sm font-black">{kpis.pickups}</span>
          <span className="kpi-label">Pickups</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-val text-sm font-black">{kpis.drops}</span>
          <span className="kpi-label">Drops</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-val text-sm font-black">{kpis.avgKm} km</span>
          <span className="kpi-label">Avg/Trip</span>
        </div>
      </div>

      {/* CHARTS */}
      <div className="chart-card">
        <div className="chart-title">Daily distance (km)</div>
        <div className="h-40">
          <canvas ref={chartKMRef}></canvas>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="chart-card !mb-0">
          <div className="chart-title">Trip Split</div>
          <div className="h-40">
            <canvas ref={chartTypeRef}></canvas>
          </div>
        </div>
        <div className="chart-card !mb-0">
          <div className="chart-title">Daily Passengers</div>
          <div className="h-40">
            <canvas ref={chartPaxRef}></canvas>
          </div>
        </div>
      </div>

      {/* DRIVER TABLE */}
      <div className="report-table-container">
        <div className="px-4 py-3 bg-[var(--bg)] border-b text-[10px] font-black uppercase tracking-wider text-gray-500">
           Driver Performance Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="report-table">
            <thead>
              <tr>
                <th className="font-bold text-left align-top">Driver</th>
                <th className="font-bold text-left align-top">Trips</th>
                <th className="font-bold text-left align-top">Km</th>
                <th className="font-bold text-left align-top">Pax</th>
                <th className="font-bold text-left align-top">Leave</th>
              </tr>
            </thead>
            <tbody>
              {driverStats.map(s => (
                <tr key={s.name}>
                  <td className="font-bold text-left align-top">{s.name}</td>
                  <td className="font-bold text-left align-top">{s.trips}</td>
                  <td className="font-bold text-left align-top">{s.km.toFixed(1)}</td>
                  <td className="font-bold text-left align-top">{s.pax}</td>
                  <td className={cn("font-bold text-left align-top", s.leaves > 0 && "text-orange-600")}>{s.leaves}</td>
                </tr>
              ))}
              {driverStats.length === 0 && (
                <tr>
                   <td colSpan={5} className="text-center py-6 text-gray-400">No activity in this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* TRIP LOG TABLE */}
      <div className="report-table-container mt-6">
        <div className="px-4 py-3 bg-[var(--bg)] border-b flex justify-between items-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">
             Detailed Trip Log (Period)
          </div>
          <div className="text-[10px] font-bold text-gray-400">
            {flatTripsForView.length} entries matching filters
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="report-table">
            <thead>
              <tr>
                <th className="font-bold text-left align-top">Date</th>
                <th className="font-bold text-left align-top">Emp Name</th>
                <th className="font-bold text-left align-top">Emp ID</th>
                <th className="font-bold text-left align-top">Dept / Gen</th>
                <th className="font-bold text-left align-top">Route</th>
                <th className="font-bold text-left align-top">Time (S–E)</th>
                <th className="font-bold text-left align-top">Km</th>
                <th className="font-bold text-left align-top">Pax</th>
              </tr>
            </thead>
            <tbody>
              {flatTripsForView.map(row => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-left align-top">
                    <div className="font-bold">{format(parseISO(row.date), 'dd MMM')}</div>
                    <div className="text-[9px] text-gray-400 uppercase">{getDayName(row.date)}</div>
                  </td>
                  <td className="text-left align-top">
                    <div className="font-bold text-[var(--primary)]">{row.passengerName}</div>
                    {row.passengerId !== row.driverId && (
                      <div className="text-[8px] text-slate-400 font-medium">Driver: {row.driverName}</div>
                    )}
                  </td>
                  <td className="text-left align-top">
                    <div className="font-mono text-gray-500 text-[10px]">{row.passengerId}</div>
                  </td>
                  <td className="text-left align-top">
                    <div className="text-[9px] font-bold text-slate-500">
                      {row.passengerDept}
                    </div>
                    <div className="text-[8px] text-slate-400 uppercase">
                      {row.passengerGender}
                    </div>
                  </td>
                  <td className="text-left align-top">
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <span className="text-gray-400">{row.fromLabel}</span>
                      <i className="fa-solid fa-arrow-right text-[8px] text-slate-300"></i>
                      <span className="text-gray-700">{row.toLabel}</span>
                    </div>
                    <div className="text-[9px] text-gray-500 truncate max-w-[100px]">{row.toName}</div>
                  </td>
                  <td className="whitespace-nowrap text-left align-top">
                    <div className="font-black text-slate-700">{fmtTime(row.startTime)}</div>
                    <div className="text-[10px] font-bold text-blue-500">{row.endTime ? fmtTime(row.endTime) : '—'}</div>
                  </td>
                  <td className="text-left align-top">
                    {row.isFirstPassenger ? (
                      <>
                        <div className="font-extrabold text-slate-800">{row.distanceKm} km</div>
                        {row.startKm !== undefined && row.endKm !== undefined && (
                          <div className="text-[8px] font-mono text-slate-400 leading-tight">
                            {row.startKm}→{row.endKm}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-300 text-[10px] font-semibold">—</div>
                    )}
                  </td>
                  <td className="text-left align-top">
                    <span className="badge badge-outline text-[10px]">{row.paxCountDisplay}</span>
                  </td>
                </tr>
              ))}
              {flatTripsForView.length === 0 && (
                <tr>
                   <td colSpan={8} className="text-center py-8 text-gray-400">
                     No trips found in this time range
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEAVE SUMMARY */}
      <div className="card">
         <div className="chart-title">Leave Summary</div>
         <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
            {Object.entries(leaveSummary).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center text-[11px] border-b border-gray-50 pb-1">
                 <span className="font-semibold text-gray-600">{type}</span>
                 <span className={cn("font-black", (count as number) > 0 ? "text-orange-600" : "text-gray-300")}>{count}</span>
              </div>
            ))}
         </div>
      </div>

      {/* EXPORT SECTION */}
      <div className="export-card">
         <div className="bg-green-100 h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-file-excel text-2xl text-green-700"></i>
         </div>
         <div className="export-title text-[var(--primary)]">Export Compliance Log</div>
         <p className="export-sub">Download your data in audit-ready Microsoft Excel format.</p>
         
         <div className="export-btns">
            <button onClick={() => handleExport('current_week')} className="export-btn export-weekly">
               <i className="fa-solid fa-download"></i> Current Week Excel
            </button>
            <button onClick={() => handleExport('current_month')} className="export-btn export-monthly">
               <i className="fa-solid fa-download"></i> Current Month Excel
            </button>
            <button onClick={() => handleExport('all')} className="export-btn export-all">
               <i className="fa-solid fa-download"></i> Download All Data
            </button>
         </div>
         <div className="mt-4 text-[10px] text-gray-400 font-medium">
            <i className="fa-solid fa-shield-halved mr-1"></i> Data exports are processed locally in your browser.
         </div>
      </div>

    </div>
  );
}
