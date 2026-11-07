import React, { useEffect } from 'react';
import { X, Printer, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export default function InvoicePrintModal({ order, isOpen, onClose }) {
  const { formatPrice } = useLanguage();
  const { settings } = useStoreSettings();
  const storeName = settings.store_name || 'ByteNova Store';
  const storeAddress = [settings.store_address, settings.store_city, settings.store_country].filter(Boolean).join(', ');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
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
        {/* Modal Top Bar (hidden when printing) */}
        <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700">Aperçu du Bon de Livraison / Facture</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer size={15} />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              title="Fermer (Échap)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div id="printable-invoice" className="p-8 sm:p-10 bg-white text-slate-900 space-y-6 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold overflow-hidden">
                  {settings.store_logo
                    ? <img src={settings.store_logo} alt="" className="w-full h-full object-contain bg-white" />
                    : <ShoppingBag size={18} />}
                </div>
                <span className="text-xl font-black text-slate-900">{storeName}</span>
              </div>
              {settings.store_email && <p className="text-slate-500">{settings.store_email}</p>}
              {storeAddress && <p className="text-slate-500">{storeAddress}</p>}
              {settings.store_phone && <p className="text-slate-500">Tél: {settings.store_phone}</p>}
            </div>

            <div className="text-end">
              <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-sm text-blue-700 mb-1">
                {order.order_number}
              </span>
              <p className="text-slate-500">Date: {new Date(order.created_at).toLocaleDateString()}</p>
              <p className="font-bold text-emerald-700 uppercase tracking-wider mt-1">
                Mode: الدفع عند الاستلام (COD)
              </p>
            </div>
          </div>

          {/* Delivery Recipient Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Destinataire</span>
              <p className="font-extrabold text-sm text-slate-900">{order.customer_name}</p>
              <p className="font-mono text-slate-700 font-bold" dir="ltr">{order.customer_phone}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lieu de Livraison</span>
              <p className="font-bold text-slate-900">{order.wilaya_name} - {order.commune_name}</p>
              <p className="text-slate-600">{order.delivery_address}</p>
              {order.order_notes && (
                <p className="text-slate-500 italic mt-1">Note: {order.order_notes}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-start border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600">
              <tr>
                <th className="p-3 text-start">Désignation Produit</th>
                <th className="p-3 text-center">Qté</th>
                <th className="p-3 text-end">P.U (DA)</th>
                <th className="p-3 text-end">Total (DA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items && order.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-medium text-slate-900">{it.product_name}</td>
                  <td className="p-3 text-center font-bold">{it.quantity}</td>
                  <td className="p-3 text-end">{formatPrice(it.unit_price)}</td>
                  <td className="p-3 text-end font-bold">{formatPrice(it.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total:</span>
                <span className="font-bold">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Frais de Livraison:</span>
                <span className="font-bold">{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-blue-700 pt-2 border-t border-slate-200">
                <span>Net à Payer (Cash):</span>
                <span>{formatPrice(order.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Courier Instructions & Simulated Barcode */}
          <div className="border-t border-dashed border-slate-300 pt-4 flex items-center justify-between text-slate-400 text-[10px]">
            <div>
              <p>Merci pour votre achat chez {storeName}.</p>
              {settings.store_phone && <p>Pour toute réclamation, contactez le {settings.store_phone}.</p>}
            </div>
            {/* Barcode Graphic */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5 h-8">
                {[4,2,5,1,3,6,2,4,1,5,3,2,6,1,4,3,5,2,4,1,3].map((w, idx) => (
                  <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="font-mono text-[9px] mt-0.5 tracking-wider font-bold text-slate-700">
                {order.order_number}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
