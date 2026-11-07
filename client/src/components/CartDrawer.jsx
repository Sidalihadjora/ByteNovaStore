import React, { useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { resolveImageUrl } from '../utils/image';

export default function CartDrawer({ onProceedToCheckout }) {
  const { t, language, formatPrice, isRtl } = useLanguage();
  const { settings } = useStoreSettings();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItemsCount
  } = useCart();

  // Listen for Escape key to close cart
  useEffect(() => {
    if (!isCartOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsCartOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const configuredFreeThreshold = Number(settings.free_delivery_threshold);
  const FREE_SHIPPING_THRESHOLD = Number.isFinite(configuredFreeThreshold) && configuredFreeThreshold >= 0
    ? configuredFreeThreshold
    : 15000;
  const progressPercent = FREE_SHIPPING_THRESHOLD === 0
    ? 100
    : Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="absolute inset-0"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-y-0 ${
          isRtl ? 'left-0' : 'right-0'
        } max-w-[100vw] flex w-screen max-w-md bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl flex-col transition-transform`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t('shopping_cart')}</h2>
              <span className="text-xs text-slate-500">
                {totalItemsCount} {language === 'ar' ? 'عناصر' : 'articles'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress Meter */}
        <div className="px-5 py-3 bg-blue-50/70 border-b border-blue-100">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Truck size={14} className="text-blue-600" />
              {subtotal >= FREE_SHIPPING_THRESHOLD
                ? t('free_delivery_reached')
                : t('free_delivery_progress', { amount: remainingForFreeShipping.toLocaleString() })}
            </span>
            <span className="text-blue-700 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">{t('cart_empty')}</h3>
              <p className="text-xs text-slate-500 mb-5 max-w-xs">{t('cart_empty_sub')}</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="py-2.5 px-6 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {t('start_shopping')}
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemTitle = language === 'ar' ? (item.name_ar || item.name) : (item.name_fr || item.name);
              return (
                <div key={item.id} className="py-4 flex gap-3 sm:gap-4 items-center">
                  {/* Thumbnail */}
                  <img
                    src={resolveImageUrl(item.image)}
                    alt={itemTitle}
                    className="w-18 h-18 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate mb-1" title={itemTitle}>
                      {itemTitle}
                    </h4>
                    <div className="text-xs font-extrabold text-blue-700 mb-2">
                      {formatPrice(item.price)}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="min-h-11 min-w-11 rounded bg-white shadow-xs hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_quantity}
                          className="min-h-11 min-w-11 rounded bg-white shadow-xs hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="min-h-11 min-w-11 text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title={t('delete_product')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-end font-bold text-xs sm:text-sm text-slate-900 shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t('subtotal')}:</span>
              <span className="font-bold text-slate-800 text-sm">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t('delivery')}:</span>
              <span className="font-medium text-slate-600">
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span className="text-emerald-600 font-bold">{t('free')}</span>
                ) : (
                  language === 'ar' ? 'يحسب عند اختيار الولاية' : 'Calculé à l\'étape suivante'
                )}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">{t('total')}:</span>
              <span className="text-lg font-black text-blue-700">{formatPrice(subtotal)}</span>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{t('checkout')}</span>
              {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>

            <button
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-500 text-center transition-colors cursor-pointer py-1"
            >
              {t('clear_cart')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
