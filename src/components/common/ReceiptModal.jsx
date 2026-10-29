import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters.js';
import { Printer, X, Coffee } from 'lucide-react';

export const ReceiptModal = ({ order, isOpen, onClose }) => {
  const { settings } = useApp();

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="bg-white border border-[#E8DFD8] rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4 print:hidden">
          <span className="text-xs font-semibold text-[#8C6D58] uppercase tracking-wider">
            Thermal Receipt Preview
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2C1810] hover:bg-[#4A2E1B] rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable thermal receipt layout */}
        <div
          id="printable-receipt"
          className="font-mono text-xs text-neutral-900 leading-relaxed bg-[#FFFDF9] p-4 border border-dashed border-neutral-300 rounded-xl"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-300">
            <div className="flex items-center justify-center gap-1.5 text-[#2C1810] font-sans font-bold text-base mb-0.5">
              <Coffee className="w-4 h-4 text-[#C87D32]" />
              <span>{settings.cafeName}</span>
            </div>
            <p className="text-[11px] text-neutral-600 font-sans italic">{settings.tagline}</p>
            <p className="text-[10px] text-neutral-500 mt-1">{settings.address}</p>
            <p className="text-[10px] text-neutral-500">
              Ph: {settings.phone} | GSTIN: {settings.gstin}
            </p>
          </div>

          {/* Order Info */}
          <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1">
            <div className="flex justify-between font-semibold text-[13px]">
              <span>ORDER: {order.orderNumber}</span>
              <span>{order.orderType?.toUpperCase()}</span>
            </div>
            {order.tableNumber && (
              <div className="text-[11px] text-neutral-600">Assigned: {order.tableNumber}</div>
            )}
            <div className="flex justify-between text-[11px] text-neutral-600">
              <span>Date: {formatDate(order.createdAt)}</span>
              <span>{formatTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-600">
              <span>Customer: {order.customerName}</span>
              <span>Staff: {order.assignedStaff}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-neutral-300 space-y-2">
            <div className="flex justify-between text-[11px] font-semibold text-neutral-700 border-b border-neutral-200 pb-1">
              <span>ITEM</span>
              <span>QTY × RATE</span>
              <span className="text-right">AMT</span>
            </div>
            {order.items?.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-start">
                  <div className="max-w-[150px]">
                    <div className="font-semibold text-neutral-900">{item.name}</div>
                    <div className="text-[10px] text-neutral-500">
                      {item.size}
                      {item.customizations?.length > 0 &&
                        ` | +${item.customizations.map((c) => c.name).join(', ')}`}
                    </div>
                  </div>
                  <span className="text-neutral-600 tabular-nums">
                    {item.quantity} × {item.price}
                  </span>
                  <span className="font-semibold text-neutral-900 tabular-nums text-right">
                    {formatCurrency(item.totalItemPrice)}
                  </span>
                </div>
                {item.notes && (
                  <div className="text-[10px] text-neutral-500 italic">Note: {item.notes}</div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({order.discountReason || 'Promo'}):</span>
                <span className="tabular-nums">- {formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>GST ({settings.taxRatePercent}%):</span>
              <span className="tabular-nums">{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1 border-t border-neutral-200">
              <span>NET TOTAL:</span>
              <span className="tabular-nums">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment & Footer */}
          <div className="pt-2.5 text-center space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-700">
              <span>Payment Mode:</span>
              <span className="font-semibold">
                {order.paymentMethod?.toUpperCase()}{' '}
                {order.razorpayPaymentId
                  ? '(RAZORPAY VERIFIED)'
                  : order.isSimulatedPayment || order.paymentStatus?.includes('Simulated')
                  ? '(SIMULATED TEST)'
                  : '(VERIFIED CASH)'}
              </span>
            </div>
            {order.razorpayPaymentId && (
              <div className="text-[10px] py-0.5 px-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono mt-1 text-left flex justify-between">
                <span>Razorpay Txn:</span>
                <span className="font-semibold">{order.razorpayPaymentId}</span>
              </div>
            )}
            {order.isSimulatedPayment && (
              <div className="text-[10px] py-1 px-2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono mt-1">
                * DEMO TEST MODE | NO REAL TRANSACTION *
              </div>
            )}
            <p className="text-[10px] text-neutral-500 pt-2 font-sans">
              {settings.receiptFooterMessage}
            </p>
            <div className="text-[9px] text-neutral-400 font-mono tracking-widest pt-1">
              *** THANK YOU VISIT AGAIN ***
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-[#F5EFEB] rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#4A2E1B] rounded-xl transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
