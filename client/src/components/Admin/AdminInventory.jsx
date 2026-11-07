import React, { useState, useEffect } from 'react';
import { Warehouse, AlertTriangle, Check, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { resolveImageUrl } from '../../utils/image';

export default function AdminInventory() {
  const { t, language, formatPrice } = useLanguage();
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [editQuantities, setEditQuantities] = useState({});

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.admin.getInventory();
      if (res.success && Array.isArray(res.inventory)) {
        setInventory(res.inventory);
        const map = {};
        res.inventory.forEach(p => {
          map[p.id] = p.stock_quantity;
        });
        setEditQuantities(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async (productId) => {
    const qty = editQuantities[productId];
    if (qty === undefined || isNaN(qty)) return;

    setUpdatingId(productId);
    try {
      await api.admin.updateStock(productId, qty);
      setInventory(prev =>
        prev.map(p => (p.id === productId ? { ...p, stock_quantity: parseInt(qty, 10) } : p))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('admin_inventory')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi et réapprovisionnement direct des stocks
          </p>
        </div>

        <button
          onClick={fetchInventory}
          className="flex items-center gap-1.5 py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">Chargement de l'inventaire...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 text-start">Produit</th>
                  <th className="p-4 text-start">SKU</th>
                  <th className="p-4 text-start">Catégorie</th>
                  <th className="p-4 text-start">Prix Unitaire</th>
                  <th className="p-4 text-start">Stock Actuel</th>
                  <th className="p-4 text-start">Statut Stock</th>
                  <th className="p-4 text-end">Mettre à Jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const qty = item.stock_quantity;
                  const isOutOfStock = qty <= 0;
                  const isLow = qty > 0 && qty <= 5;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveImageUrl(item.main_image)}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                          <span className="font-bold text-slate-900 max-w-xs truncate">
                            {language === 'ar' ? (item.name_ar || item.name) : (item.name_fr || item.name)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-500">{item.sku || '-'}</td>
                      <td className="p-4 text-slate-600">{item.category_name || '-'}</td>
                      <td className="p-4 font-black text-blue-700">{formatPrice(item.price)}</td>
                      <td className="p-4">
                        <span className={`font-black text-sm ${isOutOfStock ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {qty}
                        </span>
                      </td>
                      <td className="p-4">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            {t('out_of_stock_warning')}
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {t('low_stock_warning')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Stock Normal
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editQuantities[item.id] !== undefined ? editQuantities[item.id] : qty}
                            onChange={(e) => setEditQuantities({ ...editQuantities, [item.id]: e.target.value })}
                            className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-bold"
                          />
                          <button
                            onClick={() => handleUpdateStock(item.id)}
                            disabled={updatingId === item.id}
                            className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {updatingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
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
    </div>
  );
}
