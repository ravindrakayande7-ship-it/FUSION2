import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters.js';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  X,
  Eye,
} from 'lucide-react';

export const Customers = () => {
  const { customers, orders, addCustomer } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = (search || '').toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  // Customer order history
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) =>
        (selectedCustomer.phone && o.customerPhone === selectedCustomer.phone) ||
        o.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase()
    );
  }, [orders, selectedCustomer]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addCustomer({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    setName('');
    setPhone('');
    setEmail('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Customer CRM &amp; Loyalty</h1>
          <p className="text-xs text-[#8C6D58]">
            Frequent guest profiles, beverage preferences, lifetime spending, and loyalty reward tiers
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#E29D62]" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests by name, phone number, or email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white rounded-2xl border border-[#E8DFD8] p-5 shadow-xs flex flex-col justify-between hover:border-[#D5C2B4] transition-all"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EDE5DE] text-[#C87D32] flex items-center justify-center font-bold text-sm">
                  {cust.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold font-mono">
                  <Award className="w-3 h-3 text-[#D97706]" />
                  <span>{cust.loyaltyPoints || 0} pts</span>
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#2C1810]">{cust.name}</h3>
              <div className="text-[11px] text-[#8C6D58] space-y-0.5 mt-1">
                {cust.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-[#A68A78]" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-[#A68A78]" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 p-2 bg-[#FAF7F2] rounded-xl border border-[#EDE5DE] text-[11px] text-[#5C4538] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8C6D58]">Favorite:</span>
                  <span className="font-semibold text-[#2C1810] truncate max-w-[130px]">
                    {cust.favoriteItem || 'Coffee'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C6D58]">Last Visit:</span>
                  <span>{formatDate(cust.lastVisit)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F0E8E1] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8C6D58] block">Lifetime Value</span>
                <span className="text-xs font-mono font-bold text-[#2C1810] tabular-nums">
                  {formatCurrency(cust.totalSpend || 0)} ({cust.totalOrders || 0} orders)
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(cust)}
                className="p-1.5 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#F5EFEB] rounded-lg transition-colors"
                title="View customer order history"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E8DFD8] max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#2C1810]">
                  {selectedCustomer.name}'s History
                </h3>
                <p className="text-xs text-[#8C6D58]">
                  Total Spent: {formatCurrency(selectedCustomer.totalSpend)} • Loyalty:{' '}
                  {selectedCustomer.loyaltyPoints} points
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-neutral-400 hover:text-[#2C1810] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#2C1810]">Past Café Visits &amp; Orders</h4>
              {customerOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EDE5DE] text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center font-semibold">
                    <span className="font-mono text-[#2C1810]">{ord.orderNumber}</span>
                    <span className="font-mono tabular-nums text-[#2C1810]">
                      {formatCurrency(ord.total)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8C6D58] flex justify-between">
                    <span>
                      {formatDate(ord.createdAt)} ({formatTime(ord.createdAt)})
                    </span>
                    <span className="text-emerald-700 font-semibold">{ord.status}</span>
                  </div>
                  <div className="text-[11px] text-[#5C4538] pt-1 border-t border-[#E8DFD8]">
                    {(ord.items || []).map((i) => `${i.quantity}x ${i.name} (${i.size})`).join(', ')}
                  </div>
                </div>
              ))}
              {customerOrders.length === 0 && (
                <p className="text-xs text-center py-6 text-[#8C6D58]">
                  No past orders logged for this guest yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E8DFD8]">
            <h3 className="text-base font-bold text-[#2C1810] mb-3">Register Guest Profile</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikramaditya Rao"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450..."
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@domain.com"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
