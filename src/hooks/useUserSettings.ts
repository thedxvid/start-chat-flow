import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuthSimple';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id?: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  admin_email?: string;
  is_admin_created?: boolean;
  temp_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface UserStats {
  totalConversations: number;
  lastActivity: string | null;
  accountAge: number; // em dias
}

export function useUserSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Criar perfil se não existir
        const newProfile = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;

        setProfile(createdProfile);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      setError('Erro ao carregar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Buscar conversas
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('user_id', user.id);

      if (convError) throw convError;

      const totalConversations = conversations?.length || 0;

      // Calcular última atividade
      const allDates = conversations?.map(c => new Date(c.created_at)) || [];
      
      const lastActivity = allDates.length > 0 
        ? Math.max(...allDates.map(d => d.getTime()))
        : null;

      // Calcular idade da conta
      const accountCreated = user.created_at ? new Date(user.created_at) : new Date();
      const accountAge = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));

      setStats({
        totalConversations,
        lastActivity: lastActivity ? new Date(lastActivity).toISOString() : null,
        accountAge
      });

    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { success: false, error: 'Usuário não encontrado' };

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);

      // Se atualizou informações básicas, também atualizar no auth
      if (updates.full_name) {
        await supabase.auth.updateUser({
          data: {
            full_name: updates.full_name
          }
        });
      }

      return { success: true, data };
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: any) => {
    if (!profile) return { success: false, error: 'Perfil não encontrado' };
    
    // Por enquanto, não há suporte a preferences no banco
    return { success: true };
  };

  const changePassword = async (newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar senha';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    try {
      setLoading(true);

      // Buscar todos os dados do usuário
      const [conversationsResult, profileResult] = await Promise.all([
        supabase.from('conversations').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('user_id', user.id).single()
      ]);

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          metadata: user.user_metadata
        },
        profile: profileResult.data,
        conversations: conversationsResult.data || [],
        stats,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      // Criar e baixar arquivo
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `start-chat-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar dados';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    stats,
    loading,
    error,
    updateProfile,
    updatePreferences,
    changePassword,
    exportUserData,
    refreshProfile: fetchUserProfile,
    refreshStats: fetchUserStats
  };
} 