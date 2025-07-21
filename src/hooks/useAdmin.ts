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
      console.log('Criando usuário:', userData);
      
      // Usar função corrigida v3
      const { data, error } = await (supabase as any).rpc('create_admin_user_v3', {
        user_email: userData.email,
        user_full_name: userData.fullName,
        user_role: userData.role || 'user',
        plan_type: userData.planType || 'free'
      });

      if (error) {
        console.error('Erro RPC Supabase:', error);
        throw new Error(`Erro na função do banco: ${error.message}`);
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Falha ao criar usuário - resposta inválida';
        console.error('Criação de usuário admin falhou:', data);
        throw new Error(errorMsg);
      }

      console.log('Usuário criado com sucesso:', data);

      // Enviar email com credenciais usando a edge function
      try {
        console.log('Enviando email com credenciais...');
        
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-user-credentials', {
          body: {
            email: userData.email,
            fullName: userData.fullName,
            tempPassword: 'TEMP-' + Math.random().toString(36).slice(-8).toUpperCase(),
            role: userData.role || 'user',
            planType: userData.planType || 'free'
          }
        });

        if (emailError) {
          console.error('Erro ao enviar email com credenciais:', emailError);
          // Não falhar a criação do usuário por causa do email
        } else {
          console.log('Email com credenciais enviado com sucesso:', emailData);
        }
      } catch (emailError) {
        console.error('Erro ao invocar função de email:', emailError);
        // Não falhar a criação do usuário por causa do email
      }

      // Notificar admin sobre criação de usuário
      try {
        await sendAdminNotification('Usuário criado via painel admin', {
          newUser: {
            email: userData.email,
            fullName: userData.fullName,
            role: userData.role || 'user',
            planType: userData.planType || 'free'
          },
          createdBy: user?.email,
          timestamp: new Date().toISOString()
        });
      } catch (notificationError) {
        console.error('Erro ao enviar notificação admin:', notificationError);
      }

      await fetchUsers();
      
      return { 
        success: true, 
        message: `Usuário ${userData.fullName} criado com sucesso! Email com credenciais enviado para ${userData.email}.`
      };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { success: false, error: error.message };
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
