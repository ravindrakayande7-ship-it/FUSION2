/**
 * Main Application Context for FUSION Coffee Shop Management System (JavaScript)
 * Real HttpOnly cookie-based JWT authentication, CSRF safety, and authoritative backend REST synchronization.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService.js';
import { api } from '../services/api.js';
import { checkIngredientsStock } from '../utils/orderLogic.js';

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Active role is strictly derived from verified authenticated backend user profile
  const role = currentUser?.role || 'Guest';

  // Domain states
  const [settings, setSettingsState] = useState(() => storageService.getSettings());
  const [products, setProductsState] = useState(() => storageService.getProducts());
  const [inventory, setInventoryState] = useState(() => storageService.getInventory());
  const [suppliers, setSuppliersState] = useState(() => storageService.getSuppliers());
  const [customers, setCustomersState] = useState(() => storageService.getCustomers());
  const [staff, setStaffState] = useState(() => storageService.getStaff());
  const [attendance, setAttendanceState] = useState(() => storageService.getAttendance());
  const [orders, setOrdersState] = useState(() => storageService.getOrders());
  const [expenses, setExpensesState] = useState(() => storageService.getExpenses());
  const [cart, setCart] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notifications
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch full dataset from authenticated backend
  const refreshData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [
        settingsRes,
        productsRes,
        inventoryRes,
        suppliersRes,
        customersRes,
        staffRes,
        attendanceRes,
        ordersRes,
        expensesRes,
      ] = await Promise.allSettled([
        api.settings.get(),
        api.products.getAll(),
        api.inventory.getAll(),
        api.suppliers.getAll(),
        api.customers.getAll(),
        api.staff.getAll(),
        api.attendance.getAll(),
        api.orders.getAll(),
        api.expenses.getAll(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setSettingsState(settingsRes.value.data);
      }
      if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value?.data)) {
        setProductsState(productsRes.value.data);
      }
      if (inventoryRes.status === 'fulfilled' && Array.isArray(inventoryRes.value?.data)) {
        setInventoryState(inventoryRes.value.data);
      }
      if (suppliersRes.status === 'fulfilled' && Array.isArray(suppliersRes.value?.data)) {
        setSuppliersState(suppliersRes.value.data);
      }
      if (customersRes.status === 'fulfilled' && Array.isArray(customersRes.value?.data)) {
        setCustomersState(customersRes.value.data);
      }
      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value?.data)) {
        setStaffState(staffRes.value.data);
      }
      if (attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value?.data)) {
        setAttendanceState(attendanceRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value?.data)) {
        setOrdersState(ordersRes.value.data);
      }
      if (expensesRes.status === 'fulfilled' && Array.isArray(expensesRes.value?.data)) {
        setExpensesState(expensesRes.value.data);
      }
    } catch (err) {
      console.warn('[FUSION Sync] Sync warning:', err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Verify stored session on boot via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const res = await api.auth.getMe();
        if (isMounted && res?.user) {
          setCurrentUser(res.user);
          refreshData();
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          storageService.clearAllSessionData();
          setIsLoginModalOpen(true);
        }
      } finally {
        if (isMounted) setAuthChecked(true);
      }
    };

    verifySession();

    // Listen for unauthorized 401 events dispatched from API service
    const handleUnauthorized = (e) => {
      storageService.clearAllSessionData();
      setCurrentUser(null);
      setIsLoginModalOpen(true);
      showToast(e.detail?.message || 'Session expired. Please sign in.', 'error');
    };

    window.addEventListener('fusion:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('fusion:unauthorized', handleUnauthorized);
    };
  }, [refreshData, showToast]);

  // Auth: Login
  const login = async (email, password) => {
    try {
      const res = await api.auth.login({ email, password });
      if (res?.user) {
        setCurrentUser(res.user);
        setIsLoginModalOpen(false);
        showToast(`Welcome back, ${res.user.name} (${res.user.role})!`, 'success');
        refreshData();
        return res.user;
      }
      throw new Error(res?.message || 'Login failed');
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  // Auth: Logout
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network failure on logout
    } finally {
      storageService.clearAllSessionData();
      setCurrentUser(null);
      setCart([]);
      showToast('Logged out successfully', 'info');
      setIsLoginModalOpen(true);
    }
  };

  // Settings
  const updateSettings = async (newSettings) => {
    try {
      const res = await api.settings.update(newSettings);
      if (res?.data) {
        setSettingsState(res.data);
        showToast('Settings saved successfully', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to save settings', 'error');
      throw e;
    }
  };

  // Products CRUD
  const addProduct = async (p) => {
    try {
      const res = await api.products.create(p);
      if (res?.data) {
        setProductsState((prev) => [res.data, ...prev]);
        showToast(`Added product "${res.data.name}"`, 'success');
        return res.data;
      }
    } catch (e) {
      showToast(e.message || 'Failed to add product', 'error');
      throw e;
    }
  };

  const updateProduct = async (p) => {
    try {
      const res = await api.products.update(p.id, p);
      if (res?.data) {
        setProductsState((prev) => prev.map((item) => (item.id === p.id ? res.data : item)));
        showToast(`Updated "${p.name}"`, 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to update product', 'error');
      throw e;
    }
  };

  const deleteProduct = async (id) => {
    const target = products.find((p) => p.id === id);
    try {
      await api.products.delete(id);
      setProductsState((prev) => prev.filter((p) => p.id !== id));
      showToast(`Deleted product "${target?.name || id}"`, 'info');
    } catch (e) {
      showToast(e.message || 'Failed to delete product', 'error');
      throw e;
    }
  };

  const toggleProductAvailability = async (id) => {
    try {
      const res = await api.products.toggleAvailability(id);
      if (res?.data) {
        setProductsState((prev) => prev.map((p) => (p.id === id ? res.data : p)));
        showToast(
          `${res.data.name} marked as ${res.data.available ? 'Available' : 'Unavailable'}`,
          'info'
        );
      }
    } catch (e) {
      showToast(e.message || 'Failed to update product status', 'error');
    }
  };

  // Inventory
  const addInventoryItem = async (item) => {
    try {
      const res = await api.inventory.create(item);
      if (res?.data) {
        setInventoryState((prev) => [res.data, ...prev]);
        showToast(`Added ingredient "${res.data.name}"`, 'success');
        return res.data;
      }
    } catch (e) {
      showToast(e.message || 'Failed to add ingredient', 'error');
      throw e;
    }
  };

  const updateInventoryItem = async (item) => {
    try {
      const res = await api.inventory.update(item.id, item);
      if (res?.data) {
        setInventoryState((prev) => prev.map((i) => (i.id === item.id ? res.data : i)));
        showToast(`Updated "${item.name}" stock details`, 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to update ingredient', 'error');
      throw e;
    }
  };

  const adjustStock = async (id, deltaQty, reason) => {
    try {
      const res = await api.inventory.adjustStock(id, deltaQty, reason);
      if (res?.data) {
        setInventoryState((prev) => prev.map((item) => (item.id === id ? res.data : item)));
        showToast(res.message || `Stock adjusted (${deltaQty > 0 ? '+' : ''}${deltaQty})`, 'info');
      }
    } catch (e) {
      showToast(e.message || 'Failed to adjust stock', 'error');
    }
  };

  const recordWastage = async (id, wastageQty, reason) => {
    try {
      const res = await api.inventory.recordWastage(id, wastageQty, reason);
      if (res?.data) {
        setInventoryState((prev) => prev.map((item) => (item.id === id ? res.data : item)));
        if (res.expense) {
          setExpensesState((prev) => [res.expense, ...prev]);
        }
        showToast(res.message || `Recorded wastage of ${wastageQty}`, 'info');
      }
    } catch (e) {
      showToast(e.message || 'Failed to record wastage', 'error');
    }
  };

  // Suppliers
  const addSupplier = async (s) => {
    try {
      const res = await api.suppliers.create(s);
      if (res?.data) {
        setSuppliersState((prev) => [...prev, res.data]);
        showToast(`Supplier "${res.data.name}" added`, 'success');
        return res.data;
      }
    } catch (e) {
      showToast(e.message || 'Failed to add supplier', 'error');
      throw e;
    }
  };

  const updateSupplier = async (s) => {
    try {
      const res = await api.suppliers.update(s.id, s);
      if (res?.data) {
        setSuppliersState((prev) => prev.map((item) => (item.id === s.id ? res.data : item)));
        showToast(`Supplier "${s.name}" updated`, 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to update supplier', 'error');
      throw e;
    }
  };

  const deleteSupplier = async (id) => {
    try {
      await api.suppliers.delete(id);
      setSuppliersState((prev) => prev.filter((s) => s.id !== id));
      showToast('Supplier removed', 'info');
    } catch (e) {
      showToast(e.message || 'Failed to delete supplier', 'error');
      throw e;
    }
  };

  // Customers
  const addCustomer = async (c) => {
    try {
      const res = await api.customers.create(c);
      if (res?.data) {
        setCustomersState((prev) => [res.data, ...prev]);
        showToast(`Customer "${res.data.name}" registered`, 'success');
        return res.data;
      }
    } catch (e) {
      showToast(e.message || 'Failed to register customer', 'error');
      throw e;
    }
  };

  const updateCustomer = async (c) => {
    try {
      const res = await api.customers.update(c.id, c);
      if (res?.data) {
        setCustomersState((prev) => prev.map((item) => (item.id === c.id ? res.data : item)));
        showToast('Customer details updated', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to update customer', 'error');
      throw e;
    }
  };

  // Staff & Attendance
  const addStaff = async (member) => {
    try {
      const res = await api.staff.create(member);
      if (res?.data) {
        setStaffState((prev) => [...prev, res.data]);
        showToast(`Staff member "${res.data.name}" added`, 'success');
        return res.data;
      }
    } catch (e) {
      showToast(e.message || 'Failed to add staff member', 'error');
      throw e;
    }
  };

  const updateStaff = async (member) => {
    try {
      const res = await api.staff.update(member.id, member);
      if (res?.data) {
        setStaffState((prev) => prev.map((s) => (s.id === member.id ? res.data : s)));
        showToast(`Staff details updated for ${member.name}`, 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to update staff member', 'error');
      throw e;
    }
  };

  const toggleStaffStatus = async (id) => {
    try {
      const res = await api.staff.toggleStatus(id);
      if (res?.data) {
        setStaffState((prev) => prev.map((s) => (s.id === id ? res.data : s)));
        showToast(`Status updated to ${res.data.status}`, 'info');
      }
    } catch (e) {
      showToast(e.message || 'Failed to update status', 'error');
    }
  };

  const recordCheckIn = async (staffId) => {
    try {
      const res = await api.attendance.checkIn(staffId);
      if (res?.data) {
        setAttendanceState((prev) => [res.data, ...prev]);
        showToast(res.message || 'Shift punch-in recorded', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Check-in failed', 'error');
    }
  };

  const recordCheckOut = async (attendanceId) => {
    try {
      const res = await api.attendance.checkOut(attendanceId);
      if (res?.data) {
        setAttendanceState((prev) => prev.map((a) => (a.id === attendanceId ? res.data : a)));
        showToast(res.message || 'Shift punch-out recorded', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Check-out failed', 'error');
    }
  };

  // Cart operations
  const addToCart = (product, sizeName, priceDelta = 0, customizations = [], notes = '') => {
    const itemPrice = product.price + priceDelta;
    const customTotal = customizations.reduce((acc, c) => acc + c.price, 0);
    const finalUnitPrice = itemPrice + customTotal;
    const cartItemId = `${product.id}-${sizeName}-${customizations
      .map((c) => c.name)
      .sort()
      .join('-')}-${notes}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalItemPrice: (item.quantity + 1) * finalUnitPrice,
              }
            : item
        );
      }
      const newItem = {
        cartItemId,
        productId: product.id,
        name: product.name,
        price: finalUnitPrice,
        cost: product.cost,
        quantity: 1,
        size: sizeName,
        customizations,
        notes,
        totalItemPrice: finalUnitPrice,
      };
      return [...prev, newItem];
    });
    showToast(`Added ${product.name} (${sizeName}) to cart`, 'success');
  };

  const updateCartItemQty = (cartItemId, qty) => {
    if (qty <= 0) {
      removeCartItem(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          return {
            ...item,
            quantity: qty,
            totalItemPrice: qty * item.price,
          };
        }
        return item;
      })
    );
  };

  const removeCartItem = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Order Placement
  const createOrder = async (orderData) => {
    if (!cart || cart.length === 0) {
      showToast('Cannot create order with an empty cart', 'error');
      return { success: false, error: 'Cart is empty' };
    }

    try {
      const payload = {
        items: cart.map(({ cartItemId: _unused, ...rest }) => rest),
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        orderType: orderData.orderType,
        tableNumber: orderData.tableNumber,
        paymentMethod: orderData.paymentMethod,
        discount: orderData.discount,
        discountPercent: orderData.discountPercent,
        discountReason: orderData.discountReason,
        notes: orderData.notes,
        isSimulatedPayment: orderData.isSimulatedPayment,
        razorpayOrderId: orderData.razorpayOrderId,
        razorpayPaymentId: orderData.razorpayPaymentId,
        razorpaySignature: orderData.razorpaySignature,
      };

      const res = await api.orders.create(payload);
      if (res?.data) {
        const createdOrder = res.data;
        setOrdersState((prev) => [createdOrder, ...prev]);
        clearCart();
        showToast(`Order ${createdOrder.orderNumber} placed successfully!`, 'success');
        refreshData();
        return { success: true, order: createdOrder };
      }
      throw new Error(res?.message || 'Order creation failed');
    } catch (e) {
      showToast(e.message || 'Failed to place order', 'error');
      return { success: false, error: e.message };
    }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      const res = await api.orders.updateStatus(orderId, nextStatus);
      if (res?.data) {
        setOrdersState((prev) => prev.map((ord) => (ord.id === orderId ? res.data : ord)));
        showToast(res.message || `Status updated to ${nextStatus}`, 'info');
        return { success: true, status: nextStatus };
      }
    } catch (e) {
      showToast(e.message || 'Failed to update order status', 'error');
      return { success: false, error: e.message };
    }
  };

  const cancelOrder = async (orderId, reason = 'Staff Cancellation') => {
    try {
      const res = await api.orders.cancel(orderId, reason);
      if (res?.data) {
        setOrdersState((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
        showToast(res.message || 'Order cancelled and stock restored', 'info');
        refreshData();
        return { success: true };
      }
    } catch (e) {
      showToast(e.message || 'Failed to cancel order', 'error');
      return { success: false, error: e.message };
    }
  };

  // Expenses
  const addExpense = async (exp) => {
    try {
      const res = await api.expenses.create(exp);
      if (res?.data) {
        setExpensesState((prev) => [res.data, ...prev]);
        showToast(`Expense "${res.data.title}" recorded`, 'success');
        return res.data;
      }
    } catch (e) {
      showToast(e.message || 'Failed to record expense', 'error');
      throw e;
    }
  };

  const deleteExpense = async (id) => {
    try {
      await api.expenses.delete(id);
      setExpensesState((prev) => prev.filter((e) => e.id !== id));
      showToast('Expense removed', 'info');
    } catch (e) {
      showToast(e.message || 'Failed to remove expense', 'error');
      throw e;
    }
  };

  const resetAllData = async () => {
    try {
      await api.settings.resetDemo();
      storageService.resetAllToDefault();
      setCart([]);
      await refreshData();
      showToast('All cafe data reset to fresh demo default', 'success');
    } catch (e) {
      showToast(e.message || 'Reset failed', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        role,
        authChecked,
        dataLoading,
        login,
        logout,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        settings,
        updateSettings,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductAvailability,
        inventory,
        addInventoryItem,
        updateInventoryItem,
        adjustStock,
        recordWastage,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        customers,
        addCustomer,
        updateCustomer,
        staff,
        attendance,
        addStaff,
        updateStaff,
        toggleStaffStatus,
        recordCheckIn,
        recordCheckOut,
        orders,
        cart,
        addToCart,
        updateCartItemQty,
        removeCartItem,
        clearCart,
        createOrder,
        updateOrderStatus,
        cancelOrder,
        expenses,
        addExpense,
        deleteExpense,
        toasts,
        showToast,
        removeToast,
        searchQuery,
        setSearchQuery,
        checkCartStock: () => checkIngredientsStock(cart, inventory, products),
        resetAllData,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
