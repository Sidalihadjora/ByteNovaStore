import React from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Percent,
  Warehouse,
  Settings,
  LogOut,
  ExternalLink,
  Store,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export default function AdminSidebar({ currentView, onChangeView, onExitAdmin, isMobileOpen = false, onClose }) {
  const { t, language, isRtl } = useLanguage();
  const { logout } = useAuth();
  const { settings } = useStoreSettings();

  const menuItems = [
    { key: 'dashboard', label: t('admin_dashboard'), icon: LayoutDashboard },
    { key: 'products', label: t('admin_products'), icon: Package },
    { key: 'categories', label: t('admin_categories'), icon: Layers },
    { key: 'orders', label: t('admin_orders'), icon: ShoppingBag },
    { key: 'customers', label: t('admin_customers'), icon: Users },
    { key: 'discounts', label: language === 'ar' ? 'التخفيضات والعروض' : 'Remises & Promos', icon: Percent },
    { key: 'inventory', label: t('admin_inventory'), icon: Warehouse },
    { key: 'settings', label: t('admin_settings'), icon: Settings }
  ];

  return (
    <aside
      className={`fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col select-none border-e border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-300 md:sticky md:top-0 md:z-30 md:h-screen md:w-64 md:max-w-none md:translate-x-0 ${
        isMobileOpen ? 'visible translate-x-0' : isRtl ? 'invisible translate-x-full md:visible md:translate-x-0' : 'invisible -translate-x-full md:visible md:translate-x-0'
      }`}
      aria-label={language === 'ar' ? 'قائمة الإدارة' : 'Navigation administration'}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 overflow-hidden">
            {settings.store_logo
              ? <img src={settings.store_logo} alt="" className="w-full h-full object-contain bg-white" />
              : <ShoppingBag size={20} />}
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-sm tracking-tight">
              {settings.store_name || 'ByteNova Store'}
            </span>
            <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
              {language === 'ar' ? 'لوحة الإدارة' : 'Admin Portal'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={language === 'ar' ? 'إغلاق القائمة' : 'Fermer le menu'}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChangeView(item.key)}
              className={`min-h-11 w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-800 space-y-1">
        <button
          onClick={onExitAdmin}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <Store size={17} className="text-emerald-400" />
          <span>{language === 'ar' ? 'العودة للمتجر' : 'Voir le Magasin'}</span>
          <ExternalLink size={13} className="ms-auto text-slate-500" />
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut size={17} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
