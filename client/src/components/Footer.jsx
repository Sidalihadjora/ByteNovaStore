import React from 'react';
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer({ settings = {}, wilayaStats = {}, categories = [], onSelectCategory }) {
  const { t, language } = useLanguage();
  const storeName = language === 'ar'
    ? settings.store_name_ar || settings.store_name || 'ByteNova Store'
    : settings.store_name || 'ByteNova Store';
  const address = [settings.store_address, settings.store_city, settings.store_country].filter(Boolean).join(', ');

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
      {/* Value Proposition Highlights Banner */}
      <div className="border-b border-slate-800 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Delivery coverage */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Truck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mb-0.5">
                  {language === 'ar'
                    ? `توصيل إلى ${wilayaStats.wilaya_count || 0} ولاية`
                    : `Livraison dans ${wilayaStats.wilaya_count || 0} wilayas`}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'ar' ? 'توصيل سريع لباب منزلك أو للمكتب' : 'Livraison express à domicile ou en point relais'}
                </p>
              </div>
            </div>

            {/* 2. Cash on Delivery */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mb-0.5">
                  {language === 'ar' ? 'الدفع عند الاستلام' : 'Paiement à la Livraison'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'ar' ? 'عاين طلبك وتأكد منه قبل دفع أي مليم' : 'Vérifiez votre colis avant de régler en espèces'}
                </p>
              </div>
            </div>

            {/* 3. Warranty & Return */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mb-0.5">
                  {language === 'ar' ? 'ضمان وخدمة ما بعد البيع' : 'Garantie & SAV Réactif'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'ar' ? 'إمكانية الاستبدال في حال وجود عيب مصنعي' : 'Échange rapide sous 48h en cas de problème'}
                </p>
              </div>
            </div>

            {/* 4. Customer Support */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Headphones size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mb-0.5">
                  {language === 'ar' ? 'خدمة الزبائن 7/7 أيام' : 'Support Client 7j/7'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'ar' ? 'فريقنا في خدمتكم عبر الهاتف وواتساب' : 'Assistance téléphonique et suivi continu'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Slogan */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                {settings.store_logo
                  ? <img src={settings.store_logo} alt="" className="w-full h-full rounded-xl object-contain bg-white" />
                  : <ShoppingBag size={20} />}
              </div>
              <span className="text-xl font-black text-white">
                  {storeName}
                </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
                {(language === 'ar' ? settings.store_description_ar : settings.store_description) ||
                  (language === 'ar' ? settings.store_slogan_ar : settings.store_slogan) || ''}
            </p>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              {t('categories')}
            </h4>
            <ul className="space-y-2 text-xs">
              {categories.slice(0, 5).map(cat => (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.slug)}
                    className="hover:text-blue-400 transition-colors cursor-pointer text-start"
                  >
                    {language === 'ar' ? (cat.name_ar || cat.name) : (cat.name_fr || cat.name)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Delivery in Algeria */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              {language === 'ar' ? 'التوصيل في الجزائر' : 'Livraison en Algérie'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              {language === 'ar'
                ? `قائمة التوصيل تشمل ${wilayaStats.wilaya_count || 0} ولاية و${wilayaStats.commune_count || 0} بلدية.`
                : `Zones desservies : ${wilayaStats.wilaya_count || 0} wilayas et ${wilayaStats.commune_count || 0} communes.`}
            </p>
            <span className="inline-block px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 text-[11px] font-semibold border border-blue-700/50">
              {wilayaStats.wilaya_count || 0} Wilayas & {wilayaStats.commune_count || 0} Communes
            </span>
          </div>

          {/* Col 4: Contact Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              {t('contact_us')}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              {settings.store_phone && <div className="flex items-center gap-2"><Phone size={14} className="text-blue-400 shrink-0" /><span dir="ltr">{settings.store_phone}</span></div>}
              {settings.store_secondary_phone && <div className="flex items-center gap-2"><Phone size={14} className="text-blue-400 shrink-0" /><span dir="ltr">{settings.store_secondary_phone}</span></div>}
              {settings.store_email && <div className="flex items-center gap-2"><Mail size={14} className="text-blue-400 shrink-0" /><a href={`mailto:${settings.store_email}`} className="hover:text-white">{settings.store_email}</a></div>}
              {address && <div className="flex items-center gap-2"><MapPin size={14} className="text-blue-400 shrink-0" /><span>{address}</span></div>}
              <div className="flex flex-wrap gap-3 pt-1">
                {settings.social_facebook && <a href={settings.social_facebook} target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a>}
                {settings.social_instagram && <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>}
                {settings.social_whatsapp && <a href={settings.social_whatsapp} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a>}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {storeName}. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.'}</p>
          <p className="flex items-center gap-1 text-[11px]">
            <span>{language === 'ar' ? 'صُمم خصيصاً للمستهلك الجزائري' : 'Conçu pour le marché algérien'}</span>
            <span className="text-red-500">🇩🇿</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
