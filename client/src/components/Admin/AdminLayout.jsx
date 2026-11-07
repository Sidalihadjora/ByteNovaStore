import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, ArrowRight, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminCategories from './AdminCategories';
import AdminOrders from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import AdminInventory from './AdminInventory';
import AdminDiscounts from './AdminDiscounts';
import AdminSettings from './AdminSettings';
import InvoicePrintModal from './InvoicePrintModal';

export default function AdminLayout({ onExitAdmin, categories = [], onCategoriesUpdated, onSettingsUpdated }) {
  const { isAdmin } = useAuth();
  const { language, isRtl } = useLanguage();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Role Protection (Requirement 3: "Only authorized administrators can access the Admin Dashboard")
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            {language === 'ar' ? 'منطقة مخصصة للمدراء فقط' : 'Accès Administrateur Restreint'}
          </h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {language === 'ar'
              ? 'لا تملك الصلاحيات الكافية للوصول إلى لوحة الإدارة. يرجى تسجيل الدخول بحساب مدير مخوّل.'
              : 'Vous devez être connecté avec un compte administrateur autorisé pour accéder à cette interface.'}
          </p>
          <button
            onClick={onExitAdmin}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
          >
            {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            <span>{language === 'ar' ? 'الرجوع إلى المتجر' : 'Retourner à la boutique'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
      {/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onChangeView={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }}
        onExitAdmin={onExitAdmin}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label={language === 'ar' ? 'إغلاق القائمة' : 'Fermer le menu'}
        />
      )}
      <main className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label={language === 'ar' ? 'فتح قائمة الإدارة' : 'Ouvrir le menu d’administration'}
            aria-expanded={isSidebarOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>
          <span className="truncate text-sm font-bold text-slate-900">
            {language === 'ar' ? 'لوحة الإدارة' : 'Administration'}
          </span>
        </header>
        {currentView === 'dashboard' && (
          <AdminDashboard
            onNavigateToOrders={() => setCurrentView('orders')}
            onNavigateToProducts={() => setCurrentView('products')}
          />
        )}
        {currentView === 'products' && (
          <AdminProducts categories={categories} />
        )}
        {currentView === 'categories' && (
          <AdminCategories onCategoriesUpdated={onCategoriesUpdated} />
        )}
        {currentView === 'orders' && (
          <AdminOrders onPrintInvoice={(order) => setInvoiceOrder(order)} />
        )}
        {currentView === 'customers' && (
          <AdminCustomers />
        )}
        {currentView === 'inventory' && (
          <AdminInventory />
        )}
        {currentView === 'discounts' && (
          <AdminDiscounts />
        )}
        {currentView === 'settings' && (
          <AdminSettings onSettingsUpdated={onSettingsUpdated} />
        )}
      </main>

      {/* Invoice Print Modal */}
      {invoiceOrder && (
        <InvoicePrintModal
          order={invoiceOrder}
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
