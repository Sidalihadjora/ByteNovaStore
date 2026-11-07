import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Package,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  settings = {},
  categories = [],
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onOpenAccount,
  onOpenTrackOrder,
  onOpenAdmin
}) {
  const { t, language, toggleLanguage, isRtl } = useLanguage();
  const { totalItemsCount, setIsCartOpen } = useCart();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 sm:h-18 gap-2 sm:gap-4">
          {/* Logo */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden min-h-11 min-w-11 p-2 text-slate-600 hover:text-blue-600 rounded-lg focus:outline-hidden"
              aria-label={isMobileMenuOpen ? (language === 'ar' ? 'إغلاق القائمة' : 'Fermer le menu') : (language === 'ar' ? 'فتح القائمة' : 'Ouvrir le menu')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-store-menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
              onClick={() => onSelectCategory(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectCategory(null);
                }
              }}
              role="button"
              tabIndex={0}
              className="flex min-w-0 items-center gap-2 cursor-pointer group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform overflow-hidden"
                style={{ backgroundImage: `linear-gradient(45deg, ${settings.primary_color || '#2563eb'}, ${settings.secondary_color || '#4f46e5'})` }}
              >
                {settings.store_logo
                  ? <img src={settings.store_logo} alt="" className="w-full h-full object-contain bg-white" />
                  : <ShoppingBag size={22} className="stroke-[2.5]" />}
              </div>
              <div className="flex flex-col">
                <span className="max-w-[42vw] truncate text-base sm:max-w-none sm:text-2xl font-black tracking-tight text-slate-900">
                  {language === 'ar' ? settings.store_name_ar || settings.store_name || 'ByteNova Store' : settings.store_name || 'ByteNova Store'}
                </span>
                <span className="hidden min-[400px]:block text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                  {language === 'ar' ? settings.store_slogan_ar || settings.store_slogan || '' : settings.store_slogan || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 rounded-full py-2.5 px-4 text-sm focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 transition-all pe-10"
              />
              <button
                type="button"
                className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} text-slate-400 hover:text-blue-600 transition-colors p-1`}
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Right Action Icons: Auth & Cart */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <button
              onClick={toggleLanguage}
              className="min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer font-bold border border-slate-200 text-xs"
              title="Changer de langue / تغيير اللغة"
            >
              <Globe size={13} />
              <span className="hidden min-[400px]:inline">{language === 'fr' ? 'العربية' : 'Français'}</span>
            </button>
            <button
              onClick={onOpenTrackOrder}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
            >
              <Package size={15} />
              <span className="hidden md:inline">{t('track_order')}</span>
            </button>
            {/* Admin Quick Link */}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <LayoutDashboard size={15} />
                <span>{t('admin_panel')}</span>
              </button>
            )}

            {/* Auth Dropdown / Button */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden xl:inline text-sm font-medium text-slate-700 max-w-[100px] truncate">
                    {user?.name}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div
                    className={`absolute mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 ${isRtl ? 'left-0' : 'right-0'}`}
                    onClick={() => setIsUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400">{t('account')}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>

                    <button
                      onClick={onOpenAccount}
                      className="w-full text-start px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User size={16} className="text-slate-500" />
                      <span>{t('my_profile')} & {t('my_orders')}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={onOpenAdmin}
                        className="w-full text-start px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <LayoutDashboard size={16} />
                        <span>{t('admin_panel')}</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={logout}
                      className="w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-300 hover:border-blue-600 hover:text-blue-600 text-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-white"
              >
                <User size={16} />
                <span className="hidden sm:inline">{t('sign_in')}</span>
              </button>
            )}

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative min-h-11 min-w-11 flex items-center justify-center sm:justify-start gap-2 px-2.5 sm:px-3.5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer group"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t('cart')}</span>
              {totalItemsCount > 0 && (
                <span className="bg-amber-400 text-slate-900 font-extrabold text-[11px] px-2 py-0.5 rounded-full shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-full py-2 px-4 text-xs focus:outline-hidden focus:border-blue-600 pe-10"
            />
            <Search size={16} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} text-slate-400`} />
          </div>

          {isMobileMenuOpen && (
            <nav id="mobile-store-menu" className="md:hidden border-t border-slate-200 py-2" aria-label={language === 'ar' ? 'قائمة المتجر' : 'Menu de la boutique'}>
              <div className="grid gap-1">
                <button
                  type="button"
                  onClick={() => { onOpenTrackOrder(); setIsMobileMenuOpen(false); }}
                  className="min-h-11 flex items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Package size={18} />
                  <span>{t('track_order')}</span>
                </button>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => { onOpenAccount(); setIsMobileMenuOpen(false); }}
                    className="min-h-11 flex items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User size={18} />
                    <span>{t('my_profile')} & {t('my_orders')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { onOpenAuth(); setIsMobileMenuOpen(false); }}
                    className="min-h-11 flex items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User size={18} />
                    <span>{t('sign_in')}</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => { onOpenAdmin(); setIsMobileMenuOpen(false); }}
                    className="min-h-11 flex items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-amber-800 hover:bg-amber-50"
                  >
                    <LayoutDashboard size={18} />
                    <span>{t('admin_panel')}</span>
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="min-h-11 flex items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    <span>{t('logout')}</span>
                  </button>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* 3. Category Bar */}
      <div className="bg-slate-50 border-t border-slate-200 overflow-x-auto scrollbar-none py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === null
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-500 hover:text-blue-600'
            }`}
          >
            {t('all_categories')}
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            const displayName = language === 'ar' ? (cat.name_ar || cat.name) : (cat.name_fr || cat.name);
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                className={`min-h-10 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                <span>{displayName}</span>
                {cat.products_count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.products_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
