import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import { ConfirmationModal } from '../components/common/ConfirmationModal.jsx';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  X,
} from 'lucide-react';

export const MenuManagement = () => {
  const { products, addProduct, updateProduct, deleteProduct, toggleProductAvailability, role } =
    useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form inputs
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hot Coffee');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(180);
  const [cost, setCost] = useState(45);
  const [sku, setSku] = useState('');
  const [prepTime, setPrepTime] = useState(3);
  const [image, setImage] = useState('');
  const [available, setAvailable] = useState(true);

  // Delete modal
  const [productToDelete, setProductToDelete] = useState(null);

  const isOwner = role === 'Owner';
  const isManagerOrOwner = role === 'Owner' || role === 'Manager';

  const categories = ['All', 'Hot Coffee', 'Cold Coffee', 'Tea', 'Non-Coffee', 'Bakery', 'Snacks'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch =
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Hot Coffee');
    setDescription('');
    setPrice(200);
    setCost(48);
    setSku(`COF-NEW-${Math.floor(Math.random() * 900 + 100)}`);
    setPrepTime(3);
    setImage('/src/assets/images/coffee_cappuccino_1792072634092.jpg');
    setAvailable(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description);
    setPrice(p.price);
    setCost(p.cost);
    setSku(p.sku);
    setPrepTime(p.prepTime);
    setImage(p.image);
    setAvailable(p.available);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      await updateProduct({
        ...editingProduct,
        name: name.trim(),
        category,
        description: description.trim(),
        price: Math.max(0, Number(price)),
        cost: Math.max(0, Number(cost)),
        sku: sku.trim(),
        prepTime: Math.max(1, Number(prepTime)),
        image: image || '/src/assets/images/coffee_cappuccino_1792072634092.jpg',
        available,
      });
    } else {
      await addProduct({
        name: name.trim(),
        category,
        description: description.trim(),
        price: Math.max(0, Number(price)),
        cost: Math.max(0, Number(cost)),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        prepTime: Math.max(1, Number(prepTime)),
        image: image || '/src/assets/images/coffee_cappuccino_1792072634092.jpg',
        available,
        sizes: [
          { name: 'Regular', priceDelta: 0 },
          { name: 'Large', priceDelta: 40 },
        ],
        recipe: [
          { ingredientId: 'ing-1', quantity: 18 },
          { ingredientId: 'ing-3', quantity: 180 },
        ],
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  const calculateMargin = (itemPrice, itemCost) => {
    const p = Number(itemPrice) || 0;
    const c = Number(itemCost) || 0;
    if (p <= 0) return 0;
    return Math.round(((p - c) / p) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Menu &amp; Recipe Management</h1>
          <p className="text-xs text-[#8C6D58]">
            Configure café catalogue items, selling rates, ingredient costs, and stock margins
          </p>
        </div>
        {isManagerOrOwner && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-[#E29D62]" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
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
            placeholder="Search products or SKU..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD8] text-[#8C6D58] font-bold">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 font-mono">Selling Price</th>
                <th className="py-3 px-4 font-mono">Ingr. Cost</th>
                <th className="py-3 px-4 font-mono">Est. Margin</th>
                <th className="py-3 px-4">Prep Time</th>
                <th className="py-3 px-4 text-center">In Register</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFEB]">
              {filteredProducts.map((prod) => {
                const margin = calculateMargin(prod.price, prod.cost);
                return (
                  <tr key={prod.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#E8DFD8] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-bold text-[#2C1810] text-sm">{prod.name}</div>
                          <div className="text-[10px] text-[#8C6D58] line-clamp-1 max-w-[200px]">
                            {prod.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-[#5C4538] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EDE5DE]">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#8C6D58]">{prod.sku}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#2C1810] tabular-nums">
                      {formatCurrency(prod.price)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#8C6D58] tabular-nums">
                      {formatCurrency(prod.cost)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold tabular-nums">
                      <span className={margin >= 65 ? 'text-emerald-700' : 'text-amber-700'}>
                        {margin}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5C4538]">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-[#8C6D58]" />
                        <span>{prod.prepTime} min</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleProductAvailability(prod.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                          prod.available
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-stone-100 text-[#8C6D58] hover:bg-stone-200'
                        }`}
                      >
                        {prod.available ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isManagerOrOwner && (
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#EBE2D8] rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOwner && (
                          <button
                            onClick={() => setProductToDelete(prod)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-xs text-[#8C6D58]">
              No menu items match your search.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E8DFD8] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <h3 className="text-base font-bold text-[#2C1810]">
                {editingProduct ? 'Edit Menu Product' : 'Add New Menu Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-[#2C1810] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cinnamon Spiced Cortado"
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
                    <option value="Hot Coffee">Hot Coffee</option>
                    <option value="Cold Coffee">Cold Coffee</option>
                    <option value="Tea">Tea</option>
                    <option value="Non-Coffee">Non-Coffee</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Snacks">Snacks</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="COF-XYZ-01"
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Flavor notes, brewing method, recipe highlights..."
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Ingr. Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2C1810] block mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
                  />
                </div>
              </div>

              {/* Calculated gross margin indicator */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex justify-between items-center text-amber-900 font-medium">
                <span>Estimated Gross Margin per Unit:</span>
                <span className="font-mono font-bold text-sm">
                  {calculateMargin(price, cost)}% ({formatCurrency(price - cost)} gross profit)
                </span>
              </div>

              <div>
                <label className="font-bold text-[#2C1810] block mb-1">Product Image</label>
                <select
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                >
                  <option value="/src/assets/images/coffee_cappuccino_1792072634092.jpg">
                    Hot Cappuccino / Espresso Art
                  </option>
                  <option value="/src/assets/images/coffee_cold_brew_1792072633965.jpg">
                    Iced Cold Brew / Beverage Glass
                  </option>
                  <option value="/src/assets/images/bakery_croissant_1792072633765.jpg">
                    Artisan Butter Croissant / Bakery
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="rounded text-[#2C1810]"
                />
                <label htmlFor="availCheck" className="text-[#2C1810] font-semibold cursor-pointer">
                  Available for immediate ordering in POS register
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#F0E8E1]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl hover:bg-[#EBE2D8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl shadow-xs"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(productToDelete)}
        title="Delete Menu Product?"
        message={`Are you sure you want to remove "${productToDelete?.name}" from the menu catalog?`}
        confirmLabel="Delete Item"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};

export default MenuManagement;
