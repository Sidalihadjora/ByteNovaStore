import React from 'react';
import {
  Truck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HeroSection({ settings = {}, wilayaStats = {}, onShopNow, categories = [], selectedCategory, onSelectCategory }) {
  const { t, language, isRtl } = useLanguage();
  const defaultDescription = t('hero_subtitle').replace(/\b58\b/g, String(wilayaStats.wilaya_count || 0));
  const parsedThreshold = Number(settings.free_delivery_threshold);
  const freeDeliveryThreshold = Number.isFinite(parsedThreshold) && parsedThreshold >= 0 ? parsedThreshold : 15000;
  const freeDeliveryNotice = t('free_delivery_notice').replace(
    '{amount}',
    freeDeliveryThreshold.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-DZ')
  );

  return (
    <div className="space-y-8 mb-12">
      {/* 1. Main Hero Banner */}
      <div
        className="relative rounded-3xl overflow-hidden text-white shadow-xl shadow-blue-900/10 border border-blue-800/50"
        style={{ backgroundImage: `linear-gradient(135deg, ${settings.primary_color || '#2563eb'}, ${settings.secondary_color || '#4f46e5'})` }}
      >
        {/* Background decorative elements */}
        <div className="absolute top-0 end-0 -mt-12 -me-12 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-1/4 -mb-12 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-10 lg:px-12 py-8 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Left Hero Text */}
          <div className="lg:col-span-7 flex flex-col items-start gap-4 text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
              <Sparkles size={14} className="text-amber-400" />
              <span>{freeDeliveryNotice}</span>
            </div>

            <h1 className="text-[clamp(1.75rem,6vw,3rem)] font-black tracking-tight leading-tight">
              {(language === 'ar' ? settings.store_slogan_ar : settings.store_slogan) || t('hero_title')}
            </h1>

            <p className="text-sm sm:text-base text-blue-100 max-w-xl leading-relaxed">
              {(language === 'ar' ? settings.store_description_ar : settings.store_description) || defaultDescription}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onShopNow}
                className="py-3.5 px-7 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-sm shadow-lg shadow-amber-400/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{t('shop_now')}</span>
                {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 px-3 py-2">
                <Truck size={16} className="text-amber-400" />
                <span>{wilayaStats.wilaya_count || 0} Wilayas</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image / Featured Collage */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative h-60 w-full max-w-60 sm:h-80 sm:max-w-80 lg:h-80 lg:w-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-white/5 backdrop-blur-xs">
              <img
                src={settings.hero_image || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80'}
                alt="Smartphone Deals"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  {(language === 'ar' ? settings.hero_image_badge_ar : settings.hero_image_badge)
                    || (language === 'ar' ? 'الأكثر مبيعًا' : 'Top Ventes')}
                </span>
                <span className="text-base font-black text-white">
                  {(language === 'ar' ? settings.hero_image_title_ar : settings.hero_image_title)
                    || (language === 'ar' ? 'الهواتف الذكية والإلكترونيات' : 'Smartphones & Électronique')}
                </span>
                <span className="text-xs text-slate-300">
                  {(language === 'ar' ? settings.hero_image_discount_ar : settings.hero_image_discount)
                    || (language === 'ar' ? 'تخفيضات تصل إلى 30%' : "Jusqu'à -30% de remise")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Quick Cards Row */}
      {categories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('categories')}</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {categories.length}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              const displayName = language === 'ar' ? (cat.name_ar || cat.name) : (cat.name_fr || cat.name);
              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(isSelected ? null : cat.slug)}
                  className={`group relative rounded-2xl overflow-hidden border p-3 flex flex-col items-center text-center cursor-pointer transition-all duration-300 bg-white ${
                    isSelected
                      ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200/80 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 mb-2 group-hover:scale-105 transition-transform">
                    <img
                      src={cat.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop&q=80'}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {cat.products_count || 0} {language === 'ar' ? 'منتج' : 'articles'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
