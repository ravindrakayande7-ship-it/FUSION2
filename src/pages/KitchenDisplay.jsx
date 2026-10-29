import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatTime } from '../utils/formatters.js';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Bell,
  Volume2,
  VolumeX,
  Flame,
  Check,
} from 'lucide-react';

export const KitchenDisplay = () => {
  const { orders, updateOrderStatus } = useApp();
  const [filterLane, setFilterLane] = useState('All');
  const [tickedItems, setTickedItems] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filter only active kitchen orders
  const activeKitchenOrders = orders.filter((o) => {
    if (o.status === 'Completed' || o.status === 'Cancelled') return false;
    if (filterLane === 'All') return true;
    if (filterLane === 'Pending') return o.status === 'Pending' || o.status === 'Confirmed';
    return o.status === filterLane;
  });

  const toggleItemTick = (key) => {
    setTickedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  const handleAdvanceStatus = async (order) => {
    playKitchenChime();
    if (order.status === 'Pending' || order.status === 'Confirmed') {
      await updateOrderStatus(order.id, 'Preparing');
    } else if (order.status === 'Preparing') {
      await updateOrderStatus(order.id, 'Ready');
    } else if (order.status === 'Ready') {
      await updateOrderStatus(order.id, 'Completed');
    }
  };

  return (
    <div className="space-y-6">
      {/* KDS Header Bar */}
      <div className="bg-[#2C1810] text-white p-5 rounded-2xl border border-[#44281B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E29D62] text-[#2C1810] flex items-center justify-center font-bold shadow-sm">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Kitchen Display Screen (KDS)</h1>
            <p className="text-xs text-[#D8C7B9]">
              Live espresso bar &amp; kitchen prep queue • Real-time tickets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound alert toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#E29D62]" />
                <span>Audio Alert On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                <span>Audio Muted</span>
              </>
            )}
          </button>

          {/* Lane filters */}
          <div className="flex items-center gap-1 bg-[#1A0E08] p-1 rounded-xl border border-[#3C2216]">
            {['All', 'Pending', 'Preparing', 'Ready'].map((lane) => (
              <button
                key={lane}
                onClick={() => setFilterLane(lane)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterLane === lane
                    ? 'bg-[#E29D62] text-[#2C1810]'
                    : 'text-[#B8A394] hover:text-white'
                }`}
              >
                {lane}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {activeKitchenOrders.map((order) => {
          const isPending = order.status === 'Pending' || order.status === 'Confirmed';
          const isPreparing = order.status === 'Preparing';
          const isReady = order.status === 'Ready';

          return (
            <div
              key={order.id}
              className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xs transition-all ${
                isReady
                  ? 'bg-blue-50/40 border-blue-300'
                  : isPreparing
                  ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20'
                  : 'bg-white border-[#E8DFD8]'
              }`}
            >
              {/* Ticket Header */}
              <div
                className={`p-4 border-b flex items-center justify-between ${
                  isReady
                    ? 'bg-blue-100/60 border-blue-200 text-blue-950'
                    : isPreparing
                    ? 'bg-amber-100/70 border-amber-200 text-amber-950'
                    : 'bg-[#FAF7F2] border-[#EDE5DE] text-[#2C1810]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base">{order.orderNumber}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/70 border border-black/5">
                    {order.orderType === 'Dine-in' ? order.tableNumber || 'Dine-in' : 'Takeaway'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(order.createdAt)}</span>
                </div>
              </div>

              {/* Ticket Body Items */}
              <div className="p-4 space-y-3 flex-1 bg-white">
                <div className="flex items-center justify-between text-xs text-[#8C6D58] pb-1 border-b border-[#F5EFEB]">
                  <span>
                    Customer: <strong className="text-[#2C1810]">{order.customerName}</strong>
                  </span>
                  <span className="font-semibold text-[#C87D32]">{order.status.toUpperCase()}</span>
                </div>

                <div className="space-y-2">
                  {(order.items || []).map((item, idx) => {
                    const itemKey = `${order.id}-${idx}`;
                    const isChecked = Boolean(tickedItems[itemKey]);

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItemTick(itemKey)}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-3 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-[#FAF7F2] border-emerald-200 opacity-60 line-through'
                            : 'bg-[#FFFDF9] border-[#EDE5DE] hover:border-[#D5C2B4]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-neutral-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm text-[#2C1810]">
                            {item.quantity} × {item.name}
                          </div>
                          <div className="text-[11px] text-[#7A6354]">
                            Size: <span className="font-medium text-[#2C1810]">{item.size}</span>
                          </div>
                          {item.customizations?.length > 0 && (
                            <div className="text-[11px] text-[#C87D32] font-semibold mt-0.5">
                              + {item.customizations.map((c) => c.name).join(', ')}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.notes && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold">Ticket Memo:</span> {order.notes}
                  </div>
                )}
              </div>

              {/* Action Button at Bottom */}
              <div className="p-3 border-t border-[#F0E8E1] bg-[#FAF7F2]">
                <button
                  onClick={() => handleAdvanceStatus(order)}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                    isPending
                      ? 'bg-[#2C1810] hover:bg-[#432519] text-white'
                      : isPreparing
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isPending && (
                    <>
                      <Flame className="w-4 h-4 text-[#E29D62]" />
                      <span>Start Preparing Order</span>
                    </>
                  )}
                  {isPreparing && (
                    <>
                      <Bell className="w-4 h-4 text-white" />
                      <span>Mark Order Ready for Pickup</span>
                    </>
                  )}
                  {isReady && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Handover &amp; Mark Completed</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {activeKitchenOrders.length === 0 && (
          <div className="col-span-full py-16 bg-white rounded-2xl border border-[#E8DFD8] text-center p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#2C1810]">Kitchen Queue is Clear!</h3>
            <p className="text-xs text-[#8C6D58] mt-1 max-w-sm mx-auto">
              All placed orders have been prepared and handed over to guests. New POS orders will instantly pop up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDisplay;
