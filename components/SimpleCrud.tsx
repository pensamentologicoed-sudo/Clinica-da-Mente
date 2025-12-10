import React, { useState, useEffect } from 'react';
import { supabase } from '../services/db';
import { Plus, Trash2, Edit2, Pill, Stethoscope, Mail, Phone } from 'lucide-react';

interface SimpleCrudProps {
  type: 'assistants' | 'medications';
}

const SimpleCrud: React.FC<SimpleCrudProps> = ({ type }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const isMeds = type === 'medications';
  const table = type;
  const title = isMeds ? 'Medicações' : 'Assistentes';
  const subTitle = isMeds ? 'Gerencie o inventário e dosagens.' : 'Gerencie a equipe e contatos.';

  useEffect(() => {
    fetchItems();
  }, [type]);

  const getErrorMessage = (error: any) => {
    if (!error) return 'Erro desconhecido';
    if (typeof error === 'string') return error;

    // Prioritize standard Error properties
    if (error.message && typeof error.message === 'string') return error.message;
    if (error.error_description && typeof error.error_description === 'string') return error.error_description;
    if (error.details && typeof error.details === 'string') return error.details;

    // Fallback to JSON
    try {
      return JSON.stringify(error);
    } catch (e) {
      return String(error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    // Se for medicações, pegamos apenas as que NÃO tem patient_id (estoque geral) ou todas, dependendo da regra de negócio.
    // Normalmente, o menu "Medicações" mostra o estoque geral.
    let query = supabase.from(table).select('*');

    if (isMeds) {
      // Opcional: Se quiser ver SÓ as de estoque, descomente a linha abaixo. 
      // Se quiser ver todas (incluindo de pacientes), deixe como está.
      // query = query.is('patient_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar itens:", error);
    }

    if (data) {
      if (!isMeds) { // Assistentes
        const mappedAssistants = data.map((item: any) => ({
          id: item.id,
          fullName: item.full_name || item.fullName,
          specialty: item.specialty,
          email: item.email,
          phone: item.phone,
          photoUrl: item.photo_url || item.photoUrl
        }));
        setItems(mappedAssistants);
      } else { // Medicações
        const mappedMeds = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          stock: item.stock || 0,
          patient_id: item.patient_id // Guardar para saber se é vinculado
        }));
        setItems(mappedMeds);
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir?')) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id).select();
        if (error) throw error;
        fetchItems();
      } catch (error: any) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir: " + getErrorMessage(error));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isMeds) {
        // Medications
        if (!formData.name) throw new Error("O nome da medicação é obrigatório.");

        const payload = {
          name: formData.name,
          dosage: formData.dosage || '',
          frequency: formData.frequency || '',
          stock: formData.stock ? parseInt(formData.stock) : 0,
          patient_id: null // Explicitamente nulo para estoque geral
        };

        const { error } = await supabase.from('medications').insert(payload).select();

        if (error) throw error;
      } else {
        // Assistants
        if (!formData.fullName) throw new Error("O nome do assistente é obrigatório.");

        const payload = {
          full_name: formData.fullName,
          specialty: formData.specialty || '',
          email: formData.email || '',
          phone: formData.phone || '',
          photo_url: formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName || 'A')}&background=random`
        };
        const { error } = await supabase.from('assistants').insert(payload).select();
        if (error) throw error;
      }

      setIsModalOpen(false);
      setFormData({});
      fetchItems();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar: " + getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500">{subTitle}</p>
        </div>
        <button
          onClick={() => { setFormData({}); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-[#e580b1] text-white rounded-lg hover:bg-pink-600 transition shadow-md backdrop-blur-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar {isMeds ? 'Medicação' : 'Assistente'}
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando dados...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum registro encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-rose-100/50">
              <thead className="bg-rose-50/50">
                <tr>
                  {isMeds ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dosagem</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frequência</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estoque</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Perfil</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Especialidade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contato</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 divide-y divide-rose-100/50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-rose-50/50 transition">
                    {isMeds ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${item.patient_id ? 'bg-blue-100' : 'bg-fuchsia-100'}`}>
                              <Pill className={`w-4 h-4 ${item.patient_id ? 'text-blue-600' : 'text-fuchsia-600'}`} />
                            </div>
                            <div>
                              <span className="font-medium text-slate-900 block">{item.name}</span>
                              {item.patient_id && <span className="text-[10px] text-blue-500 uppercase font-bold">Vinculado a Paciente</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.dosage}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.frequency}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.stock} un.
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img className="h-10 w-10 rounded-full object-cover mr-3" src={item.photoUrl} alt="" />
                            <div className="text-sm font-medium text-slate-900">{item.fullName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-slate-600">
                            <Stethoscope className="w-4 h-4 mr-2 text-slate-400" />
                            {item.specialty}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600 flex flex-col space-y-1">
                            <span className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {item.email}</span>
                            <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {item.phone}</span>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Genérico */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in duration-200 border border-white/50">
            <h2 className="text-xl font-bold mb-4">Adicionar {isMeds ? 'Medicação' : 'Assistente'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {isMeds ? (
                <>
                  <input
                    required
                    placeholder="Nome"
                    className="w-full bg-white/50 border p-2 rounded-lg"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      placeholder="Dosagem (ex: 10mg)"
                      className="w-full bg-white/50 border p-2 rounded-lg"
                      value={formData.dosage || ''}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                    />
                    <input
                      required
                      placeholder="Frequência"
                      className="w-full bg-white/50 border p-2 rounded-lg"
                      value={formData.frequency || ''}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    />
                  </div>
                  <input
                    required
                    type="number"
                    placeholder="Qtd. Estoque"
                    className="w-full bg-white/50 border p-2 rounded-lg"
                    value={formData.stock || ''}
                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  />
                </>
              ) : (
                <>
                  <input
                    required
                    placeholder="Nome Completo"
                    className="w-full bg-white/50 border p-2 rounded-lg"
                    value={formData.fullName || ''}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  />
                  <input
                    required
                    placeholder="Especialidade (ex: Enfermeiro)"
                    className="w-full bg-white/50 border p-2 rounded-lg"
                    value={formData.specialty || ''}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    className="w-full bg-white/50 border p-2 rounded-lg"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                  <input
                    required
                    placeholder="Telefone"
                    className="w-full bg-white/50 border p-2 rounded-lg"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-rose-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#e580b1] text-white rounded-lg hover:bg-pink-600">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleCrud;