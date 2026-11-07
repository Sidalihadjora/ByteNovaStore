import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Package,
  Clock,
  MapPin,
  Phone,
  Mail,
  Printer,
  ChevronRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function CustomerAccountModal({ isOpen, onClose, onPrintInvoice }) {
  const { t, language, formatPrice, isRtl } = useLanguage();
  const { user, updateUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'profile'
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Edit Profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setWilaya(user.wilaya || '');
      setCommune(user.commune || '');
      setAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && activeTab === 'orders') {
      const fetchMyOrders = async () => {
        setIsLoadingOrders(true);
        try {
          const res = await api.orders.getMyOrders();
          if (res.success && Array.isArray(res.orders)) {
            setOrders(res.orders);
          }
        } catch (err) {
          console.error('Failed to fetch orders:', err);
        } finally {
          setIsLoadingOrders(false);
        }
      };

      fetchMyOrders();
    }
  }, [isOpen, activeTab]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage('');
    try {
      const res = await api.auth.updateMe({ name, phone, wilaya, commune, address });
      if (res.success) {
        updateUser(res.user);
        setProfileMessage(t('profile_updated'));
      }
    } catch (err) {
      console.error(err);
      setProfileMessage('Error updating profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div
      className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="responsive-modal-panel relative bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { logout(); onClose(); }}
              className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>{t('logout')}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package size={16} />
            <span>{t('my_orders')} ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={16} />
            <span>{t('my_profile')}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto">
          {activeTab === 'orders' ? (
            <div>
              {isLoadingOrders ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={28} className="animate-spin text-blue-600" />
                  <span className="text-xs">{language === 'ar' ? 'جاري تحميل الطلبيات...' : 'Chargement de vos commandes...'}</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <Package size={40} className="stroke-1 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600 mb-1">{t('no_orders_yet')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="border border-slate-200 rounded-2xl p-4 hover:border-blue-300 transition-all bg-white shadow-xs"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block">{t('order_number')}</span>
                          <span className="font-mono font-bold text-slate-900">{o.order_number}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {o.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="py-3 flex flex-col gap-2">
                        {o.items && o.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                            <span className="truncate max-w-xs font-medium">
                              {it.quantity} × {it.product_name}
                            </span>
                            <span className="font-bold text-slate-900">{formatPrice(it.total_price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock size={13} />
                          <span>{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-blue-700 text-sm">{formatPrice(o.total_price)}</span>
                          <button
                            onClick={() => onPrintInvoice(o)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                            title={t('print_invoice')}
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              {profileMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{profileMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('full_name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('phone_number')}</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('wilaya')}</label>
                  <input
                    type="text"
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('commune')}</label>
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('address')}</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-500/20"
              >
                {isUpdatingProfile ? t('placing_order') : t('update_profile')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
