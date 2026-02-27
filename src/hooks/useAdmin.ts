import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthSimple';


interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  role?: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
  subscription?: {
    status: string;
    plan_type: string;
    expires_at: string;
  };
  tokenStats?: {
    total_tokens: number;
    total_cost: number;
    conversation_count: number;
    avg_tokens_per_conversation: number;
    last_used_at: string;
  };
}

interface CreateUserData {
  email: string;
  fullName: string;
  role?: 'user' | 'admin';
  planType?: 'free' | 'premium' | 'pro';
  sendWelcomeEmail?: boolean;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [totalTokenUsage, setTotalTokenUsage] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  // Auto-carregar usuários quando isAdmin for true
  useEffect(() => {
    if (isAdmin && !loading) {
      fetchUsers();
    }
  }, [isAdmin, loading]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
      }

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const makeUserAdmin = async (email: string) => {
    try {
      const { error } = await supabase.rpc('make_user_admin', {
        user_email: email
      });

      if (error) {
        throw error;
      }

      await fetchUsers();

      return { success: true };
    } catch (error) {
      console.error('Error making user admin:', error);
      return { success: false, error: error.message };
    }
  };

  const createUser = async (userData: CreateUserData) => {
    try {
      console.log('🚀 Iniciando criação de usuário:', userData);

      // Gerar senha temporária
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const tempPassword = 'TEMP-' + code;

      console.log('📤 Chamando Edge Function send-user-credentials...');

      // Usar fetch direto com timeout para evitar hang infinito
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token || '';

      let fetchRes: Response;
      try {
        fetchRes = await fetch('https://wpqthkvidfmjyroaijiq.supabase.co/functions/v1/send-user-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcXRoa3ZpZGZtanlyb2FpamlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NTk2MzQsImV4cCI6MjA2ODUzNTYzNH0.3HdTw587IUP-Y-QR59qMuijAzlqk9ifiZq_bP14hcjc',
          },
          body: JSON.stringify({
            email: userData.email,
            fullName: userData.fullName,
            tempPassword: tempPassword,
            role: userData.role || 'user',
            planType: userData.planType || 'premium'
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error('Tempo limite excedido ao criar usuário. Verifique se a Edge Function está ativa.');
        }
        throw new Error(`Erro de rede ao chamar Edge Function: ${fetchErr.message}`);
      }
      clearTimeout(timeoutId);

      const emailData = await fetchRes.json().catch(() => null);
      const emailError = fetchRes.ok ? null : { message: `HTTP ${fetchRes.status}: ${emailData?.error || 'Erro desconhecido'}` };

      console.log('📨 Resposta da Edge Function:', { emailData, emailError, status: fetchRes.status });

      // Parse response if it came back as string
      let parsedData = emailData;
      if (typeof emailData === 'string') {
        try {
          parsedData = JSON.parse(emailData);
        } catch {
          console.error('❌ Resposta não é JSON válido:', emailData);
          throw new Error('Resposta inválida da função de criação');
        }
      }

      console.log('📨 Dados parseados:', parsedData);

      // Verificar se houve erro na chamada da função
      if (emailError) {
        console.error('❌ Erro detalhado da Edge Function:', emailError);
        if (emailError.message?.includes('409') || emailError.message?.includes('Conflict')) {
          throw new Error(`Email ${userData.email} já está registrado no sistema`);
        }
        throw new Error(`Erro ao criar usuário: ${emailError.message}`);
      }

      // Verificar se a resposta existe
      if (!parsedData) {
        console.error('❌ Resposta vazia da Edge Function');
        throw new Error('Resposta vazia da função de criação');
      }

      // Verificar se houve erro na resposta da função
      if (parsedData.error) {
        console.error('❌ Erro retornado pela Edge Function:', parsedData.error);
        if (parsedData.error.includes('já existe') || parsedData.error.includes('already exists')) {
          throw new Error(`Email ${userData.email} já está registrado no sistema`);
        }
        throw new Error(parsedData.error);
      }

      // Verificar se foi bem-sucedido
      if (!parsedData.success) {
        console.error('❌ Falha na Edge Function:', parsedData);
        throw new Error('Falha na criação do usuário');
      }

      console.log('✅ Usuário criado e email enviado com sucesso:', parsedData);

      // Atualizar lista de usuários
      await fetchUsers();

      return {
        success: true,
        message: parsedData.warning
          ? `Usuário criado com sucesso! ${parsedData.warning}. Credenciais: ${userData.email} / ${tempPassword}`
          : `Usuário criado com sucesso! As credenciais foram enviadas para ${userData.email}`,
        userId: parsedData.userId,
        tempPassword: tempPassword
      };
    } catch (error) {
      console.error('💥 Erro ao criar usuário:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      console.log('🗑️ Excluindo usuário via Edge Function cleanup-users:', userEmail);

      const { data, error } = await supabase.functions.invoke('cleanup-users', {
        body: { action: 'cleanup_incomplete', email: userEmail }
      });

      if (error) {
        console.error('❌ Erro na Edge Function cleanup-users:', error);
        throw new Error(error.message || 'Erro ao excluir usuário');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('✅ Usuário excluído com sucesso:', data);
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserSubscription = async (
    userId: string,
    planType: 'free' | 'premium' | 'pro',
    userEmail?: string
  ) => {
    try {
      if (planType === 'free') {
        // Remove subscription
        await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', userId);
      } else {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 180); // 6 meses de acesso

        // Insert or update subscription with all required fields
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            customer_email: userEmail || '',
            customer_name: '',
            plan_type: planType,
            status: 'active',
            access_code: 'ADMIN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            kiwify_order_id: 'ADMIN-' + Math.random().toString(36).substring(2, 14).toUpperCase(),
            expires_at: expirationDate.toISOString()
          });
      }

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchUsers = async () => {
    try {
      // Primeiro tenta a RPC
      let usersWithData: UserWithProfile[] = [];

      try {
        const { data: adminUsers, error } = await (supabase as any).rpc('get_admin_users_v3');

        if (!error && adminUsers && adminUsers.length > 0) {
          usersWithData = adminUsers.map((userData: any) => ({
            id: userData.user_id,
            email: userData.email || '',
            created_at: userData.created_at,
            role: userData.role || 'user',
            profile: {
              full_name: userData.full_name || '',
              avatar_url: null
            },
            subscription: {
              status: userData.status || 'inactive',
              plan_type: userData.plan_type || 'free',
              expires_at: null
            },
            tokenStats: {
              total_tokens: 0,
              total_cost: 0,
              conversation_count: 0,
              avg_tokens_per_conversation: 0,
              last_used_at: ''
            }
          }));
        }
      } catch {
        console.log('RPC get_admin_users_v3 não disponível, usando fallback...');
      }

      // Fallback: consulta direta às tabelas se RPC falhou ou retornou vazio
      if (usersWithData.length === 0) {
        console.log('Buscando usuários diretamente das tabelas...');

        // Buscar todos os profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error('Erro ao buscar profiles:', profilesError);
          throw profilesError;
        }

        if (profiles && profiles.length > 0) {
          // Buscar roles
          const { data: roles } = await supabase
            .from('user_roles')
            .select('*');

          // Buscar subscriptions
          const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('*');

          const rolesMap = new Map((roles || []).map(r => [r.user_id, r.role]));
          const subsMap = new Map((subscriptions || []).map(s => [s.user_id, s]));

          usersWithData = profiles.map((profile) => {
            const sub = subsMap.get(profile.user_id);
            return {
              id: profile.user_id,
              email: profile.email || '',
              created_at: profile.created_at || new Date().toISOString(),
              role: rolesMap.get(profile.user_id) || 'user',
              profile: {
                full_name: profile.full_name || '',
                avatar_url: profile.avatar_url || null
              },
              subscription: {
                status: sub?.status || 'inactive',
                plan_type: sub?.plan_type || 'free',
                expires_at: sub?.expires_at || null
              },
              tokenStats: {
                total_tokens: 0,
                total_cost: 0,
                conversation_count: 0,
                avg_tokens_per_conversation: 0,
                last_used_at: ''
              }
            };
          });
        }
      }

      setUsers(usersWithData);
      setTotalTokenUsage(0);
      setTotalCost(0);

    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Função para reenviar email de boas-vindas
  const resendWelcomeEmail = async (email: string, fullName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-user-credentials', {
        body: { email, fullName, tempPassword: '', mode: 'resend' }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { success: true };
    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      return { success: false, error: error.message };
    }
  };

  // Função para limpar usuários específicos via Edge Function
  const cleanupIncompleteUsers = async () => {
    try {
      console.log('🧹 Iniciando limpeza via Edge Function...');

      const { data, error } = await supabase.functions.invoke('cleanup-users', {
        body: {
          action: 'cleanup_incomplete',
          email: 'davicastropx@gmail.com' // Email específico problemático
        }
      });

      console.log('📨 Resposta da limpeza:', { data, error });

      if (error) {
        console.error('❌ Erro na Edge Function de limpeza:', error);
        throw new Error(error.message);
      }

      if (data?.success) {
        // Atualizar lista de usuários
        await fetchUsers();

        return {
          success: true,
          message: data.message || 'Limpeza concluída com sucesso'
        };
      }

      throw new Error(data?.error || 'Erro na limpeza');

    } catch (error) {
      console.error('💥 Erro na limpeza de usuários incompletos:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido na limpeza'
      };
    }
  };

  // Função para criar usuários em massa (importação CSV/XLSX)
  const bulkCreateUsers = async (
    usersList: Array<{ email: string; fullName: string; role?: 'user' | 'admin'; planType?: 'free' | 'premium' | 'pro' }>
  ) => {
    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const userData of usersList) {
      try {
        await createUser({
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role || 'user',
          planType: userData.planType || 'premium',
        });
        results.push({ email: userData.email, success: true });
      } catch (error: any) {
        results.push({
          email: userData.email,
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      }

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Recarregar lista depois da importação
    await fetchUsers();
    return results;
  };

  // Função para reenviar acesso (resetar senha e enviar novo email)
  const resetUserCredentials = async (email: string, fullName: string, planType?: string) => {
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const newPassword = 'START-' + code;

      console.log('📤 Reenviando credenciais para:', email);

      const { data, error } = await supabase.functions.invoke('send-user-credentials', {
        body: {
          email,
          fullName,
          tempPassword: newPassword,
          role: 'user',
          planType: planType || 'premium',
          mode: 'reset'
        }
      });

      console.log('📥 Resposta da função:', { data, error });

      // supabase.functions.invoke retorna error para non-2xx mas a função
      // pode retornar success:true no body mesmo com warning
      if (error) {
        // Tentar extrair dados do contexto do erro
        const errorMsg = typeof error === 'object' && error.message ? error.message : String(error);
        console.warn('⚠️ Edge function retornou erro mas pode ter funcionado:', errorMsg);
        
        // Se o erro é apenas "non-2xx" mas temos data com success, considerar sucesso
        if (data?.success) {
          return {
            success: true,
            message: `Nova senha enviada para ${email}${data.warning ? ' (com aviso)' : ''}`,
            tempPassword: newPassword
          };
        }
        
        throw new Error(errorMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        message: `Nova senha enviada para ${email}`,
        tempPassword: newPassword
      };
    } catch (error: any) {
      console.error('❌ Erro ao reenviar credenciais:', error);
      return { success: false, error: error.message || 'Erro ao reenviar credenciais' };
    }
  };

  // Função para reenviar credenciais em massa
  const bulkResetCredentials = async (
    usersList: Array<{ email: string; fullName: string; planType?: string }>,
    onProgress?: (current: number, total: number) => void
  ) => {
    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < usersList.length; i++) {
      const userData = usersList[i];
      try {
        const result = await resetUserCredentials(userData.email, userData.fullName, userData.planType);
        if (result.success) {
          results.push({ email: userData.email, success: true });
        } else {
          results.push({ email: userData.email, success: false, error: result.error });
        }
      } catch (error: any) {
        results.push({
          email: userData.email,
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      }

      onProgress?.(i + 1, usersList.length);
      // Delay de 1s para respeitar rate limits do Resend
      if (i < usersList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await fetchUsers();
    return results;
  };

  return {
    isAdmin,
    loading,
    users,
    totalTokenUsage,
    totalCost,
    makeUserAdmin,
    createUser,
    deleteUser,
    updateUserSubscription,
    fetchUsers,
    resendWelcomeEmail,
    cleanupIncompleteUsers,
    bulkCreateUsers,
    resetUserCredentials,
    bulkResetCredentials
  };
}
