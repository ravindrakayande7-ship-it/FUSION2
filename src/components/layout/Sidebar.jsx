import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  ChefHat,
  Coffee,
  Package,
  Truck,
  Users,
  UserCheck,
  CalendarCheck,
  ReceiptText,
  BarChart3,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

export const Sidebar = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { orders, inventory, settings, role } = useApp();

  const pendingKitchenCount = orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Preparing'
  ).length;

  const lowStockCount = inventory.filter((i) => (Number(i.stock) || 0) <= (Number(i.minThreshold) || 0)).length;

  const isOwner = role === 'Owner';
  const isManagerOrOwner = role === 'Owner' || role === 'Manager';

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, visible: true },
    { name: 'Point of Sale', path: '/pos', icon: ShoppingCart, visible: true },
    {
      name: 'Orders',
      path: '/orders',
      icon: ClipboardList,
      count: orders.filter((o) => o.status === 'Pending' || o.status === 'Preparing').length,
      visible: true,
    },
    {
      name: 'Kitchen Display',
      path: '/kitchen',
      icon: ChefHat,
      count: pendingKitchenCount,
      countColor: 'bg-[#D97706] text-white',
      visible: true,
    },
    { name: 'Menu Management', path: '/menu', icon: Coffee, visible: true },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Package,
      count: lowStockCount > 0 ? lowStockCount : undefined,
      countColor: 'bg-rose-500 text-white',
      visible: true,
    },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, visible: isManagerOrOwner },
    { name: 'Customers', path: '/customers', icon: Users, visible: true },
    { name: 'Staff Management', path: '/staff', icon: UserCheck, visible: isManagerOrOwner },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck, visible: true },
    { name: 'Expenses', path: '/expenses', icon: ReceiptText, visible: isManagerOrOwner },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, visible: isManagerOrOwner },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, visible: isOwner },
  ];

  const navItems = allNavItems.filter((i) => i.visible);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#1C100B] text-[#EAE0D5] border-r border-[#2F1D15] flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#2F1D15] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E29D62] to-[#B86B27] flex items-center justify-center text-[#1C100B] shadow-md shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base tracking-wider text-white">FUSION</span>
                <span className="text-[10px] text-[#A68A78] truncate tracking-wide">
                  {settings.tagline}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-[#A68A78] hover:text-white hover:bg-[#2A1810] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-[#3C2216] text-[#FCEBD9] shadow-xs'
                      : 'text-[#B8A394] hover:text-[#FAF5EF] hover:bg-[#28160E]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#E29D62]' : 'text-[#8E7464] group-hover:text-[#E29D62]'
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}
                    {!collapsed && item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
                          item.countColor || 'bg-[#2E1A11] text-[#E29D62]'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                    {/* Collapsed tooltip */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#2C1810] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity shadow-lg z-50 border border-[#44281B]">
                        {item.name}
                        {item.count !== undefined && item.count > 0 && ` (${item.count})`}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Cafe status footer */}
        <div className="p-3 border-t border-[#2F1D15] shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between text-xs text-[#8E7464]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-[#D8C7B9]">
                  {role !== 'Guest' ? `${role} Active` : 'Store Online'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#A68A78]">v1.0.0</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Store Active" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
