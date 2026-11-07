import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const defaultSettings = {
  store_name: 'ByteNova Store',
  store_name_ar: 'ByteNova Store',
  website_title: 'ByteNova Store',
  primary_color: '#2563eb',
  secondary_color: '#4f46e5',
  free_delivery_threshold: '15000'
};

const settingGroups = [
  {
    title: 'Identité et apparence',
    fields: [
      ['store_name', 'Nom du magasin (FR)'],
      ['store_name_ar', 'اسم المتجر (عربي)'],
      ['website_title', 'Titre du site et du navigateur'],
      ['store_slogan', 'Slogan (FR)'],
      ['store_slogan_ar', 'الشعار (عربي)'],
      ['store_description', 'Description du site (FR)', 'textarea'],
      ['store_description_ar', 'وصف المتجر (عربي)', 'textarea'],
      ['store_logo', 'Logo du magasin'],
      ['store_favicon', 'Favicon du site'],
      ['hero_image', 'Image de la bannière d’accueil'],
      ['hero_image_badge', 'Texte court sur l’image (FR)'],
      ['hero_image_badge_ar', 'النص القصير على الصورة (عربي)'],
      ['hero_image_title', 'Titre sur l’image (FR)'],
      ['hero_image_title_ar', 'العنوان على الصورة (عربي)'],
      ['hero_image_discount', 'Texte de remise sur l’image (FR)'],
      ['hero_image_discount_ar', 'نص التخفيض على الصورة (عربي)'],
      ['primary_color', 'Couleur principale', 'color'],
      ['secondary_color', 'Couleur secondaire', 'color']
    ]
  },
  {
    title: 'Coordonnées du magasin',
    fields: [
      ['store_email', 'E-mail officiel', 'email'],
      ['store_phone', 'Téléphone principal'],
      ['store_secondary_phone', 'Téléphone secondaire'],
      ['store_address', 'Adresse'],
      ['store_city', 'Ville'],
      ['store_country', 'Pays']
    ]
  },
  {
    title: 'Réseaux sociaux et livraison',
    fields: [
      ['social_facebook', 'Facebook (URL HTTPS)', 'url'],
      ['social_instagram', 'Instagram (URL HTTPS)', 'url'],
      ['social_whatsapp', 'WhatsApp (URL HTTPS)', 'url'],
      ['free_delivery_threshold', 'Seuil de livraison gratuite (DA)', 'number']
    ]
  }
];

function Field({ name, label, type, value, onChange }) {
  const commonProps = {
    id: name,
    name,
    value: value ?? '',
    onChange,
    className: 'w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-slate-800'
  };
  return (
    <div>
      <label htmlFor={name} className="block font-bold text-slate-700 mb-1">{label}</label>
      {type === 'textarea'
        ? <textarea {...commonProps} rows={3} />
        : <input {...commonProps} type={type || 'text'} required={type === 'number'} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} />}
    </div>
  );
}

