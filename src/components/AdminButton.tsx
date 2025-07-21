import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthSimple';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Crown } from 'lucide-react';
import { toast } from 'sonner';

export function AdminButton() {
  const { isAdmin, user, refreshAdminStatus } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAdminStatus();
      toast.success('Status de admin atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      navigate('/admin');
    } else {
      toast.error('Você não tem permissões de administrador');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleRefresh}
        size="sm"
        variant="outline"
        disabled={isRefreshing}
        title="Atualizar status de admin"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
      
      {isAdmin && (
        <Button
          onClick={handleAdminClick}
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <Crown className="h-4 w-4 mr-2" />
          Admin
        </Button>
      )}
      
      {!isAdmin && user?.email === 'davicastrowp@gmail.com' && (
        <Button
          onClick={handleRefresh}
          size="sm"
          variant="outline"
          className="text-amber-600 border-amber-600 hover:bg-amber-50"
        >
          <Shield className="h-4 w-4 mr-2" />
          Verificar Admin
        </Button>
      )}
    </div>
  );
} 