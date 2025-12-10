import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Debug: Log environment variables (remove in production)
console.log('🔍 Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);
console.log('Key length:', supabaseKey?.length || 0);
console.log('Key preview:', supabaseKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
    console.error('VITE_SUPABASE_URL:', supabaseUrl);
    console.error('VITE_SUPABASE_KEY:', supabaseKey ? 'Definida' : 'Não definida');

    // Fallback para valores hardcoded (APENAS PARA DEBUG - REMOVER EM PRODUÇÃO)
    console.warn('⚠️ Usando valores hardcoded como fallback');
}

// Use valores hardcoded se as variáveis de ambiente não estiverem disponíveis
const finalUrl = supabaseUrl || 'https://qlplzvrsckvarzcmzypc.supabase.co';
const finalKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscGx6dnJzY2t2YXJ6Y216eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODU4MDcsImV4cCI6MjA3OTg2MTgwN30.ArpgrdEELgyvV4Sm1dQeyvAYeIsBpzUz_c5zfgEiUyk';

console.log('🔧 Valores finais usados:');
console.log('Final URL:', finalUrl);
console.log('Final Key preview:', finalKey.substring(0, 20) + '...');

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
