import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthSimple';
import { sendWelcomeEmail, sendAdminNotification } from '@/lib/resend';

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

      // Notificar admin sobre nova promoção
      await sendAdminNotification('Usuário promovido a admin', {
        promotedEmail: email,
        promotedBy: user?.email,
        timestamp: new Date().toISOString()
      });

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
      const tempPassword = 'TEMP-' + Math.random().toString(36).slice(-8).toUpperCase();
      
      console.log('📤 Chamando Edge Function send-user-credentials...');
      
      // Criar usuário diretamente via Edge Function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-user-credentials', {
        body: {
          email: userData.email,
          fullName: userData.fullName,
          tempPassword: tempPassword,
          role: userData.role || 'user',
          planType: userData.planType || 'free'
        }
      });

      console.log('📨 Resposta da Edge Function:', { emailData, emailError });

      // Verificar se houve erro na chamada da função
      if (emailError) {
        console.error('❌ Erro detalhado da Edge Function:', emailError);
        
        // Tratamento específico para erro 409 (conflito - usuário já existe)
        if (emailError.message?.includes('409') || emailError.message?.includes('Conflict')) {
          throw new Error(`Email ${userData.email} já está registrado no sistema`);
        }
        
        throw new Error(`Erro ao criar usuário: ${emailError.message}`);
      }

      // Verificar se a resposta existe
      if (!emailData) {
        console.error('❌ Resposta vazia da Edge Function');
        throw new Error('Resposta vazia da função de criação');
      }

      // Verificar se houve erro na resposta da função
      if (emailData.error) {
        console.error('❌ Erro retornado pela Edge Function:', emailData.error);
        
        if (emailData.error.includes('já existe') || emailData.error.includes('already exists')) {
          throw new Error(`Email ${userData.email} já está registrado no sistema`);
        }
        
        throw new Error(emailData.error);
      }

      // Verificar se foi bem-sucedido
      if (!emailData.success) {
        console.error('❌ Falha na Edge Function:', emailData);
        throw new Error('Falha na criação do usuário');
      }

      console.log('✅ Usuário criado e email enviado com sucesso:', emailData);
      
      // Atualizar lista de usuários
      await fetchUsers();
      
      return {
        success: true,
        message: emailData.warning 
          ? `Usuário criado com sucesso! ${emailData.warning}. Credenciais: ${userData.email} / ${tempPassword}`
          : `Usuário criado com sucesso! As credenciais foram enviadas para ${userData.email}`,
        userId: emailData.userId,
        tempPassword: tempPassword
      };
    } catch (error) {
      console.error('💥 Erro ao criar usuário:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw error;
      }

      // Notificar admin sobre exclusão de usuário
      await sendAdminNotification('Usuário excluído', {
        deletedUser: {
          id: userId,
          email: userEmail
        },
        deletedBy: user?.email,
        timestamp: new Date().toISOString()
      });

      await fetchUsers();
      return { success: true };
    } catch (error) {
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
        expirationDate.setDate(expirationDate.getDate() + 30);

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

      // Notificar admin sobre mudança de assinatura
      await sendAdminNotification('Assinatura atualizada', {
        user: {
          id: userId,
          email: userEmail
        },
        newPlan: planType,
        updatedBy: user?.email,
        timestamp: new Date().toISOString()
      });

      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchUsers = async () => {
    try {
      // Usar nova função RPC corrigida v3
      const { data: adminUsers, error } = await (supabase as any).rpc('get_admin_users_v3');
      
      if (error) {
        throw error;
      }

      // Process data from RPC function (no token usage for now)
      const usersWithData = (adminUsers || []).map((userData: any) => {

        return {
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
        };
      });

      setUsers(usersWithData);

      // Calculate totals (set to 0 for now)
      setTotalTokenUsage(0);
      setTotalCost(0);

    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Função para reenviar email de boas-vindas
  const resendWelcomeEmail = async (email: string, fullName: string) => {
    try {
      const result = await sendWelcomeEmail(email, fullName);
      
      if (result.success) {
        // Notificar admin sobre reenvio
        await sendAdminNotification('Email de boas-vindas reenviado', {
          recipient: email,
          resentBy: user?.email,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error resending welcome email:', error);
      return { success: false, error: error.message };
    }
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
    resendWelcomeEmail
  };
}
