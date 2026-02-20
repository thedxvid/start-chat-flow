import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthSimple';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Crown, Key, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Função para validar código de acesso no banco de dados
  const validateAccessCode = async (code: string, customerEmail: string): Promise<boolean> => {
    try {
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('access_code, status, customer_email, expires_at')
        .eq('access_code', code.toUpperCase())
        .eq('status', 'active')
        .maybeSingle();

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const redirectUrl = `${window.location.origin}/auth`;

    try {
      let sent = false;

      // Tenta Edge Function customizada primeiro (email bonito via Resend)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wpqthkvidfmjyroaijiq.supabase.co';

        const response = await fetch(`${supabaseUrl}/functions/v1/send-password-reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            email: forgotEmail,
            redirectTo: redirectUrl,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (!result.error) {
            sent = true;
          }
        }
      } catch {
        // Edge Function não disponível, fallback abaixo
      }

      // Fallback: método nativo do Supabase
      if (!sent) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
      }

      setResetEmailSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
    } catch (err: any) {
      const msg = err.message || 'Erro ao enviar email de recuperação';
      setError(msg);
      toast({
        title: 'Erro ao enviar email',
        description: msg,
        variant: 'destructive',
      });
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
        await (supabase as any)
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

        {/* ——— TELA DE RECUPERAÇÃO DE SENHA ——— */}
        {showForgotPassword ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Recuperar Senha
              </CardTitle>
              <CardDescription>
                Informe seu email e enviaremos um link para redefinir sua senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-lg font-semibold text-foreground">Email enviado!</h3>
                  <p className="text-muted-foreground text-sm">
                    Verifique sua caixa de entrada (e também o spam) para encontrar o link de redefinição de senha.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setForgotEmail('');
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email">Seu email de cadastro</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar link de recuperação
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError('');
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ——— TELA NORMAL DE LOGIN / CADASTRO ——— */
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
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="signin-password">Senha</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email);
                            setShowForgotPassword(true);
                            setError('');
                          }}
                          className="text-xs text-primary hover:underline focus:outline-none"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
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
        )}
      </div>
    </div>
  );
}