export default function AdminSettings({ onSettingsUpdated }) {
  const { t } = useLanguage();
  const { updateCredentials } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [account, setAccount] = useState({ name: '', email: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, accountResponse] = await Promise.all([
          api.settings.get(),
          api.settings.getAdminAccount()
        ]);
        if (!active) return;
        if (!settingsResponse.success || !settingsResponse.settings) {
          throw new Error(settingsResponse.message || 'Impossible de charger les paramètres.');
        }
        if (!accountResponse.success || !accountResponse.account) {
          throw new Error(accountResponse.message || 'Impossible de charger le compte administrateur.');
        }
        setSettings({ ...defaultSettings, ...settingsResponse.settings });
        setAccount(accountResponse.account);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Erreur lors du chargement des paramètres.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleSettingChange = (event) => {
    setSettings(previous => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleAssetUpload = async (event, settingName) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setUploadingAsset(settingName);
    setUploadProgress(0);
    setSuccess('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.products.uploadImage(formData, setUploadProgress);
      if (!response.success || !response.imageUrl) {
        throw new Error(response.message || 'Image upload failed.');
      }
      setSettings(previous => ({ ...previous, [settingName]: response.imageUrl }));
      setSuccess('Image téléversée. Enregistrez les paramètres du magasin pour appliquer le changement.');
    } catch (uploadError) {
      setError(uploadError.message || 'Impossible de téléverser cette image.');
    } finally {
      setUploadingAsset('');
      setUploadProgress(0);
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    setSuccess('');
    setError('');
    try {
      const response = await api.settings.update(settings);
      if (!response.success || !response.settings) {
        throw new Error(response.message || 'Les paramètres n’ont pas pu être enregistrés.');
      }
      setSettings({ ...defaultSettings, ...response.settings });
      await onSettingsUpdated?.();
      setSuccess('Paramètres du magasin enregistrés.');
    } catch (saveError) {
      setError(saveError.message || 'Erreur lors de l’enregistrement des paramètres.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    setSavingAccount(true);
    setSuccess('');
    setError('');
    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('La confirmation du nouveau mot de passe ne correspond pas.');
      }
      const payload = {
        currentPassword,
        name: account.name,
        email: account.email
      };
      if (newPassword) payload.newPassword = newPassword;
      const response = await api.settings.updateAdminAccount(payload);
      if (!response.success || !response.account) {
        throw new Error(response.message || 'Le compte administrateur n’a pas pu être modifié.');
      }
      updateCredentials(response.account, response.token);
      setAccount(response.account);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Compte administrateur mis à jour.');
    } catch (saveError) {
      setError(saveError.message || 'Erreur lors de la mise à jour du compte.');
    } finally {
      setSavingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 size={20} className="animate-spin me-2" />
        Chargement des paramètres…
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin_settings')}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Identité, coordonnées et accès administrateur du magasin.</p>
      </div>

      {success && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /><span>{success}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-7 text-xs">
        {settingGroups.map(group => (
          <section key={group.title} className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">{group.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.fields.map(([name, label, type]) => (
                <div key={name}>
                  {['store_logo', 'store_favicon', 'hero_image'].includes(name) ? (
                    <>
                      <label htmlFor={`${name}-file`} className="block font-bold text-slate-700 mb-1">{label}</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {settings[name] && (
                          <img
                            src={settings[name]}
                            alt={`Aperçu ${name === 'store_logo' ? 'du logo' : name === 'store_favicon' ? 'du favicon' : 'de la bannière d’accueil'}`}
                            className={name === 'hero_image'
                              ? 'h-20 w-36 rounded border border-slate-200 bg-white object-cover'
                              : 'max-h-14 max-w-40 rounded border border-slate-200 bg-white p-1 object-contain'}
                          />
                        )}
                        <label
                          htmlFor={`${name}-file`}
                          className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 ${uploadingAsset || savingSettings ? 'pointer-events-none opacity-60' : ''}`}
                        >
                          {uploadingAsset === name
                            ? `Téléversement ${uploadProgress}%`
                            : settings[name] ? 'Choisir une autre image' : 'Choisir une image'}
                        </label>
                        {settings[name] && (
                          <button
                            type="button"
                            onClick={() => setSettings(previous => ({ ...previous, [name]: '' }))}
                            disabled={!!uploadingAsset || savingSettings}
                            className="font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                      <input
                        id={`${name}-file`}
                        name={name}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={!!uploadingAsset || savingSettings}
                        onChange={event => handleAssetUpload(event, name)}
                      />
                      {uploadingAsset === name && (
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
                          role="progressbar"
                          aria-label={`Téléversement ${label}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={uploadProgress}
                        >
                          <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                      {settings[name] && (
                        <p className="mt-1 break-all text-[10px] text-slate-500">{settings[name]}</p>
                      )}
                    </>
                  ) : (
                    <Field {...{ name, label, type }} value={settings[name]} onChange={handleSettingChange} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button type="submit" disabled={savingSettings || !!uploadingAsset} className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20">
            {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Enregistrer les paramètres</span>
          </button>
        </div>
      </form>

      <form onSubmit={handleSaveAccount} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 text-xs">
        <div>
          <h2 className="text-sm font-black text-slate-800">Compte administrateur</h2>
          <p className="text-slate-500 mt-1">Confirmez votre mot de passe actuel pour modifier les accès.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="admin-name" className="block font-bold text-slate-700 mb-1">Nom</label>
            <input id="admin-name" value={account.name} onChange={event => setAccount(previous => ({ ...previous, name: event.target.value }))} required maxLength={100} className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3" />
          </div>
          <div>
            <label htmlFor="admin-email" className="block font-bold text-slate-700 mb-1">E-mail administrateur</label>
            <input id="admin-email" type="email" value={account.email} onChange={event => setAccount(previous => ({ ...previous, email: event.target.value }))} required maxLength={254} className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3" />
          </div>
          <div>
            <label htmlFor="current-password" className="block font-bold text-slate-700 mb-1">Mot de passe actuel</label>
            <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3" />
          </div>
          <div>
            <label htmlFor="new-password" className="block font-bold text-slate-700 mb-1">Nouveau mot de passe (facultatif)</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3" />
          </div>
          {newPassword && (
            <div>
              <label htmlFor="confirm-password" className="block font-bold text-slate-700 mb-1">Confirmer le nouveau mot de passe</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3" />
            </div>
          )}
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button type="submit" disabled={savingAccount} className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold flex items-center gap-2 cursor-pointer">
            {savingAccount ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Mettre à jour le compte</span>
          </button>
        </div>
      </form>
    </div>
  );
}
