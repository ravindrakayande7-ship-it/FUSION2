import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { storageService } from '../services/storageService.js';
import { ConfirmationModal } from '../components/common/ConfirmationModal.jsx';
import {
  Store,
  Receipt,
  Percent,
  Database,
  RotateCcw,
  Download,
  Save,
} from 'lucide-react';

export const Settings = () => {
  const { settings, updateSettings, resetAllData, role } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isOwner = role === 'Owner';

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(form);
  };

  const handleDownloadBackup = () => {
    const jsonStr = storageService.exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FUSION_Store_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-[#2C1810]">Store &amp; System Settings</h1>
        <p className="text-xs text-[#8C6D58]">
          Configure café identity, legal GSTIN, configurable tax percentages, and local storage state
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Cafe Identity */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F0E8E1]">
            <Store className="w-4 h-4 text-[#C87D32]" />
            <h2 className="text-sm font-bold text-[#2C1810]">Café Profile &amp; Contact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Café Name *</label>
              <input
                type="text"
                required
                value={form.cafeName || ''}
                onChange={(e) => setForm({ ...form, cafeName: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
              />
            </div>
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Tagline</label>
              <input
                type="text"
                value={form.tagline || ''}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-bold text-[#2C1810] block mb-1">Store Address</label>
              <input
                type="text"
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
              />
            </div>
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Store Phone</label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
              />
            </div>
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={form.gstin || ''}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Taxation & Currency */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F0E8E1]">
            <Percent className="w-4 h-4 text-[#C87D32]" />
            <h2 className="text-sm font-bold text-[#2C1810]">Tax Rates &amp; Locale</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Tax / GST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={50}
                value={form.taxRatePercent ?? 5}
                onChange={(e) => setForm({ ...form, taxRatePercent: Number(e.target.value) })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810] font-mono"
              />
              <span className="text-[10px] text-[#8C6D58] mt-1 block">
                Standard F&amp;B restaurant rate (5% GST without ITC in India)
              </span>
            </div>
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Store Currency</label>
              <input
                type="text"
                disabled
                value={`${form.currency || 'INR'} (${form.currencySymbol || '₹'})`}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#8C6D58] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Timezone</label>
              <input
                type="text"
                disabled
                value={form.timeZone || 'Asia/Kolkata'}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#8C6D58] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Receipt & Operations */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F0E8E1]">
            <Receipt className="w-4 h-4 text-[#C87D32]" />
            <h2 className="text-sm font-bold text-[#2C1810]">Receipt &amp; Inventory Rules</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-[#2C1810] block mb-1">Thermal Receipt Footer Message</label>
              <input
                type="text"
                value={form.receiptFooterMessage || ''}
                onChange={(e) => setForm({ ...form, receiptFooterMessage: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl px-3 py-2 text-[#2C1810]"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="autoDeduct"
                checked={Boolean(form.autoDeductInventory)}
                onChange={(e) => setForm({ ...form, autoDeductInventory: e.target.checked })}
                className="rounded text-[#2C1810]"
              />
              <label htmlFor="autoDeduct" className="text-[#2C1810] font-semibold cursor-pointer">
                Automatically deduct recipe ingredient stock whenever an order is completed in POS
              </label>
            </div>
          </div>
        </div>

        {/* Save button */}
        {isOwner && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl transition-colors shadow-sm"
            >
              <Save className="w-4 h-4 text-[#E29D62]" />
              <span>Save Configuration</span>
            </button>
          </div>
        )}
      </form>

      {/* Section 4: Data Management & Backup */}
      {isOwner && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F0E8E1]">
            <Database className="w-4 h-4 text-[#C87D32]" />
            <h2 className="text-sm font-bold text-[#2C1810]">Data Management &amp; Backup</h2>
          </div>
          <p className="text-xs text-[#5C4538] leading-relaxed">
            All orders, products, inventory counts, expenses, and staff accounts are persisted in your database and cached locally. You can download a full JSON archive or reset to default café state anytime.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E8DFD8] rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Store Backup </span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirm}
        title="Reset Store to Fresh Demo State?"
        message="This will restore the original café orders, stock counts, and custom menu entries with the initial sample dataset."
        confirmLabel="Reset Everything"
        isDestructive={true}
        onConfirm={async () => {
          await resetAllData();
          setForm(storageService.getSettings());
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default Settings;
