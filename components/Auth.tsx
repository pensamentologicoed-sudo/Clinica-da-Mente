import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import Login from './Login';
import Register from './Register';

interface AuthProps {
  onSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-[#fcf4fa] flex flex-col justify-center items-center p-4 relative">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-fuchsia-100 z-10 my-8">
        {/* Cabeçalho */}
        <div className="bg-[#e580b1] px-8 py-6 border-b border-fuchsia-50 text-center">
           <div className="flex justify-center mb-4">
             <div className="p-3 bg-white/10 rounded-xl shadow-inner backdrop-blur-sm">
               <Activity className="w-8 h-8 text-white" />
             </div>
           </div>
           <h1 className="text-2xl font-bold text-white">Clínica da Mente</h1>
           <p className="text-white/90 mt-1">Gestão de cuidados simplificada.</p>
        </div>

        {/* Abas */}
        <div className="flex border-b border-fuchsia-50">
          <button 
            className={`flex-1 py-4 text-sm font-medium transition ${isLogin ? 'text-[#e580b1] border-b-2 border-[#e580b1] bg-fuchsia-50/50' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setIsLogin(true)}
          >
            Entrar
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-medium transition ${!isLogin ? 'text-[#e580b1] border-b-2 border-[#e580b1] bg-fuchsia-50/50' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setIsLogin(false)}
          >
            Criar Conta
          </button>
        </div>

        {/* Conteúdo Dinâmico */}
        {isLogin ? (
            <Login />
        ) : (
            <Register />
        )}
      </div>
    </div>
  );
};

export default Auth;