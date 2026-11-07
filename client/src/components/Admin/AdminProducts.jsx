import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Package,
  Layers,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { resolveImageUrl } from '../../utils/image';

export default function AdminProducts({ categories = [] }) {
  const { t, language, formatPrice } = useLanguage();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form Fields
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [shortDescFr, setShortDescFr] = useState('');
  const [shortDescAr, setShortDescAr] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageStatus, setImageStatus] = useState('empty');
  const [imageChanged, setImageChanged] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const localImagePreview = useRef('');

  const clearLocalImagePreview = () => {
    if (localImagePreview.current) {
      URL.revokeObjectURL(localImagePreview.current);
      localImagePreview.current = '';
    }
  };

  useEffect(() => () => clearLocalImagePreview(), []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.products.getAll({ admin_all: 'true' });
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const openAddModal = () => {
    setEditingProduct(null);
    setNameFr('');
    setNameAr('');
    setCategoryId(categories[0]?.id || '');
    setPrice('');
    setOldPrice('');
    setStockQuantity('10');
    setShortDescFr('');
    setShortDescAr('');
    setDescFr('');
    setDescAr('');
    setImageUrl('');
    setImagePreviewUrl('');
    clearLocalImagePreview();
    setImageStatus('empty');
    setImageChanged(false);
    setIsActive(true);
    setIsFeatured(false);
    setImageUploadProgress(0);
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setNameFr(p.name_fr || p.name);
    setNameAr(p.name_ar || p.name);
    setCategoryId(p.category_id || '');
    setPrice(String(p.price));
    setOldPrice(p.old_price !== null && p.old_price !== undefined ? String(p.old_price) : '');
    setStockQuantity(String(p.stock_quantity));
    setShortDescFr(p.short_description_fr || p.short_description || '');
    setShortDescAr(p.short_description_ar || p.short_description || '');
    setDescFr(p.description_fr || p.description || '');
    setDescAr(p.description_ar || p.description || '');
    const savedImageUrl = p.main_image || '';
    const usableImageUrl = /^https?:\/\//i.test(savedImageUrl) || savedImageUrl.startsWith('/uploads/');
    setImageUrl(usableImageUrl ? savedImageUrl : '');
    setImagePreviewUrl(p.main_image || '');
    clearLocalImagePreview();
    setImageStatus(savedImageUrl ? (usableImageUrl ? 'saved' : 'legacy') : 'empty');
    setImageChanged(false);
    setIsActive(p.is_active === 1);
    setIsFeatured(p.is_featured === 1);
    setImageUploadProgress(0);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    clearLocalImagePreview();
    const localPreview = URL.createObjectURL(file);
    localImagePreview.current = localPreview;
    setImagePreviewUrl(localPreview);
    setImageStatus('uploading');
    setImageChanged(true);
    setIsUploadingImage(true);
    setImageUploadProgress(0);
    setModalError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.products.uploadImage(formData, (progress) => {
        setImageUploadProgress(progress);
      });
      if (res.success && res.imageUrl) {
        setImageUrl(res.imageUrl);
        setImagePreviewUrl(res.imageUrl);
        setImageStatus('uploaded');
        clearLocalImagePreview();
      } else {
        throw new Error(res.message || 'Image upload failed.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setImageStatus('error');
      setModalError(err.message || 'Image upload failed. Remove the selection or enter a valid image URL.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUrlChange = (value) => {
    clearLocalImagePreview();
    setImageUrl(value);
    setImagePreviewUrl(value);
    setImageStatus(value.trim() ? 'external' : 'removed');
    setImageChanged(true);
    setModalError('');
  };

  const handleRemoveImage = () => {
    clearLocalImagePreview();
    setImageUrl('');
    setImagePreviewUrl('');
    setImageStatus('removed');
    setImageChanged(true);
    setImageUploadProgress(0);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setModalError('');

    if (isUploadingImage || imageStatus === 'error') {
      setModalError('Wait for the image upload to finish, or remove the failed selection before saving.');
      return;
    }

    if (!nameFr.trim() && !nameAr.trim()) {
      setModalError('Product name is required');
      return;
    }

    if (!price || isNaN(price)) {
      setModalError('Valid price in DA is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: nameFr.trim() || nameAr.trim(),
        name_fr: nameFr.trim() || nameAr.trim(),
        name_ar: nameAr.trim() || nameFr.trim(),
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        price: parseFloat(price),
        old_price: oldPrice && !isNaN(oldPrice) ? parseFloat(oldPrice) : null,
        stock_quantity: parseInt(stockQuantity, 10) || 0,
        short_description: shortDescFr.trim() || shortDescAr.trim(),
        short_description_fr: shortDescFr.trim(),
        short_description_ar: shortDescAr.trim(),
        description: descFr.trim() || descAr.trim(),
        description_fr: descFr.trim(),
        description_ar: descAr.trim(),
        is_active: isActive ? 1 : 0,
        is_featured: isFeatured ? 1 : 0
      };
      if (imageChanged) {
        payload.main_image = imageUrl.trim() || null;
      }

      if (editingProduct) {
        await api.products.update(editingProduct.id, payload);
      } else {
        await api.products.create(payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Error saving product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (productId) => {
    try {
      await api.products.toggleActive(productId);
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, is_active: p.is_active === 1 ? 0 : 1 } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await api.products.delete(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter products by search & category
  const filteredProducts = products.filter(p => {
    const pName = (p.name_fr || p.name || '') + ' ' + (p.name_ar || '');
    const matchesSearch = pName.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCat === 'all' || String(p.category_id) === String(selectedCat) || p.category_slug === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('admin_products')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {products.length} {language === 'ar' ? 'منتج مسجل بالمخزن' : 'produits au catalogue'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>{t('add_product')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
          />
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400" />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-hidden focus:border-blue-600 cursor-pointer"
        >
          <option value="all">{t('all_categories')}</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {language === 'ar' ? c.name_ar : c.name_fr}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">{language === 'ar' ? 'جاري تحميل المنتجات...' : 'Chargement des produits...'}</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package size={36} className="stroke-1 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">{t('no_products_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 text-start">Image</th>
                  <th className="p-4 text-start">Produit</th>
                  <th className="p-4 text-start">Catégorie</th>
                  <th className="p-4 text-start">Prix (DA)</th>
                  <th className="p-4 text-start">Stock</th>
                  <th className="p-4 text-start">Statut</th>
                  <th className="p-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const hasDiscount = p.old_price && Number(p.old_price) > Number(p.price);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Image */}
                      <td className="p-4">
                        <img
                          src={resolveImageUrl(p.main_image || (p.images && p.images[0]))}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                        />
                      </td>

                      {/* Name & SKU */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm max-w-xs truncate">
                          {language === 'ar' ? (p.name_ar || p.name) : (p.name_fr || p.name)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {p.sku || '-'}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {language === 'ar' ? (p.category_name_ar || p.category_name) : (p.category_name_fr || p.category_name || '-')}
                        </span>
                      </td>

                      {/* Price & Old Price */}
                      <td className="p-4">
                        <div className="font-extrabold text-blue-700 text-sm">
                          {formatPrice(p.price)}
                        </div>
                        {hasDiscount && (
                          <div className="text-[11px] text-slate-400 line-through">
                            {formatPrice(p.old_price)} (-{p.discount_percentage}%)
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="p-4">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            p.stock_quantity <= 0
                              ? 'bg-red-100 text-red-700'
                              : p.stock_quantity <= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(p.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            p.is_active === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {p.is_active === 1 ? 'Actif' : 'Inactif'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                            title={t('edit_product')}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                            title={t('delete_product')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="responsive-modal-panel relative bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduct ? t('edit_product') : t('add_product')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Product Names (FR and AR) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('product_name_fr')} *</label>
                  <input
                    type="text"
                    required
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="Ex: Xiaomi Redmi Note 13"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('product_name_ar')} *</label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: شاومي ريدمي نوت 13"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Category, Prices & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">{t('categories')}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs cursor-pointer"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_fr}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">{t('current_price')} (DA) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3900"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">{t('old_price_optional')}</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">{t('stock_quantity')} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Product Photo Upload Section (Device file or URL) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    {language === 'ar' ? 'صورة المنتج (من جهازك أو عبر رابط)' : 'Photo du produit (depuis votre appareil ou lien)'}
                  </label>
                  {imagePreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer font-semibold"
                    >
                      {language === 'ar' ? 'إزالة الصورة' : 'Supprimer la photo'}
                    </button>
                  )}
                </div>

                {/* Main Upload Zone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* File Upload Button */}
                  <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xs group">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageFileUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      {isUploadingImage ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                    </div>
                    <span className="font-bold text-xs text-blue-700">
                      {isUploadingImage ? 'Chargement en cours...' : 'Choisir une photo depuis votre appareil'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      (PNG, JPG, WEBP depuis n'importe quel dossier)
                    </span>
                  </label>

                  {/* Preview or Info */}
                  <div className="flex items-center justify-center p-2 rounded-2xl bg-white border border-slate-200 min-h-[100px]">
                    {imagePreviewUrl ? (
                      <div className="relative group w-full flex items-center gap-3 p-1">
                        <img
                          src={imagePreviewUrl.startsWith('blob:') ? imagePreviewUrl : resolveImageUrl(imagePreviewUrl)}
                          alt="Preview"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 ${
                            imageStatus === 'error'
                              ? 'bg-red-100 text-red-800'
                              : imageStatus === 'uploading' || imageStatus === 'legacy'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {imageStatus === 'uploading'
                              ? `Envoi en cours (${imageUploadProgress}%)`
                              : imageStatus === 'error'
                                ? 'Échec de l’envoi'
                                : imageStatus === 'legacy'
                                  ? 'Ancienne image locale non accessible'
                                : imageStatus === 'external'
                                  ? 'URL externe'
                                  : imageStatus === 'saved'
                                    ? 'Image enregistrée'
                                    : imageStatus === 'removed'
                                      ? 'Image supprimée'
                                      : 'Image envoyée sur le serveur'}
                          </span>
                          <p className="text-[11px] text-slate-500 truncate" title={imageUrl || imagePreviewUrl}>
                            {imageStatus === 'uploading' || imageStatus === 'error' ? 'Image sélectionnée sur cet appareil' : imageUrl}
                          </p>
                          {imageStatus === 'uploading' && (
                            <progress className="w-full h-1.5 mt-1" max="100" value={imageUploadProgress} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 p-2">
                        <ImageIcon size={28} className="mx-auto mb-1 stroke-1 text-slate-300" />
                        <span className="text-[11px]">Aucune photo sélectionnée</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional URL input (type="text" to prevent browser URL validation error) */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {language === 'ar' ? 'أو رابط مباشر:' : 'Ou lien web (optionnel):'}
                    </span>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      disabled={isUploadingImage}
                      placeholder="https://images.unsplash.com/... ou /uploads/..."
                      className="flex-1 bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs focus:outline-hidden focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description Courte (FR)</label>
                  <textarea
                    rows={2}
                    value={shortDescFr}
                    onChange={(e) => setShortDescFr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-1.5 px-3 text-xs resize-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وصف قصير (عربي)</label>
                  <textarea
                    rows={2}
                    value={shortDescAr}
                    onChange={(e) => setShortDescAr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-1.5 px-3 text-xs resize-none"
                  />
                </div>
              </div>

              {/* Active / Featured Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>{t('is_active')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>{t('is_featured')}</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage || imageStatus === 'error'}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {isSaving ? t('placing_order') : t('save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
