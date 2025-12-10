import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Debug: Log environment variables (remove in production)
console.log('🔍 Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);
console.log('Key length:', supabaseKey?.length || 0);
console.log('Key preview:', supabaseKey?.substring(0, 20) + '...');

// Hardcoded fallback values for production
const FALLBACK_URL = 'https://qlplzvrsckvarzcmzypc.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscGx6dnJzY2t2YXJ6Y216eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODU4MDcsImV4cCI6MjA3OTg2MTgwN30.ArpgrdEELgyvV4Sm1dQeyvAYeIsBpzUz_c5zfgEiUyk';

// Use fallback if env vars are undefined, null, or empty strings
const finalUrl = (supabaseUrl && supabaseUrl.trim() !== '') ? supabaseUrl : FALLBACK_URL;
const finalKey = (supabaseKey && supabaseKey.trim() !== '') ? supabaseKey : FALLBACK_KEY;

if (!supabaseUrl || supabaseUrl.trim() === '' || !supabaseKey || supabaseKey.trim() === '') {
    console.warn('⚠️ AVISO: Variáveis de ambiente não configuradas ou vazias!');
    console.warn('Usando valores hardcoded como fallback');
    console.warn('VITE_SUPABASE_URL:', supabaseUrl || 'undefined');
    console.warn('VITE_SUPABASE_KEY:', supabaseKey ? 'definida mas pode estar vazia' : 'undefined');
}

console.log('🔧 Valores finais usados:');
console.log('Final URL:', finalUrl);
console.log('Final Key preview:', finalKey.substring(0, 20) + '...');
console.log('Final Key length:', finalKey.length);

export const supabase = createClient(finalUrl, finalKey);

// Teste de conexão imediato
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('❌ Erro ao verificar sessão:', error);
    } else {
        console.log('✅ Cliente Supabase inicializado com sucesso!');
        console.log('Sessão atual:', data.session ? 'Logado' : 'Não logado');
    }
});
