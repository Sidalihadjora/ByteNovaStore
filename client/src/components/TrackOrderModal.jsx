import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  Clock,
  Phone,
  Truck,
  Home,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function TrackOrderModal({ isOpen, onClose }) {
  const { t, language, formatPrice, isRtl } = useLanguage();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setIsLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await api.orders.track(orderNumber);
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        setError(res.message || 'Order not found');
      }
    } catch (err) {
      setError(err.message || 'Order not found. Please verify the order number.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: 'Pending', label: t('status_pending'), icon: Clock },
    { key: 'Confirmed', label: t('status_confirmed'), icon: Phone },
    { key: 'Processing', label: t('status_processing'), icon: Package },
    { key: 'Shipped', label: t('status_shipped'), icon: Truck },
    { key: 'Delivered', label: t('status_delivered'), icon: Home }
  ];

  const currentStatusIndex = order ? steps.findIndex(s => s.key === order.status) : 0;
  const activeIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0;

  return (
    <div
      className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="responsive-modal-panel relative bg-white rounded-3xl max-w-lg w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">{t('track_order')}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleTrack} className="flex gap-2 mb-4">
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="DZ-2026-XXXX"
              dir="ltr"
              className="flex-1 bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>{language === 'ar' ? 'بحث' : 'Chercher'}</span>
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {order && (
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">{t('order_number')}</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{order.order_number}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {order.status}
                </span>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-5 gap-1 text-center py-2">
                {steps.map((st, i) => {
                  const isDone = i <= activeIndex;
                  const Icon = st.icon;
                  return (
                    <div key={st.key} className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mb-1 ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <Icon size={12} />
                      </div>
                      <span className={`text-[9px] ${isDone ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>{t('wilaya')}:</span>
                  <span className="font-semibold">{order.wilaya_name} - {order.commune_name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('total')}:</span>
                  <span className="font-bold text-blue-700">{formatPrice(order.total_price)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
