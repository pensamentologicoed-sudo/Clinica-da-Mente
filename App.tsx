import React, { useState, useEffect } from 'react';
import { User, ViewState } from './types';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './services/db';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import SimpleCrud from './components/SimpleCrud';
import Assistants from './components/Assistants';
import DocumentValidator from './components/DocumentValidator';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [initializing, setInitializing] = useState(true);

  // Estado para validação de documento público
  const [validationDocId, setValidationDocId] = useState<string | null>(null);

  // Estado para gerenciar a navegação direta para um paciente específico (vinda do Dashboard)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Estado para gerenciar o profissional selecionado pelo Admin no Dashboard
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Verificar se é uma URL de validação pública
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('doc_id');

    if (docId) {
      setValidationDocId(docId);
      setInitializing(false);
      return;
    }

    // 2. Fluxo Normal de Auth
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserAndProfile(session.user);
      } else {
        setUser(null);
      }
      setInitializing(false);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        await fetchUserAndProfile(session.user);
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserAndProfile = async (authUser: any) => {
    let fullName = authUser.user_metadata?.fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Usuário';
    let avatarUrl = authUser.user_metadata?.avatarUrl || authUser.user_metadata?.avatar_url;
    let role = authUser.user_metadata?.role || 'Profissional';
    let cpf = authUser.user_metadata?.cpf || '';
    let crm = authUser.user_metadata?.crm || '';

    if (!avatarUrl) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
    }

    try {
      // 1. Tenta buscar o perfil existente
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        if (profile.name) fullName = profile.name;
        if (profile.role) role = profile.role;
        if (profile.photo_url) avatarUrl = profile.photo_url;
      } else {
        console.log("Perfil não encontrado. Criando perfil automaticamente para:", fullName);

        const newProfile = {
          id: authUser.id,
          name: fullName,
          email: authUser.email,
          role: role,
          photo_url: avatarUrl,
          cpf: cpf,
          crm: crm
        };

        const { error: insertError } = await supabase.from('profiles').insert(newProfile);

        if (insertError) {
          console.error("Erro ao integrar usuário automaticamente:", insertError);
        }
      }
    } catch (error) {
      console.log('Profile fetch/sync error:', error);
    }

    setUser({
      id: authUser.id,
      email: authUser.email || '',
      fullName,
      avatarUrl,
      role
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSelectedProfessionalId(null);
  };

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);
    setCurrentView('clients');
  };

  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fcf4fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
      </div>
    );
  }

  if (validationDocId) {
    return <DocumentValidator docId={validationDocId} />;
  }

  if (!user) {
    return <Auth onSuccess={(u: User) => setUser(u)} />;
  }

  return (
    <Layout
      user={user}
      currentView={currentView}
      onNavigate={(view: ViewState) => {
        setCurrentView(view);
        if (view !== 'clients') setSelectedPatientId(null);
        if (view === 'dashboard') setSelectedProfessionalId(null);
      }}
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && (
        <Dashboard
          onPatientSelect={handlePatientSelect}
          currentUserRole={user.role}
          currentUserId={user.id}
          selectedProfessionalId={selectedProfessionalId}
          onProfessionalSelect={setSelectedProfessionalId}
        />
      )}
      {currentView === 'clients' && (
        <Clients
          initialPatientId={selectedPatientId}
          onClearInitialId={() => setSelectedPatientId(null)}
          currentUserRole={user.role}
          currentUserProfileId={user.id}
          onBack={() => setCurrentView('dashboard')}
        />
      )}
      {currentView === 'assistants' && <Assistants />}
      {currentView === 'medications' && <SimpleCrud type="medications" />}
    </Layout>
  );
};

export default App;