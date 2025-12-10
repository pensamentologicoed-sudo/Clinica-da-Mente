import React, { useState } from 'react';
import { supabase } from '../services/db';
import { User as UserIcon, FileText, Hash, Briefcase, Mail, Lock, Loader2, Image } from 'lucide-react';

interface RegisterProps {
  onSuccess?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [crm, setCrm] = useState('');
  const [role, setRole] = useState('Psiquiatra');
  const [photoUrl, setPhotoUrl] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!fullName) throw new Error("Nome completo é obrigatório");
      if (!password) throw new Error("Senha é obrigatória");
      if (!cpf) throw new Error("CPF é obrigatório");

      const avatar = photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;

      // 1. Criar Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullName,
            cpf,
            crm,
            role,
            avatarUrl: avatar
          }
        }
      });

      if (authError) throw authError;

      // 2. Criar Profile Entry
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          name: fullName,
          role: role,
          email: email,
          photo_url: avatar,
          cpf: cpf,
          crm: crm
        });

        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
        }
      }

      if (onSuccess) onSuccess();

    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-in fade-in slide-in-from-left-4 duration-300">
      {error && (
        <div className="mb-6 p-3 bg-red-50/90 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              required
              placeholder="ex: Dra. Jane Doe"
              className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Função</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm appearance-none"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Psiquiatra">Psiquiatra</option>
              <option value="Psicólogo">Psicólogo</option>
              <option value="Assessor">Assessor(a)</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CRM <span className="text-slate-400 font-normal text-xs">(Op)</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="CRM/UF"
                className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="email"
              required
              placeholder="voce@empresa.com"
              className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Foto URL <span className="text-slate-400 font-normal text-xs">(Opcional)</span></label>
          <div className="relative">
            <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="url"
              placeholder="https://exemplo.com/foto.jpg"
              className="w-full pl-10 pr-4 py-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#e580b1] focus:border-transparent transition outline-none shadow-sm"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-[#e580b1] hover:bg-pink-600 hover:shadow-lg text-white font-semibold rounded-xl shadow-md transition duration-200 disabled:opacity-70 flex justify-center items-center mt-6"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Criar Conta Profissional'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Ao continuar, você concorda com nossos Termos de Serviço.
      </div>
    </div>
  );
};

export default Register;