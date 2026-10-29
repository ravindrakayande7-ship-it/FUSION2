/**
 * API Service for FUSION Coffee Shop Management System
 * Production-ready HTTP client using HttpOnly secure cookies & CSRF verification.
 * Access tokens are NOT stored in browser localStorage.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const csrfToken = getCookie('fusion_csrf_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    ...options.headers,
  };

  const response = await fetch(url, {
    credentials: 'include', // Automatically sends HttpOnly cookies cross-origin / same-origin
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;

    // Handle token expiration or unauthorized session
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('fusion:unauthorized', {
            detail: { message: errorMsg },
          })
        );
      }
    }

    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    getMe: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
    switchDemoToken: (role) =>
      request('/auth/switch-demo-token', { method: 'POST', body: JSON.stringify({ role }) }),
  },

  // Dashboard
  dashboard: {
    getSummary: () => request('/dashboard/summary'),
  },

  // Products
  products: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/products${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/products/${id}`),
    create: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
    update: (id, updates) =>
      request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    toggleAvailability: (id) => request(`/products/${id}/availability`, { method: 'PATCH' }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  },

  // Orders
  orders: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/orders${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/orders/${id}`),
    create: (orderData) =>
      request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    updateStatus: (id, status) =>
      request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    cancel: (id, reason) =>
      request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    getRazorpayConfig: () => request('/orders/razorpay/config'),
    createRazorpayOrder: (data) =>
      request('/orders/razorpay/order', { method: 'POST', body: JSON.stringify(data) }),
    verifyRazorpayPayment: (data) =>
      request('/orders/razorpay/verify', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Inventory
  inventory: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventory${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/inventory/${id}`),
    getLowStockAlerts: () => request('/inventory/alerts/low-stock'),
    create: (item) => request('/inventory', { method: 'POST', body: JSON.stringify(item) }),
    update: (id, updates) =>
      request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    adjustStock: (id, deltaQty, reason) =>
      request(`/inventory/${id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ deltaQty, reason }),
      }),
    recordWastage: (id, wastageQty, reason) =>
      request(`/inventory/${id}/wastage`, {
        method: 'POST',
        body: JSON.stringify({ wastageQty, reason }),
      }),
  },

  // Suppliers
  suppliers: {
    getAll: () => request('/suppliers'),
    create: (supplier) => request('/suppliers', { method: 'POST', body: JSON.stringify(supplier) }),
    update: (id, updates) =>
      request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
    recordPayment: (id, amountPaid) =>
      request(`/suppliers/${id}/pay`, { method: 'POST', body: JSON.stringify({ amountPaid }) }),
  },

  // Customers
  customers: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/customers${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/customers/${id}`),
    create: (customer) => request('/customers', { method: 'POST', body: JSON.stringify(customer) }),
    update: (id, updates) =>
      request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  },

  // Staff
  staff: {
    getAll: () => request('/staff'),
    create: (member) => request('/staff', { method: 'POST', body: JSON.stringify(member) }),
    update: (id, updates) =>
      request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    toggleStatus: (id) => request(`/staff/${id}/status`, { method: 'PATCH' }),
    delete: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
  },

  // Attendance
  attendance: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/attendance${query ? `?${query}` : ''}`);
    },
    checkIn: (staffId) =>
      request('/attendance/check-in', { method: 'POST', body: JSON.stringify({ staffId }) }),
    checkOut: (attendanceId) =>
      request('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({ attendanceId }),
      }),
  },

  // Expenses
  expenses: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/expenses${query ? `?${query}` : ''}`);
    },
    create: (expense) => request('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },

  // Reports
  reports: {
    getAnalytics: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/reports/analytics${query ? `?${query}` : ''}`);
    },
  },

  // Settings
  settings: {
    get: () => request('/settings'),
    update: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
    resetDemo: () => request('/settings/reset-demo', { method: 'POST' }),
    getBackup: () => request('/settings/backup'),
  },

  // Health
  getHealth: () => request('/health'),
};

export default api;
