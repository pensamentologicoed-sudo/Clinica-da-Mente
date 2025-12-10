import React, { useState } from 'react';
import { supabase } from '../services/db';
import { Mail, Lock, Loader2 } from 'lucide-react';

interface LoginProps {
  onSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (onSuccess) onSuccess();

    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-in fade-in slide-in-from-right-4 duration-300">
      {error && (
        <div className="mb-6 p-3 bg-red-50/90 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="email"
              required
              placeholder="seu@email.com"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-[#e580b1] hover:bg-pink-600 hover:shadow-lg text-white font-semibold rounded-xl shadow-md transition duration-200 disabled:opacity-70 flex justify-center items-center mt-6"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Acessar Dashboard'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Esqueceu sua senha? Entre em contato com o suporte.
      </div>
    </div>
  );
};

export default Login;