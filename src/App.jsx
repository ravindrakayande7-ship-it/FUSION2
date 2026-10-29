import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { Layout } from './components/layout/Layout.jsx';

// Page components
import { Dashboard } from './pages/Dashboard.jsx';
import { POS } from './pages/POS.jsx';
import { Orders } from './pages/Orders.jsx';
import { KitchenDisplay } from './pages/KitchenDisplay.jsx';
import { MenuManagement } from './pages/MenuManagement.jsx';
import { Inventory } from './pages/Inventory.jsx';
import { Suppliers } from './pages/Suppliers.jsx';
import { Customers } from './pages/Customers.jsx';
import { StaffManagement } from './pages/StaffManagement.jsx';
import { Attendance } from './pages/Attendance.jsx';
import { Expenses } from './pages/Expenses.jsx';
import { Reports } from './pages/Reports.jsx';
import { Settings } from './pages/Settings.jsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/kitchen" element={<KitchenDisplay />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}
