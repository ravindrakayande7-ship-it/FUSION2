import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../services/api.js';
import { formatCurrency } from '../utils/formatters.js';
import { ReceiptModal } from '../components/common/ReceiptModal.jsx';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  UtensilsCrossed,
  Receipt,
  User,
  Phone,
  Sparkles,
  X,
  Coffee,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById('razorpay-checkout-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const POS = () => {
  const {
    products,
    cart,
    addToCart,
    updateCartItemQty,
    removeCartItem,
    clearCart,
    createOrder,
    settings,
    customers,
    role,
    searchQuery: globalSearch,
    checkCartStock,
    dataLoading,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState('All');
  const [localSearch, setLocalSearch] = useState('');
  const [orderType, setOrderType] = useState('Dine-in');
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Customization modal state
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [modalSelectedSize, setModalSelectedSize] = useState({
    name: 'Regular',
    priceDelta: 0,
  });
  const [modalCustomizations, setModalCustomizations] = useState([]);
  const [modalItemNote, setModalItemNote] = useState('');

  // Receipt popup on order complete
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [razorpayConfig, setRazorpayConfig] = useState({ isConfigured: false, keyId: null });
  const [checkoutError, setCheckoutError] = useState(null);

  // Load Razorpay config on mount
  useEffect(() => {
    let isMounted = true;
    api.orders
      .getRazorpayConfig()
      .then((res) => {
        if (isMounted && res?.data) {
          setRazorpayConfig(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = ['All', 'Hot Coffee', 'Cold Coffee', 'Tea', 'Non-Coffee', 'Bakery', 'Snacks'];

  const availableAddons = [
    { name: 'Extra Espresso Shot', price: 35 },
    { name: 'Oat Milk Alternative', price: 45 },
    { name: 'Madagascar Vanilla Syrup', price: 25 },
    { name: 'Caramel Drizzle', price: 20 },
    { name: 'Whipped Cream', price: 25 },
    { name: 'Sugar-Free Stevia', price: 0 },
  ];

  // Maximum allowed discount based on user role
  const maxDiscountAllowed =
    role === 'Barista' ? 10 : role === 'Cashier' ? 15 : role === 'Manager' ? 30 : 100;

  const discountOptions = [0, 5, 10, 15, 20].filter((d) => d <= maxDiscountAllowed);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    const term = (localSearch || globalSearch || '').toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = activeCategory === 'All' || p.category === activeCategory;
      const matchSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, localSearch, globalSearch]);

  const subtotal = cart.reduce((acc, item) => acc + (item.totalItemPrice || 0), 0);
  const discountAmount = Math.round((subtotal * (discountPercent || 0)) / 100);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount =
    Math.round(((discountedSubtotal * (settings.taxRatePercent || 5)) / 100) * 100) / 100;
  const grandTotal = discountedSubtotal + taxAmount;

  const handleOpenCustomize = (prod) => {
    setSelectedProductForModal(prod);
    setModalSelectedSize(prod.sizes?.[0] || { name: 'Standard', priceDelta: 0 });
    setModalCustomizations([]);
    setModalItemNote('');
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProductForModal) return;
    addToCart(
      selectedProductForModal,
      modalSelectedSize.name,
      modalSelectedSize.priceDelta,
      modalCustomizations,
      modalItemNote
    );
    setSelectedProductForModal(null);
  };

  const handleSelectCustomer = (custName, phone) => {
    setCustomerName(custName);
    if (phone) setCustomerPhone(phone);
  };

  const handleCheckout = () => {
    if (cart.length === 0 || isSubmitting) return;
    setCheckoutError(null);

    if (settings.autoDeductInventory && checkCartStock) {
      const stockCheck = checkCartStock();
      if (!stockCheck.sufficient) {
        finalizeOrder();
        return;
      }
    }

    if (paymentMethod === 'UPI' || paymentMethod === 'Card') {
      if (razorpayConfig.isConfigured && razorpayConfig.keyId) {
        initiateRazorpayCheckout();
      } else if (!import.meta.env.DEV) {
        setCheckoutError('Online payments are not configured on this server. Choose Cash or contact the administrator.');
      } else {
        setShowUPIModal(true);
      }
    } else {
      finalizeOrder();
    }
  };

  const initiateRazorpayCheckout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Unable to load Razorpay Checkout script. Check connection.');
      }

      const rzpRes = await api.orders.createRazorpayOrder({
        items: cart.map(({ cartItemId: _cartItemId, ...item }) => item),
        customerName: customerName.trim() || 'Walk-in Guest',
        customerPhone: customerPhone.trim() || undefined,
        orderType,
        tableNumber: orderType === 'Dine-in' ? tableNumber : undefined,
        paymentMethod,
        discount: discountAmount,
        discountPercent,
        discountReason: discountPercent > 0 ? `${discountPercent}% POS Discount` : undefined,
        notes: orderNotes.trim() || undefined,
      });

      if (!rzpRes?.data?.id) {
        throw new Error('Failed to create Razorpay gateway order');
      }
      if (Number(rzpRes.data.amount) !== Math.round(grandTotal * 100)) {
        throw new Error('The server-calculated total differs from the POS total. Refresh the menu and review the cart before paying.');
      }

      const options = {
        key: razorpayConfig.keyId,
        amount: rzpRes.data.amount,
        currency: rzpRes.data.currency || 'INR',
        name: settings.cafeName || 'FUSION Coffee',
        description: `POS Order • Table ${tableNumber || 'Takeaway'}`,
        order_id: rzpRes.data.id,
        prefill: {
          name: customerName.trim() || 'Walk-in Guest',
          contact: customerPhone.trim() || '',
        },
        theme: {
          color: '#2C1810',
        },
        handler: async (response) => {
          try {
            const verifyRes = await api.orders.verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes?.data?.valid) {
              await finalizeOrder({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            } else {
              setCheckoutError('Payment signature validation failed on server');
              setIsSubmitting(false);
            }
          } catch (verifyErr) {
            setCheckoutError(verifyErr.message || 'Payment verification failed');
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', (resp) => {
        setCheckoutError(resp.error?.description || 'Razorpay checkout cancelled or failed');
        setIsSubmitting(false);
      });
      rzpInstance.open();
    } catch (err) {
      setCheckoutError(err.message || 'Razorpay initialization failed');
      setIsSubmitting(false);
    }
  };

  const finalizeOrder = async (extraPayload = {}) => {
    if (isSubmitting && !extraPayload.razorpayPaymentId && !extraPayload.isSimulatedPayment) return;
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await createOrder({
        customerName: customerName.trim() || 'Walk-in Guest',
        customerPhone: customerPhone.trim() || undefined,
        orderType,
        tableNumber: orderType === 'Dine-in' ? tableNumber : undefined,
        paymentMethod,
        discount: discountAmount,
        discountPercent,
        discountReason: discountPercent > 0 ? `${discountPercent}% POS Discount` : undefined,
        notes: orderNotes.trim() || undefined,
        ...extraPayload,
      });

      if (res && res.success) {
        setCompletedOrder(res.order);
        setShowUPIModal(false);
        setCustomerName('');
        setCustomerPhone('');
        setDiscountPercent(0);
        setOrderNotes('');
        setCheckoutError(null);
      } else if (res && res.error) {
        setCheckoutError(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch min-h-0 lg:h-[calc(100vh-5.5rem)]">
      {/* Left Column: Product Catalog Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-[#E8DFD8] p-3.5 sm:p-4 lg:p-4.5 overflow-hidden shadow-xs">
        {/* Top Controls: Search and Category Navigation */}
        <div className="shrink-0 space-y-3 pb-3 border-b border-[#F0E8E1]">
          {/* Menu Search Bar & Catalog Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search menu by item name, category, or SKU..."
                aria-label="Search POS menu items"
                className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] placeholder-[#A68A78] focus:outline-none focus:border-[#C87D32] focus:bg-white focus:ring-1 focus:ring-[#C87D32] transition-all"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 px-1 py-0.5"
                  aria-label="Clear menu search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] text-[#8C6D58] shrink-0">
              <span className="font-medium">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} available
              </span>
              {activeCategory !== 'All' && (
                <button
                  onClick={() => setActiveCategory('All')}
                  className="text-[10px] font-semibold text-[#C87D32] hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>
          </div>

          {/* Compact Category Tabs with Horizontally Scrollable Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C87D32] ${
                    isActive
                      ? 'bg-[#2C1810] text-[#F5EFEB] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#7A6354] hover:bg-[#F2ECE4] hover:text-[#2C1810]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid Area with Loading and Empty States */}
        <div className="flex-1 overflow-y-auto pt-3.5 pr-0.5 sm:pr-1 min-h-[300px]">
          {dataLoading && products.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2.5 text-[#8C6D58]">
              <Loader2 className="w-6 h-6 animate-spin text-[#C87D32]" />
              <span className="text-xs font-medium">Loading café menu items...</span>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 content-start">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => prod.available && handleOpenCustomize(prod)}
                  tabIndex={prod.available ? 0 : -1}
                  role="button"
                  onKeyDown={(e) => {
                    if (prod.available && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleOpenCustomize(prod);
                    }
                  }}
                  className={`flex flex-col rounded-xl border border-[#EDE5DE] overflow-hidden bg-[#FFFDF9] transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C87D32] ${
                    prod.available
                      ? 'hover:border-[#C87D32] hover:shadow-md cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="h-24 sm:h-28 w-full bg-[#F3ECE5] relative overflow-hidden">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    {!prod.available && (
                      <span className="absolute inset-0 bg-black/60 text-white text-[10px] font-bold flex items-center justify-center uppercase tracking-wider">
                        Sold Out
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#2C1810]/85 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-mono font-semibold">
                      {prod.category}
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#2C1810] leading-snug line-clamp-1 group-hover:text-[#C87D32] transition-colors">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-[#7A6354] line-clamp-1 mt-0.5">
                        {prod.description}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-2.5 flex items-center justify-between pt-2 border-t border-[#F5EFEB]">
                      <span className="text-xs font-bold text-[#2C1810] font-mono tabular-nums">
                        {formatCurrency(prod.price)}
                      </span>
                      <span className="p-1 rounded-lg bg-[#FAF7F2] text-[#C87D32] group-hover:bg-[#C87D32] group-hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#8C6D58]">
              <Coffee className="w-8 h-8 mb-2 stroke-[1.5] text-[#D8C7B9]" />
              <p className="text-xs font-semibold text-[#5C4538]">No products found</p>
              <p className="text-[11px] text-[#8C6D58] mt-0.5 max-w-xs">
                {localSearch
                  ? `No matching items found for "${localSearch}". Try another search keyword.`
                  : `No menu items currently listed under category "${activeCategory}".`}
              </p>
              {(localSearch || activeCategory !== 'All') && (
                <button
                  onClick={() => {
                    setLocalSearch('');
                    setActiveCategory('All');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E8DFD8] text-xs font-semibold text-[#2C1810] transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Billing & Cart Drawer */}
      <div className="w-full lg:w-96 xl:w-[26rem] flex flex-col bg-white rounded-2xl border border-[#E8DFD8] p-3.5 sm:p-4 lg:p-4.5 overflow-hidden shadow-xs shrink-0 min-h-0 lg:h-full">
        {/* Compact Aligned Cart Header with Item Count Badge and Clear Action */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0E8E1] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#E8DFD8] flex items-center justify-center text-[#C87D32] shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <h3 className="text-xs sm:text-sm font-bold text-[#2C1810] truncate">
                Current Register Cart
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-[#FAF7F2] text-[#7A6354] border border-[#E8DFD8] shrink-0">
                {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
              </span>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 rounded-md transition-colors"
              aria-label="Clear all cart items"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Order Mode & Dine-in Table */}
        <div className="py-2.5 space-y-2 border-b border-[#F0E8E1] shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderType('Dine-in')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                orderType === 'Dine-in'
                  ? 'bg-[#2C1810] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#7A6354] hover:bg-[#F2ECE4]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dine-in</span>
            </button>
            <button
              onClick={() => setOrderType('Takeaway')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                orderType === 'Takeaway'
                  ? 'bg-[#2C1810] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#7A6354] hover:bg-[#F2ECE4]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
          </div>
          {orderType === 'Dine-in' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8C6D58] shrink-0">Table:</span>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-lg px-2.5 py-1 text-[#2C1810] focus:outline-none"
              >
                <option value="Table 1">Table 1 (Indoor Window)</option>
                <option value="Table 2">Table 2 (Center High Top)</option>
                <option value="Table 3">Table 3 (Barista Bar)</option>
                <option value="Table 4">Table 4 (Outdoor Patio)</option>
                <option value="Table 5">Table 5 (Lounge Sofa)</option>
              </select>
            </div>
          )}
        </div>

        {/* Customer Quick Attachment */}
        <div className="py-2.5 border-b border-[#F0E8E1] space-y-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-[#8C6D58]" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (Walk-in)"
              className="flex-1 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-lg px-2.5 py-1 text-[#2C1810]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#8C6D58]" />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Mobile Phone (Optional for loyalty)"
              className="flex-1 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-lg px-2.5 py-1 text-[#2C1810]"
            />
          </div>
          {/* Quick suggestions from existing customers */}
          {customers.length > 0 && !customerName && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
              <span className="text-[10px] text-[#A68A78] shrink-0">Frequent:</span>
              {customers.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c.name, c.phone)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#5C4538] whitespace-nowrap border border-[#E8DFD8]"
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
          {cart.map((item) => (
            <div
              key={item.cartItemId}
              className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#EDE5DE] text-xs space-y-1.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-[#2C1810]">{item.name}</h4>
                  <div className="text-[11px] text-[#8C6D58]">
                    <span>{item.size}</span>
                    {item.customizations?.length > 0 && (
                      <span> • {item.customizations.map((c) => c.name).join(', ')}</span>
                    )}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-[#A68A78] italic">Note: {item.notes}</div>
                  )}
                </div>
                <span className="font-mono font-bold text-[#2C1810] tabular-nums">
                  {formatCurrency(item.totalItemPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#F0E8E1]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCartItemQty(item.cartItemId, item.quantity - 1)}
                    className="w-5 h-5 rounded-md bg-white border border-[#E5DDD5] flex items-center justify-center text-[#5C4538] hover:bg-neutral-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-xs tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartItemQty(item.cartItemId, item.quantity + 1)}
                    className="w-5 h-5 rounded-md bg-white border border-[#E5DDD5] flex items-center justify-center text-[#5C4538] hover:bg-neutral-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeCartItem(item.cartItemId)}
                  className="text-neutral-400 hover:text-rose-600 p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A68A78]">
              <Coffee className="w-8 h-8 mb-2 stroke-[1.5] text-[#D8C7B9]" />
              <p className="text-xs font-semibold text-[#5C4538]">Register is empty</p>
              <p className="text-[11px] text-[#8C6D58] mt-0.5">
                Select items from the catalog on the left to start billing.
              </p>
            </div>
          )}
        </div>

        {/* Financial Summary & Payment */}
        <div className="pt-3 border-t border-[#F0E8E1] space-y-2 shrink-0">
          {/* Discount chips */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8C6D58]">
              Discount ({role} max {maxDiscountAllowed}%):
            </span>
            <div className="flex items-center gap-1">
              {discountOptions.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                    discountPercent === pct
                      ? 'bg-[#C87D32] text-white'
                      : 'bg-[#FAF7F2] text-[#7A6354] hover:bg-[#F2ECE4]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Subtotal, Tax, Total */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#8C6D58]">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({discountPercent}%):</span>
                <span className="font-mono tabular-nums">- {formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#8C6D58]">
              <span>GST ({settings.taxRatePercent}%):</span>
              <span className="font-mono tabular-nums">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#2C1810] pt-1 border-t border-[#F0E8E1]">
              <span>Grand Total:</span>
              <span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method Selector & Gateway Indicator */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8C6D58] font-medium">Payment Mode:</span>
              {(paymentMethod === 'UPI' || paymentMethod === 'Card') && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    razorpayConfig.isConfigured
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {razorpayConfig.isConfigured ? 'Razorpay Live / Test Key' : 'Gateway Simulation Mode'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['UPI', 'Cash', 'Card', 'Other'].map((method) => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    setCheckoutError(null);
                  }}
                  className={`py-1.5 text-[11px] font-semibold rounded-xl border flex flex-col items-center gap-0.5 transition-all ${
                    paymentMethod === method
                      ? 'bg-[#2C1810] text-white border-[#2C1810] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#7A6354] border-[#E8DFD8] hover:bg-[#F2ECE4]'
                  }`}
                >
                  {method === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                  {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                  {method === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                  {method === 'Other' && <Sparkles className="w-3.5 h-3.5" />}
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Error Banner */}
          {checkoutError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start justify-between gap-2 animate-in fade-in">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-tight">{checkoutError}</span>
              </div>
              <button
                onClick={() => setCheckoutError(null)}
                className="text-rose-500 hover:text-rose-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Checkout CTA */}
          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCheckout}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              cart.length > 0 && !isSubmitting
                ? 'bg-[#2C1810] hover:bg-[#432519] text-white cursor-pointer'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#E29D62]" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 text-[#E29D62]" />
                <span>
                  {paymentMethod === 'UPI' || paymentMethod === 'Card'
                    ? razorpayConfig.isConfigured
                      ? `Pay via Razorpay • ${formatCurrency(grandTotal)}`
                      : `Complete Order (${paymentMethod}) • ${formatCurrency(grandTotal)}`
                    : `Complete Order • ${formatCurrency(grandTotal)}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Customization Modal */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#E8DFD8] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1]">
              <div>
                <h3 className="text-base font-bold text-[#2C1810]">
                  {selectedProductForModal.name}
                </h3>
                <p className="text-xs text-[#8C6D58]">
                  Base Price: {formatCurrency(selectedProductForModal.price)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="text-neutral-400 hover:text-[#2C1810] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Size Selector */}
              <div>
                <label className="text-xs font-bold text-[#2C1810] mb-2 block">
                  Select Beverage Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProductForModal.sizes?.map((size) => (
                    <button
                      key={size.name}
                      onClick={() => setModalSelectedSize(size)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                        modalSelectedSize.name === size.name
                          ? 'bg-[#2C1810] text-white border-[#2C1810]'
                          : 'bg-[#FAF7F2] text-[#5C4538] border-[#E8DFD8] hover:bg-[#F2ECE4]'
                      }`}
                    >
                      <div>{size.name}</div>
                      <div className="text-[10px] opacity-80">
                        {size.priceDelta > 0 ? `+${formatCurrency(size.priceDelta)}` : 'Included'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons & Modifiers */}
              <div>
                <label className="text-xs font-bold text-[#2C1810] mb-2 block">
                  Custom Modifiers &amp; Add-ons
                </label>
                <div className="space-y-1.5">
                  {availableAddons.map((addon) => {
                    const isChecked = modalCustomizations.some((c) => c.name === addon.name);
                    return (
                      <div
                        key={addon.name}
                        onClick={() => {
                          if (isChecked) {
                            setModalCustomizations((prev) =>
                              prev.filter((c) => c.name !== addon.name)
                            );
                          } else {
                            setModalCustomizations((prev) => [...prev, addon]);
                          }
                        }}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-50/60 border-[#C87D32] text-[#2C1810]'
                            : 'bg-[#FAF7F2] border-[#EDE5DE] text-[#5C4538] hover:bg-[#F2ECE4]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isChecked
                                ? 'bg-[#2C1810] border-[#2C1810] text-white'
                                : 'border-[#D5C2B4] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-medium">{addon.name}</span>
                        </div>
                        <span className="font-mono text-neutral-600 tabular-nums">
                          {addon.price > 0 ? `+${formatCurrency(addon.price)}` : 'Free'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Item Note */}
              <div>
                <label className="text-xs font-bold text-[#2C1810] mb-1.5 block">
                  Kitchen Instruction / Notes
                </label>
                <input
                  type="text"
                  value={modalItemNote}
                  onChange={(e) => setModalItemNote(e.target.value)}
                  placeholder="e.g. Extra hot, light ice, decaf..."
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0E8E1] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8C6D58] block">Unit Price</span>
                <span className="text-sm font-bold text-[#2C1810] font-mono tabular-nums">
                  {formatCurrency(
                    selectedProductForModal.price +
                      (modalSelectedSize.priceDelta || 0) +
                      modalCustomizations.reduce((a, b) => a + b.price, 0)
                  )}
                </span>
              </div>
              <button
                onClick={handleConfirmAddToCart}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-sm"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Razorpay / UPI Test Mode Modal */}
      {showUPIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-[#E8DFD8] animate-in fade-in zoom-in-95 duration-150">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-2">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Razorpay Test / Simulation Mode</span>
            </div>
            <h3 className="text-base font-bold text-[#2C1810] mb-1">
              Online Checkout ({paymentMethod})
            </h3>
            <p className="text-xs text-[#8C6D58] mb-4">
              Gateway simulation active • No live keys in environment
            </p>
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD8] inline-block mb-3">
              <div className="w-40 h-40 bg-white p-2 rounded-xl border border-neutral-200 flex flex-col items-center justify-center relative">
                <QrCode className="w-28 h-28 text-[#2C1810]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-lg bg-[#2C1810] text-[#E29D62] flex items-center justify-center text-xs font-bold shadow-md">
                    ₹
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-[#2C1810] mb-0.5 tabular-nums">
              Amount Due: {formatCurrency(grandTotal)}
            </div>
            <div className="text-[11px] text-[#8C6D58] mb-3">
              VPA: {(settings.cafeName || 'fusion').toLowerCase().replace(/\s+/g, '')}@icici
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 text-left mb-4 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Simulated Online Payment Notice</span>
              </div>
              <p className="text-[10px] leading-relaxed text-amber-900">
                Live Razorpay keys are not configured. To process real UPI/Card payments, configure{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">RAZORPAY_KEY_ID</code> and{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">RAZORPAY_KEY_SECRET</code>.
              </p>
            </div>
            <div className="space-y-2">
              <button
                disabled={isSubmitting}
                onClick={() => finalizeOrder({ isSimulatedPayment: true })}
                className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Complete Test Order (Simulated)</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUPIModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] rounded-xl hover:bg-[#EBE2D8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('Cash');
                    setShowUPIModal(false);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-[#2C1810] bg-amber-100 rounded-xl hover:bg-amber-200 transition-colors"
                >
                  Switch to Cash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        order={completedOrder}
        isOpen={Boolean(completedOrder)}
        onClose={() => setCompletedOrder(null)}
      />
    </div>
  );
};

export default POS;
