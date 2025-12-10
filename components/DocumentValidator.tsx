import React, { useEffect, useState } from 'react';
import { supabase } from '../services/db';
import { Activity, CheckCircle, XCircle, Calendar, User, FileText, AlertTriangle } from 'lucide-react';

interface DocumentValidatorProps {
  docId: string;
}

const DocumentValidator: React.FC<DocumentValidatorProps> = ({ docId }) => {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_documents')
          .select('*')
          .eq('id', docId)
          .single();

        if (error) throw error;
        setDocument(data);
      } catch (err) {
        console.error(err);
        setError('Documento não encontrado ou inválido.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [docId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center border border-slate-200">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Documento Inválido</h1>
          <p className="text-slate-500 mb-6">{error || 'Não foi possível validar este documento.'}</p>
          <a href="/" className="text-fuchsia-600 font-medium hover:underline">Voltar para Psicare Manager</a>
        </div>
      </div>
    );
  }

  // Formatação de dados
  const dateStr = new Date(document.created_at).toLocaleDateString('pt-BR');
  const timeStr = new Date(document.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const content = document.content_data || {};

  return (
    <div className="min-h-screen bg-[#fcf4fa] py-8 px-4 flex justify-center">
      <div className="bg-white max-w-2xl w-full shadow-2xl rounded-2xl overflow-hidden border border-slate-200 flex flex-col">

        {/* Header de Validação */}
        <div className="bg-green-600 text-white p-6 text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold">Documento Autêntico</h1>
          <p className="opacity-90 text-sm mt-1">Verificado digitalmente pelo Psicare Manager</p>
        </div>

        {/* Detalhes do Documento */}
        <div className="p-8 space-y-6 flex-1">

          <div className="text-center border-b border-slate-100 pb-6">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide text-fuchsia-700">{document.type}</h2>
            <p className="text-slate-500 text-sm mt-1">Emitido em {dateStr} às {timeStr}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center">
                <User className="w-4 h-4 mr-1" /> Paciente
              </h3>
              <p className="font-bold text-slate-800 text-lg">{document.patient_name}</p>
              <p className="text-slate-600 font-mono text-sm">{document.patient_cpf || 'CPF não informado'}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center">
                <Activity className="w-4 h-4 mr-1" /> Profissional
              </h3>
              <p className="font-bold text-slate-800 text-lg">{document.doctor_name}</p>
              <p className="text-slate-600 text-sm">{document.doctor_crm ? `CRM: ${document.doctor_crm}` : 'Registro não informado'}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Detalhes do Documento
            </h3>

            {document.type === 'Atestado Médico' && (
              <div className="space-y-2 text-blue-900/80 text-sm">
                <p><strong>CID/Diagnóstico:</strong> {content.cid}</p>
                <p><strong>Dias de Afastamento:</strong> {content.days} dia(s)</p>
                <p><strong>Tipo de Atendimento:</strong> {content.attendanceType}</p>
              </div>
            )}

            {document.type === 'Declaração de Comparecimento' && (
              <div className="space-y-2 text-blue-900/80 text-sm">
                <p><strong>Data do Comparecimento:</strong> {new Date(content.date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> De {content.startTime} às {content.endTime}</p>
              </div>
            )}
          </div>

          <div className="flex items-start p-4 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs">
            <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
            <p>
              Este documento foi assinado digitalmente. A veracidade das informações acima confirma que o documento original foi emitido através do sistema Psicare Manager e não sofreu alterações.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-200 text-xs text-slate-400">
          ID do Documento: <span className="font-mono text-slate-500 select-all">{document.id}</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentValidator;