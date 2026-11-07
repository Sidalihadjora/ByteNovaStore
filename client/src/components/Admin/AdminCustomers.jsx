import React, { useState, useEffect } from 'react';
import { Users, Trash2, Loader2, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

export default function AdminCustomers() {
  const { t, language, formatPrice } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.admin.getCustomers();
        if (res.success && Array.isArray(res.customers)) {
          setCustomers(res.customers);
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const customer = customerToDelete;
    setDeletingCustomerId(customer.id);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await api.admin.deleteCustomer(customer.id);
      if (!response.success) {
        throw new Error(response.message || 'Le compte client n’a pas pu être supprimé.');
      }
      setCustomers(previous => previous.filter(item => item.id !== customer.id));
      setCustomerToDelete(null);
      setActionSuccess(language === 'ar'
        ? `تم حذف حساب ${customer.name} مع الاحتفاظ بالطلبيات السابقة.`
        : `Le compte de ${customer.name} a été supprimé. Ses commandes sont conservées.`);
    } catch (err) {
      setActionError(err.message || 'Erreur lors de la suppression du client.');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  useEffect(() => {
    if (!customerToDelete || deletingCustomerId !== null) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCustomerToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customerToDelete, deletingCustomerId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {t('admin_customers')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {customers.length} {language === 'ar' ? 'زبون مسجل بالمنصة' : 'clients enregistrés'}
        </p>
      </div>

      {actionError && !customerToDelete && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">Chargement des clients...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users size={36} className="stroke-1 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 text-start">Client</th>
                  <th className="p-4 text-start">Email</th>
                  <th className="p-4 text-start">Téléphone</th>
                  <th className="p-4 text-start">Wilaya</th>
                  <th className="p-4 text-start">Commandes</th>
                  <th className="p-4 text-start">Total Dépensé (DA)</th>
                  <th className="p-4 text-start">Inscrit le</th>
                  <th className="p-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-bold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{c.email}</td>
                    <td className="p-4 font-mono text-slate-700" dir="ltr">{c.phone || '-'}</td>
                    <td className="p-4 text-slate-700">{c.wilaya || '-'}</td>
                    <td className="p-4 font-bold text-slate-900">{c.orders_count || 0}</td>
                    <td className="p-4 font-black text-blue-700">{formatPrice(c.total_spent || 0)}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError('');
                          setCustomerToDelete(c);
                        }}
                        disabled={deletingCustomerId !== null}
                        aria-label={language === 'ar' ? `حذف حساب ${c.name}` : `Supprimer le compte de ${c.name}`}
                        title={language === 'ar' ? 'حذف حساب العميل' : 'Supprimer le compte client'}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {customerToDelete && (
        <div
          className="responsive-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && deletingCustomerId === null) {
              setCustomerToDelete(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className="responsive-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 id="delete-customer-title" className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'تأكيد حذف العميل' : 'Confirmer la suppression'}
              </h2>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={deletingCustomerId !== null}
                aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            <div className="space-y-4 p-5">
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm leading-6">
                  {language === 'ar'
                    ? 'هذا الإجراء نهائي. ستبقى الطلبيات السابقة محفوظة ولكن سيتم فصلها عن حساب العميل.'
                    : 'Cette action est irréversible. Les commandes existantes seront conservées, mais détachées du compte client.'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">{customerToDelete.name}</p>
                <p className="mt-0.5 break-all text-sm text-slate-500">{customerToDelete.email}</p>
              </div>
              {actionError && (
                <p role="alert" className="text-sm text-red-600">{actionError}</p>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={deletingCustomerId !== null}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={deletingCustomerId !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingCustomerId !== null && <Loader2 size={16} className="animate-spin" />}
                {deletingCustomerId !== null
                  ? (language === 'ar' ? 'جارٍ الحذف...' : 'Suppression...')
                  : (language === 'ar' ? 'حذف العميل' : 'Supprimer le client')}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
