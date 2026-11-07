import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Package,
  Layers,
  Loader2,
  X
} from 'lucide-react';

import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { StoreSettingsProvider, useStoreSettings } from './context/StoreSettingsContext';
import { api } from './services/api';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import AuthModal from './components/AuthModal';
import CustomerAccountModal from './components/CustomerAccountModal';
import TrackOrderModal from './components/TrackOrderModal';
import AdminLayout from './components/Admin/AdminLayout';
import InvoicePrintModal from './components/Admin/InvoicePrintModal';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function StoreApp() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const { settings, wilayaStats, refreshSettings } = useStoreSettings();
  const productsSectionRef = useRef(null);

  // App Routing Mode: Customer Store vs Admin Dashboard
  const [isAdminView, setIsAdminView] = useState(() => window.location.pathname === '/admin');

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminView(window.location.pathname === '/admin');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const enterAdminView = () => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    setIsAdminView(true);
  };

  const exitAdminView = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setIsAdminView(false);
  };

  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Modals State
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await api.categories.getAll();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Fetch Products based on active filters
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy) params.sort = sortBy;
      if (inStockOnly) params.in_stock = 'true';

      const res = await api.products.getAll(params);
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, sortBy, inStockOnly]);

  const scrollToProducts = () => {
    if (productsSectionRef.current) {
      productsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If in Admin Dashboard mode
  if (isAdminView && isAdmin) {
    return (
      <AdminLayout
        onExitAdmin={exitAdminView}
        categories={categories}
        onSettingsUpdated={() => refreshSettings()}
        onCategoriesUpdated={() => {
          fetchCategories();
          fetchProducts();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      {/* 1. Elegant Navigation Bar */}
      <Navbar
        settings={settings}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          scrollToProducts();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
        onOpenAdmin={enterAdminView}
      />

      {/* 2. Main Store Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section & Category Pills */}
        <HeroSection
          settings={settings}
          wilayaStats={wilayaStats}
          onShopNow={scrollToProducts}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(slug) => {
            setSelectedCategory(slug);
            scrollToProducts();
          }}
        />

        {/* 3. Products Catalog Section */}
        <div ref={productsSectionRef} className="pt-4">
          {/* Section Header & Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{selectedCategory ? (categories.find(c => c.slug === selectedCategory)?.name_fr || selectedCategory) : t('all_products')}</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {products.length}
                </span>
              </h2>
              {searchQuery && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar' ? 'نتائج البحث عن:' : 'Résultats pour :'} <span className="font-bold text-slate-700">"{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ms-2 text-blue-600 hover:underline cursor-pointer"
                  >
                    ({language === 'ar' ? 'مسح' : 'Effacer'})
                  </button>
                </p>
              )}
            </div>

            {/* Sort & In-stock Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* In Stock Only Checkbox */}
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-blue-600 w-3.5 h-3.5"
                />
                <span>{t('in_stock_only')}</span>
              </label>

              {/* Sorting Dropdown */}
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <ArrowUpDown size={14} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="newest">{t('sort_newest')}</option>
                  <option value="price_asc">{t('sort_price_asc')}</option>
                  <option value="price_desc">{t('sort_price_desc')}</option>
                  <option value="discount">{t('sort_discount')}</option>
                  <option value="rating">{t('sort_rating')}</option>
                </select>
              </div>

              {/* Reset filter button if any active */}
              {(selectedCategory || searchQuery || inStockOnly) && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                    setInStockOnly(false);
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Réinitialiser les filtres"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Product Cards Grid */}
          {isLoadingProducts ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 size={36} className="animate-spin text-blue-600" />
              <span className="text-sm font-semibold">
                {language === 'ar' ? 'جاري تحميل المنتجات...' : 'Chargement du catalogue...'}
              </span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 bg-white rounded-3xl border border-slate-200 text-center p-8 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Package size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">{t('no_products_found')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {language === 'ar'
                  ? 'جرب تغيير فلاتر البحث أو تصفح باقي التصنيفات'
                  : 'Essayez d\'ajuster vos filtres de recherche ou parcourez nos autres catégories.'}
              </p>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                  setInStockOnly(false);
                }}
                className="py-2 px-5 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-md"
              >
                {t('all_categories')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={(p) => setQuickViewProduct(p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 4. Footer */}
      <Footer
        settings={settings}
        wilayaStats={wilayaStats}
        categories={categories}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          scrollToProducts();
        }}
      />

      {/* 5. Modals & Drawers */}
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onBuyNow={() => setIsCheckoutOpen(true)}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Form Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderPlaced={(order) => {
          setConfirmedOrder(order);
          fetchProducts(); // Refresh stock
        }}
      />

      {/* Order Confirmation Screen */}
      <OrderConfirmationModal
        order={confirmedOrder}
        isOpen={!!confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onPrintInvoice={(order) => setInvoiceOrder(order)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(loggedInUser) => {
          if (loggedInUser.role === 'admin') {
            enterAdminView();
          }
        }}
      />

      {/* Customer Account & Order History Modal */}
      <CustomerAccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onPrintInvoice={(order) => setInvoiceOrder(order)}
      />

      {/* Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      {/* Printable Invoice Modal */}
      <InvoicePrintModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
}

export default function App() {
  const app = (
    <LanguageProvider>
      <AuthProvider>
        <StoreSettingsProvider>
          <CartProvider>
            <StoreApp />
          </CartProvider>
        </StoreSettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );

  return GOOGLE_CLIENT_ID
    ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider>
    : app;
}
