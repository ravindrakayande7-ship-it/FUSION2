import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, exportToCSV } from '../utils/formatters.js';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const Reports = () => {
  const { orders, expenses, products, settings } = useApp();

  // Filter completed / non-cancelled orders
  const validOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'Cancelled');
  }, [orders]);

  // Financial Calculations
  const totalGrossSales = validOrders.reduce(
    (sum, o) => sum + (Number(o.subtotal) || 0) - (Number(o.discount) || 0),
    0
  );
  const totalTaxCollected = validOrders.reduce((sum, o) => sum + (Number(o.tax) || 0), 0);
  const totalNetRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Total COGS: sum of (item.cost * quantity)
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

  const estimatedGrossProfit = Math.max(0, totalGrossSales - totalCOGS);
  const grossProfitMargin =
    totalGrossSales > 0 ? ((estimatedGrossProfit / totalGrossSales) * 100).toFixed(1) : '0';
  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const estimatedOperatingProfit = estimatedGrossProfit - totalOperatingExpenses;

  // Category breakdown
  const categorySalesMap = {};
  validOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || 'Hot Coffee';
      categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (item.totalItemPrice || 0);
    });
  });

  const categoryChartData = Object.entries(categorySalesMap).map(([name, value]) => ({
    name,
    value,
  }));

  const CATEGORY_COLORS = ['#C87D32', '#2C1810', '#D97706', '#8C6D58', '#432519', '#E29D62'];

  // Daily revenue bar data
  const revenueHistory = [
    { date: 'Oct 09', sales: 4200, cogs: 1100, profit: 3100 },
    { date: 'Oct 10', sales: 5100, cogs: 1350, profit: 3750 },
    { date: 'Oct 11', sales: 4850, cogs: 1220, profit: 3630 },
    { date: 'Oct 12', sales: 6300, cogs: 1650, profit: 4650 },
    { date: 'Oct 13', sales: 8400, cogs: 2100, profit: 6300 },
    { date: 'Oct 14', sales: 11200, cogs: 2900, profit: 8300 },
    {
      date: 'Oct 15',
      sales: totalGrossSales || 9800,
      cogs: totalCOGS || 2400,
      profit: estimatedGrossProfit || 7400,
    },
  ];

  const handleExportFinancialSummary = () => {
    const headers = ['Financial Metric', 'Value (INR)', 'Notes'];
    const rows = [
      ['Gross Merchandise Sales (Net of Discount)', totalGrossSales, 'Excludes taxes'],
      ['GST Taxes Collected', totalTaxCollected, `${settings.taxRatePercent}% Cafe Rate`],
      ['Total Register Receipts (Net Revenue)', totalNetRevenue, 'Gross + Tax'],
      ['Cost of Goods Sold (COGS)', totalCOGS, 'Recipe ingredients directly consumed'],
      ['Estimated Gross Profit', estimatedGrossProfit, `Gross Margin: ${grossProfitMargin}%`],
      ['Total Operating Expenses', totalOperatingExpenses, 'Rent, power, salaries, maintenance'],
      ['Estimated Net Operating Profit', estimatedOperatingProfit, 'Gross Profit minus Operating Expenses'],
    ];
    exportToCSV(`FUSION_Financial_Report_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Financial Reports &amp; Performance</h1>
          <p className="text-xs text-[#8C6D58]">
            P&amp;L statement, recipe gross margins, category velocity, and operating profit audits
          </p>
        </div>
        <button
          onClick={handleExportFinancialSummary}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-white hover:bg-[#FAF7F2] border border-[#E8DFD8] rounded-xl transition-colors shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export P&amp;L Summary</span>
        </button>
      </div>

      {/* P&L Financial Statement Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E8E1] mb-5">
          <div>
            <h2 className="text-base font-bold text-[#2C1810]">
              Café Profit &amp; Loss Statement (P&amp;L)
            </h2>
            <p className="text-xs text-[#8C6D58]">
              Standardised accounting breakdown avoiding double-counting between COGS and general expenses
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#C87D32] bg-[#FAF7F2] px-3 py-1 rounded-lg border border-[#EDE5DE]">
            FY 2026-27 (Q3)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE5DE]">
            <span className="text-xs text-[#8C6D58] block mb-1">Gross Merchandise Sales</span>
            <div className="text-xl font-bold text-[#2C1810] font-mono tabular-nums">
              {formatCurrency(totalGrossSales)}
            </div>
            <span className="text-[11px] text-[#A68A78] mt-1 block">Excluding GST</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE5DE]">
            <span className="text-xs text-[#8C6D58] block mb-1">Cost of Goods Sold (COGS)</span>
            <div className="text-xl font-bold text-rose-700 font-mono tabular-nums">
              - {formatCurrency(totalCOGS)}
            </div>
            <span className="text-[11px] text-[#A68A78] mt-1 block">Beans, milk, syrups &amp; cups</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-xs text-amber-900 block mb-1">Estimated Gross Profit</span>
            <div className="text-xl font-bold text-[#2C1810] font-mono tabular-nums">
              {formatCurrency(estimatedGrossProfit)}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
              {grossProfitMargin}% Gross Margin
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#2C1810] text-white">
            <span className="text-xs text-[#E29D62] block mb-1">Estimated Operating Profit</span>
            <div className="text-xl font-bold font-mono tabular-nums">
              {formatCurrency(estimatedOperatingProfit)}
            </div>
            <span className="text-[11px] text-[#D8C7B9] mt-1 block">
              After {formatCurrency(totalOperatingExpenses)} expenses
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs COGS Bar chart */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
          <h3 className="text-sm font-bold text-[#2C1810] mb-1">Daily Revenue vs Ingredient Cost</h3>
          <p className="text-xs text-[#8C6D58] mb-4">Direct margin comparison across recent trading days</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0E8E1" />
                <XAxis dataKey="date" tick={{ fill: '#8C6D58', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8C6D58', fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [formatCurrency(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#2C1810',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="sales" name="Sales (₹)" fill="#C87D32" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" name="COGS (₹)" fill="#2C1810" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Donut */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#2C1810] mb-1">Category Contribution</h3>
            <p className="text-xs text-[#8C6D58]">Share of revenue by menu category</p>
          </div>
          <div className="h-52 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [formatCurrency(Number(val)), 'Sales']}
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
            {categoryChartData.map((c, idx) => (
              <div key={c.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span className="text-[#5C4538] truncate">{c.name}</span>
                <span className="font-mono font-semibold ml-auto tabular-nums">
                  {formatCurrency(c.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
