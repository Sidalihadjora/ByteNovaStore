import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Printer,
  Eye,
  Trash2,
  Package,
  FileSpreadsheet,
  Loader2,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { api } from '../../services/api';

export default function AdminOrders({ onPrintInvoice }) {
  const { t, language, formatPrice } = useLanguage();
  const { settings, wilayaStats } = useStoreSettings();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wilayaFilter, setWilayaFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Wilayas List for filter
  const [wilayasList, setWilayasList] = useState([]);

  // View Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (wilayaFilter !== 'all') params.wilaya = wilayaFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.orders.getAll(params);
      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, wilayaFilter, startDate, endDate]);

  useEffect(() => {
    const loadWilayas = async () => {
      try {
        const res = await api.wilayas.getAll();
        if (res.success) setWilayasList(res.data);
      } catch (err) {
        setActionError(err.message || 'Impossible de charger la liste des wilayas.');
      }
    };
    loadWilayas();
  }, []);

  // Listen for Escape key to close details modal
  useEffect(() => {
    if (!selectedOrder) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.orders.updateStatus(orderId, newStatus);
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setActionError(err.message || 'Impossible de modifier le statut de la commande.');
    }
  };

  const handleDeleteOrder = async (order) => {
    const confirmation = language === 'ar'
      ? `هل أنت متأكد من حذف الطلبية ${order.order_number} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Supprimer définitivement la commande ${order.order_number} ? Cette action est irréversible.`;
    if (!window.confirm(confirmation)) return;

    setDeletingOrderId(order.id);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await api.orders.delete(order.id);
      if (!response.success) {
        throw new Error(response.message || 'La commande n’a pas pu être supprimée.');
      }
      setOrders(previous => previous.filter(item => item.id !== order.id));
      setSelectedOrder(previous => previous?.id === order.id ? null : previous);
      setActionSuccess(language === 'ar'
        ? `تم حذف الطلبية ${order.order_number}.`
        : `La commande ${order.order_number} a été supprimée.`);
    } catch (err) {
      setActionError(err.message || 'Erreur lors de la suppression de la commande.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Export to Excel (XLSX)
  const handleExportExcel = () => {
    if (orders.length === 0) return;

    const data = orders.map(o => ({
      'N° Commande': o.order_number,
      'Date': o.created_at,
      'Client': o.customer_name,
      'Téléphone': o.customer_phone,
      'Wilaya': o.wilaya_name,
      'Commune': o.commune_name,
      'Adresse': o.delivery_address,
      'Articles': o.items ? o.items.map(it => `${it.quantity}x ${it.product_name}`).join(', ') : '',
      'Sous-total (DA)': o.subtotal,
      'Livraison (DA)': o.delivery_fee,
      'Total (DA)': o.total_price,
      'Statut': o.status,
      'Paiement': o.payment_method
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Commandes');
    const storeLabel = (settings.store_name || 'ByteNovaStore').replace(/[^a-zA-Z0-9_-]+/g, '_');
    XLSX.writeFile(workbook, `${storeLabel}_Commandes_${Date.now()}.xlsx`);
  };

  // Export to CSV
  const handleExportCsv = () => {
    window.open(api.orders.getExportCsvUrl(), '_blank');
  };

  const statusBadgeClass = (st) => {
    switch (st) {
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('admin_orders')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {orders.length} {language === 'ar' ? 'طلبية مسجلة' : 'commandes trouvées'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>{t('export_excel')}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Download size={15} />
            <span>{t('export_csv')}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par N° commande, nom, téléphone, commune..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
            />
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400" />
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Filtrer
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-slate-700 cursor-pointer"
          >
            <option value="all">Tous les Statuts</option>
            <option value="Pending">En Attente (Pending)</option>
            <option value="Confirmed">Confirmée (Confirmed)</option>
            <option value="Processing">En Préparation (Processing)</option>
            <option value="Shipped">Expédiée (Shipped)</option>
            <option value="Delivered">Livrée (Delivered)</option>
            <option value="Cancelled">Annulée (Cancelled)</option>
          </select>

          {/* Wilaya Filter */}
          <select
            value={wilayaFilter}
            onChange={(e) => setWilayaFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-slate-700 cursor-pointer"
          >
            <option value="all">Toutes les {wilayaStats.wilaya_count || 0} Wilayas</option>
            {wilayasList.map(w => (
              <option key={w.code} value={w.name_ascii}>
                {String(w.code).padStart(2, '0')} - {w.name_ascii} ({w.name_arabic})
              </option>
            ))}
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-slate-700"
          />

          {/* End Date */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-slate-700"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {actionError && (
          <div role="alert" className="m-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div role="status" className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            {actionSuccess}
          </div>
        )}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">Chargement des commandes...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package size={36} className="stroke-1 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">Aucune commande trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 text-start">N° Commande</th>
                  <th className="p-4 text-start">Date</th>
                  <th className="p-4 text-start">Client</th>
                  <th className="p-4 text-start">Téléphone</th>
                  <th className="p-4 text-start">Wilaya & Commune</th>
                  <th className="p-4 text-start">Total (DA)</th>
                  <th className="p-4 text-start">Statut</th>
                  <th className="p-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Order Number */}
                    <td className="p-4 font-mono font-bold text-blue-600">
                      {o.order_number}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>

                    {/* Customer */}
                    <td className="p-4 font-bold text-slate-900">
                      {o.customer_name}
                    </td>

                    {/* Phone */}
                    <td className="p-4 font-mono text-slate-700" dir="ltr">
                      {o.customer_phone}
                    </td>

                    {/* Wilaya & Commune */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{o.wilaya_name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[120px]">{o.commune_name}</div>
                    </td>

                    {/* Total */}
                    <td className="p-4 font-black text-blue-700">
                      {formatPrice(o.total_price)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-4">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-full border cursor-pointer ${statusBadgeClass(o.status)}`}
                      >
                        <option value="Pending">En Attente</option>
                        <option value="Confirmed">Confirmée</option>
                        <option value="Processing">En Préparation</option>
                        <option value="Shipped">Expédiée</option>
                        <option value="Delivered">Livrée</option>
                        <option value="Cancelled">Annulée</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                          title="Voir Détails"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => onPrintInvoice(o)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title={t('print_invoice')}
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(o)}
                          disabled={deletingOrderId === o.id}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-wait transition-colors cursor-pointer"
                          title={language === 'ar' ? 'حذف الطلبية' : 'Supprimer la commande'}
                          aria-label={language === 'ar' ? `حذف الطلبية ${o.order_number}` : `Supprimer la commande ${o.order_number}`}
                        >
                          {deletingOrderId === o.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto cursor-pointer"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-bold">Détails de la Commande</span>
                <h3 className="text-base font-black text-slate-900 font-mono">{selectedOrder.order_number}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Customer Info Card */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('full_name')}</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('phone_number')}</span>
                  <p className="font-bold text-slate-900 font-mono text-sm" dir="ltr">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('wilaya')} & {t('commune')}</span>
                  <p className="font-bold text-slate-900">{selectedOrder.wilaya_name} - {selectedOrder.commune_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('delivery_address')}</span>
                  <p className="font-bold text-slate-900">{selectedOrder.delivery_address}</p>
                </div>
                {selectedOrder.order_notes && (
                  <div className="col-span-2 pt-2 border-t border-blue-100">
                    <span className="text-slate-400 block mb-0.5">{t('notes')}</span>
                    <p className="italic text-slate-700">{selectedOrder.order_notes}</p>
                  </div>
                )}
              </div>

              {/* Status Update In Modal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700">Changer Statut:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer ${statusBadgeClass(selectedOrder.status)}`}
                >
                  <option value="Pending">En Attente (Pending)</option>
                  <option value="Confirmed">Confirmée (Confirmed)</option>
                  <option value="Processing">En Préparation (Processing)</option>
                  <option value="Shipped">Expédiée (Shipped)</option>
                  <option value="Delivered">Livrée (Delivered)</option>
                  <option value="Cancelled">Annulée (Cancelled)</option>
                </select>
              </div>

              {/* Products List */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">{t('ordered_items')}</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedOrder.items && selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={it.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'}
                          alt={it.product_name}
                          className="w-10 h-10 rounded-lg object-cover border"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{it.product_name}</p>
                          <p className="text-slate-500">{it.quantity} × {formatPrice(it.unit_price)}</p>
                        </div>
                      </div>
                      <span className="font-black text-blue-700">{formatPrice(it.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>{t('subtotal')}:</span>
                  <span className="font-bold">{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('delivery_fee')}:</span>
                  <span className="font-bold">{formatPrice(selectedOrder.delivery_fee)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                  <span>{t('total')}:</span>
                  <span className="text-blue-700">{formatPrice(selectedOrder.total_price)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onPrintInvoice(selectedOrder)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Printer size={15} />
                  <span>Imprimer le Bon de Livraison</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
