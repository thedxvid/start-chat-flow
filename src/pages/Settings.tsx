import { useState } from 'react';
import { useAuth } from '@/hooks/useAuthSimple';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  Shield, 
  Key, 
  Bell, 
  Eye, 
  EyeOff,
  Mail,
  Calendar,
  Crown,
  CreditCard,
  Activity,
  LogOut,
  ArrowLeft,
  Save,
  Trash2,
  Download,
  Upload,
  Settings as SettingsIcon,
  Lock,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export function Settings() {
  const { user, signOut, isAdmin, isSubscribed } = useAuth();
  const navigate = useNavigate();
  
  // Estados para formulários
  const [profileData, setProfileData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    bio: user?.user_metadata?.bio || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    marketingEmails: false,
    theme: 'system' as 'light' | 'dark' | 'system'
  });

  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    preferences: false,
    export: false
  });

  const handleUpdateProfile = async () => {
    setLoading(prev => ({ ...prev, profile: true }));
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName,
          phone: profileData.phone,
          bio: profileData.bio
        }
      });

      if (error) throw error;

      // Atualizar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: profileData.fullName,
          phone: profileData.phone,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const handleExportData = async () => {
    setLoading(prev => ({ ...prev, export: true }));
    
    try {
      // Buscar dados do usuário
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id);

      const { data: tokenUsage } = await supabase
        .from('token_usage')
        .select('*')
        .eq('user_id', user?.id);

      const exportData = {
        user: {
          id: user?.id,
          email: user?.email,
          created_at: user?.created_at,
          metadata: user?.user_metadata
        },
        conversations: conversations || [],
        tokenUsage: tokenUsage || [],
        exportDate: new Date().toISOString()
      };

      // Download do arquivo JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `start-chat-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Aqui você implementaria a lógica de exclusão de conta
      toast.success('Solicitação de exclusão enviada');
    } catch (error) {
      console.error('Erro ao solicitar exclusão:', error);
      toast.error('Erro ao processar solicitação');
    }
  };

  const accountCreatedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A';
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Configurações</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
              <TabsTrigger value="preferences">Preferências</TabsTrigger>
              <TabsTrigger value="account">Conta</TabsTrigger>
            </TabsList>

            {/* Aba Perfil */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Perfil
                  </CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais e de contato.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {profileData.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Alterar Foto
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Formulário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Para alterar o email, entre em contato com o suporte
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">Biografia</Label>
                      <Input
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Conte um pouco sobre você..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleUpdateProfile}
                      disabled={loading.profile}
                    >
                      {loading.profile ? 'Salvando...' : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Segurança */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Segurança da Conta
                  </CardTitle>
                  <CardDescription>
                    Gerencie sua senha e configurações de segurança.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Alterar Senha */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Alterar Senha
                    </h3>

                    <div className="grid grid-cols-1 gap-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Senha Atual</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Digite sua senha atual"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Digite sua nova senha"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirme sua nova senha"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button
                        onClick={handleChangePassword}
                        disabled={loading.password || !passwordData.newPassword || !passwordData.confirmPassword}
                        className="w-full"
                      >
                        {loading.password ? 'Alterando...' : 'Alterar Senha'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Informações de Segurança */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Informações de Segurança
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Último Login</Label>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {lastSignIn}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Status da Conta</Label>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Conta Verificada</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Preferências */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações e Preferências
                  </CardTitle>
                  <CardDescription>
                    Configure como você deseja receber informações e atualizações.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações por Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações importantes por email
                        </p>
                      </div>
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Relatórios Semanais</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba resumos semanais de atividade
                        </p>
                      </div>
                      <Switch
                        checked={preferences.weeklyReports}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, weeklyReports: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Emails de Marketing</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba dicas e novidades sobre produtos
                        </p>
                      </div>
                      <Switch
                        checked={preferences.marketingEmails}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, marketingEmails: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Preferências
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Conta */}
            <TabsContent value="account" className="space-y-6">
              {/* Informações da Conta */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Informações da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ID da Conta</Label>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {user?.id}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Data de Criação</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        {accountCreatedDate}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Plano Atual</Label>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <Badge variant={isSubscribed ? "default" : "secondary"}>
                          {isSubscribed ? "Premium" : "Gratuito"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Conta</Label>
                      <div className="flex items-center gap-2">
                        {isAdmin ? <Crown className="h-4 w-4 text-yellow-500" /> : <User className="h-4 w-4" />}
                        <Badge variant={isAdmin ? "default" : "secondary"}>
                          {isAdmin ? "Administrador" : "Usuário"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exportar Dados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar Dados
                  </CardTitle>
                  <CardDescription>
                    Baixe uma cópia de todos os seus dados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleExportData}
                    disabled={loading.export}
                    variant="outline"
                  >
                    {loading.export ? 'Exportando...' : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Meus Dados
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Zona de Perigo */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Zona de Perigo
                  </CardTitle>
                  <CardDescription>
                    Ações irreversíveis que afetam permanentemente sua conta.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Conta
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Todos os seus dados, conversas e configurações serão permanentemente excluídos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, Excluir Conta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 