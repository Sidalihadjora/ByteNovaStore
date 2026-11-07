import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Star,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  Zap
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useCart } from '../context/CartContext';
import { resolveImageUrl } from '../utils/image';

export default function ProductDetailModal({ product, isOpen, onClose, onBuyNow }) {
  const { t, language, formatPrice, isRtl } = useLanguage();
  const { settings, wilayaStats } = useStoreSettings();
  const { addToCart, recentlyAddedId } = useCart();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setSelectedImageIndex(0);
      setQuantity(1);
    }
  }, [product]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const isJustAdded = recentlyAddedId === product.id;
  const isOutOfStock = product.stock_quantity <= 0;

  // Localized texts
  const displayName = language === 'ar' ? (product.name_ar || product.name) : (product.name_fr || product.name);
  const displayCategory = language === 'ar' ? (product.category_name_ar || product.category_name) : (product.category_name_fr || product.category_name);
  const displayDescription = language === 'ar' ? (product.description_ar || product.description) : (product.description_fr || product.description);
  const displayShortDesc = language === 'ar' ? (product.short_description_ar || product.short_description) : (product.short_description_fr || product.short_description);

  // Gallery images array
  const images = (product.images && product.images.length > 0)
    ? product.images.map(resolveImageUrl)
    : [resolveImageUrl(product.main_image)];

  const hasDiscount = product.old_price && Number(product.old_price) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100)
    : 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleInstantBuy = () => {
    addToCart(product, quantity);
    onClose();
    if (onBuyNow) {
      onBuyNow();
    }
  };

  return (
    <div
      className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="responsive-modal-panel relative bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-xs`}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Left: Product Images Gallery */}
          <div className="flex flex-col gap-3">
            {/* Main Featured Image */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-xs">
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={displayName}
                className="w-full h-full object-cover object-center"
              />

              {hasDiscount && (
                <div className="absolute top-3 start-3 bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-md">
                  -{discountPercent}%
                </div>
              )}
            </div>

            {/* Thumbnails row (multi-image support) */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info & Actions */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Category & Status */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {displayCategory || settings.store_name || 'ByteNova Store'}
                </span>
                {isOutOfStock ? (
                  <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                    {t('out_of_stock')}
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{t('in_stock')} ({product.stock_quantity} {language === 'ar' ? 'قطعة' : 'unités'})</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 leading-snug">
                {displayName}
              </h2>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      className={i < Math.floor(product.rating || 5) ? 'fill-amber-400' : 'text-slate-200'}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-700">{product.rating || '4.8'}</span>
                <span className="text-xs text-slate-400">({product.reviews_count || 18} {t('reviews')})</span>
              </div>

              {/* Price Display */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
                {hasDiscount ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{t('old_price')}:</span>
                      <span className="line-through decoration-slate-400 font-semibold">{formatPrice(product.old_price)}</span>
                      <span className="text-red-600 font-extrabold bg-red-100 px-1.5 py-0.2 rounded text-[11px]">
                        -{discountPercent}%
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-blue-700">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">{t('current_price')}</span>
                    <span className="text-2xl sm:text-3xl font-black text-blue-700">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                )}
              </div>

              {/* Short & Full Description */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  {t('description')}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {displayDescription || displayShortDesc}
                </p>
              </div>

              {/* Quantity Counter */}
              {!isOutOfStock && (
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {t('quantity')}:
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-white shadow-xs hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center font-bold text-slate-800 text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="w-8 h-8 rounded-lg bg-white shadow-xs hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: Add to Cart & Buy Now */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isJustAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-98'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>{t('out_of_stock')}</span>
                  ) : isJustAdded ? (
                    <>
                      <Check size={18} />
                      <span>{t('added_to_cart')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={18} />
                      <span>{t('add_to_cart')}</span>
                    </>
                  )}
                </button>

                {!isOutOfStock && (
                  <button
                    type="button"
                    onClick={handleInstantBuy}
                    className="py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
                  >
                    <Zap size={18} className="fill-slate-950" />
                    <span>{t('buy_now')}</span>
                  </button>
                )}
              </div>

              {/* Guarantees Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50">
                  <Truck size={14} className="text-blue-600 shrink-0" />
                  <span>{wilayaStats.wilaya_count || 0} Wilayas</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>{language === 'ar' ? 'دفع عند الاستلام' : 'Paiement à livraison'}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50">
                  <RotateCcw size={14} className="text-amber-600 shrink-0" />
                  <span>{language === 'ar' ? 'ضمان رسمي' : 'Garantie légale'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
