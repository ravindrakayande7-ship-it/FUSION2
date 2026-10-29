import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import { ReceiptModal } from '../components/common/ReceiptModal.jsx';
import {
  TrendingUp,
  ShoppingBag,
  Coins,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Receipt,
  Coffee,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { orders, inventory, settings } = useApp();
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  // Active / Completed orders
  const validOrders = orders.filter((o) => o.status !== 'Cancelled');
  const todayRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? todayRevenue / (validOrders.length || 1) : 0;

  // Estimated gross profit: Revenue minus product COGS
  const totalCOGS = validOrders.reduce((acc, order) => {
    return (
      acc +
      (order.items || []).reduce(
        (itemAcc, item) =>
          itemAcc + (Number(item.cost) || 0) * (Number(item.quantity) || 1),
        0
      )
    );
  }, 0);
  const grossProfit = Math.max(0, todayRevenue - totalCOGS);
  const grossMarginPct = todayRevenue > 0 ? Math.round((grossProfit / todayRevenue) * 100) : 0;

  // Pending and low stock
  const pendingOrders = orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Preparing'
  );
  const lowStockItems = inventory.filter(
    (i) => (Number(i.stock) || 0) <= (Number(i.minThreshold) || 0)
  );

  // Weekly sales trend data dynamically integrating today's live revenue
  const salesTrendData = [
    { day: 'Mon', sales: 4200, orders: 18 },
    { day: 'Tue', sales: 5100, orders: 22 },
    { day: 'Wed', sales: 4850, orders: 20 },
    { day: 'Thu', sales: 6300, orders: 27 },
    { day: 'Fri', sales: 8400, orders: 36 },
    { day: 'Sat', sales: 11200, orders: 48 },
    {
      day: 'Sun (Live)',
      sales: Math.max(todayRevenue, 9800),
      orders: Math.max(validOrders.length, 42),
    },
  ];

  // Best selling products
  const productSalesMap = {};
  validOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { name: item.name, count: 0, revenue: 0 };
      }
      productSalesMap[item.name].count += item.quantity || 1;
      productSalesMap[item.name].revenue += item.totalItemPrice || 0;
    });
  });

  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Status distribution for donut
  const statusCounts = [
    {
      name: 'Completed',
      value: orders.filter((o) => o.status === 'Completed').length,
      color: '#16A34A',
    },
    {
      name: 'Preparing',
      value: orders.filter((o) => o.status === 'Preparing').length,
      color: '#D97706',
    },
    {
      name: 'Pending',
      value: orders.filter((o) => o.status === 'Pending').length,
      color: '#E29D62',
    },
    {
      name: 'Cancelled',
      value: orders.filter((o) => o.status === 'Cancelled').length,
      color: '#DC2626',
    },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Store Announcement Strip */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E8DFD8] bg-[#2C1810] text-white shadow-sm">
        <div className="absolute inset-0 opacity-25">
          <img
            src="/src/assets/images/fusion_cafe_hero_1792072634183.jpg"
            alt="FUSION Roastery Counter"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2C1810] via-[#2C1810]/80 to-transparent" />
        </div>
        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#E29D62]">
              <Coffee className="w-4 h-4" />
              <span>Café Operations Console</span>
              <span className="text-[#8C6D58]">•</span>
              <span>{settings.address?.split(',')[1] || 'Bengaluru'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {settings.cafeName}
            </h1>
            <p className="text-xs sm:text-sm text-[#D8C7B9] leading-relaxed">
              Brewed fresh with precision. Real-time billing, ingredient stock sync, KDS kitchen orders, and daily profitability.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#2C1810] bg-[#E29D62] hover:bg-[#D58C4F] rounded-xl transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Launch POS Billing</span>
            </button>
            <button
              onClick={() => navigate('/kitchen')}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-xs rounded-xl border border-white/15 transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Kitchen Display ({pendingOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs hover:border-[#D5C2B4] transition-all">
          <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2">
            <span>Today's Net Sales</span>
            <span className="p-2 bg-amber-50 text-[#C87D32] rounded-xl">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#2C1810] tabular-nums tracking-tight">
            {formatCurrency(todayRevenue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Live register active</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs hover:border-[#D5C2B4] transition-all">
          <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2">
            <span>Total Orders Handled</span>
            <span className="p-2 bg-stone-100 text-[#5C4538] rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#2C1810] tabular-nums tracking-tight">
            {totalOrdersCount}
          </div>
          <div className="mt-2 text-xs text-[#8C6D58]">
            <span className="font-semibold text-[#2C1810] tabular-nums">{validOrders.length}</span> completed • <span className="tabular-nums">{pendingOrders.length}</span> active
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs hover:border-[#D5C2B4] transition-all">
          <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2">
            <span>Average Order Value</span>
            <span className="p-2 bg-orange-50 text-[#D97706] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#2C1810] tabular-nums tracking-tight">
            {formatCurrency(avgOrderValue)}
          </div>
          <div className="mt-2 text-xs text-[#8C6D58]">
            Est. Margin: <span className="font-semibold text-emerald-700">{grossMarginPct}%</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs hover:border-[#D5C2B4] transition-all">
          <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2">
            <span>Kitchen &amp; Stock Status</span>
            <span
              className={`p-2 rounded-xl ${
                lowStockItems.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#2C1810] tabular-nums tracking-tight">
            {pendingOrders.length} <span className="text-sm font-normal text-[#8C6D58]">in queue</span>
          </div>
          <div className="mt-2 text-xs">
            {lowStockItems.length > 0 ? (
              <span className="text-rose-600 font-medium">
                {lowStockItems.length} ingredient alerts
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">All stocks healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend area chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#2C1810]">Weekly Sales Velocity</h2>
              <p className="text-xs text-[#8C6D58]">Revenue performance over the last 7 operating days</p>
            </div>
            <span className="text-xs font-mono text-[#C87D32] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E8DFD8]">
              INR (₹) Tabular
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C87D32" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C87D32" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0E8E1" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: '#E8DFD8' }}
                  tick={{ fill: '#8C6D58', fontSize: 11 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8C6D58', fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                  contentStyle={{
                    backgroundColor: '#2C1810',
                    borderColor: '#4A2E1F',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#E29D62' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#C87D32"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order status breakdown donut */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#2C1810]">Order Fulfillment Distribution</h2>
            <p className="text-xs text-[#8C6D58]">Current status of all recorded transactions</p>
          </div>
          <div className="h-48 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2C1810',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F5EFEB] text-xs">
            {statusCounts.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[#5C4538]">{s.name}</span>
                <span className="font-mono font-semibold ml-auto tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Best Sellers & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best sellers */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#2C1810]">Top Selling Menu Items</h2>
              <p className="text-xs text-[#8C6D58]">Ranked by volume ordered</p>
            </div>
            <button
              onClick={() => navigate('/menu')}
              className="text-xs font-semibold text-[#C87D32] hover:underline"
            >
              View Menu →
            </button>
          </div>
          <div className="space-y-3">
            {bestSellers.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl border border-[#F0E8E1]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#2C1810] text-[#E29D62] text-xs font-bold flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#2C1810]">{item.name}</h4>
                    <span className="text-[11px] text-[#8C6D58] font-mono tabular-nums">
                      {item.count} orders placed
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#2C1810] font-mono tabular-nums">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
            {bestSellers.length === 0 && (
              <p className="text-xs text-center py-6 text-[#8C6D58]">No sales records yet.</p>
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#2C1810]">Recent Store Orders</h2>
              <p className="text-xs text-[#8C6D58]">Live register activity</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-[#C87D32] hover:underline"
            >
              All Orders →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DFD8] text-[#8C6D58] font-semibold">
                  <th className="pb-2.5">Order</th>
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Items</th>
                  <th className="pb-2.5">Method</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Total</th>
                  <th className="pb-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFEB]">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="py-2.5 font-mono font-bold text-[#2C1810]">
                      {order.orderNumber}
                    </td>
                    <td className="py-2.5 text-[#5C4538]">
                      <div>{order.customerName}</div>
                      <div className="text-[10px] text-[#8C6D58]">{order.orderType}</div>
                    </td>
                    <td className="py-2.5 text-[#5C4538] max-w-[160px] truncate">
                      {(order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-2.5 font-mono text-[#8C6D58]">
                      {order.paymentMethod}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          order.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'Preparing'
                            ? 'bg-amber-50 text-amber-700'
                            : order.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-stone-100 text-[#5C4538]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-[#2C1810] tabular-nums">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setSelectedReceiptOrder(order)}
                        className="p-1 text-[#8C6D58] hover:text-[#2C1810] hover:bg-[#EBE2D8] rounded-md transition-colors"
                        title="View printable receipt"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable receipt modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};

export default Dashboard;
