import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  MapPin,
  Phone,
  User,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingBag
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { api } from '../services/api';

export default function CheckoutModal({ isOpen, onClose, onOrderPlaced }) {
  const { t, language, formatPrice, isRtl } = useLanguage();
  const { settings, wilayaStats } = useStoreSettings();
  const { cartItems, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('');
  const [selectedWilayaName, setSelectedWilayaName] = useState('');
  const [selectedCommuneName, setSelectedCommuneName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Algerian Data State
  const [wilayasList, setWilayasList] = useState([]);
  const [communesList, setCommunesList] = useState([]);
  const [isLoadingWilayas, setIsLoadingWilayas] = useState(false);
  const [isLoadingCommunes, setIsLoadingCommunes] = useState(false);

  // Delivery fee & Submission State
  const [deliveryFee, setDeliveryFee] = useState(600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Pre-fill user info if logged in
  useEffect(() => {
    if (user) {
      if (user.name) setFullName(user.name);
      if (user.phone) setPhoneNumber(user.phone);
      if (user.address) setDeliveryAddress(user.address);
    }
  }, [user]);

  // Load Algerian Wilayas from data.json dynamically via backend API
  useEffect(() => {
    if (!isOpen) return;

    const fetchWilayas = async () => {
      setIsLoadingWilayas(true);
      try {
        const res = await api.wilayas.getAll();
        if (res.success && Array.isArray(res.data)) {
          setWilayasList(res.data);
        }
      } catch (err) {
        console.error('Failed to load wilayas:', err);
        setErrorMessage('Failed to load wilayas data. Please try again.');
      } finally {
        setIsLoadingWilayas(false);
      }
    };

    fetchWilayas();
  }, [isOpen]);

  // Dependent dropdown: Whenever selectedWilayaCode changes, load communes dynamically!
  useEffect(() => {
    if (!selectedWilayaCode) {
      setCommunesList([]);
      setSelectedCommuneName('');
      return;
    }

    const fetchCommunes = async () => {
      setIsLoadingCommunes(true);
      try {
        const res = await api.wilayas.getCommunes(selectedWilayaCode);
        if (res.success && Array.isArray(res.data)) {
          setCommunesList(res.data);
          // Reset commune selection so customer must pick from this wilaya's communes
          setSelectedCommuneName('');
        }
      } catch (err) {
        console.error('Failed to load communes for wilaya:', err);
      } finally {
        setIsLoadingCommunes(false);
      }
    };

    fetchCommunes();

    // Update delivery fee for the selected wilaya
    const selectedWilayaObj = wilayasList.find(w => String(w.code) === String(selectedWilayaCode));
    if (selectedWilayaObj) {
      setDeliveryFee(selectedWilayaObj.delivery_fee || 600);
      setSelectedWilayaName(language === 'ar' ? selectedWilayaObj.name_arabic : selectedWilayaObj.name_ascii);
    }
  }, [selectedWilayaCode, wilayasList, language]);

  if (!isOpen) return null;

  // Algerian Phone Validation
  const validatePhone = (num) => {
    const cleaned = num.replace(/[\s\-\.]/g, '');
    const regex = /^((\+213|00213|0)(5|6|7)[0-9]{8})$|^((\+213|00213|0)(2|3|4)[0-9]{7,8})$/;
    return regex.test(cleaned);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhoneNumber(val);
    if (val && !validatePhone(val)) {
      setPhoneError(t('phone_error'));
    } else {
      setPhoneError('');
    }
  };

  const handleWilayaChange = (e) => {
    const code = e.target.value;
    setSelectedWilayaCode(code);
    const found = wilayasList.find(w => String(w.code) === String(code));
    if (found) {
      setSelectedWilayaName(language === 'ar' ? found.name_arabic : found.name_ascii);
    } else {
      setSelectedWilayaName('');
    }
  };

  // Check if free shipping applies
  const configuredFreeThreshold = Number(settings.free_delivery_threshold);
  const FREE_SHIPPING_THRESHOLD = Number.isFinite(configuredFreeThreshold) && configuredFreeThreshold >= 0
    ? configuredFreeThreshold
    : 15000;
  const isFreeDelivery = subtotal >= FREE_SHIPPING_THRESHOLD;
  const effectiveDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const totalAmount = subtotal + effectiveDeliveryFee;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!fullName.trim()) {
      setErrorMessage(t('required_field') + ': ' + t('full_name'));
      return;
    }

    if (!phoneNumber.trim() || !validatePhone(phoneNumber)) {
      setErrorMessage(t('phone_error'));
      return;
    }

    if (!selectedWilayaCode || !selectedWilayaName) {
      setErrorMessage(t('required_field') + ': ' + t('wilaya'));
      return;
    }

    if (!selectedCommuneName) {
      setErrorMessage(t('required_field') + ': ' + t('commune'));
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMessage(t('required_field') + ': ' + t('address'));
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage(t('cart_empty'));
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer_name: fullName.trim(),
        customer_phone: phoneNumber.trim(),
        wilaya_code: parseInt(selectedWilayaCode, 10),
        wilaya_name: selectedWilayaName,
        commune_name: selectedCommuneName,
        delivery_address: deliveryAddress.trim(),
        order_notes: orderNotes.trim(),
        items: cartItems.map(item => ({
          id: item.id,
          product_id: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity
        }))
      };

      const res = await api.orders.create(orderPayload);

      if (res.success && res.order) {
        clearCart();
        onClose();
        onOrderPlaced(res.order);
      } else {
        setErrorMessage(res.message || 'Error submitting order');
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setErrorMessage(err.message || 'An error occurred while placing the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <Truck size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{t('checkout_title')}</h2>
              <p className="text-xs text-blue-200">{t('checkout_subtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 flex flex-col gap-5">
          {/* Section: Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-blue-600" />
                <span>{t('full_name')} *</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('full_name_placeholder')}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone size={14} className="text-blue-600" />
                <span>{t('phone_number')} *</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder={t('phone_placeholder')}
                dir="ltr"
                className={`w-full bg-slate-50 border ${
                  phoneError ? 'border-red-400 focus:border-red-600' : 'border-slate-300 focus:border-blue-600'
                } focus:bg-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800`}
              />
              {phoneError && (
                <span className="text-[11px] text-red-600 mt-1 block font-medium">
                  {phoneError}
                </span>
              )}
            </div>
          </div>

          {/* Section: Wilaya and Commune Selection (Dynamic Dependent Dropdowns from data.json) */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin size={15} className="text-blue-600" />
              <span>{language === 'ar'
                ? `اختيار الولاية والبلدية (${wilayaStats.wilaya_count || 0} ولاية)`
                : `Sélection Wilaya & Commune (${wilayaStats.wilaya_count || 0} wilayas)`}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Wilaya Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('wilaya')} *
                </label>
                <select
                  required
                  value={selectedWilayaCode}
                  onChange={handleWilayaChange}
                  disabled={isLoadingWilayas}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 cursor-pointer"
                >
                  <option value="">{t('select_wilaya')}</option>
                  {wilayasList.map((w) => (
                    <option key={w.code} value={w.code}>
                      {String(w.code).padStart(2, '0')} - {language === 'ar' ? w.name_arabic : w.name_ascii} ({w.delivery_fee} DA)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dependent Commune Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('commune')} *
                </label>
                <select
                  required
                  value={selectedCommuneName}
                  onChange={(e) => setSelectedCommuneName(e.target.value)}
                  disabled={!selectedWilayaCode || isLoadingCommunes}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">
                    {!selectedWilayaCode
                      ? t('select_wilaya_first')
                      : isLoadingCommunes
                      ? (language === 'ar' ? 'جاري تحميل البلديات...' : 'Chargement des communes...')
                      : t('select_commune')}
                  </option>
                  {communesList.map((c, idx) => {
                    const cName = language === 'ar' ? c.name_arabic : c.name_ascii;
                    return (
                      <option key={idx} value={cName}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Detailed Delivery Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('address')} *
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={t('address_placeholder')}
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800"
            />
          </div>

          {/* Optional Order Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('notes')}
            </label>
            <textarea
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={t('notes_placeholder')}
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-2 px-3.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 resize-none"
            />
          </div>

          {/* Payment Method Badge: Cash on Delivery */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="font-bold text-emerald-900 text-sm block">
                {t('cod_label')}
              </span>
              <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                {t('cod_desc')}
              </p>
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span>{t('subtotal')} ({cartItems.length} {language === 'ar' ? 'منتجات' : 'produits'}):</span>
              <span className="font-bold text-slate-800">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span>{t('delivery_fee')}:</span>
              <span className="font-bold">
                {isFreeDelivery ? (
                  <span className="text-emerald-600 font-extrabold">{t('free')}</span>
                ) : (
                  <span>{formatPrice(deliveryFee)}</span>
                )}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900">{t('total')}:</span>
              <span className="text-xl font-black text-blue-700">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{t('placing_order')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>{t('place_order')} - {formatPrice(totalAmount)}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
