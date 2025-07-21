import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthSimple';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Settings, 
  Crown,
  Sparkles
} from 'lucide-react';

const SimpleIndex = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Start Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <Crown className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
          <Button
            onClick={() => navigate('/settings')}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSignOut}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center space-y-6">
          {/* Hero Section */}
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-foreground">
            Bem-vindo ao Sistema!
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Olá, {user?.email}! O sistema está funcionando corretamente.
          </p>

          <div className="space-y-4 mt-8">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✅ Login realizado com sucesso!</p>
              <p className="text-green-600 text-sm mt-1">
                Você está autenticado e pode acessar o sistema.
              </p>
            </div>

            {isAdmin && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800 font-medium">👑 Você é um administrador!</p>
                <p className="text-purple-600 text-sm mt-1">
                  Você tem acesso ao painel administrativo.
                </p>
                <Button
                  onClick={() => navigate('/admin')}
                  className="mt-3"
                  size="sm"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Acessar Painel Admin
                </Button>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">🔧 Sistema Funcionando</p>
              <p className="text-blue-600 text-sm mt-1">
                Todas as correções foram aplicadas com sucesso.
              </p>
            </div>
          </div>

          <div className="flex gap-4 justify-center mt-8">
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            
            <Button
              onClick={handleSignOut}
              variant="outline"
              disabled={loading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {loading ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleIndex;