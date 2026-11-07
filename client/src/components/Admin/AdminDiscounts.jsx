import React, { useState, useEffect } from 'react';
import { Percent, Tag, Check, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { resolveImageUrl } from '../../utils/image';

export default function AdminDiscounts() {
  const { t, language, formatPrice } = useLanguage();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiscountedProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.products.getAll({ admin_all: 'true' });
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscountedProducts();
  }, []);

  const discountedList = products.filter(p => p.old_price && Number(p.old_price) > Number(p.price));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'ar' ? 'إدارة التخفيضات والأسعار الترويجية' : 'Gestion des Remises & Promotions'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {discountedList.length} {language === 'ar' ? 'منتجات تتمتع بتخفيضات نشطة حالياً' : 'produits avec promotions actives'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">PROMOTIONS ACTIVES</span>
            <span className="text-2xl font-black text-emerald-600">{discountedList.length}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Percent size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">REMISE MOYENNE</span>
            <span className="text-2xl font-black text-blue-600">
              {discountedList.length > 0
                ? Math.round(discountedList.reduce((sum, p) => sum + (p.discount_percentage || 0), 0) / discountedList.length)
                : 0}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Tag size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Liste des Produits en Solde</h3>
          <button
            onClick={fetchDiscountedProducts}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <RefreshCw size={13} />
            <span>Actualiser</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : discountedList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold">Aucun produit en réduction actuellement</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 text-start">Produit</th>
                  <th className="p-4 text-start">Ancien Prix (DA)</th>
                  <th className="p-4 text-start">Nouveau Prix (DA)</th>
                  <th className="p-4 text-start">Économie Client</th>
                  <th className="p-4 text-start">Taux de Remise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountedList.map((p) => {
                  const saveAmount = Number(p.old_price) - Number(p.price);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveImageUrl(p.main_image || (p.images && p.images[0]))}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                          <span className="font-bold text-slate-900 max-w-xs truncate">
                            {language === 'ar' ? (p.name_ar || p.name) : (p.name_fr || p.name)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 line-through text-slate-400 font-bold">{formatPrice(p.old_price)}</td>
                      <td className="p-4 font-black text-blue-700 text-sm">{formatPrice(p.price)}</td>
                      <td className="p-4 font-bold text-emerald-700">+{formatPrice(saveAmount)}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">
                          -{p.discount_percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
