import React, { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { ToastContainer } from '../common/Toast.jsx';
import { LoginModal } from '../common/LoginModal.jsx';
import { useApp } from '../../context/AppContext.jsx';

export const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoginModalOpen, closeLoginModal } = useApp();

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C1810] flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
        <ToastContainer />
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      </div>
    </div>
  );
};

export default Layout;
