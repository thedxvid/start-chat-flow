
import { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthSimple';
import { Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, hasAccess } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  // If user is authenticated but doesn't have subscription access
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Acesso Premium Necessário</CardTitle>
            <CardDescription>
              Você precisa de uma assinatura ativa para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirme seu pagamento ou entre em contato com o suporte se você já pagou.
            </p>
            <Button 
              onClick={() => navigate('/landing')}
              className="w-full"
            >
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
