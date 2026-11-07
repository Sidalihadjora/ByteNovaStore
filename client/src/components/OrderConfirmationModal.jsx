import React, { useEffect } from 'react';
import {
  CheckCircle,
  Package,
  MapPin,
  Phone,
  User,
  Printer,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Home
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { resolveImageUrl } from '../utils/image';

export default function OrderConfirmationModal({ order, isOpen, onClose, onPrintInvoice }) {
  const { t, language, formatPrice, isRtl } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // Order status progression steps
  const steps = [
    { key: 'Pending', label: t('status_pending'), icon: Clock },
    { key: 'Confirmed', label: t('status_confirmed'), icon: Phone },
    { key: 'Processing', label: t('status_processing'), icon: Package },
    { key: 'Shipped', label: t('status_shipped'), icon: Truck },
    { key: 'Delivered', label: t('status_delivered'), icon: Home }
  ];

  const currentStatusIndex = steps.findIndex(s => s.key === order.status);
  const activeIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0;

  return (
    <div
      className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="responsive-modal-panel relative bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebratory Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-600 via-teal-700 to-blue-800 text-white text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mb-3 shadow-inner">
            <CheckCircle size={38} className="stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-1">
            {t('order_confirmed')}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-md leading-relaxed">
            {t('order_confirmed_msg')}
          </p>

          <div className="mt-4 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-mono font-bold tracking-widest text-emerald-50">
            {t('order_number')}: <span className="text-white font-extrabold">{order.order_number}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Order Status Timeline Stepper */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {t('order_status')}:
              </span>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {order.status === 'Pending' ? t('status_pending') : order.status}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1 relative text-center">
              {steps.map((step, idx) => {
                const isCompleted = idx <= activeIndex;
                const isCurrent = idx === activeIndex;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-slate-200 text-slate-400'
                      } ${isCurrent ? 'ring-4 ring-emerald-500/20 scale-105' : ''}`}
                    >
                      <StepIcon size={14} />
                    </div>
                    <span
                      className={`text-[10px] leading-tight font-medium ${
                        isCompleted ? 'text-slate-800 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ordered Products Table / List */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package size={15} className="text-blue-600" />
              <span>{t('ordered_items')}</span>
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
              {order.items && order.items.map((it, idx) => (
                <div key={idx} className="p-3.5 flex items-center gap-3 bg-white hover:bg-slate-50/50">
                  <img
                    src={resolveImageUrl(it.product_image)}
                    alt={it.product_name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {it.product_name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {formatPrice(it.unit_price)} × {it.quantity}
                    </p>
                  </div>
                  <div className="text-end font-extrabold text-xs sm:text-sm text-blue-700 shrink-0">
                    {formatPrice(it.total_price)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Delivery Information */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{t('full_name')}</span>
              <p className="font-bold text-slate-800">{order.customer_name}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t('phone_number')}</span>
              <p className="font-bold text-slate-800 font-mono" dir="ltr">{order.customer_phone}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t('wilaya')} & {t('commune')}</span>
              <p className="font-bold text-slate-800">{order.wilaya_name} - {order.commune_name}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t('delivery_address')}</span>
              <p className="font-bold text-slate-800">{order.delivery_address}</p>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span>{t('subtotal')}:</span>
              <span className="font-bold text-slate-800">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>{t('delivery_fee')}:</span>
              <span className="font-bold text-slate-800">{formatPrice(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-slate-200 text-sm font-black text-slate-900 mt-1">
              <span>{t('total')}:</span>
              <span className="text-base text-blue-700">{formatPrice(order.total_price)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onPrintInvoice(order)}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Printer size={16} />
              <span>{t('print_invoice')}</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
            >
              <ShoppingBag size={16} />
              <span>{t('continue_shopping')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
