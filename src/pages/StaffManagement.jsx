import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import {
  Search,
  Plus,
  Phone,
  Mail,
  ShieldAlert,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  X,
  Clock,
} from 'lucide-react';

export const StaffManagement = () => {
  const { staff, addStaff, updateStaff, toggleStaffStatus, role } = useApp();
  const [search, setSearch] = useState('');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form
  const [name, setName] = useState('');
  const [staffRole, setStaffRole] = useState('Barista');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shift, setShift] = useState('Morning (07:00 - 15:00)');
  const [salary, setSalary] = useState(28000);
  const [showSalaryValues, setShowSalaryValues] = useState(false);

  // Authorization check: Only Owner and Manager can view salaries
  const isAuthorizedForSalary = role === 'Owner' || role === 'Manager';
  const isOwner = role === 'Owner';
  const isManagerOrOwner = role === 'Owner' || role === 'Manager';

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const q = (search || '').toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    });
  }, [staff, search]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setStaffRole('Barista');
    setPhone('+91 ');
    setEmail('');
    setShift('Morning (07:00 - 15:00)');
    setSalary(28000);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStaff(s);
    setName(s.name);
    setStaffRole(s.role);
    setPhone(s.phone);
    setEmail(s.email);
    setShift(s.shift);
    setSalary(s.monthlySalary || 25000);
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStaff) {
      await updateStaff({
        ...editingStaff,
        name: name.trim(),
        role: staffRole,
        phone: phone.trim(),
        email: email.trim(),
        shift,
        monthlySalary: Math.max(0, Number(salary)),
      });
    } else {
      await addStaff({
        name: name.trim(),
        role: staffRole,
        phone: phone.trim(),
        email: email.trim(),
        shift,
        monthlySalary: Math.max(0, Number(salary)),
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0],
      });
    }
    setIsAddEditOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Staff &amp; Employee Directory</h1>
          <p className="text-xs text-[#8C6D58]">
            Team credentials, scheduled barista shifts, contact info, and role-based permissions
          </p>
        </div>
        {isManagerOrOwner && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-[#E29D62]" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Security Disclaimer Banner */}
      {!isAuthorizedForSalary && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You are signed in with <strong>{role}</strong> role. Sensitive employee compensation data is restricted to Owner and Manager roles.
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, role, phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
        {isAuthorizedForSalary && (
          <button
            onClick={() => setShowSalaryValues(!showSalaryValues)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-[#FAF7F2] border border-[#E8DFD8] rounded-xl transition-colors"
          >
            {showSalaryValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showSalaryValues ? 'Hide Compensation' : 'Reveal Salaries'}</span>
          </button>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-2xl border border-[#E8DFD8] p-5 shadow-xs flex flex-col justify-between hover:border-[#D5C2B4] transition-all"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2C1810] text-[#E29D62] flex items-center justify-center font-bold text-sm">
                    {member.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2C1810]">{member.name}</h3>
                    <span className="font-mono text-[11px] text-[#C87D32] font-semibold">
                      {member.role}
                    </span>
                  </div>
                </div>
                {isManagerOrOwner && (
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="p-1 text-[#8C6D58] hover:text-[#2C1810] rounded-lg transition-colors"
                    title="Edit staff details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Shift and details */}
              <div className="space-y-1.5 text-xs text-[#5C4538] mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#8C6D58]" />
                  <span>{member.shift}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#8C6D58]" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#8C6D58]" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="text-[11px] text-[#8C6D58] pt-1">
                  Joined: {formatDate(member.joiningDate)}
                </div>
              </div>
            </div>

            {/* Compensation & status footer */}
            <div className="pt-3 border-t border-[#F0E8E1] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8C6D58] block">Monthly Compensation</span>
                {isAuthorizedForSalary ? (
                  <span className="font-mono font-bold text-xs text-[#2C1810] tabular-nums">
                    {showSalaryValues ? formatCurrency(member.monthlySalary) : '₹ ••••••'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Lock className="w-3 h-3" />
                    <span>Restricted</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleStaffStatus(member.id)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                  member.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {member.status}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Staff Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8DFD8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <h3 className="text-base font-bold text-[#2C1810]">
                {editingStaff ? 'Edit Staff Member' : 'Add Employee Account'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-neutral-400 hover:text-[#2C1810] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Deshmukh"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Job Role</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  >
                    <option value="Barista">Barista</option>
                    <option value="Cashier">Cashier</option>
                    {isOwner && <option value="Manager">Manager</option>}
                    {isOwner && <option value="Owner">Owner</option>}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  >
                    <option value="Morning (07:00 - 15:00)">Morning (07:00 - 15:00)</option>
                    <option value="Evening (14:30 - 22:30)">Evening (14:30 - 22:30)</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765..."
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@fusioncoffee.in"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              {isOwner && (
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min={10000}
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl"
                >
                  {editingStaff ? 'Update Employee' : 'Create Staff Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
