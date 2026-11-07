import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

export default function AdminCategories({ onCategoriesUpdated }) {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCats = async () => {
    setIsLoading(true);
    try {
      const res = await api.categories.getAll();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
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
    setEditingCategory(null);
    setNameFr('');
    setNameAr('');
    setSlug('');
    setIcon('Tag');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setNameFr(cat.name_fr || cat.name);
    setNameAr(cat.name_ar || cat.name);
    setSlug(cat.slug);
    setIcon(cat.icon || 'Tag');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!nameFr.trim()) {
      setModalError('Category name is required');
      return;
    }

    setIsSaving(true);
    try {
      const autoSlug = slug.trim() || nameFr.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const payload = {
        name: nameFr.trim(),
        name_fr: nameFr.trim(),
        name_ar: nameAr.trim() || nameFr.trim(),
        slug: autoSlug,
        icon: icon || 'Tag'
      };

      if (editingCategory) {
        await api.categories.update(editingCategory.id, payload);
      } else {
        await api.categories.create(payload);
      }

      setIsModalOpen(false);
      fetchCats();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      setModalError(err.message || 'Error saving category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await api.categories.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('admin_categories')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {categories.length} {language === 'ar' ? 'تصنيفات متوفرة' : 'catégories actives'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Plus size={16} />
          <span>Ajouter une Catégorie</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 text-start">Nom (FR)</th>
                  <th className="p-4 text-start">Nom (AR)</th>
                  <th className="p-4 text-start">Slug</th>
                  <th className="p-4 text-start">Produits</th>
                  <th className="p-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="p-4 font-bold text-slate-900">{c.name_fr || c.name}</td>
                    <td className="p-4 font-bold text-slate-900">{c.name_ar || '-'}</td>
                    <td className="p-4 font-mono text-slate-500">{c.slug}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
                        {c.products_count || 0}
                      </span>
                    </td>
                    <td className="p-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="responsive-modal fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs cursor-pointer animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="responsive-modal-panel bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCategory ? 'Modifier la Catégorie' : 'Ajouter une Catégorie'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom en Français *</label>
                <input
                  type="text"
                  required
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  placeholder="Ex: Électroménager"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom en Arabe *</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: الأجهزة الكهرومنزلية"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slug URL (Optionnel)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="electromenager"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-3 border rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
