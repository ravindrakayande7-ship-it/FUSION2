import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters.js';
import {
  Plus,
  AlertTriangle,
  Search,
  Download,
  Edit2,
  X,
} from 'lucide-react';

export const Inventory = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    adjustStock,
    recordWastage,
    suppliers,
    role,
  } = useApp();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Coffee Beans');
  const [stock, setStock] = useState(1000);
  const [unit, setUnit] = useState('g');
  const [minThreshold, setMinThreshold] = useState(300);
  const [unitCost, setUnitCost] = useState(1.5);
  const [supplierId, setSupplierId] = useState('');
  const [expiryDate, setExpiryDate] = useState('2027-01-01');

  // Quick Adjust Modal
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState(100);
  const [adjustMode, setAdjustMode] = useState('add');
  const [adjustReason, setAdjustReason] = useState('Batch restock purchase');

  const isManagerOrOwner = role === 'Owner' || role === 'Manager';
  const categories = [
    'All',
    'Coffee Beans',
    'Dairy',
    'Plant Milk',
    'Syrups',
    'Tea',
    'Sweeteners',
    'Packaging',
    'Bakery',
  ];

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
      const matchSearch =
        !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.sku?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [inventory, categoryFilter, search]);

  const lowStockCount = inventory.filter(
    (i) => (Number(i.stock) || 0) <= (Number(i.minThreshold) || 0)
  ).length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setSku(`ING-${Math.floor(Math.random() * 900 + 100)}`);
    setCategory('Coffee Beans');
    setStock(2000);
    setUnit('g');
    setMinThreshold(500);
    setUnitCost(2.0);
    setSupplierId(suppliers[0]?.id || '');
    setExpiryDate('2027-06-30');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setCategory(item.category);
    setStock(item.stock);
    setUnit(item.unit);
    setMinThreshold(item.minThreshold);
    setUnitCost(item.unitCost);
    setSupplierId(item.supplierId || '');
    setExpiryDate(item.expiryDate || '');
    setIsAddEditModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      await updateInventoryItem({
        ...editingItem,
        name: name.trim(),
        sku: sku.trim(),
        category,
        stock: Math.max(0, Number(stock)),
        unit,
        minThreshold: Math.max(0, Number(minThreshold)),
        unitCost: Math.max(0, Number(unitCost)),
        supplierId,
        expiryDate,
      });
    } else {
      await addInventoryItem({
        name: name.trim(),
        sku: sku.trim(),
        category,
        stock: Math.max(0, Number(stock)),
        unit,
        minThreshold: Math.max(0, Number(minThreshold)),
        unitCost: Math.max(0, Number(unitCost)),
        supplierId: supplierId || suppliers[0]?.id || 'sup-1',
        expiryDate,
      });
    }
    setIsAddEditModalOpen(false);
  };

  const handleExecuteStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustItem || adjustQty <= 0) return;

    if (adjustMode === 'add') {
      await adjustStock(adjustItem.id, Number(adjustQty), adjustReason);
    } else if (adjustMode === 'waste') {
      await recordWastage(adjustItem.id, Number(adjustQty), adjustReason);
    } else {
      const diff = Number(adjustQty) - (adjustItem.stock || 0);
      await adjustStock(adjustItem.id, diff, `Audit adjustment (${adjustReason})`);
    }
    setAdjustItem(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'Ingredient Name',
      'SKU',
      'Category',
      'Current Stock',
      'Unit',
      'Min Threshold',
      'Unit Cost',
      'Total Value',
      'Status',
    ];
    const rows = filteredInventory.map((i) => [
      i.name,
      i.sku,
      i.category,
      i.stock,
      i.unit,
      i.minThreshold,
      i.unitCost,
      Math.round((i.stock || 0) * (i.unitCost || 0)),
      (i.stock || 0) <= (i.minThreshold || 0) ? 'LOW STOCK' : 'IN STOCK',
    ]);
    exportToCSV(`FUSION_Inventory_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Stock &amp; Inventory Management</h1>
          <p className="text-xs text-[#8C6D58]">
            Recipe ingredient deductions, reorder thresholds, wastage logs, and supplier tracking
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
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#E29D62]" />
              <span>Add Stock Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Alert Pill */}
      {lowStockCount > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{lowStockCount} items</strong> are at or below safety reorder threshold! Place purchase orders with suppliers to avoid stockouts.
            </span>
          </div>
          <span className="font-mono font-bold text-[11px] px-2 py-0.5 bg-rose-200/60 rounded-md">
            CRITICAL
          </span>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#2C1810] text-[#F5EFEB]'
                  : 'bg-[#FAF7F2] text-[#7A6354] hover:bg-[#F2ECE4]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock by name or SKU..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD8] text-[#8C6D58] font-bold">
              <tr>
                <th className="py-3 px-4">Ingredient / Consumable</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 font-mono">Current Stock</th>
                <th className="py-3 px-4 font-mono">Threshold</th>
                <th className="py-3 px-4 font-mono">Unit Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Quick Adjust</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFEB]">
              {filteredInventory.map((item) => {
                const isLow = (Number(item.stock) || 0) <= (Number(item.minThreshold) || 0);
                const supplier = suppliers.find((s) => s.id === item.supplierId);

                return (
                  <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#2C1810] text-sm">{item.name}</div>
                      <div className="text-[10px] text-[#8C6D58]">
                        Supplier: {supplier?.name || 'Local Vendor'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-[#5C4538] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EDE5DE]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#8C6D58]">{item.sku}</td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-[#2C1810] tabular-nums">
                      {Number(item.stock || 0).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-[#8C6D58]">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#8C6D58] tabular-nums">
                      {Number(item.minThreshold || 0).toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#5C4538] tabular-nums">
                      {formatCurrency(item.unitCost)} / {item.unit}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isLow
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isLow ? 'LOW STOCK' : 'HEALTHY'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#8C6D58] text-[11px]">
                      {formatDate(item.expiryDate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustMode('add');
                            setAdjustQty(item.unit === 'g' || item.unit === 'ml' ? 1000 : 50);
                            setAdjustReason('Restock purchase order');
                          }}
                          className="px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          title="Add restock quantity"
                        >
                          + Add
                        </button>
                        <button
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustMode('waste');
                            setAdjustQty(item.unit === 'g' || item.unit === 'ml' ? 100 : 5);
                            setAdjustReason('Spillage during shift');
                          }}
                          className="px-2 py-1 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                          title="Record wastage"
                        >
                          - Waste
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isManagerOrOwner && (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#EBE2D8] rounded-lg transition-colors"
                          title="Edit stock details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-xs text-[#8C6D58]">
              No inventory ingredients match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Inventory Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E8DFD8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <h3 className="text-base font-bold text-[#2C1810]">
                {editingItem ? 'Edit Ingredient / Consumable' : 'Add New Inventory Stock'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-neutral-400 hover:text-[#2C1810] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ethiopian Yirgacheffe Beans"
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
                    <option value="Coffee Beans">Coffee Beans</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Plant Milk">Plant Milk</option>
                    <option value="Syrups">Syrups</option>
                    <option value="Tea">Tea</option>
                    <option value="Sweeteners">Sweeteners</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Bakery">Bakery</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Stock Amount *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  >
                    <option value="g">g (Grams)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="L">L (Liters)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Min Threshold *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Cost per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl"
                >
                  {editingItem ? 'Update Stock' : 'Create Stock Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Adjust / Wastage Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E8DFD8]">
            <h3 className="text-sm font-bold text-[#2C1810] mb-1">
              {adjustMode === 'add' ? 'Record Stock Restock' : 'Record Stock Wastage'}
            </h3>
            <p className="text-xs text-[#8C6D58] mb-3">
              Item: <strong>{adjustItem.name}</strong> (Current: {adjustItem.stock} {adjustItem.unit})
            </p>
            <form onSubmit={handleExecuteStockAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">
                  {adjustMode === 'add' ? 'Quantity to Add' : 'Quantity Wasted'} ({adjustItem.unit})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={adjustMode === 'add' ? 'Purchase invoice #124' : 'Spillage / Expired'}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-xl ${
                    adjustMode === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
