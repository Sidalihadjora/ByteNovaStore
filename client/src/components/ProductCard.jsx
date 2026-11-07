import React from 'react';
import { ShoppingBag, Eye, Star, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useCart } from '../context/CartContext';
import { resolveImageUrl } from '../utils/image';

export default function ProductCard({ product, onQuickView }) {
  const { t, language, formatPrice } = useLanguage();
  const { settings } = useStoreSettings();
  const { addToCart, recentlyAddedId } = useCart();

  const isJustAdded = recentlyAddedId === product.id;
  const isOutOfStock = product.stock_quantity <= 0;

  // Localized text
  const displayName = language === 'ar' ? (product.name_ar || product.name) : (product.name_fr || product.name);
  const displayShortDesc = language === 'ar'
    ? (product.short_description_ar || product.short_description)
    : (product.short_description_fr || product.short_description);
  const displayCategory = language === 'ar'
    ? (product.category_name_ar || product.category_name)
    : (product.category_name_fr || product.category_name);

  // Compute discount percentage if old_price exists and is higher than current price
  const hasDiscount = product.old_price && Number(product.old_price) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* 1. Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        <img
          src={resolveImageUrl(product.main_image || (product.images && product.images[0]))}
          alt={displayName}
          className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
          loading="lazy"
        />

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 start-3 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md tracking-wider">
            -{discountPercent}%
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="absolute top-3 end-3">
          {isOutOfStock ? (
            <span className="bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <AlertCircle size={12} />
              <span>{t('out_of_stock')}</span>
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs backdrop-blur-xs bg-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t('in_stock')}</span>
            </span>
          )}
        </div>

        {/* Quick View Button Hover Overlay */}
        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="pointer-events-auto bg-white/95 hover:bg-white text-slate-800 text-xs font-bold py-2 px-3.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer hover:text-blue-600"
          >
            <Eye size={15} />
            <span>{t('quick_view')}</span>
          </button>
        </div>
      </div>

      {/* 2. Content Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-[11px] truncate">
              {displayCategory || settings.store_name || 'ByteNova Store'}
            </span>
            <div className="flex items-center gap-1 text-amber-500 shrink-0">
              <Star size={13} className="fill-amber-400 stroke-amber-400" />
              <span className="font-bold text-slate-700 text-xs">{product.rating || '4.8'}</span>
              <span className="text-slate-400 text-[11px]">({product.reviews_count || 12})</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => onQuickView(product)}
            className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 hover:text-blue-600 transition-colors cursor-pointer mb-1"
            title={displayName}
          >
            {displayName}
          </h3>

          {/* Short Description */}
          {displayShortDesc && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {displayShortDesc}
            </p>
          )}
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="pt-2 border-t border-slate-100 mt-2">
          {/* Price display:
              If old_price exists, show strikethrough old price.
              If not, show ONLY current price! */}
          <div className="mb-3">
            {hasDiscount ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-blue-700 tracking-tight">
                  {formatPrice(product.price)}
                </span>
                <span className="text-xs sm:text-sm text-slate-400 line-through decoration-slate-400">
                  {formatPrice(product.old_price)}
                </span>
                <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  -{discountPercent}%
                </span>
              </div>
            ) : (
              <div className="flex items-baseline">
                <span className="text-lg sm:text-xl font-extrabold text-blue-700 tracking-tight">
                  {formatPrice(product.price)}
                </span>
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={() => addToCart(product, 1)}
            disabled={isOutOfStock}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : isJustAdded
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-md shadow-blue-500/20'
            }`}
          >
            {isOutOfStock ? (
              <span>{t('out_of_stock')}</span>
            ) : isJustAdded ? (
              <>
                <Check size={16} />
                <span>{t('added_to_cart')}</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>{t('add_to_cart')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
