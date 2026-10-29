import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import { ConfirmationModal } from '../components/common/ConfirmationModal.jsx';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export const Suppliers = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addExpense, role } = useApp();
  const [search, setSearch] = useState('');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [itemsSupplied, setItemsSupplied] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('Net 15');

  // Pay supplier modal
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Bank Transfer');

  // Delete modal
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const isOwner = role === 'Owner';
  const isManagerOrOwner = role === 'Owner' || role === 'Manager';

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = (search || '').toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.itemsSupplied?.toLowerCase().includes(q)
      );
    });
  }, [suppliers, search]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setItemsSupplied('');
    setOutstandingBalance(0);
    setPaymentTerms('Net 30');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson);
    setPhone(s.phone);
    setEmail(s.email);
    setItemsSupplied(s.itemsSupplied);
    setOutstandingBalance(s.outstandingBalance);
    setPaymentTerms(s.paymentTerms);
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingSupplier) {
      await updateSupplier({
        ...editingSupplier,
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        itemsSupplied: itemsSupplied.trim(),
        outstandingBalance: Math.max(0, Number(outstandingBalance)),
        paymentTerms,
      });
    } else {
      await addSupplier({
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        itemsSupplied: itemsSupplied.trim(),
        outstandingBalance: Math.max(0, Number(outstandingBalance)),
        paymentTerms,
      });
    }
    setIsAddEditOpen(false);
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!payingSupplier || payAmount <= 0) return;

    await addExpense({
      title: `Supplier Payout: ${payingSupplier.name}`,
      category: 'Ingredients',
      amount: Number(payAmount),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: payMethod,
      supplierId: payingSupplier.id,
      notes: `Invoice clearance for ${payingSupplier.itemsSupplied}`,
    });

    await updateSupplier({
      ...payingSupplier,
      outstandingBalance: Math.max(0, (payingSupplier.outstandingBalance || 0) - Number(payAmount)),
    });
    setPayingSupplier(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Supplier Directory &amp; Accounts</h1>
          <p className="text-xs text-[#8C6D58]">
            Manage roasters, dairy farms, cup packagers, and outstanding vendor payables
          </p>
        </div>
        {isManagerOrOwner && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-[#E29D62]" />
            <span>Add New Supplier</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, contact, or supplied goods..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-2xl border border-[#E8DFD8] p-5 shadow-xs flex flex-col justify-between hover:border-[#D5C2B4] transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#C87D32] flex items-center justify-center border border-[#EDE5DE] shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2C1810]">{supplier.name}</h3>
                    <p className="text-[11px] text-[#8C6D58]">Rep: {supplier.contactPerson}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isManagerOrOwner && (
                    <button
                      onClick={() => handleOpenEdit(supplier)}
                      className="p-1 text-[#8C6D58] hover:text-[#2C1810] rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setSupplierToDelete(supplier)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items supplied */}
              <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#F0E8E1] text-xs text-[#5C4538] mb-3">
                <span className="font-semibold text-[#2C1810] block mb-0.5">Supplies:</span>
                {supplier.itemsSupplied}
              </div>

              {/* Contact info */}
              <div className="space-y-1.5 text-xs text-[#5C4538]">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#8C6D58]" />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#8C6D58]" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#8C6D58] pt-1 border-t border-[#F5EFEB]">
                  <span>Terms: {supplier.paymentTerms}</span>
                </div>
              </div>
            </div>

            {/* Financial balance footer */}
            <div className="mt-4 pt-3 border-t border-[#F0E8E1] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8C6D58] block">Outstanding Balance</span>
                <span className="text-sm font-mono font-bold text-[#2C1810] tabular-nums">
                  {formatCurrency(supplier.outstandingBalance)}
                </span>
              </div>
              {supplier.outstandingBalance > 0 && isManagerOrOwner && (
                <button
                  onClick={() => {
                    setPayingSupplier(supplier);
                    setPayAmount(supplier.outstandingBalance);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-[#2C1810] bg-[#FAF7F2] hover:bg-[#EBE2D8] border border-[#E8DFD8] rounded-xl transition-colors"
                >
                  Pay Invoice
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8DFD8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <h3 className="text-base font-bold text-[#2C1810]">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
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
                <label className="font-bold text-[#2C1810] block mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Coorg Hill Estate Plantation"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Name"
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450..."
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@supplier.in"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Items Supplied</label>
                <input
                  type="text"
                  value={itemsSupplied}
                  onChange={(e) => setItemsSupplied(e.target.value)}
                  placeholder="e.g. Arabica Roast, Robusta, Filter Papers"
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Outstanding Balance (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Net 15 / Weekly"
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  />
                </div>
              </div>

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
                  {editingSupplier ? 'Save Updates' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Invoice Modal */}
      {payingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E8DFD8]">
            <h3 className="text-sm font-bold text-[#2C1810] mb-1">Clear Vendor Invoice</h3>
            <p className="text-xs text-[#8C6D58] mb-3">
              Paying: <strong>{payingSupplier.name}</strong> (Outstanding:{' '}
              {formatCurrency(payingSupplier.outstandingBalance)})
            </p>
            <form onSubmit={handleConfirmPay} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={payingSupplier.outstandingBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Disbursement Mode</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">Corporate UPI</option>
                  <option value="Card">Business Debit/Credit Card</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={Boolean(supplierToDelete)}
        title="Remove Supplier?"
        message={`Are you sure you want to remove "${supplierToDelete?.name}" from your vendor directory?`}
        confirmLabel="Remove"
        isDestructive={true}
        onConfirm={async () => {
          if (supplierToDelete) await deleteSupplier(supplierToDelete.id);
          setSupplierToDelete(null);
        }}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
};

export default Suppliers;
