import React, { useState, useEffect } from 'react';
import { supabase } from '../services/db';
import { Plus, Search, Edit2, Trash2, User, Mail, Phone, Stethoscope, X, Check, MapPin, Briefcase } from 'lucide-react';

interface Assistant {
  id: string;
  full_name: string;
  specialty: string;
  email: string;
  phone: string;
  photo_url?: string;
  created_at?: string;
}

const Assistants: React.FC = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Assistant>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setAssistants(data as Assistant[]);
    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (assistant?: Assistant) => {
    if (assistant) {
      setEditingId(assistant.id);
      setFormData(assistant);
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        specialty: '',
        email: '',
        phone: '',
        photo_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!formData.full_name) throw new Error("Nome é obrigatório");

      const payload = {
        full_name: formData.full_name,
        specialty: formData.specialty,
        email: formData.email,
        phone: formData.phone,
        photo_url: formData.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name)}&background=random`
      };

      if (editingId) {
        const { error } = await supabase
          .from('assistants')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assistants')
          .insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchAssistants();
    } catch (error: any) {
      alert('Erro ao salvar: ' + (error.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${name}?`)) return;

    try {
      const { error } = await supabase.from('assistants').delete().eq('id', id);
      if (error) throw error;
      fetchAssistants();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const filteredAssistants = assistants.filter(a =>
    a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipe & Assistentes</h1>
          <p className="text-slate-500">Gerencie sua equipe de apoio e contatos profissionais.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome ou especialidade..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e580b1] focus:border-transparent outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex-none flex items-center px-4 py-2 bg-[#e580b1] text-white rounded-xl hover:bg-pink-600 transition font-bold shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" /> Novo
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
        </div>
      ) : filteredAssistants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">Nenhum assistente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssistants.map(assistant => (
            <div key={assistant.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition group">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={assistant.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assistant.full_name)}&background=random`}
                      alt={assistant.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm"
                    />
                    <div>
                      <h3 className="font-bold text-slate-800">{assistant.full_name}</h3>
                      <div className="flex items-center text-xs text-fuchsia-600 font-medium bg-fuchsia-50 px-2 py-0.5 rounded mt-1 w-fit">
                        <Stethoscope className="w-3 h-3 mr-1" />
                        {assistant.specialty || 'Geral'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleOpenModal(assistant)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(assistant.id, assistant.full_name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-slate-600">
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="truncate">{assistant.email || 'Sem email'}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{assistant.phone || 'Sem telefone'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status: Ativo</span>
                <button className="text-xs text-fuchsia-600 font-bold hover:underline">Ver Perfil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Assistente' : 'Novo Assistente'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    required
                    className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-[#e580b1] outline-none"
                    value={formData.full_name || ''}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ex: Ana Souza"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Especialidade / Função</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    required
                    className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-[#e580b1] outline-none"
                    value={formData.specialty || ''}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Ex: Recepcionista, Enfermeira"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-[#e580b1] outline-none"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-[#e580b1] outline-none"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Foto URL (Opcional)</label>
                <input
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#e580b1] outline-none text-xs"
                  value={formData.photo_url || ''}
                  onChange={e => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#e580b1] text-white rounded-lg font-bold hover:bg-pink-600 disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assistants;