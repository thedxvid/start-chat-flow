import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    full_name: string;
  };
  subscription?: {
    status: string;
    plan_type: string;
    expires_at: string;
  };
  role?: string;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithProfile[]>([]);

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
      return { success: true };
    } catch (error) {
      console.error('Error making user admin:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;

    try {
      // First get all users from auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
      }

      // Then get profiles and subscriptions
      const userIds = authUsers.users.map(u => u.id);
      
      const [profilesResult, subscriptionsResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
        supabase.from('subscriptions').select('user_id, status, plan_type, expires_at').in('user_id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
      ]);

      const enrichedUsers: UserWithProfile[] = authUsers.users.map(user => {
        const profile = profilesResult.data?.find(p => p.user_id === user.id);
        const subscription = subscriptionsResult.data?.find(s => s.user_id === user.id);
        const roleData = rolesResult.data?.find(r => r.user_id === user.id);

        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          profile: profile ? { full_name: profile.full_name } : undefined,
          subscription: subscription ? {
            status: subscription.status,
            plan_type: subscription.plan_type,
            expires_at: subscription.expires_at
          } : undefined,
          role: roleData?.role || 'user'
        };
      });

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  return {
    isAdmin,
    loading,
    users,
    makeUserAdmin,
    fetchUsers
  };
}