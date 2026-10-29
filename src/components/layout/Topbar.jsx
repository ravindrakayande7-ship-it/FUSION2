import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import {
  Menu,
  Search,
  Bell,
  PlusCircle,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  Clock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';

export const Topbar = ({ onOpenMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    role,
    login,
    logout,
    openLoginModal,
    settings,
    inventory,
    orders,
    searchQuery,
    setSearchQuery,
    resetAllData,
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const lowStockItems = inventory.filter((i) => (Number(i.stock) || 0) <= (Number(i.minThreshold) || 0));
  const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Preparing');
  const totalNotifications = lowStockItems.length + (pendingOrders.length > 0 ? 1 : 0);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Overview Dashboard';
      case '/pos':
        return 'Point of Sale (POS)';
      case '/orders':
        return 'Order History & Status';
      case '/kitchen':
        return 'Kitchen Display Screen (KDS)';
      case '/menu':
        return 'Menu & Recipe Management';
      case '/inventory':
        return 'Stock & Ingredient Inventory';
      case '/suppliers':
        return 'Supplier Directory';
      case '/customers':
        return 'Customer CRM & Loyalty';
      case '/staff':
        return 'Staff & Employee Directory';
      case '/attendance':
        return 'Daily Attendance & Shifts';
      case '/expenses':
        return 'Operating Expense Ledger';
      case '/reports':
        return 'Sales & Financial Reports';
      case '/settings':
        return 'Store & System Settings';
      default:
        return 'Management System';
    }
  };

  const quickRoles = [
    { role: 'Owner', email: 'owner@fusioncoffee.in', desc: 'Full store & finance control' },
    { role: 'Manager', email: 'manager@fusioncoffee.in', desc: 'Staff, inventory & reports' },
    { role: 'Cashier', email: 'cashier@fusioncoffee.in', desc: 'POS register & billing' },
    { role: 'Barista', email: 'barista@fusioncoffee.in', desc: 'Kitchen prep & order status' },
  ];

  const handleQuickSwitchAccount = async (targetEmail) => {
    try {
      await login(targetEmail, 'password123');
      setShowUserDropdown(false);
    } catch {
      openLoginModal();
    }
  };

  const isPosPage = location.pathname === '/pos';

  return (
    <header className="h-14 sm:h-16 bg-[#FFFFFF] border-b border-[#EBE3DC] px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 sm:p-2 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#F5EFEB] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C87D32]"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[#8C6D58] truncate">
            <span className="font-semibold text-[#2C1810] truncate">{settings.cafeName || 'FUSION'}</span>
            <span className="text-[#D0C2B6]">/</span>
            <span className="font-medium text-[#5C4538] truncate">{getPageTitle()}</span>
          </div>
          <span className="text-[11px] text-[#A68A78] hidden sm:inline leading-tight">
            Today: {formatDate(new Date().toISOString())}
          </span>
        </div>
      </div>

      {/* Zone 2: Global Search (Hidden when on POS to avoid redundant duplicate search input) */}
      {!isPosPage ? (
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, orders, ingredients, or customers..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] placeholder-[#A68A78] focus:outline-none focus:border-[#C87D32] focus:bg-white transition-all focus:ring-1 focus:ring-[#C87D32]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700"
                aria-label="Clear global search"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8DFD8] text-[11px] text-[#7A6354]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Active POS Terminal</span>
          </div>
        </div>
      )}

      {/* Zone 3: Actions, Alerts, User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Reset Demo Data */}
        {role === 'Owner' && (
          <button
            onClick={() => setShowResetConfirm(true)}
            title="Reset cafe demo data"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-[#7D6454] hover:text-[#2C1810] hover:bg-[#F5EFEB] rounded-lg border border-[#E8DFD8] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            className="relative p-2 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#F5EFEB] rounded-xl transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D97706] rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E8DFD8] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0E8E1] mb-2">
                <span className="text-xs font-bold text-[#2C1810]">Store Alerts &amp; Activity</span>
                <span className="text-[10px] text-[#8C6D58] font-mono tabular-nums">
                  {totalNotifications} active
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockItems.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{lowStockItems.length} Low-Stock Ingredients</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      {lowStockItems.map((i) => i.name).slice(0, 3).join(', ')}
                      {lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}
                    </p>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/inventory');
                      }}
                      className="text-[11px] font-semibold text-amber-900 underline pt-0.5"
                    >
                      Restock in Inventory →
                    </button>
                  </div>
                )}
                {pendingOrders.length > 0 && (
                  <div className="p-2.5 bg-[#FAF7F2] border border-[#E8DFD8] rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#2C1810]">
                      <Clock className="w-3.5 h-3.5 text-[#C87D32] shrink-0" />
                      <span>{pendingOrders.length} Orders in Kitchen Queue</span>
                    </div>
                    <p className="text-[11px] text-[#5C4538]">
                      Orders awaiting preparation or barista pickup.
                    </p>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/kitchen');
                      }}
                      className="text-[11px] font-semibold text-[#C87D32] underline pt-0.5"
                    >
                      Open Kitchen Screen →
                    </button>
                  </div>
                )}
                {totalNotifications === 0 && (
                  <p className="text-xs text-center py-4 text-[#8C6D58]">All systems normal.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Sign In */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E8DFD8] rounded-xl transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-[#2C1810] text-[#E29D62] flex items-center justify-center text-[10px] font-bold">
                {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-[#2C1810] leading-none truncate max-w-[100px]">
                  {currentUser.name || role}
                </span>
                <span className="text-[9px] text-[#8C6D58]">{role}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#8C6D58]" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E8DFD8] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[#F0E8E1] mb-1">
                  <div className="text-xs font-bold text-[#2C1810]">{currentUser.name}</div>
                  <div className="text-[10px] text-[#8C6D58] truncate">{currentUser.email}</div>
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[9px] font-bold uppercase tracking-wider">
                    {role} Role
                  </div>
                </div>

                <div className="py-1">
                  <span className="px-2 text-[10px] font-semibold text-[#A68A78] uppercase tracking-wider">
                    Switch Staff Account
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {quickRoles.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => handleQuickSwitchAccount(r.email)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          role === r.role
                            ? 'bg-[#2C1810] text-white font-semibold'
                            : 'text-[#2C1810] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <div>
                          <div>{r.role}</div>
                          <div
                            className={`text-[9px] ${
                              role === r.role ? 'text-[#D8C7B9]' : 'text-[#8C6D58]'
                            }`}
                          >
                            {r.desc}
                          </div>
                        </div>
                        {role === r.role && <ShieldCheck className="w-3.5 h-3.5 text-[#E29D62]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0E8E1] mt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openLoginModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2C1810] bg-[#F5EFEB] hover:bg-[#EBE2D8] border border-[#E8DFD8] rounded-xl transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-[#C87D32]" />
            <span>Sign In</span>
          </button>
        )}

        {/* Primary Action Button */}
        {!isPosPage ? (
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-all shadow-xs whitespace-nowrap active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C87D32]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#E29D62]" />
            <span className="hidden sm:inline">New Order</span>
            <span className="sm:hidden">POS</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#2C1810] bg-[#FAF7F2] border border-[#E8DFD8] rounded-xl whitespace-nowrap">
            <PlusCircle className="w-3.5 h-3.5 text-[#C87D32]" />
            <span className="text-[11px] font-bold">Register Active</span>
          </div>
        )}
      </div>

      {/* Confirmation modal for reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E8DFD8]">
            <h4 className="text-sm font-bold text-[#2C1810] mb-2">Reset Demo Data?</h4>
            <p className="text-xs text-[#5C4538] mb-4">
              This will restore the original café orders, products, inventory counts, and staff records.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#5C4538] bg-[#F5EFEB] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;
