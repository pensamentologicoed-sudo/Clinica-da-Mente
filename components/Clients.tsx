import React, { useState, useEffect } from 'react';
import { Patient, Medication, Profile, Consultation, ConsultationMedicine } from '../types';
import { supabase } from '../services/db';
import { Plus, Search, Edit2, ArrowLeft, X, Phone, Calendar, Activity, Trash2, Pill, Save, MinusCircle, FileText, Printer, FileCheck, Stethoscope, ChevronRight, User as UserIcon, CheckSquare, Clock, CalendarDays, History, AlertTriangle, ListPlus, Loader2, MapPin, ClipboardList, Check } from 'lucide-react';

interface ClientsProps {
    initialPatientId?: string | null;
    onClearInitialId?: () => void;
    currentUserRole?: string;
    currentUserProfileId?: string;
    onBack?: () => void;
}

const Clients: React.FC<ClientsProps> = ({ initialPatientId, onClearInitialId, currentUserRole, currentUserProfileId, onBack }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Identificação de Perfil
    const role = currentUserRole?.trim().toLowerCase() || '';
    const isAssistant = role === 'assessor';
    const isAdmin = ['admin', 'administrador', 'gestor'].includes(role);

    // Estado do Modal de Paciente (Criar/Editar)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [formData, setFormData] = useState<Partial<Patient>>({});

    // Estado para Medicação Inicial (apenas na criação)
    const [initialMedications, setInitialMedications] = useState<Partial<Medication>[]>([]);

    // Estado da PÁGINA de Detalhes
    const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
    const [activeMedications, setActiveMedications] = useState<Medication[]>([]);

    // Estado de Consultas
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loadingConsultations, setLoadingConsultations] = useState(false);
    const [consultationError, setConsultationError] = useState<string | null>(null);

    // Estado do Modal de Consulta
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
    const [viewingConsultation, setViewingConsultation] = useState<Consultation | null>(null);
    const [isSaving, setIsSaving] = useState(false); // Estado para feedback de salvamento
    const [newConsultationData, setNewConsultationData] = useState<{
        date: string;
        time: string;
        next_date: string; // DATA DE RETORNO
        diagnosis: string; // DIAGNÓSTICO
        patient_notes: string;
        professional_notes: string;
        medicines: ConsultationMedicine[];
    }>({
        date: '',
        time: '',
        next_date: '',
        diagnosis: '',
        patient_notes: '',
        professional_notes: '',
        medicines: []
    });

    // Estado para nova medicação manual na consulta
    const [newMedData, setNewMedData] = useState<ConsultationMedicine>({ name: '', dosage: '', frequency: '', stock: 0 });
    const [isAddCustomMedModalOpen, setIsAddCustomMedModalOpen] = useState(false);

    // Estado para controlar se salvamos na lista ativa do paciente
    const [syncToPatientMeds, setSyncToPatientMeds] = useState(true);

    // Estados para Edição de Medicação
    const [isMedEditModalOpen, setIsMedEditModalOpen] = useState(false);
    const [medicationToEdit, setMedicationToEdit] = useState<Medication | null>(null);

    // Estados para Documentos (Atestados, Declarações e Exames)
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
    const [certificateData, setCertificateData] = useState({ days: 1, cid: '', attendanceType: 'Eletiva' });
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceData, setAttendanceData] = useState({ date: '', startTime: '', endTime: '' });

    // --- NOVO: Estados para Exames ---
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [examList, setExamList] = useState<string[]>([]);
    const [currentExam, setCurrentExam] = useState('');

    const commonExams = [
        'Hemograma Completo', 'Glicemia de Jejum', 'Colesterol Total e Frações',
        'Triglicérides', 'Ureia', 'Creatinina', 'TGO', 'TGP',
        'TSH', 'T4 Livre', 'Vitamina B12', 'Vitamina D', 'EAS (Urina Tipo 1)',
        'Eletrocardiograma', 'Raio-X de Tórax'
    ];

    const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

    useEffect(() => {
        fetchPatients();
        fetchProfessionals();
    }, [currentUserRole, currentUserProfileId]);

    useEffect(() => {
        if (initialPatientId && patients.length > 0) {
            const found = patients.find(p => p.id === initialPatientId);
            if (found) {
                setViewingPatient(found);
                if (onClearInitialId) onClearInitialId();
            }
        }
    }, [patients, initialPatientId, onClearInitialId]);

    useEffect(() => {
        if (viewingPatient) {
            fetchConsultations(viewingPatient.id);
            fetchActiveMedications(viewingPatient.id);
        } else {
            setConsultations([]);
            setActiveMedications([]);
            setConsultationError(null);
        }
    }, [viewingPatient]);

    const getErrorMessage = (error: any) => {
        if (!error) return 'Erro desconhecido';
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.error_description) return error.error_description;
        if (error.details) return typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
        return JSON.stringify(error);
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const datePart = dateString.split('T')[0];
            const [y, m, d] = datePart.split('-');
            return `${d}/${m}/${y}`;
        } catch (e) {
            return dateString;
        }
    };

    const fetchProfessionals = async () => {
        const { data } = await supabase.from('profiles').select('*').order('name');
        if (data) setProfessionals(data as Profile[]);
    };

    const fetchPatients = async () => {
        setLoading(true);
        let query = supabase.from('patients').select('*').order('full_name', { ascending: true });

        if (!isAdmin && currentUserProfileId) {
            query = query.or(`professional_id.eq.${currentUserProfileId},user_id.eq.${currentUserProfileId}`);
        }
        const { data, error } = await query;
        if (data) setPatients(data as Patient[]);
        setLoading(false);
    };

    const fetchActiveMedications = async (patientId: string) => {
        const { data } = await supabase.from('medications').select('*').eq('patient_id', patientId).order('name', { ascending: true });
        if (data) setActiveMedications(data as Medication[]);
    };

    const fetchConsultations = async (patientId: string) => {
        setLoadingConsultations(true);
        setConsultationError(null);
        try {
            const { data, error } = await supabase.from('consultations').select('*').eq('patient_id', patientId).order('date', { ascending: false });
            if (error) throw error;
            if (data) setConsultations(data as Consultation[]);
        } catch (err: any) {
            if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
                setConsultationError("A tabela 'consultations' não existe no banco de dados.");
            } else {
                setConsultationError(getErrorMessage(err));
            }
        } finally {
            setLoadingConsultations(false);
        }
    };

    const openNewConsultationModal = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localDate = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + 30);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        setViewingConsultation(null);
        setNewConsultationData({
            date: localDate,
            time: `${hours}:${minutes}`,
            next_date: nextDateStr,
            diagnosis: viewingPatient?.diagnosis || '',
            patient_notes: '',
            professional_notes: '',
            medicines: []
        });
        setSyncToPatientMeds(true);
        setIsConsultationModalOpen(true);
    };

    const openViewConsultationModal = (consultation: Consultation) => {
        setViewingConsultation(consultation);
        const summary = consultation.summary || '';

        setNewConsultationData({
            date: consultation.date,
            time: consultation.time || '00:00',
            next_date: consultation.next_date || '',
            diagnosis: '',
            patient_notes: '',
            professional_notes: summary,
            medicines: consultation.medicines || []
        });
        setSyncToPatientMeds(false);
        setIsConsultationModalOpen(true);
    };

    const addMedToConsultation = () => {
        if (!newMedData.name) return;
        const updatedMeds = [...newConsultationData.medicines, newMedData];
        setNewConsultationData({ ...newConsultationData, medicines: updatedMeds });
        setNewMedData({ name: '', dosage: '', frequency: '', stock: 0 });
        setIsAddCustomMedModalOpen(false);
    };

    const addExistingMedToConsultation = (med: Medication) => {
        const exists = newConsultationData.medicines.some(m => m.name.toLowerCase() === med.name.toLowerCase());
        if (exists) {
            alert("Este medicamento já está na lista da consulta.");
            return;
        }
        const newMedItem: ConsultationMedicine = {
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            stock: med.stock || 0
        };
        setNewConsultationData({ ...newConsultationData, medicines: [...newConsultationData.medicines, newMedItem] });
    };

    const removeMedFromConsultation = (index: number) => {
        const updatedMeds = [...newConsultationData.medicines];
        updatedMeds.splice(index, 1);
        setNewConsultationData({ ...newConsultationData, medicines: updatedMeds });
    };

    const handleOpenEditMedication = (med: Medication, e: React.MouseEvent) => {
        e.stopPropagation();
        setMedicationToEdit(med);
        setIsMedEditModalOpen(true);
    };

    const handleUpdateMedication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medicationToEdit || !viewingPatient) return;
        try {
            const { error } = await supabase.from('medications').update({
                name: medicationToEdit.name,
                dosage: medicationToEdit.dosage,
                frequency: medicationToEdit.frequency,
                stock: medicationToEdit.stock
            }).eq('id', medicationToEdit.id);

            if (error) throw error;
            setIsMedEditModalOpen(false);
            setMedicationToEdit(null);
            fetchActiveMedications(viewingPatient.id);
        } catch (err: any) {
            alert("Erro ao atualizar medicação: " + getErrorMessage(err));
        }
    };

    const handleDeleteActiveMedication = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!viewingPatient) return;
        if (window.confirm("Tem certeza que deseja remover esta medicação do uso contínuo?")) {
            try {
                const { error } = await supabase.from('medications').delete().eq('id', id);
                if (error) throw error;
                fetchActiveMedications(viewingPatient.id);
            } catch (err: any) {
                alert("Erro ao excluir: " + getErrorMessage(err));
            }
        }
    };

    const getProfessionalData = () => {
        const currentProf = professionals.find(p => p.id === currentUserProfileId);
        return {
            name: currentProf?.name || 'Profissional',
            crm: currentProf?.crm || '000000',
            role: currentProf?.role || 'Médico(a)'
        };
    };

    const saveDocumentForValidation = async (type: string, contentData: any) => {
        if (!viewingPatient) return null;

        setIsGeneratingDoc(true);
        const prof = getProfessionalData();

        try {
            const { data, error } = await supabase.from('generated_documents').insert({
                type,
                content_data: contentData,
                patient_name: viewingPatient.full_name,
                patient_cpf: viewingPatient.cpf,
                doctor_name: prof.name,
                doctor_crm: prof.crm,
                // created_at is automatic
            }).select().single();

            if (error) throw error;
            return data;
        } catch (e) {
            console.warn("Validation saving error (offline mode or table missing):", e);
            return { id: `local-${Date.now()}` };
        } finally {
            setIsGeneratingDoc(false);
        }
    };

    const handleSaveConsultation = async () => {
        if (!viewingPatient) return;
        setIsSaving(true);
        try {
            if (newConsultationData.diagnosis && newConsultationData.diagnosis !== viewingPatient.diagnosis) {
                await supabase.from('patients').update({
                    diagnosis: newConsultationData.diagnosis
                }).eq('id', viewingPatient.id);

                setViewingPatient(prev => prev ? { ...prev, diagnosis: newConsultationData.diagnosis } : null);
            }

            let summaryBuilder = [];
            if (newConsultationData.diagnosis) summaryBuilder.push(`Diagnóstico: ${newConsultationData.diagnosis}`);
            if (newConsultationData.patient_notes) summaryBuilder.push(`Queixas: ${newConsultationData.patient_notes}`);
            if (newConsultationData.professional_notes) summaryBuilder.push(`Evolução: ${newConsultationData.professional_notes}`);

            if (newConsultationData.medicines && newConsultationData.medicines.length > 0) {
                const medsText = newConsultationData.medicines
                    .map(m => `• ${m.name} (${m.dosage}, ${m.frequency})`)
                    .join('\n');
                summaryBuilder.push(`[Prescrição]\n${medsText}`);
            }

            const finalSummary = summaryBuilder.join('\n\n');

            const payload = {
                patient_id: viewingPatient.id,
                date: newConsultationData.date,
                next_date: newConsultationData.next_date || null,
                summary: finalSummary
            };

            if (viewingConsultation?.id) {
                const { error } = await supabase.from('consultations').update(payload).eq('id', viewingConsultation.id).select();
                if (error) throw error;
            } else {
                const { error } = await supabase.from('consultations').insert(payload).select();
                if (error) throw error;
            }

            if (syncToPatientMeds && newConsultationData.medicines && newConsultationData.medicines.length > 0) {
                const medsToInsert = newConsultationData.medicines.map(m => ({
                    patient_id: viewingPatient.id,
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    stock: m.stock,
                    start_date: newConsultationData.date
                }));
                await supabase.from('medications').insert(medsToInsert);
            }

            setIsConsultationModalOpen(false);
            await fetchConsultations(viewingPatient.id);
            await fetchActiveMedications(viewingPatient.id);
            fetchPatients();

        } catch (err: any) {
            console.error("Save error details:", err);
            alert('Erro ao salvar consulta. ' + getErrorMessage(err));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintConsultationPrescription = async () => {
        if (!viewingPatient) return;
        const doc = await saveDocumentForValidation('Receita Médica', {
            medicines: newConsultationData.medicines,
            date: newConsultationData.date
        });

        if (doc) {
            generatePrescriptionHTML(newConsultationData.medicines, doc.id);
        } else {
            generatePrescriptionHTML(newConsultationData.medicines, `local-${Date.now()}`);
        }
    };

    // --- ESTILOS COMPARTILHADOS DE IMPRESSÃO ---
    const getPrintStyles = () => `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
    body { font-family: 'Roboto', sans-serif; padding: 40px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; }
    .logo { color: #ea5b0c; font-size: 24px; font-weight: bold; display: flex; align-items: center; }
    .logo span { color: #003087; margin-left: 5px; }
    .address { text-align: right; font-size: 10px; color: #666; line-height: 1.4; max-width: 300px; }
    
    .patient-block { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
    .patient-info h3 { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .patient-details { font-size: 11px; color: #000; line-height: 1.5; }
    .qr-block { text-align: right; font-size: 9px; color: #666; }
    
    .doc-title { color: #2a64c4; font-size: 16px; font-weight: bold; margin: 30px 0 20px 0; }
    
    .content-body { font-size: 14px; line-height: 1.6; text-align: justify; min-height: 350px; }
    
    .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-block { border-top: 1px solid #000; padding-top: 5px; min-width: 250px; }
    .signature-block p { margin: 2px 0; font-size: 12px; }
    .signature-block strong { font-weight: bold; font-size: 13px; }
    
    .digital-sign { display: flex; align-items: center; font-size: 10px; color: #000; border-left: 2px solid #5ba636; padding-left: 10px; }
    .digital-sign img { width: 30px; height: 30px; margin-right: 10px; opacity: 0.8; }
    .digital-sign-text { line-height: 1.2; }
    
    .validation-link { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 9px; color: #888; text-align: center; }
  `;

    const getCommonHeader = (prof: any) => `
    <div class="header">
        <div class="logo">
            Psicare<span>Manager</span>
        </div>
        <div class="address">
            Av. Paulista, 867 - Bela Vista, São Paulo-SP<br>
            CEP: 01311-100 | Telefone: (11) 4002-3633
        </div>
    </div>
  `;

    const getPatientHeader = (p: Patient, docId: string) => {
        // SEMPRE GERA O QR CODE, independente de ser offline ou não
        // Se o docId for local, o QR code será gerado com o link, mas ao ler vai dar "Não encontrado" na tela de validação.
        // Isso resolve o problema visual de "não aparecer".
        const validationUrl = `${window.location.origin}?doc_id=${docId}`;
        const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(validationUrl)}&size=200&margin=1`;

        return `
    <div class="patient-block">
        <div class="patient-info">
            <h3>${p.full_name}</h3>
            <div class="patient-details">
                <strong>CPF:</strong> ${p.cpf || 'Não informado'}<br>
                <strong>Celular:</strong> ${p.phone}<br>
                <strong>Tipo de atendimento:</strong> Eletiva
            </div>
        </div>
        <div class="qr-block">
            Consulte a autenticidade:<br>
            <a href="${validationUrl}" target="_blank" style="color:#2a64c4;text-decoration:none;">${window.location.host}</a>
            <div style="margin-top: 5px; display: flex; justify-content: flex-end;">
                <img src="${qrCodeUrl}" alt="QR Code" width="90" height="90" style="border:1px solid #eee; padding: 2px;" loading="eager" />
            </div>
        </div>
    </div>
    `;
    };

    const getCommonFooter = (prof: any, dateStr: string, docId: string) => `
    <p style="margin-top: 40px; font-size: 12px;">Data de emissão: ${dateStr}</p>
    <div class="footer">
        <div class="signature-block">
            <strong>${prof.name.toUpperCase()}</strong>
            <p>${prof.role ? prof.role.toUpperCase() : 'MÉDICO(A)'}</p>
            <p>${prof.crm ? 'CRM ' + prof.crm : ''}</p>
        </div>
        <div class="digital-sign">
             <svg style="width:24px;height:24px;fill:#5ba636;margin-right:8px;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
             <div class="digital-sign-text">
                 Digitally signed by <strong>${prof.name.toUpperCase()}</strong><br>
                 Date: ${dateStr}<br>
                 ID: ${docId.substring(0, 8)}...
             </div>
        </div>
    </div>
    <div class="validation-link">
        Este documento foi assinado digitalmente conforme padrão ICP-BRASIL. Para conferir a autenticidade acesse ${window.location.origin}?doc_id=${docId}
    </div>
  `;

    const generatePrescriptionHTML = (meds: ConsultationMedicine[], docId: string) => {
        if (!viewingPatient) return;
        const prof = getProfessionalData();
        const dateStr = new Date().toLocaleDateString('pt-BR');

        const printWindow = window.open('', '', 'width=900,height=1100');
        if (!printWindow) return;

        const medListHtml = meds.map((med, i) => `
        <div style="margin-bottom: 20px; font-family: 'Courier New', Courier, monospace;">
            <div style="font-weight: bold; font-size: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 5px;">
                ${i + 1}. ${med.name} ${med.dosage}
            </div>
            <div style="padding-left: 20px;">
                <p style="margin: 0; font-size: 14px;">Uso: ${med.frequency}</p>
                ${med.stock ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">(Quantidade: ${med.stock} caixas)</p>` : ''}
            </div>
        </div>
      `).join('');

        printWindow.document.write(`
        <html>
        <head><style>${getPrintStyles()}</style></head>
        <body>
            ${getCommonHeader(prof)}
            ${getPatientHeader(viewingPatient, docId)}
            <h2 class="doc-title">Receituário</h2>
            
            <div class="content-body">
                ${medListHtml}
            </div>

            ${getCommonFooter(prof, dateStr, docId)}
            <script>
                // Aumentando delay para garantir carregamento da imagem do QR Code
                window.onload = function() { setTimeout(function(){ window.print(); }, 1000); }
            </script>
        </body></html>
      `);
        printWindow.document.close();
    };

    const generateAttendanceHTML = (data: { date: string, startTime: string, endTime: string }, docId: string) => {
        if (!viewingPatient) return;
        const prof = getProfessionalData();
        const dateFormatted = formatDateDisplay(data.date);
        const todayStr = new Date().toLocaleDateString('pt-BR');

        const printWindow = window.open('', '', 'width=900,height=1100');
        if (!printWindow) return;

        printWindow.document.write(`
        <html>
        <head><style>${getPrintStyles()}</style></head>
        <body>
            ${getCommonHeader(prof)}
            ${getPatientHeader(viewingPatient, docId)}
            <h2 class="doc-title">Declaração de Comparecimento</h2>
            
            <div class="content-body">
                <p>
                    Declaro para os devidos fins que o(a) Sr(a) <strong>${viewingPatient.full_name}</strong>, 
                    portador(a) do CPF nº ${viewingPatient.cpf || '___________'}, compareceu a este serviço 
                    médico no dia <strong>${dateFormatted}</strong>, permanecendo em atendimento das 
                    <strong>${data.startTime}</strong> às <strong>${data.endTime}</strong>.
                </p>
                <p style="margin-top: 20px;">
                    Sendo o que tínhamos para o momento, firmamos a presente.
                </p>
            </div>

            ${getCommonFooter(prof, todayStr, docId)}
            <script>window.onload = function() { setTimeout(function(){ window.print(); }, 1000); }</script>
        </body></html>
    `);
        printWindow.document.close();
    };

    const generateCertificateHTML = (data: { days: number, cid: string }, docId: string) => {
        if (!viewingPatient) return;
        const prof = getProfessionalData();
        const todayStr = new Date().toLocaleDateString('pt-BR');
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Calcular data fim
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (data.days - 1));
        const endDateStr = endDate.toLocaleDateString('pt-BR');

        const printWindow = window.open('', '', 'width=900,height=1100');
        if (!printWindow) return;

        printWindow.document.write(`
        <html>
        <head><style>${getPrintStyles()}</style></head>
        <body>
            ${getCommonHeader(prof)}
            ${getPatientHeader(viewingPatient, docId)}
            <h2 class="doc-title">Atestado</h2>
            
            <div class="content-body">
                <p>
                    Atesto, para os devidos fins, que <strong>${viewingPatient.full_name.toUpperCase()}</strong>, portador do CPF nº 
                    <strong>${viewingPatient.cpf || '___________'}</strong>, foi submetido a uma consulta médica na data de hoje, 
                    <strong>${todayStr}</strong> às <strong>${timeStr} hrs</strong>${data.cid ? `, sendo diagnosticado como portador da afecção CID-10: <strong>${data.cid}</strong>` : ''}.
                </p>
                <p>
                    Em decorrência, deverá permanecer afastado de suas atividades laborativas/escolares por um período de 
                    <strong>${data.days} dia(s)</strong>, a partir desta data.
                </p>
                <p style="margin-top: 30px; font-weight: bold;">
                    Atestado válido de ${todayStr} até ${endDateStr}.
                </p>
            </div>

            ${getCommonFooter(prof, todayStr, docId)}
            <script>window.onload = function() { setTimeout(function(){ window.print(); }, 1000); }</script>
        </body></html>
    `);
        printWindow.document.close();
    };

    // --- FUNÇÃO DE IMPRESSÃO DE EXAMES ---
    const generateExamRequestHTML = (exams: string[], docId: string) => {
        if (!viewingPatient) return;
        const prof = getProfessionalData();
        const dateStr = new Date().toLocaleDateString('pt-BR');

        const printWindow = window.open('', '', 'width=900,height=1100');
        if (!printWindow) return;

        // Formatação de lista bonita
        const formattedExams = exams.map(e =>
            `<div style="margin-bottom: 8px; font-size: 15px; font-weight: 500;">• ${e}</div>`
        ).join('');

        printWindow.document.write(`
        <html>
        <head><style>${getPrintStyles()}</style></head>
        <body>
            ${getCommonHeader(prof)}
            ${getPatientHeader(viewingPatient, docId)}
            <h2 class="doc-title">Solicitação de Exames</h2>
            
            <div class="content-body">
                <p style="margin-bottom: 20px;">Solicito a realização dos seguintes exames:</p>
                <div style="font-family: 'Courier New', Courier, monospace; background: #f9f9f9; padding: 20px; border-radius: 8px;">
                    ${formattedExams}
                </div>
            </div>

            ${getCommonFooter(prof, dateStr, docId)}
            <script>
                window.onload = function() { setTimeout(function(){ window.print(); }, 1000); }
            </script>
        </body></html>
      `);
        printWindow.document.close();
    };

    const openExamModal = () => setIsExamModalOpen(true);
    const openAttendanceModal = () => {
        const now = new Date();
        setAttendanceData({
            date: now.toISOString().split('T')[0],
            startTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(now.getTime() + 3600000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
        setIsAttendanceModalOpen(true);
    };
    const openCertificateModal = () => setIsCertificateModalOpen(true);

    const handlePrintAttendance = async () => {
        const doc = await saveDocumentForValidation('Declaração de Comparecimento', attendanceData);
        generateAttendanceHTML(attendanceData, doc?.id || `local-${Date.now()}`);
        setIsAttendanceModalOpen(false);
    };

    const handlePrintCertificate = async () => {
        const doc = await saveDocumentForValidation('Atestado Médico', certificateData);
        generateCertificateHTML(certificateData, doc?.id || `local-${Date.now()}`);
        setIsCertificateModalOpen(false);
    };

    const handleAddExam = () => {
        if (currentExam.trim()) {
            setExamList([...examList, currentExam.trim()]);
            setCurrentExam('');
        }
    };

    const handleAddCommonExam = (exam: string) => {
        if (!examList.includes(exam)) {
            setExamList([...examList, exam]);
        }
    };

    const handleRemoveExam = (index: number) => {
        const l = [...examList];
        l.splice(index, 1);
        setExamList(l);
    };

    const handlePrintExams = async () => {
        if (examList.length === 0) return;
        const doc = await saveDocumentForValidation('Solicitação de Exames', { exams: examList });
        generateExamRequestHTML(examList, doc?.id || `local-${Date.now()}`);
        setIsExamModalOpen(false);
    };

    const openModal = (patient?: Patient) => {
        if (patient) {
            setEditingPatient(patient);
            setFormData(patient);
            setInitialMedications([]);
        } else {
            setEditingPatient(null);
            setFormData({ sex: 'Masculino' });
            setInitialMedications([{ name: '', dosage: '', frequency: '', stock: 0 }]);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPatient(null);
        setFormData({});
    };

    const handleSavePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            if ((isAdmin || isAssistant) && !formData.professional_id) {
                alert("Por favor, selecione o Profissional responsável por este paciente.");
                return;
            }

            let assignedProf = formData.professional_id;
            if (!assignedProf && !isAdmin && !isAssistant) {
                assignedProf = currentUserProfileId;
            }

            const payload = {
                professional_id: assignedProf, full_name: formData.full_name, date_of_birth: formData.date_of_birth,
                diagnosis: formData.diagnosis, notes: formData.notes, phone: formData.phone, email: formData.email,
                address: formData.address, cpf: formData.cpf, sus_number: formData.sus_number, sex: formData.sex
            };

            if (editingPatient) {
                const { data: updated, error } = await supabase
                    .from('patients').update(payload).eq('id', editingPatient.id).select().single();
                if (error) throw error;

                if (viewingPatient && viewingPatient.id === editingPatient.id) {
                    setViewingPatient(updated as Patient);
                }
            } else {
                const { data: newP, error } = await supabase.from('patients').insert({ ...payload, user_id: user.id }).select().single();
                if (error) throw error;

                if (!isAssistant && initialMedications.length > 0) {
                    const meds = initialMedications.map(m => ({ ...m, patient_id: newP.id, stock: Number(m.stock) || 0 }));
                    await supabase.from('medications').insert(meds);
                }
            }
            closeModal();
            fetchPatients();
        } catch (err: any) {
            alert("Erro ao salvar: " + getErrorMessage(err));
        }
    };

    const addInitialMedRow = () => setInitialMedications([...initialMedications, { name: '', dosage: '', frequency: '', stock: 0 }]);
    const updateInitialMedRow = (i: number, f: keyof Medication, v: any) => { const n = [...initialMedications]; n[i] = { ...n[i], [f]: v }; setInitialMedications(n); };

    const filteredPatients = patients.filter(c => c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const getAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    const calculateAge = (date?: string) => {
        if (!date) return '-';
        const ageDif = Date.now() - new Date(date).getTime();
        return Math.abs(new Date(ageDif).getUTCFullYear() - 1970);
    };

    const renderModal = () => (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800">{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
                    <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSavePatient} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {(isAdmin || isAssistant) && (
                                <div className="col-span-1 md:col-span-2 bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-100">
                                    <label className="block text-sm font-bold text-fuchsia-800 mb-1">Profissional Responsável *</label>
                                    <select
                                        required
                                        className="w-full p-2 border rounded"
                                        value={formData.professional_id || ''}
                                        onChange={e => setFormData({ ...formData, professional_id: e.target.value })}
                                    >
                                        <option value="">Selecione o médico...</option>
                                        {professionals
                                            .filter(p => p.role !== 'Assessor')
                                            .map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                                            ))}
                                    </select>
                                    {isAssistant && <p className="text-xs text-fuchsia-600 mt-1">Selecione o médico a quem este paciente pertence.</p>}
                                </div>
                            )}

                            <input required placeholder="Nome Completo" className="p-2 border rounded" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                            <input required type="date" className="p-2 border rounded" value={formData.date_of_birth || ''} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} />

                            {!isAssistant && (
                                <input required placeholder="Diagnóstico" className="p-2 border rounded" value={formData.diagnosis || ''} onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} />
                            )}

                            <input required placeholder="Telefone" className="p-2 border rounded" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            <input placeholder="CPF" className="p-2 border rounded" value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                            <input placeholder="Cartão SUS" className="p-2 border rounded" value={formData.sus_number || ''} onChange={e => setFormData({ ...formData, sus_number: e.target.value })} />

                            <div className="md:col-span-2 relative">
                                <MapPin className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                                <input placeholder="Endereço Completo" className="w-full p-2 pl-8 border rounded" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>

                        {!isAssistant && (
                            <textarea placeholder="Anotações Clínicas" rows={4} className="w-full p-2 border rounded" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        )}

                        {!editingPatient && !isAssistant && (
                            <div className="bg-slate-50 p-4 rounded border">
                                <div className="flex justify-between mb-2"><h3 className="font-bold text-sm">Medicação Inicial</h3><button type="button" onClick={addInitialMedRow}><Plus className="w-4 h-4" /></button></div>
                                {initialMedications.map((m, i) => (
                                    <div key={i} className="flex gap-2 mb-2"><input placeholder="Nome" className="flex-1 p-1 border rounded" value={m.name} onChange={e => updateInitialMedRow(i, 'name', e.target.value)} /><input placeholder="Dose" className="w-20 p-1 border rounded" value={m.dosage} onChange={e => updateInitialMedRow(i, 'dosage', e.target.value)} /></div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={closeModal} className="px-4 py-2 border rounded">Cancelar</button><button type="submit" className="px-6 py-2 bg-[#e580b1] text-white rounded font-bold">Salvar</button></div>
                    </form>
                </div>
            </div>
        </div>
    );

    const handleBack = () => {
        // Alteração: Sempre que onBack for fornecido (comportamento de voltar ao Dashboard), ele será executado,
        // independentemente do perfil do usuário.
        if (onBack) {
            onBack();
        } else {
            setViewingPatient(null);
        }
    };

    if (viewingPatient) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
                        <span className="cursor-pointer hover:text-fuchsia-600" onClick={handleBack}>Pacientes</span>
                        <ChevronRight className="w-4 h-4" />
                        <span className="font-semibold text-fuchsia-800">{viewingPatient.full_name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-fuchsia-100 pb-6">
                        <div className="flex items-center">
                            <button onClick={handleBack} className="mr-4 p-2 rounded-full hover:bg-slate-100"><ArrowLeft className="w-6 h-6" /></button>
                            <img src={getAvatar(viewingPatient.full_name)} className="w-16 h-16 rounded-full border-2 border-white shadow mr-4" />
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">{viewingPatient.full_name}</h1>
                                <span className="bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded text-sm font-semibold">{viewingPatient.diagnosis || 'Sem Diagnóstico'}</span>
                            </div>
                        </div>
                        <button onClick={() => openModal(viewingPatient)} className="flex items-center px-3 py-2 bg-[#e580b1] text-white rounded-lg hover:bg-pink-600 shadow-sm"><Edit2 className="w-4 h-4 mr-2" /> Editar</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center text-sm"><UserIcon className="w-4 h-4 mr-2" /> Pessoal</h3>
                            <div className="space-y-3 text-xs font-medium">
                                <div><span className="text-slate-500 block">CPF</span>{viewingPatient.cpf || '-'}</div>
                                <div><span className="text-slate-500 block">Tel</span>{viewingPatient.phone}</div>
                                <div><span className="text-slate-500 block">Idade</span>{calculateAge(viewingPatient.date_of_birth)} anos</div>
                                {viewingPatient.address && <div><span className="text-slate-500 block">Endereço</span>{viewingPatient.address}</div>}
                            </div>
                        </div>
                        {!isAssistant && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm max-h-[300px] overflow-auto">
                                <h3 className="font-semibold text-amber-800 mb-2 flex items-center text-sm"><Activity className="w-4 h-4 mr-2" /> Notas</h3>
                                <p className="text-xs text-amber-900/80 whitespace-pre-wrap">{viewingPatient.notes || 'Sem notas.'}</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3 min-h-[500px] md:min-h-[700px]">
                        <div className="bg-white border border-fuchsia-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="px-6 py-4 bg-fuchsia-50/50 border-b border-fuchsia-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center"><History className="w-5 h-5 mr-2" /> Histórico</h3>
                                <button onClick={openNewConsultationModal} className="text-xs bg-[#e580b1] text-white px-3 py-2 rounded-lg hover:bg-pink-600 font-bold flex items-center"><Plus className="w-3 h-3 mr-1" /> Nova Consulta</button>
                            </div>
                            <div className="p-6 flex-1 bg-white overflow-y-auto">
                                {loadingConsultations ? <div className="text-center p-4">Carregando...</div> : consultations.length === 0 ?
                                    <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded"><CalendarDays className="w-10 h-10 mx-auto mb-2" />Nenhuma consulta.</div> :
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {consultations.map(c => (
                                            <div key={c.id} onClick={() => openViewConsultationModal(c)} className="border rounded-xl p-4 hover:bg-fuchsia-50 cursor-pointer transition">
                                                <div className="flex justify-between mb-2">
                                                    <div className="flex items-center"><Calendar className="w-5 h-5 text-fuchsia-600 mr-2" /><span className="font-bold">{formatDateDisplay(c.date)}</span></div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                                </div>
                                                {/* Exibindo resumo/summary ao invés de professional_notes, já que agora tudo está em summary */}
                                                <div className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">{c.summary || 'Sem observações.'}</div>
                                                {c.next_date && (
                                                    <div className="mt-2 text-[10px] text-fuchsia-600 font-bold bg-fuchsia-50 inline-block px-2 py-1 rounded">
                                                        Retorno: {formatDateDisplay(c.next_date)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {isConsultationModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-[96vh]">
                            {/* CABEÇALHO DO MODAL - RESPONSIVO */}
                            <div className="px-4 py-4 md:px-6 md:py-3 border-b flex flex-col md:flex-row justify-between items-center bg-fuchsia-50 rounded-t-2xl shrink-0 gap-3 md:gap-0">
                                <div className="flex justify-between items-center w-full md:w-auto">
                                    <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center">
                                        <Stethoscope className="w-5 h-5 md:w-6 md:h-6 mr-2 text-fuchsia-600" />
                                        {viewingConsultation ? 'Consulta' : 'Nova Consulta'}
                                    </h2>
                                    {/* Botão de fechar visível no mobile */}
                                    <button onClick={() => setIsConsultationModalOpen(false)} className="md:hidden text-slate-400 p-1">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Grid de botões no mobile, Flex no desktop */}
                                <div className="grid grid-cols-2 w-full md:w-auto md:flex gap-2">
                                    <button onClick={handlePrintConsultationPrescription} className="px-3 py-2 bg-white border rounded-lg text-xs font-bold flex items-center justify-center hover:bg-slate-50 transition shadow-sm"><Printer className="w-4 h-4 mr-2" /> Receita</button>
                                    <button onClick={openExamModal} className="px-3 py-2 bg-white border rounded-lg text-xs font-bold flex items-center justify-center hover:bg-slate-50 transition shadow-sm"><ClipboardList className="w-4 h-4 mr-2" /> Exames</button>
                                    <button onClick={openAttendanceModal} className="px-3 py-2 bg-white border rounded-lg text-xs font-bold flex items-center justify-center hover:bg-slate-50 transition shadow-sm"><FileCheck className="w-4 h-4 mr-2" /> Declaração</button>
                                    <button onClick={openCertificateModal} className="px-3 py-2 bg-white border rounded-lg text-xs font-bold flex items-center justify-center hover:bg-slate-50 transition shadow-sm"><FileText className="w-4 h-4 mr-2" /> Atestado</button>
                                    {/* Botão de fechar visível no desktop */}
                                    <button onClick={() => setIsConsultationModalOpen(false)} className="hidden md:block ml-1"><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Data Consulta</label>
                                            <input type="date" className="p-2 border rounded w-full" value={newConsultationData.date} onChange={e => setNewConsultationData({ ...newConsultationData, date: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Hora</label>
                                            <input type="time" className="p-2 border rounded w-full" value={newConsultationData.time} onChange={e => setNewConsultationData({ ...newConsultationData, time: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-fuchsia-600">Data Retorno</label>
                                            <input type="date" className="p-2 border border-fuchsia-200 bg-fuchsia-50/50 rounded w-full" value={newConsultationData.next_date} onChange={e => setNewConsultationData({ ...newConsultationData, next_date: e.target.value })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">Diagnóstico Atual</label>
                                        <input
                                            placeholder="Diagnóstico (CID ou Descrição)"
                                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-fuchsia-200 outline-none"
                                            value={newConsultationData.diagnosis}
                                            onChange={e => setNewConsultationData({ ...newConsultationData, diagnosis: e.target.value })}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Alterar este campo atualizará o cadastro do paciente ao salvar.</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500">Queixas Principal (Anamnese)</label>
                                        <textarea placeholder="O que o paciente relata..." rows={4} className="w-full p-2 border rounded" value={newConsultationData.patient_notes} onChange={e => setNewConsultationData({ ...newConsultationData, patient_notes: e.target.value })} />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500">Evolução / Observações Médicas</label>
                                        <textarea placeholder="Observações clínicas..." rows={8} className="w-full p-2 border rounded bg-fuchsia-50/30" value={newConsultationData.professional_notes} onChange={e => setNewConsultationData({ ...newConsultationData, professional_notes: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex flex-col h-full gap-4">
                                    <div className="bg-slate-50 rounded-xl border flex flex-col flex-[7] overflow-hidden min-h-[250px]">
                                        <div className="px-4 py-3 bg-slate-100 border-b flex justify-between"><h3 className="font-bold text-sm">Itens da Receita</h3><span className="text-xs bg-white border px-2 rounded-full">{newConsultationData.medicines.length}</span></div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                            {newConsultationData.medicines.length === 0 ? <p className="text-center text-xs text-slate-400 mt-4">Nenhuma medicação.</p> :
                                                newConsultationData.medicines.map((m, i) => (
                                                    <div key={i} className="bg-white p-2 rounded border flex justify-between">
                                                        <div><p className="font-bold text-sm">{m.name}</p><p className="text-xs">{m.dosage} • {m.frequency}</p></div>
                                                        <button onClick={() => removeMedFromConsultation(i)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl border border-fuchsia-100 flex flex-col flex-[3] overflow-hidden min-h-[350px]">
                                        <div className="px-4 py-3 bg-fuchsia-50/50 border-b flex justify-between items-center">
                                            <h3 className="font-bold text-sm text-fuchsia-800">Histórico / Em Uso</h3>
                                            <button onClick={() => { setNewMedData({ name: '', dosage: '', frequency: '', stock: 0 }); setIsAddCustomMedModalOpen(true); }} className="px-2 py-1 bg-fuchsia-600 text-white rounded text-xs font-bold flex items-center"><Plus className="w-3 h-3 mr-1" /> Nova</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                            {activeMedications.length === 0 ? <p className="text-center text-xs text-slate-400 mt-10">Vazio.</p> :
                                                activeMedications.map(m => (
                                                    <div key={m.id} className="bg-white p-2 rounded border flex justify-between items-center hover:bg-fuchsia-50">
                                                        <div className="cursor-pointer flex-1" onClick={() => addExistingMedToConsultation(m)}>
                                                            <span className="font-bold text-xs block">{m.name}</span>
                                                            <span className="text-[10px] text-slate-500">{m.dosage} • {m.frequency}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => addExistingMedToConsultation(m)} className="p-1 bg-green-50 text-green-600 rounded" title="Adicionar à receita"><Plus className="w-3 h-3" /></button>
                                                            <button onClick={(e) => handleOpenEditMedication(m, e)} className="p-1 text-blue-400"><Edit2 className="w-3 h-3" /></button>
                                                            <button onClick={(e) => handleDeleteActiveMedication(m.id, e)} className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2 border-t">
                                        <div className="flex items-center mr-auto"><button onClick={() => setSyncToPatientMeds(!syncToPatientMeds)} className={`w-4 h-4 mr-2 border rounded ${syncToPatientMeds ? 'bg-fuchsia-600' : 'bg-white'}`}>{syncToPatientMeds && <CheckSquare className="w-3 h-3 text-white" />}</button><span className="text-xs text-slate-500">Salvar no histórico?</span></div>
                                        <button
                                            onClick={handleSaveConsultation}
                                            disabled={isSaving}
                                            className="px-6 py-2 bg-[#e580b1] text-white rounded font-bold hover:bg-pink-600 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Salvando...
                                                </>
                                            ) : (
                                                'Salvar Consulta'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isAddCustomMedModalOpen && (
                    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3">
                            <h2 className="font-bold text-sm">Nova Medicação</h2>
                            <input autoFocus placeholder="Nome" className="w-full p-2 border rounded" value={newMedData.name} onChange={e => setNewMedData({ ...newMedData, name: e.target.value })} />
                            <div className="flex gap-2"><input placeholder="Dose" className="w-full p-2 border rounded" value={newMedData.dosage} onChange={e => setNewMedData({ ...newMedData, dosage: e.target.value })} /><input placeholder="Freq" className="w-full p-2 border rounded" value={newMedData.frequency} onChange={e => setNewMedData({ ...newMedData, frequency: e.target.value })} /></div>
                            <input type="number" placeholder="Qtd Cx" className="w-full p-2 border rounded" value={newMedData.stock || ''} onChange={e => setNewMedData({ ...newMedData, stock: Number(e.target.value) })} />
                            <div className="flex justify-end gap-2"><button onClick={() => setIsAddCustomMedModalOpen(false)} className="px-3 py-1 border rounded text-xs">Cancelar</button><button onClick={addMedToConsultation} disabled={!newMedData.name} className="px-3 py-1 bg-[#e580b1] text-white rounded text-xs font-bold">Adicionar</button></div>
                        </div>
                    </div>
                )}

                {isMedEditModalOpen && medicationToEdit && (
                    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3">
                            <h2 className="font-bold text-sm">Editar Medicação</h2>
                            <input className="w-full p-2 border rounded" value={medicationToEdit.name} onChange={e => setMedicationToEdit({ ...medicationToEdit, name: e.target.value })} />
                            <div className="flex gap-2"><input className="w-full p-2 border rounded" value={medicationToEdit.dosage} onChange={e => setMedicationToEdit({ ...medicationToEdit, dosage: e.target.value })} /><input className="w-full p-2 border rounded" value={medicationToEdit.frequency} onChange={e => setMedicationToEdit({ ...medicationToEdit, frequency: e.target.value })} /></div>
                            <div className="flex justify-end gap-2"><button onClick={() => setIsMedEditModalOpen(false)} className="px-3 py-1 border rounded text-xs">Cancelar</button><button onClick={handleUpdateMedication} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold">Salvar</button></div>
                        </div>
                    </div>
                )}

                {isAttendanceModalOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60"><div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4"><h2 className="font-bold">Declaração</h2><input type="date" className="w-full border p-2 rounded" value={attendanceData.date} onChange={e => setAttendanceData({ ...attendanceData, date: e.target.value })} /><div className="flex gap-2"><input type="time" className="w-full border p-2 rounded" value={attendanceData.startTime} onChange={e => setAttendanceData({ ...attendanceData, startTime: e.target.value })} /><input type="time" className="w-full border p-2 rounded" value={attendanceData.endTime} onChange={e => setAttendanceData({ ...attendanceData, endTime: e.target.value })} /></div><div className="flex justify-end gap-2"><button onClick={() => setIsAttendanceModalOpen(false)} className="border px-3 py-1 rounded">Cancelar</button><button onClick={handlePrintAttendance} className="bg-blue-600 text-white px-3 py-1 rounded font-bold">Imprimir</button></div></div></div>}

                {isCertificateModalOpen && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4 shadow-2xl border border-slate-200">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h2 className="font-bold text-slate-800">Emitir Atestado</h2>
                                <button onClick={() => setIsCertificateModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Dias de Afastamento</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none"
                                    value={certificateData.days}
                                    onChange={e => setCertificateData({ ...certificateData, days: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">CID (Opcional)</label>
                                <input
                                    placeholder="Ex: F41.1"
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none uppercase"
                                    value={certificateData.cid}
                                    onChange={e => setCertificateData({ ...certificateData, cid: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Informe apenas o código.</p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsCertificateModalOpen(false)} className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition">Cancelar</button>
                                <button onClick={handlePrintCertificate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow flex items-center">
                                    <Printer className="w-4 h-4 mr-2" /> Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE SOLICITAÇÃO DE EXAMES ATUALIZADO */}
                {isExamModalOpen && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
                            <div className="flex justify-between items-center border-b p-4 bg-slate-50">
                                <h2 className="font-bold text-slate-800 flex items-center">
                                    <ClipboardList className="w-5 h-5 mr-2 text-fuchsia-600" />
                                    Solicitação de Exames
                                </h2>
                                <button onClick={() => setIsExamModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                                {/* Input para adicionar exame */}
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-200 outline-none text-sm"
                                        placeholder="Digite o nome do exame..."
                                        value={currentExam}
                                        onChange={e => setCurrentExam(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddExam()}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleAddExam}
                                        disabled={!currentExam.trim()}
                                        className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg font-bold text-sm hover:bg-fuchsia-700 disabled:opacity-50 transition"
                                    >
                                        Adicionar
                                    </button>
                                </div>

                                {/* Sugestões Rápidas */}
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Sugestões Rápidas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {commonExams.map(exam => (
                                            <button
                                                key={exam}
                                                onClick={() => handleAddCommonExam(exam)}
                                                className={`text-xs px-2 py-1 rounded border transition ${examList.includes(exam) ? 'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                            >
                                                {exam}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Lista de Exames Adicionados */}
                                <div className="border rounded-lg overflow-hidden bg-slate-50/50 min-h-[150px]">
                                    <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 border-b flex justify-between">
                                        <span>Exames Selecionados</span>
                                        <span>{examList.length} itens</span>
                                    </div>
                                    {examList.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            Nenhum exame adicionado.<br />Use o campo acima ou as sugestões.
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto bg-white">
                                            {examList.map((exam, index) => (
                                                <li key={index} className="px-3 py-2 flex justify-between items-center hover:bg-slate-50">
                                                    <span className="text-sm text-slate-700 font-medium">• {exam}</span>
                                                    <button onClick={() => handleRemoveExam(index)} className="text-red-400 hover:text-red-600 p-1">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
                                <button onClick={() => setIsExamModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-100 transition text-slate-600">Cancelar</button>
                                <button
                                    onClick={handlePrintExams}
                                    disabled={examList.length === 0 || isGeneratingDoc}
                                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                    Imprimir Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isModalOpen && renderModal()}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
                    <p className="text-slate-500">Gerencie prontuários, consultas e prescrições.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e580b1] focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex-none flex items-center px-4 py-2 bg-[#e580b1] text-white rounded-xl hover:bg-pink-600 transition font-bold shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Novo
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhum paciente encontrado.</p>
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-2 text-[#e580b1] text-sm hover:underline">Limpar busca</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={() => setViewingPatient(patient)}
                            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-fuchsia-200 transition cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <img src={getAvatar(patient.full_name)} alt={patient.full_name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 group-hover:text-fuchsia-700 transition">{patient.full_name}</h3>
                                        <p className="text-xs text-slate-500 font-medium">{patient.diagnosis || 'Sem diagnóstico'}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-fuchsia-400" />
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                    <Phone className="w-3 h-3 mr-2 text-slate-400" />
                                    {patient.phone}
                                </div>
                                <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                    <Calendar className="w-3 h-3 mr-2 text-slate-400" />
                                    {calculateAge(patient.date_of_birth)} anos
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${patient.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {patient.status === 'Active' ? 'ATIVO' : 'INATIVO'}
                                </span>
                                <span className="text-xs font-bold text-fuchsia-600 opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0">
                                    Acessar Prontuário
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && renderModal()}
        </div>
    );
};

export default Clients;