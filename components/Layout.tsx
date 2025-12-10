import React, { useState } from 'react';
import { User, ViewState } from '../types';
import { 
  LogOut, 
  Activity,
  PlusCircle,
  Users,
  LayoutDashboard,
  Menu,
  X,
  Briefcase
} from 'lucide-react';

interface LayoutProps {
  user: User;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, currentView, onNavigate, onLogout, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lógica para mostrar apenas os dois primeiros nomes
  const getDisplayNames = (fullName: string) => {
    if (!fullName) return 'Usuário';
    return fullName.split(' ').slice(0, 2).join(' ');
  };

  // Verificação de Admin
  const role = user.role?.trim().toLowerCase() || '';
  const isAdmin = role === 'admin' || role === 'administrador';

  const handleMobileNavigate = (view: ViewState) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const handleMobileLogout = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#fcf4fa] selection:bg-fuchsia-200 flex-col">
      {/* Cabeçalho Superior */}
      <header className="flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 bg-[#e580b1] shadow-md z-30 sticky top-0 transition-all duration-300">
        
        <div className="flex items-center">
          {/* Botão Menu Mobile (Hambúrguer) */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 mr-2 text-white hover:bg-white/10 rounded-lg transition"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo & Marca */}
          <div 
            className="flex items-center cursor-pointer hover:opacity-90 transition group"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl mr-2 sm:mr-3 group-hover:bg-white/30 transition">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white">Psicare</span>
          </div>
        </div>

        {/* Botões de Ação Rápida - DESKTOP (Hidden on mobile) */}
        <div className="hidden md:flex items-center space-x-3">
          {isAdmin ? (
            <button 
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm whitespace-nowrap
                ${currentView === 'dashboard' 
                  ? 'bg-white text-[#e580b1]' 
                  : 'text-white bg-white/10 hover:bg-white/20 border border-white/10'
                }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Profissionais
            </button>
          ) : (
            <>
              <button 
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm whitespace-nowrap
                  ${currentView === 'dashboard' 
                    ? 'bg-white text-[#e580b1]' 
                    : 'text-white bg-white/10 hover:bg-white/20 border border-white/10'
                  }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Visão Geral
              </button>
              <button 
                onClick={() => onNavigate('clients')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm whitespace-nowrap
                  ${currentView === 'clients' 
                    ? 'bg-white text-[#e580b1]' 
                    : 'text-white bg-white/10 hover:bg-white/20 border border-white/10'
                  }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Pacientes
              </button>
              <button 
                onClick={() => onNavigate('assistants')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm whitespace-nowrap
                  ${currentView === 'assistants' 
                    ? 'bg-white text-[#e580b1]' 
                    : 'text-white bg-white/10 hover:bg-white/20 border border-white/10'
                  }`}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Assistente
              </button>
            </>
          )}
        </div>

        {/* Perfil do Usuário & Logout - DESKTOP (Hidden on mobile) */}
        <div className="hidden md:flex items-center md:ml-4 min-w-max">
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-bold text-white leading-tight">
                {getDisplayNames(user.fullName)}
              </p>
              <p className="text-xs text-white/90 font-medium capitalize">
                {user.role || 'Profissional'}
              </p>
            </div>
            <img 
              src={user.avatarUrl} 
              alt="Perfil" 
              className="w-10 h-10 rounded-full border-2 border-white/50 shadow-sm object-cover"
            />
            
            <button
              onClick={onLogout}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all duration-200"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Header Mobile: Logout + Avatar */}
        <div className="md:hidden flex items-center gap-3">
            <button
              onClick={onLogout}
              className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <img 
              src={user.avatarUrl} 
              alt="Perfil" 
              className="w-9 h-9 rounded-full border border-white/50 object-cover"
              onClick={() => setIsMobileMenuOpen(true)}
            />
        </div>
      </header>

      {/* MOBILE MENU OVERLAY (DRAWER) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop Escuro */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Menu Lateral Deslizante */}
          <div className="relative bg-white w-[80%] max-w-xs h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            
            {/* Cabeçalho do Menu */}
            <div className="p-6 bg-fuchsia-50 border-b border-fuchsia-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img 
                      src={user.avatarUrl} 
                      alt="Perfil" 
                      className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                    />
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{getDisplayNames(user.fullName)}</p>
                        <p className="text-xs text-fuchsia-600 font-bold uppercase">{user.role || 'Profissional'}</p>
                    </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 bg-white rounded-full text-slate-400 shadow-sm border"
                >
                  <X className="w-5 h-5" />
                </button>
            </div>

            {/* Links de Navegação */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Menu Principal</p>
                
                {isAdmin ? (
                    <button 
                        onClick={() => handleMobileNavigate('dashboard')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition font-medium
                        ${currentView === 'dashboard' 
                            ? 'bg-[#e580b1] text-white shadow-md shadow-fuchsia-200' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Users className="w-5 h-5 mr-3" />
                        Profissionais
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={() => handleMobileNavigate('dashboard')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition font-medium
                            ${currentView === 'dashboard' 
                                ? 'bg-[#e580b1] text-white shadow-md shadow-fuchsia-200' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <LayoutDashboard className="w-5 h-5 mr-3" />
                            Visão Geral
                        </button>
                        <button 
                            onClick={() => handleMobileNavigate('clients')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition font-medium
                            ${currentView === 'clients' 
                                ? 'bg-[#e580b1] text-white shadow-md shadow-fuchsia-200' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Users className="w-5 h-5 mr-3" />
                            Pacientes
                        </button>
                        <button 
                            onClick={() => handleMobileNavigate('assistants')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition font-medium
                            ${currentView === 'assistants' 
                                ? 'bg-[#e580b1] text-white shadow-md shadow-fuchsia-200' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <PlusCircle className="w-5 h-5 mr-3" />
                            Assistentes
                        </button>
                         <button 
                            onClick={() => handleMobileNavigate('medications')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition font-medium
                            ${currentView === 'medications' 
                                ? 'bg-[#e580b1] text-white shadow-md shadow-fuchsia-200' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Briefcase className="w-5 h-5 mr-3" />
                            Medicações
                        </button>
                    </>
                )}
            </nav>

            {/* Rodapé do Menu */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                    onClick={handleMobileLogout}
                    className="w-full flex items-center justify-center px-4 py-3 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition font-bold text-sm shadow-sm"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair da Conta
                </button>
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">Psicare Manager v5.0</p>
                </div>
            </div>

          </div>
        </div>
      )}

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-20 sm:pb-8 pt-4 sm:pt-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;