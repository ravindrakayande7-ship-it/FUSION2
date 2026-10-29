import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters.js';
import {
  Plus,
  Search,
  Download,
  Trash2,
  X,
} from 'lucide-react';

export const Expenses = () => {
  const { expenses, addExpense, deleteExpense, role } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Ingredients');
  const [amount, setAmount] = useState(1000);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');

  const isManagerOrOwner = role === 'Owner' || role === 'Manager';

  const categories = [
    'Rent',
    'Electricity',
    'Water',
    'Salary',
    'Ingredients',
    'Equipment',
    'Maintenance',
    'Packaging',
    'Marketing',
    'Other',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = categoryFilter === 'All' || e.category === categoryFilter;
      const matchSearch =
        !search ||
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [expenses, categoryFilter, search]);

  const totalExpenseAmount = filteredExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || Number(amount) <= 0) return;
    await addExpense({
      title: title.trim(),
      category,
      amount: Number(amount),
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setAmount(1000);
    setNotes('');
    setIsAddOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Expense Title', 'Category', 'Amount (INR)', 'Date', 'Payment Mode', 'Notes'];
    const rows = filteredExpenses.map((e) => [
      e.title,
      e.category,
      e.amount,
      e.date,
      e.paymentMethod,
      e.notes || '',
    ]);
    exportToCSV(`FUSION_Expenses_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Operating Expense Ledger</h1>
          <p className="text-xs text-[#8C6D58]">
            Rent, utilities, machinery maintenance, and packaging disbursements
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-white hover:bg-[#FAF7F2] border border-[#E8DFD8] rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          {isManagerOrOwner && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#E29D62]" />
              <span>Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <span className="text-xs text-[#8C6D58]">Total Operating Expenses</span>
          <div className="text-2xl font-bold text-[#2C1810] mt-1 tabular-nums">
            {formatCurrency(totalExpenseAmount)}
          </div>
          <span className="text-[11px] text-[#A68A78]">For selected filters</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <span className="text-xs text-[#8C6D58]">Top Cost Driver</span>
          <div className="text-2xl font-bold text-[#C87D32] mt-1">Store Rent</div>
          <span className="text-[11px] text-[#A68A78]">Lease commitment</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <span className="text-xs text-[#8C6D58]">Entries Recorded</span>
          <div className="text-2xl font-bold text-[#2C1810] mt-1 tabular-nums">
            {filteredExpenses.length}
          </div>
          <span className="text-[11px] text-[#A68A78]">Audited vouchers</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expense description, notes..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-[#8C6D58] shrink-0">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-1.5 text-[#2C1810]"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD8] text-[#8C6D58] font-bold">
              <tr>
                <th className="py-3 px-4">Title / Purpose</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Vendor / Notes</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFEB]">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#2C1810]">{exp.title}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] text-[#5C4538] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EDE5DE]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#5C4538]">{formatDate(exp.date)}</td>
                  <td className="py-3 px-4 font-mono text-[#5C4538]">{exp.paymentMethod}</td>
                  <td className="py-3 px-4 text-[#8C6D58] max-w-[200px] truncate">
                    {exp.notes || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#2C1810] tabular-nums">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isManagerOrOwner && (
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && (
            <div className="text-center py-12 text-xs text-[#8C6D58]">
              No expense vouchers logged for this filter.
            </div>
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8DFD8]">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <h3 className="text-base font-bold text-[#2C1810]">Record Expense Voucher</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-[#2C1810] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Title / Description *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water filtration filter cartridge replacement"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Invoice Notes / Memo</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Receipt # or voucher reference"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl"
                >
                  Record Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
