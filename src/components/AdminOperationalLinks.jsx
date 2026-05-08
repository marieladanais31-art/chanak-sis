import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Save, Loader2, Link2, ExternalLink, Edit2,
  X, GripVertical, Eye, EyeOff, Globe, BookOpen,
} from 'lucide-react';

const INPUT  = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL  = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const CATEGORIES = ['LMS', 'Drive', 'ACEConnect', 'Expediente', 'Interno', 'Otro'];

const ALL_ROLES = ['admin', 'coordinator', 'tutor', 'parent', 'student'];
const ROLE_LABELS = {
  admin:       'Admin',
  coordinator: 'Coordinador',
  tutor:       'Tutor',
  parent:      'Padre / Familia',
  student:     'Estudiante',
};

const CATEGORY_COLOR = {
  LMS:          'bg-purple-100 text-purple-700 border-purple-200',
  Drive:        'bg-blue-100 text-blue-700 border-blue-200',
  ACEConnect:   'bg-teal-100 text-teal-700 border-teal-200',
  Expediente:   'bg-amber-100 text-amber-700 border-amber-200',
  Interno:      'bg-slate-100 text-slate-600 border-slate-200',
  Otro:         'bg-gray-100 text-gray-600 border-gray-200',
};

const EMPTY_FORM = {
  title:         '',
  description:   '',
  category:      'Otro',
  url:           '',
  visible_roles: ['admin', 'coordinator', 'tutor', 'parent'],
  is_active:     true,
  display_order: 0,
  student_id:    null,
};

/* ══════════════════════════════════════════════════════════════ */
export default function AdminOperationalLinks() {
  const { toast } = useToast();
  const [links, setLinks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeleting] = useState(null);

  /* ── load ── */
  const loadLinks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('operational_links')
      .select('*')
      .is('student_id', null)          // global links only (student-specific handled elsewhere)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[AdminOperationalLinks] load:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los recursos.', variant: 'destructive' });
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  /* ── form helpers ── */
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const toggleRole = (role) => {
    setForm(prev => ({
      ...prev,
      visible_roles: prev.visible_roles.includes(role)
        ? prev.visible_roles.filter(r => r !== role)
        : [...prev.visible_roles, role],
    }));
  };

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, display_order: links.length });
    setShowForm(true);
  };

  const openEdit = (link) => {
    setEditId(link.id);
    setForm({
      title:         link.title,
      description:   link.description || '',
      category:      link.category,
      url:           link.url,
      visible_roles: link.visible_roles || [...ALL_ROLES],
      is_active:     link.is_active,
      display_order: link.display_order,
      student_id:    link.student_id || null,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  /* ── save ── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: 'Título requerido', variant: 'destructive' });
      return;
    }
    if (!form.url.trim()) {
      toast({ title: 'URL requerida', variant: 'destructive' });
      return;
    }
    if (form.visible_roles.length === 0) {
      toast({ title: 'Selecciona al menos un rol visible', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        category:      form.category,
        url:           form.url.trim(),
        visible_roles: form.visible_roles,
        is_active:     form.is_active,
        display_order: Number(form.display_order) || 0,
        student_id:    form.student_id || null,
        updated_at:    new Date().toISOString(),
      };

      if (editId) {
        const { error } = await supabase.from('operational_links').update(payload).eq('id', editId);
        if (error) throw error;
        toast({ title: 'Recurso actualizado' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user?.id || null;
        const { error } = await supabase.from('operational_links').insert([payload]);
        if (error) throw error;
        toast({ title: 'Recurso creado' });
      }
      closeForm();
      await loadLinks();
    } catch (err) {
      console.error('[AdminOperationalLinks] save:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ── toggle active ── */
  const toggleActive = async (link) => {
    const { error } = await supabase
      .from('operational_links')
      .update({ is_active: !link.is_active, updated_at: new Date().toISOString() })
      .eq('id', link.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
    }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este recurso? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    const { error } = await supabase.from('operational_links').delete().eq('id', id);
    setDeleting(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Recurso eliminado' });
      setLinks(prev => prev.filter(l => l.id !== id));
    }
  };

  /* ── render ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            Recursos y Links Operativos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Links globales visibles según rol: LMS, Drive, ACEConnect, etc.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Recurso
        </button>
      </div>

      {/* Form modal / inline */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-slate-800 text-base">
              {editId ? 'Editar recurso' : 'Nuevo recurso'}
            </h3>
            <button onClick={closeForm} className="text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Título *</label>
                <input type="text" value={form.title} onChange={set('title')} className={INPUT} placeholder="Plataforma LMS" required />
              </div>
              <div>
                <label className={LABEL}>Categoría</label>
                <select value={form.category} onChange={set('category')} className={INPUT}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL}>URL *</label>
              <input type="url" value={form.url} onChange={set('url')} className={INPUT} placeholder="https://..." required />
            </div>

            <div>
              <label className={LABEL}>Descripción (opcional)</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={set('description')}
                className={INPUT + ' resize-none'}
                placeholder="Acceso al sistema de gestión de aprendizaje ACE…"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Orden de visualización</label>
                <input type="number" min={0} value={form.display_order} onChange={set('display_order')} className={INPUT} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-slate-700">Activo (visible)</span>
                </label>
              </div>
            </div>

            {/* Role visibility */}
            <div>
              <label className={LABEL}>Visible para roles</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_ROLES.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      form.visible_roles.includes(r)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Links table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">Sin recursos registrados</p>
          <p className="text-sm mt-1">Agrega el primer recurso con el botón "Nuevo Recurso".</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Recurso</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Roles</th>
                <th className="px-5 py-3 text-center">Orden</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map(link => (
                <tr key={link.id} className={`hover:bg-slate-50 transition-colors ${!link.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {link.title}
                    </div>
                    {link.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{link.description}</p>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5 max-w-xs truncate"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      {link.url}
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${CATEGORY_COLOR[link.category] || CATEGORY_COLOR.Otro}`}>
                      {link.category}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(link.visible_roles || []).map(r => (
                        <span key={r} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                          {ROLE_LABELS[r] || r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-500 font-mono text-xs">
                    {link.display_order}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => toggleActive(link)}
                      title={link.is_active ? 'Desactivar' : 'Activar'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        link.is_active
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {link.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(link)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={deletingId === link.id}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === link.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info footer */}
      <p className="text-xs text-slate-400 text-center">
        Los recursos activos aparecen en el dashboard de cada rol según la configuración de visibilidad.
        Los específicos por estudiante se gestionan desde la ficha del estudiante.
      </p>
    </div>
  );
}
