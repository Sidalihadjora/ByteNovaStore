import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { api } from '../../services/api';

export default function AdminDashboard({ onNavigateToOrders, onNavigateToProducts }) {
  const { t, language, formatPrice } = useLanguage();
  const { settings } = useStoreSettings();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.admin.getStats();
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 gap-2">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <span className="text-sm">{language === 'ar' ? 'جاري تحميل الإحصائيات...' : 'Chargement des statistiques...'}</span>
      </div>
    );
  }

  const s = stats || {};
  const salesByDay = s.sales_by_day || [];
  const topWilayas = s.top_wilayas || [];
  const recentOrders = s.recent_orders || [];

  // SVG Chart calculation
  const maxRevenue = salesByDay.length > 0 ? Math.max(...salesByDay.map(d => d.daily_revenue), 1000) : 1000;

  return (
    <div className="p-6 sm:p-8 space-y-8 flex-1 overflow-y-auto">
      {/* Top Welcome Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {t('admin_dashboard')}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'ar'
            ? `مرحباً بك في لوحة تحكم ${settings.store_name_ar || settings.store_name || 'ByteNova Store'}`
            : `Bienvenue sur le tableau de bord de ${settings.store_name || 'ByteNova Store'}`}
        </p>
      </div>

      {/* KPI Cards Grid (Requirement 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('total_sales')}
            </span>
            <span className="text-xl font-black text-blue-700 tracking-tight">
              {formatPrice(s.total_sales || 0)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Total Orders */}
        <div
          onClick={onNavigateToOrders}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-blue-400 cursor-pointer transition-all"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('total_orders')}
            </span>
            <span className="text-2xl font-black text-slate-900">
              {s.total_orders || 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShoppingBag size={24} />
          </div>
        </div>

        {/* Pending Orders */}
        <div
          onClick={onNavigateToOrders}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-amber-400 cursor-pointer transition-all"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('pending_orders')}
            </span>
            <span className="text-2xl font-black text-amber-600">
              {s.pending_orders || 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
        </div>

        {/* Confirmed & Delivered */}
        <div
          onClick={onNavigateToOrders}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-400 cursor-pointer transition-all"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('delivered_orders')} / {t('confirmed_orders')}
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {s.delivered_orders || 0} <span className="text-xs font-normal text-slate-400">({s.confirmed_orders || 0} {language === 'ar' ? 'مؤكد' : 'conf.'})</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Secondary Stats Row: Products, Customers, Inventory Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Products */}
        <div
          onClick={onNavigateToProducts}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-blue-400 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">{t('total_products')}</span>
              <span className="text-lg font-bold text-slate-800">{s.total_products || 0}</span>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-slate-400" />
        </div>

        {/* Customers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">{t('total_customers')}</span>
              <span className="text-lg font-bold text-slate-800">{s.total_customers || 0}</span>
            </div>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">{t('low_stock_warning')}</span>
              <span className="text-lg font-bold text-rose-600">
                {s.low_stock_count || 0} <span className="text-xs font-normal text-slate-400">({s.out_of_stock_count || 0} {t('out_of_stock')})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section (Requirement 7: "Include charts for sales and orders") */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Orders Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {t('sales_chart_title')}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {salesByDay.length} {language === 'ar' ? 'أيام نشطة' : 'jours actifs'}
            </span>
          </div>

          {/* Dynamic SVG Visual Chart */}
          <div className="h-64 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {salesByDay.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد بيانات مبيعات كافية حتى الآن' : 'Aucune donnée de vente pour le moment'}
              </div>
            ) : (
              salesByDay.map((item, idx) => {
                const heightPercent = Math.max(12, Math.round((item.daily_revenue / maxRevenue) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap pointer-events-none shadow-lg z-10">
                      {formatPrice(item.daily_revenue)} ({item.orders_count} {language === 'ar' ? 'طلب' : 'cmds'})
                    </div>

                    <div
                      className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-lg transition-all"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">
                      {item.date ? item.date.split('-').slice(1).join('/') : ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Algerian Wilayas Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin size={18} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {t('wilayas_chart_title')}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {topWilayas.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {language === 'ar' ? 'لا توجد طلبات بعد' : 'Aucune commande enregistrée'}
              </p>
            ) : (
              topWilayas.map((w, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800">{w.wilaya_name}</span>
                  </div>
                  <div className="text-end">
                    <span className="font-extrabold text-blue-700 block">{formatPrice(w.revenue)}</span>
                    <span className="text-[10px] text-slate-400">{w.count} {language === 'ar' ? 'طلبيات' : 'commandes'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            {t('recent_orders')}
          </h3>
          <button
            onClick={onNavigateToOrders}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            {language === 'ar' ? 'عرض جميع الطلبات ←' : 'Voir toutes les commandes →'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 text-start">{t('order_number')}</th>
                <th className="pb-3 text-start">{t('full_name')}</th>
                <th className="pb-3 text-start">{t('wilaya')}</th>
                <th className="pb-3 text-start">{t('total')}</th>
                <th className="pb-3 text-start">{t('order_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/60">
                  <td className="py-3 font-mono font-bold text-blue-600">{ord.order_number}</td>
                  <td className="py-3 font-medium text-slate-800">{ord.customer_name}</td>
                  <td className="py-3 text-slate-600">{ord.wilaya_name}</td>
                  <td className="py-3 font-extrabold text-slate-900">{formatPrice(ord.total_price)}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
