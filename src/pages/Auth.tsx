import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Crown, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Função para validar código de acesso no banco de dados
  const validateAccessCode = async (code: string, customerEmail: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('access_code, status, customer_email, expires_at')
        .eq('access_code', code.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Erro ao validar código:', error);
        return false;
      }

      // Verificar se o código existe e está ativo
      if (!data) {
        return false;
      }

      // Verificar se ainda não expirou
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return false;
      }

      // Se o email for fornecido, verificar se corresponde
      if (customerEmail && data.customer_email && data.customer_email !== customerEmail) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro na validação do código:', error);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Verificar código de acesso no banco de dados
    const isValidCode = await validateAccessCode(accessCode, email);
    
    if (!isValidCode) {
      setError('Código de acesso inválido ou expirado. Verifique seu email após o pagamento ou entre em contato com o suporte.');
      setLoading(false);
      toast({
        title: "Código de acesso inválido",
        description: "Código inválido ou expirado. Verifique seu email após o pagamento.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Atualizar o registro da assinatura com o user_id após o cadastro
      try {
        await supabase
          .from('subscriptions')
          .update({ 
            user_email_registered: email,
            registration_completed_at: new Date().toISOString()
          })
          .eq('access_code', accessCode.toUpperCase());
      } catch (updateError) {
        console.error('Erro ao atualizar registro de assinatura:', updateError);
      }

      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar a conta.",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Sistema Start</h1>
          <p className="text-muted-foreground">Mentoria Expert em Marketing Digital</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com sua conta ou cadastre-se com seu código de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      Cadastro disponível apenas para usuários com assinatura ativa. 
                      Seu código de acesso foi enviado por email após o pagamento.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="access-code">Código de Acesso *</Label>
                    <Input
                      id="access-code"
                      type="text"
                      placeholder="Ex: START-ABC12345"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      required
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Código enviado por email após confirmação do pagamento
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use o mesmo email do pagamento
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cadastrar
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/landing')}
                className="text-primary"
              >
                Não tem uma assinatura? Ver planos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}