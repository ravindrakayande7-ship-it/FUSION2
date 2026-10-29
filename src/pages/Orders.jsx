import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, formatDate, formatTime, exportToCSV } from '../utils/formatters.js';
import { ReceiptModal } from '../components/common/ReceiptModal.jsx';
import { ConfirmationModal } from '../components/common/ConfirmationModal.jsx';
import {
  Search,
  Filter,
  Download,
  Receipt,
  Eye,
  UtensilsCrossed,
  ShoppingBag,
  X,
} from 'lucide-react';

export const Orders = () => {
  const { orders, updateOrderStatus, cancelOrder } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  // Cancellation modal state
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason] = useState('Customer request');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        (o.customerPhone && o.customerPhone.includes(search));
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      const matchMethod = methodFilter === 'All' || o.paymentMethod === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [orders, search, statusFilter, methodFilter]);

  const handleExportCSV = () => {
    const headers = [
      'Order ID',
      'Date',
      'Customer',
      'Type',
      'Items Count',
      'Subtotal',
      'Discount',
      'Tax',
      'Total',
      'Payment Method',
      'Status',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      formatDate(o.createdAt),
      o.customerName,
      o.orderType,
      (o.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
      o.subtotal,
      o.discount,
      o.tax,
      o.total,
      o.paymentMethod,
      o.status,
    ]);
    exportToCSV(`FUSION_Orders_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    const res = await cancelOrder(orderToCancel.id, cancelReason);
    if (res && res.success) {
      setOrderToCancel(null);
      if (selectedOrderForDetails?.id === orderToCancel.id) {
        setSelectedOrderForDetails(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2C1810]">Order Management</h1>
          <p className="text-xs text-[#8C6D58]">
            Full register transactions, fulfillment status transitions, and customer receipts
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-white hover:bg-[#FAF7F2] border border-[#E8DFD8] rounded-xl transition-colors shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID (#FUS-XXXX), Customer name, phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] placeholder-[#A68A78] focus:outline-none focus:border-[#C87D32]"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#8C6D58]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-2.5 py-1.5 text-[#2C1810]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-2.5 py-1.5 text-[#2C1810]"
          >
            <option value="All">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD8] text-[#8C6D58] font-bold">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFEB]">
              {filteredOrders.map((order) => {
                const totalItemUnits = (order.items || []).reduce(
                  (a, b) => a + (b.quantity || 1),
                  0
                );
                return (
                  <tr key={order.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2C1810]">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-[#5C4538]">
                      <div>{formatDate(order.createdAt)}</div>
                      <div className="text-[10px] text-[#8C6D58]">
                        {formatTime(order.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#2C1810]">
                      <div className="font-semibold">{order.customerName}</div>
                      {order.customerPhone && (
                        <div className="text-[10px] text-[#8C6D58]">{order.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-[11px] text-[#5C4538]">
                        {order.orderType === 'Dine-in' ? (
                          <UtensilsCrossed className="w-3 h-3 text-[#C87D32]" />
                        ) : (
                          <ShoppingBag className="w-3 h-3 text-[#8C6D58]" />
                        )}
                        <span>{order.orderType}</span>
                        {order.tableNumber && (
                          <span className="text-[#8C6D58]">({order.tableNumber})</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5C4538] max-w-[180px] truncate">
                      <span className="font-semibold text-[#2C1810]">{totalItemUnits} items:</span>{' '}
                      {(order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#5C4538]">
                      <span className="font-semibold">{order.paymentMethod}</span>
                      <span className="text-[10px] text-emerald-700 block">
                        {order.isSimulatedPayment ? 'SIMULATED' : 'PAID'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md inline-block ${
                          order.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'Preparing'
                            ? 'bg-amber-50 text-amber-700'
                            : order.status === 'Ready'
                            ? 'bg-blue-50 text-blue-700'
                            : order.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-stone-100 text-[#5C4538]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#2C1810] tabular-nums">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrderForDetails(order)}
                          className="p-1.5 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#EBE2D8] rounded-lg transition-colors"
                          title="View order details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedReceiptOrder(order)}
                          className="p-1.5 text-[#5C4538] hover:text-[#2C1810] hover:bg-[#EBE2D8] rounded-lg transition-colors"
                          title="Print receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-xs text-[#8C6D58]">
              No orders found matching the filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Order View Drawer / Modal */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E8DFD8] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0E8E1] mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#2C1810]">
                    Order {selectedOrderForDetails.orderNumber}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      selectedOrderForDetails.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : selectedOrderForDetails.status === 'Cancelled'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {selectedOrderForDetails.status}
                  </span>
                </div>
                <p className="text-xs text-[#8C6D58]">
                  Placed {formatDate(selectedOrderForDetails.createdAt)} at{' '}
                  {formatTime(selectedOrderForDetails.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForDetails(null)}
                className="text-neutral-400 hover:text-[#2C1810] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & assignment summary */}
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFD8] text-xs space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-[#8C6D58]">Customer:</span>
                <span className="font-semibold text-[#2C1810]">
                  {selectedOrderForDetails.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C6D58]">Service Mode:</span>
                <span className="font-semibold text-[#2C1810]">
                  {selectedOrderForDetails.orderType}{' '}
                  {selectedOrderForDetails.tableNumber &&
                    `(${selectedOrderForDetails.tableNumber})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C6D58]">Assigned Barista:</span>
                <span className="font-semibold text-[#2C1810]">
                  {selectedOrderForDetails.assignedStaff}
                </span>
              </div>
              {selectedOrderForDetails.notes && (
                <div className="pt-1 border-t border-[#EDE5DE] text-[11px] text-[#A68A78]">
                  Note: {selectedOrderForDetails.notes}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-bold text-[#2C1810]">Ordered Items</h4>
              {(selectedOrderForDetails.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-[#FFFDF9] border border-[#F0E8E1] rounded-xl text-xs"
                >
                  <div>
                    <div className="font-bold text-[#2C1810]">
                      {item.quantity}x {item.name}
                    </div>
                    <div className="text-[11px] text-[#8C6D58]">
                      {item.size}
                      {item.customizations?.length > 0 &&
                        ` • +${item.customizations.map((c) => c.name).join(', ')}`}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#2C1810] tabular-nums">
                    {formatCurrency(item.totalItemPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial breakdown */}
            <div className="space-y-1 text-xs border-t border-[#F0E8E1] pt-3 mb-5">
              <div className="flex justify-between text-[#8C6D58]">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(selectedOrderForDetails.subtotal)}
                </span>
              </div>
              {selectedOrderForDetails.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono tabular-nums">
                    - {formatCurrency(selectedOrderForDetails.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#8C6D58]">
                <span>GST:</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(selectedOrderForDetails.tax)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#2C1810] pt-1 border-t border-[#F0E8E1]">
                <span>Total Amount:</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(selectedOrderForDetails.total)}
                </span>
              </div>
            </div>

            {/* Action buttons: Status transitions and Cancel */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E8E1]">
              <div className="flex items-center gap-1.5">
                {selectedOrderForDetails.status !== 'Cancelled' &&
                  selectedOrderForDetails.status !== 'Completed' && (
                    <button
                      onClick={() => setOrderToCancel(selectedOrderForDetails)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-xl transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
              </div>
              <div className="flex items-center gap-2">
                {selectedOrderForDetails.status === 'Pending' && (
                  <button
                    onClick={async () => {
                      const res = await updateOrderStatus(selectedOrderForDetails.id, 'Confirmed');
                      if (res?.success) setSelectedOrderForDetails(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2C1810] rounded-xl hover:bg-[#432519]"
                  >
                    Confirm Order
                  </button>
                )}
                {selectedOrderForDetails.status === 'Confirmed' && (
                  <button
                    onClick={async () => {
                      const res = await updateOrderStatus(selectedOrderForDetails.id, 'Preparing');
                      if (res?.success) setSelectedOrderForDetails(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C87D32] rounded-xl hover:bg-[#B36B26]"
                  >
                    Start Brewing
                  </button>
                )}
                {selectedOrderForDetails.status === 'Preparing' && (
                  <button
                    onClick={async () => {
                      const res = await updateOrderStatus(selectedOrderForDetails.id, 'Ready');
                      if (res?.success) setSelectedOrderForDetails(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                  >
                    Mark Ready
                  </button>
                )}
                {selectedOrderForDetails.status === 'Ready' && (
                  <button
                    onClick={async () => {
                      const res = await updateOrderStatus(selectedOrderForDetails.id, 'Completed');
                      if (res?.success) setSelectedOrderForDetails(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
                  >
                    Complete Handover
                  </button>
                )}
                <button
                  onClick={() => setSelectedReceiptOrder(selectedOrderForDetails)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5C4538] bg-[#F5EFEB] hover:bg-[#EBE2D8] rounded-xl"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order confirmation modal */}
      <ConfirmationModal
        isOpen={Boolean(orderToCancel)}
        title="Cancel Order &amp; Restore Inventory?"
        message={`Are you sure you want to cancel ${orderToCancel?.orderNumber}? All recipe ingredients will be automatically returned to current stock.`}
        confirmLabel="Cancel Order &amp; Restore Stock"
        isDestructive={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setOrderToCancel(null)}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};

export default Orders;
