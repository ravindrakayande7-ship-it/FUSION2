import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatDate } from '../utils/formatters.js';
import {
  LogIn,
  LogOut,
  Calendar,
} from 'lucide-react';

export const Attendance = () => {
  const { staff, attendance, recordCheckIn, recordCheckOut, currentUser } = useApp();
  const todayStr = new Date().toISOString().split('T')[0];

  // Default to the current logged in user if they exist in staff list, otherwise first staff
  const defaultStaffId =
    staff.find((s) => s.email === currentUser?.email || s.name === currentUser?.name)?.id ||
    staff[0]?.id ||
    '';

  const [selectedStaffId, setSelectedStaffId] = useState(defaultStaffId);

  // Calculate stats for today
  const todaysAttendance = attendance.filter((a) => a.date === todayStr);
  const presentCount = todaysAttendance.filter((a) => a.status === 'Present').length;
  const lateCount = todaysAttendance.filter((a) => a.status === 'Late').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Daily Shift Attendance</h1>
          <p className="text-xs text-[#8C6D58]">
            Barista check-in/out stamps, working hours, and punctuality tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#8C6D58] bg-white px-3 py-1.5 rounded-xl border border-[#E8DFD8]">
          <Calendar className="w-3.5 h-3.5 text-[#C87D32]" />
          <span>Today: {formatDate(todayStr)}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <span className="text-xs text-[#8C6D58]">Total Active Staff</span>
          <div className="text-2xl font-bold text-[#2C1810] mt-1 tabular-nums">
            {staff.filter((s) => s.status === 'Active').length}
          </div>
          <span className="text-[11px] text-[#A68A78]">Rostered for shifts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <span className="text-xs text-[#8C6D58]">Present Today</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
            {presentCount}
          </div>
          <span className="text-[11px] text-emerald-600">On time arrivals</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <span className="text-xs text-[#8C6D58]">Late / Irregular</span>
          <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
            {lateCount}
          </div>
          <span className="text-[11px] text-amber-600">Checked in after 07:00 / 14:30</span>
        </div>
      </div>

      {/* Quick Punch Clock Box */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
        <h2 className="text-sm font-bold text-[#2C1810] mb-3">Register Shift Punch-In</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full sm:w-72 bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-xs text-[#2C1810]"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role} - {s.shift})
              </option>
            ))}
          </select>
          <button
            onClick={() => recordCheckIn(selectedStaffId)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5 text-[#E29D62]" />
            <span>Clock In Now</span>
          </button>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8DFD8]">
          <h2 className="text-sm font-bold text-[#2C1810]">Attendance Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD8] text-[#8C6D58] font-bold">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 font-mono">Clock In</th>
                <th className="py-3 px-4 font-mono">Clock Out</th>
                <th className="py-3 px-4 font-mono">Hours Logged</th>
                <th className="py-3 px-4">Shift Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFEB]">
              {attendance.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#2C1810]">{rec.staffName}</td>
                  <td className="py-3 px-4 text-[#5C4538]">{formatDate(rec.date)}</td>
                  <td className="py-3 px-4 font-mono text-[#2C1810] tabular-nums font-semibold">
                    {rec.checkIn}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#5C4538] tabular-nums">
                    {rec.checkOut || '— (In Progress)'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#2C1810] tabular-nums">
                    {rec.hoursWorked > 0 ? `${rec.hoursWorked} hrs` : 'Active'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        rec.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700'
                          : rec.status === 'Late'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {!rec.checkOut ? (
                      <button
                        onClick={() => recordCheckOut(rec.id)}
                        className="flex items-center gap-1 mx-auto px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Clock Out</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#A68A78]">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
