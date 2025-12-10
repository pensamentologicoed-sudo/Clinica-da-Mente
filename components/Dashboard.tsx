import React, { useEffect, useState } from 'react';
import { User, Activity, Clock, MoreHorizontal, ChevronRight, Calendar, CalendarDays, CalendarRange, Users, Shield, ArrowLeft, Mail, FileText, Award, X, Save, Loader2, Briefcase } from 'lucide-react';
import { supabase } from '../services/db';
import { Patient, Profile } from '../types';

interface PatientWithConsultation extends Patient {
    nextConsultation?: string;
}

interface DashboardProps {
    onPatientSelect: (id: string) => void;
    currentUserRole?: string;
    currentUserId?: string;
    selectedProfessionalId?: string | null;
    onProfessionalSelect?: (id: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    onPatientSelect,
    currentUserRole,
    currentUserId,
    selectedProfessionalId,
    onProfessionalSelect
}) => {
    const [patients, setPatients] = useState<PatientWithConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ daily: 0, weekly: 0, monthly: 0 });

    // Admin State
    const [professionals, setProfessionals] = useState<Profile[]>([]);

    // Edit Profile State
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const [editingProfileData, setEditingProfileData] = useState<Partial<Profile>>({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Use prop for state if available, alias it for readability
    const viewingAsProfessional = selectedProfessionalId;
    const setViewingAsProfessional = (id: string | null) => {
        if (onProfessionalSelect) onProfessionalSelect(id);
    };

    // Verificação de Admin: Restrita apenas a administradores para separar a visão de gestão da visão clínica
    const role = currentUserRole?.trim().toLowerCase() || '';
    const isAdmin = role === 'admin' || role === 'administrador';

    useEffect(() => {
        // If Admin/Clinical Lead, load professionals list
        if (isAdmin) {
            fetchProfessionals();
        }

        // Only fetch dashboard data if:
        // 1. User is NOT admin (shows their own data)
        // 2. User IS admin AND has selected a professional (shows that professional's data)
        if (!isAdmin || viewingAsProfessional) {
            fetchDashboardData();
        } else {
            // Reset data if Admin is on overview (showing list of professionals)
            setPatients([]);
            setStats({ daily: 0, weekly: 0, monthly: 0 });
            setLoading(false);
        }
    }, [currentUserRole, viewingAsProfessional, currentUserId]);

    const fetchProfessionals = async () => {
        // Fetch users
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('name');

        if (data) setProfessionals(data as Profile[]);
    };

    const fetchDashboardData = async () => {
        setLoading(true);

        // Determine the ID to filter patients by
        let filterById = currentUserId;

        if (isAdmin) {
            if (viewingAsProfessional) {
                filterById = viewingAsProfessional;
            } else {
                setLoading(false);
                return;
            }
        }

        // 1. Fetch Patients - RELAXED FILTERING (Same as Clients.tsx)
        // Matches if professional_id is assigned OR if user_id (creator) matches
        let query = supabase.from('patients').select('*').limit(20);

        if (filterById) {
            query = query.or(`professional_id.eq.${filterById},user_id.eq.${filterById}`);
        }

        const { data: patientsData, error: patientsError } = await query;

        // 2. Fetch Consultation Stats logic
        try {
            // CORREÇÃO: Buscando pela coluna 'date' ao invés de 'next_date'
            const { data: consultations } = await supabase
                .from('consultations')
                .select('date, patient_id')
                .not('date', 'is', null);

            if (consultations && patientsData) {
                // Stats Logic - Fetch ALL ids for correct stats, applying the same OR logic
                let statsQuery = supabase.from('patients').select('id');

                if (filterById) {
                    statsQuery = statsQuery.or(`professional_id.eq.${filterById},user_id.eq.${filterById}`);
                }

                const { data: allPatientIds } = await statsQuery;

                const validIds = allPatientIds?.map(p => p.id) || [];
                const filteredConsultations = consultations.filter((c: any) => validIds.includes(c.patient_id));

                // Ajuste de Fuso Horário para garantir que "Hoje" seja o dia local correto
                const now = new Date();
                const offset = now.getTimezoneOffset();
                const localDate = new Date(now.getTime() - (offset * 60 * 1000));
                const todayStr = localDate.toISOString().split('T')[0];

                const startOfWeek = new Date(localDate);
                startOfWeek.setDate(localDate.getDate() - localDate.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(localDate);
                endOfWeek.setDate(localDate.getDate() + (6 - localDate.getDay()));
                endOfWeek.setHours(23, 59, 59, 999);

                const currentMonth = localDate.getMonth();
                const currentYear = localDate.getFullYear();

                // Contagem usando c.date
                const dailyCount = filteredConsultations.filter((c: any) => c.date === todayStr).length;

                const weeklyCount = filteredConsultations.filter((c: any) => {
                    const d = new Date(c.date);
                    // Adiciona offset para comparação correta de datas UTC vs Local se necessário, 
                    // mas string comparison YYYY-MM-DD costuma ser segura se o banco guarda YYYY-MM-DD
                    // Aqui convertemos a string do banco para Date objeto para comparar intervalo
                    // Assumindo que o banco guarda YYYY-MM-DD (sem tempo) ou ISO.
                    // Para garantir, tratamos como string data local ao criar o objeto Date
                    const datePart = c.date.split('T')[0];
                    const consultDate = new Date(datePart + 'T00:00:00');
                    return consultDate >= startOfWeek && consultDate <= endOfWeek;
                }).length;

                const monthlyCount = filteredConsultations.filter((c: any) => {
                    const datePart = c.date.split('T')[0];
                    const consultDate = new Date(datePart + 'T00:00:00');
                    return consultDate.getMonth() === currentMonth && consultDate.getFullYear() === currentYear;
                }).length;

                setStats({ daily: dailyCount, weekly: weeklyCount, monthly: monthlyCount });
            }
        } catch (e) {
            console.error("Error fetching stats", e);
        }

        if (patientsData && !patientsError) {
            const patientIds = patientsData.map((p: any) => p.id);

            // Ajuste de Data Atual para query (Local Time YYYY-MM-DD)
            const now = new Date();
            const offset = now.getTimezoneOffset();
            const todayLocalStr = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

            // CORREÇÃO: Buscando próxima consulta baseada em 'date' >= hoje
            const { data: consultationsData } = await supabase
                .from('consultations')
                .select('patient_id, date')
                .in('patient_id', patientIds)
                .gte('date', todayLocalStr)
                .order('date', { ascending: true });

            const mergedData = patientsData.map((p: any) => {
                // Encontra a consulta futura mais próxima
                const nextConsult = consultationsData?.find((c: any) => c.patient_id === p.id);

                return {
                    ...p,
                    nextConsultation: nextConsult ? nextConsult.date : null
                };
            });

            setPatients(mergedData);
        }
        setLoading(false);
    };

    const calculateAge = (dateString: string) => {
        if (!dateString) return '--';
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Não agendada';
        try {
            const datePart = dateString.split('T')[0];
            const [y, m, d] = datePart.split('-');
            return `${d}/${m}/${y}`;
        } catch {
            return dateString;
        }
    }

    const getAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    // === EDIT PROFILE LOGIC ===

    const handleOpenEditProfile = () => {
        const prof = professionals.find(p => p.id === viewingAsProfessional);
        if (prof) {
            setEditingProfileData({ ...prof });
            setIsEditProfileModalOpen(true);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProfileData.id) return;

        setIsSavingProfile(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: editingProfileData.name,
                    role: editingProfileData.role,
                    cpf: editingProfileData.cpf,
                    crm: editingProfileData.crm,
                    email: editingProfileData.email, // Updating email in profile for display purposes
                    photo_url: editingProfileData.photo_url
                })
                .eq('id', editingProfileData.id);

            if (error) throw error;

            // Update local state
            fetchProfessionals();
            setIsEditProfileModalOpen(false);

        } catch (err: any) {
            alert('Erro ao atualizar perfil: ' + (err.message || err));
        } finally {
            setIsSavingProfile(false);
        }
    };


    // Helper para renderizar detalhes do profissional selecionado (Compact Version)
    const renderProfessionalDetails = () => {
        const prof = professionals.find(p => p.id === viewingAsProfessional);
        if (!prof) return null;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-fuchsia-100 p-4 mb-3 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-fuchsia-50 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setViewingAsProfessional(null)}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-fuchsia-600 transition"
                            title="Voltar para lista"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <img
                            src={prof.photo_url || getAvatar(prof.name)}
                            alt={prof.name}
                            className="w-14 h-14 rounded-full border-2 border-fuchsia-50 shadow-md object-cover"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 leading-tight">{prof.name}</h2>
                            <span className="inline-block bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 uppercase">
                                {prof.role}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleOpenEditProfile}
                            className="px-3 py-1.5 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition font-medium text-xs shadow-sm shadow-fuchsia-200 flex items-center"
                        >
                            <Briefcase className="w-3 h-3 mr-1.5" />
                            Editar Perfil
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-start p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <Mail className="w-4 h-4 text-fuchsia-500 mr-2 mt-0.5" />
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                            <p className="text-slate-700 font-medium text-xs break-all">{prof.email || 'Não informado'}</p>
                        </div>
                    </div>
                    <div className="flex items-start p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <Award className="w-4 h-4 text-fuchsia-500 mr-2 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">CRM / Registro</p>
                            <p className="text-slate-700 font-medium text-xs">{prof.crm || 'Não informado'}</p>
                        </div>
                    </div>
                    <div className="flex items-start p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <FileText className="w-4 h-4 text-fuchsia-500 mr-2 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">CPF</p>
                            <p className="text-slate-700 font-medium text-xs">{prof.cpf || 'Não informado'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 relative">
            {/* Se não estiver vendo um profissional específico, mostra o cabeçalho padrão */}
            {(!isAdmin || !viewingAsProfessional) && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-fuchsia-950">
                            {isAdmin ? 'Painel Administrativo' : 'Visão Geral'}
                        </h1>
                        <p className="text-fuchsia-600 mt-1 font-medium">
                            {isAdmin
                                ? 'Gerencie os profissionais cadastrados e suas equipes.'
                                : 'Bem-vindo de volta ao Psicare Manager.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ADMIN VIEW: LIST OF PROFESSIONALS (Mostra APENAS se for admin E não tiver selecionado ninguém) */}
            {isAdmin && !viewingAsProfessional && (
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden mb-8 animate-in fade-in">
                    <div className="p-6 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-blue-900 flex items-center">
                                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                                Profissionais Cadastrados
                            </h2>
                            <p className="text-sm text-blue-600 mt-1">Selecione um profissional para acessar detalhes e pacientes.</p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                            {professionals.length} Total
                        </span>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {professionals.length === 0 ? (
                            <p className="text-slate-500 col-span-full text-center py-8">
                                Nenhum profissional cadastrado no sistema além de você.
                            </p>
                        ) : (
                            professionals.map(prof => (
                                <div
                                    key={prof.id}
                                    onClick={() => setViewingAsProfessional(prof.id)}
                                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-center space-x-4 cursor-pointer hover:shadow-lg hover:border-blue-300 hover:bg-blue-50/20 transition duration-200 group"
                                >
                                    <img src={prof.photo_url || getAvatar(prof.name)} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate group-hover:text-blue-700 transition">{prof.name}</p>
                                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">{prof.role}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center">
                                            {prof.crm ? `CRM: ${prof.crm}` : 'CRM pendente'}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* VIEW DE DETALHES DO PROFISSIONAL SELECIONADO */}
            {isAdmin && viewingAsProfessional && renderProfessionalDetails()}

            {/* VIEW DE MÉTRICAS E PACIENTES (Só aparece se NÃO for admin OU se Admin selecionou alguém) */}
            {(!isAdmin || viewingAsProfessional) && (
                <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-3">

                    {/* Título da seção de pacientes (Apenas se for Admin vendo um profissional, para separar visualmente) */}
                    {isAdmin && viewingAsProfessional && (
                        <h3 className="text-sm font-bold text-slate-700 flex items-center pt-1">
                            <Users className="w-4 h-4 mr-2 text-fuchsia-600" />
                            Carteira de Pacientes
                        </h3>
                    )}

                    {/* CARDS DE ESTATÍSTICAS - Reduzidos em 25% (Padding, Fontes e Ícones menores) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-fuchsia-100 flex items-center justify-between group hover:shadow-md transition">
                            <div>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Consultas Hoje</p>
                                <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.daily}</p>
                            </div>
                            <div className="p-1.5 bg-fuchsia-100 rounded-lg group-hover:bg-fuchsia-200 transition">
                                <Calendar className="w-4 h-4 text-fuchsia-600" />
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl shadow-sm border border-fuchsia-100 flex items-center justify-between group hover:shadow-md transition">
                            <div>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Esta Semana</p>
                                <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.weekly}</p>
                            </div>
                            <div className="p-1.5 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition">
                                <CalendarDays className="w-4 h-4 text-violet-600" />
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl shadow-sm border border-fuchsia-100 flex items-center justify-between group hover:shadow-md transition">
                            <div>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Este Mês</p>
                                <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.monthly}</p>
                            </div>
                            <div className="p-1.5 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition">
                                <CalendarRange className="w-4 h-4 text-pink-600" />
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Pacientes */}
                    <div className="bg-white rounded-2xl shadow-sm border border-fuchsia-100 overflow-hidden">
                        <div className="p-4 border-b border-fuchsia-50 flex justify-between items-center bg-fuchsia-50/30">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                <User className="w-4 h-4 mr-2 text-fuchsia-600" />
                                Lista de Pacientes
                            </h2>
                            <span className="text-xs text-fuchsia-600 font-medium bg-fuchsia-100 px-2 py-0.5 rounded-full">
                                {patients.length} Exibidos
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600 mx-auto mb-2"></div>
                                Carregando lista de pacientes...
                            </div>
                        ) : patients.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                Nenhum paciente encontrado para este perfil.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-fuchsia-50">
                                            <th className="px-6 py-3 font-semibold">Paciente</th>
                                            <th className="px-6 py-3 font-semibold">Idade</th>
                                            <th className="px-6 py-3 font-semibold">Diagnóstico</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold">Próxima Consulta</th>
                                            <th className="px-6 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-fuchsia-50">
                                        {patients.map((patient) => (
                                            <tr
                                                key={patient.id}
                                                onClick={() => onPatientSelect(patient.id)}
                                                className="hover:bg-fuchsia-50/40 transition duration-150 group cursor-pointer"
                                                title="Clique para ver detalhes"
                                            >
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center">
                                                        <img
                                                            src={getAvatar(patient.full_name)}
                                                            alt={patient.full_name}
                                                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm mr-3"
                                                        />
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">{patient.full_name}</p>
                                                            <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{patient.phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                                                        {calculateAge(patient.date_of_birth)} anos
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center text-slate-600 text-xs">
                                                        <Activity className="w-3 h-3 mr-1 text-fuchsia-400" />
                                                        {patient.diagnosis || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                        Ativo
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className={`flex items-center text-xs font-medium ${patient.nextConsultation ? 'text-fuchsia-700' : 'text-slate-400'}`}>
                                                        <Clock className={`w-3 h-3 mr-1 ${patient.nextConsultation ? 'text-fuchsia-400' : 'text-slate-300'}`} />
                                                        {formatDate(patient.nextConsultation)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onPatientSelect(patient.id);
                                                            }}
                                                            className="text-slate-400 hover:text-fuchsia-600 transition p-1.5 hover:bg-fuchsia-100 rounded-full"
                                                            title="Detalhes"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-fuchsia-400 transition" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE EDIÇÃO DE PERFIL */}
            {isEditProfileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                <Briefcase className="w-5 h-5 mr-2 text-fuchsia-600" />
                                Editar Perfil Profissional
                            </h2>
                            <button onClick={() => setIsEditProfileModalOpen(false)} className="hover:bg-slate-200 p-1 rounded-full transition">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                                <input
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-fuchsia-200 outline-none transition"
                                    value={editingProfileData.name || ''}
                                    onChange={e => setEditingProfileData({ ...editingProfileData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Cargo / Função</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-fuchsia-200 outline-none transition bg-white"
                                        value={editingProfileData.role || ''}
                                        onChange={e => setEditingProfileData({ ...editingProfileData, role: e.target.value })}
                                    >
                                        <option value="Psiquiatra">Psiquiatra</option>
                                        <option value="Psicólogo">Psicólogo</option>
                                        <option value="Assessor">Assessor(a)</option>
                                        <option value="Gestor">Gestor</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">CRM / Registro</label>
                                    <input
                                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-fuchsia-200 outline-none transition"
                                        value={editingProfileData.crm || ''}
                                        onChange={e => setEditingProfileData({ ...editingProfileData, crm: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
                                    <input
                                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-fuchsia-200 outline-none transition"
                                        value={editingProfileData.cpf || ''}
                                        onChange={e => setEditingProfileData({ ...editingProfileData, cpf: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Email de Exibição</label>
                                    <input
                                        type="email"
                                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-fuchsia-200 outline-none transition"
                                        value={editingProfileData.email || ''}
                                        onChange={e => setEditingProfileData({ ...editingProfileData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">URL da Foto</label>
                                <input
                                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-fuchsia-200 outline-none transition text-xs"
                                    value={editingProfileData.photo_url || ''}
                                    onChange={e => setEditingProfileData({ ...editingProfileData, photo_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditProfileModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="px-6 py-2 bg-[#e580b1] text-white rounded-xl font-bold hover:bg-pink-600 disabled:opacity-70 flex items-center shadow-md shadow-fuchsia-200 transition text-sm"
                                >
                                    {isSavingProfile ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;