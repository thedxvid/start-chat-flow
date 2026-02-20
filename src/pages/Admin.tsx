import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Users,
  Shield,
  Crown,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  Activity,
  BarChart3,
  UserPlus,
  Settings,
  Wrench,
  ArrowLeft,
  Home,
  Upload,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export function Admin() {
  const navigate = useNavigate();
  const {
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
    cleanupIncompleteUsers,
    bulkCreateUsers
  } = useAdmin();

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [makingAdmin, setMakingAdmin] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportData, setBulkImportData] = useState<Array<{ email: string; fullName: string; role?: string; planType?: string }>>([]);
  const [bulkImportResults, setBulkImportResults] = useState<Array<{ email: string; success: boolean; error?: string }> | null>(null);
  const [bulkImportProgress, setBulkImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Form state for creating new user
  const [newUserData, setNewUserData] = useState({
    email: '',
    fullName: '',
    role: 'user' as 'user' | 'admin',
    planType: 'free' as 'free' | 'premium' | 'pro'
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissões de administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleMakeAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Digite um email válido");
      return;
    }

    setMakingAdmin(true);
    const result = await makeUserAdmin(newAdminEmail.trim());

    if (result.success) {
      toast.success("Usuário promovido a administrador");
      setNewAdminEmail('');
    } else {
      toast.error(result.error || "Falha ao promover usuário");
    }

    setMakingAdmin(false);
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.fullName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setCreatingUser(true);

    try {
      const result = await createUser(newUserData);

      if (result.success) {
        toast.success(result.message || "Usuário criado com sucesso!");
        setNewUserData({
          email: '',
          fullName: '',
          role: 'user',
          planType: 'free'
        });
        setShowCreateUserDialog(false);
      } else {
        toast.error("Falha ao criar usuário");
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro: ${errorMessage}`);
    }

    setCreatingUser(false);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const result = await deleteUser(userId, userEmail);

    if (result.success) {
      toast.success(`Usuário ${userEmail} excluído com sucesso`);
    } else {
      toast.error(result.error || "Falha ao excluir usuário");
    }
  };

  const handleUpdateSubscription = async (userId: string, planType: "free" | "premium" | "pro", userEmail?: string) => {
    const result = await updateUserSubscription(userId, planType, userEmail);

    if (result.success) {
      toast.success("Assinatura atualizada com sucesso");
    } else {
      toast.error(result.error || "Falha ao atualizar assinatura");
    }
  };

  const handleCleanupIncompleteUsers = async () => {
    const result = await cleanupIncompleteUsers();

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error || "Falha na limpeza de usuários");
    }
  };

  // ── Importação em massa ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

        // Mapear colunas (aceita variações de nome)
        const parsed = jsonData.map((row: any) => ({
          email: (row.email || row.Email || row.EMAIL || row['E-mail'] || row['e-mail'] || '').toString().trim(),
          fullName: (row.nome || row.Nome || row.NOME || row.name || row.Name || row.full_name || row.fullName || row['Nome Completo'] || '').toString().trim(),
          role: (row.role || row.Role || row.funcao || row.Funcao || row['Função'] || 'user').toString().trim().toLowerCase() as 'user' | 'admin',
          planType: (row.plano || row.Plano || row.plan || row.Plan || row.planType || row.plan_type || 'free').toString().trim().toLowerCase() as 'free' | 'premium' | 'pro',
        })).filter((u: any) => u.email && u.fullName);

        if (parsed.length === 0) {
          toast.error('Nenhum usuário válido encontrado no arquivo. Verifique se as colunas "email" e "nome" existem.');
          return;
        }

        setBulkImportData(parsed);
        setBulkImportResults(null);
        setBulkImportProgress(0);
        setShowBulkImportDialog(true);
        toast.success(`${parsed.length} usuários encontrados no arquivo`);
      } catch (err) {
        toast.error('Erro ao ler arquivo. Verifique se é um CSV ou XLSX válido.');
        console.error('Erro parsing file:', err);
      }
    };
    reader.readAsBinaryString(file);
    // Reset input para permitir reupload do mesmo arquivo
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    if (bulkImportData.length === 0) return;

    setBulkImporting(true);
    setBulkImportProgress(0);
    setBulkImportResults(null);

    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < bulkImportData.length; i++) {
      const userData = bulkImportData[i];
      try {
        await createUser({
          email: userData.email,
          fullName: userData.fullName,
          role: (userData.role as 'user' | 'admin') || 'user',
          planType: (userData.planType as 'free' | 'premium' | 'pro') || 'free',
        });
        results.push({ email: userData.email, success: true });
      } catch (error: any) {
        results.push({
          email: userData.email,
          success: false,
          error: error.message || 'Erro desconhecido',
        });
      }

      setBulkImportProgress(Math.round(((i + 1) / bulkImportData.length) * 100));
      // Delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    setBulkImportResults(results);
    setBulkImporting(false);
    await fetchUsers();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount === 0) {
      toast.success(`Todos os ${successCount} usuários foram importados com sucesso!`);
    } else {
      toast.warning(`Importação concluída: ${successCount} com sucesso, ${failCount} com erro.`);
    }
  };

  const downloadTemplate = () => {
    const template = 'email,nome,plano,funcao\nexemplo@email.com,Nome Completo,free,user\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_importacao_usuarios.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="text-green-600 bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Gratuito</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge variant="default" className="bg-purple-100 text-purple-800">
        <Crown className="h-3 w-3 mr-1" />Admin
      </Badge>
    ) : (
      <Badge variant="outline">Usuário</Badge>
    );
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const adminUsers = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');
  const activeSubscriptions = users.filter(u => u.subscription?.status === 'active');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Painel de Administração</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button onClick={() => fetchUsers()} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Atualizar Dados
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assinantes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-2xl font-bold">{activeSubscriptions.length}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {users.length > 0 ? Math.round((activeSubscriptions.length / users.length) * 100) : 0}% de conversão
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Crown className="h-4 w-4 text-purple-600 mr-2" />
                <span className="text-2xl font-bold">{adminUsers.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-2xl font-bold">{formatTokens(totalTokenUsage)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-2xl font-bold">{formatCost(totalCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Gerenciar Usuários</TabsTrigger>
            <TabsTrigger value="tokens">Uso de Tokens</TabsTrigger>
            <TabsTrigger value="admins">Administradores</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>
                      Visualize e gerencie todos os usuários do sistema
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botão importar em massa */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Importar em Massa
                    </Button>
                    <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Adicionar Usuário
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Criar Novo Usuário</DialogTitle>
                          <DialogDescription>
                            Adicione um novo usuário ao sistema com as configurações desejadas
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="usuario@exemplo.com"
                              value={newUserData.email}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input
                              id="fullName"
                              placeholder="João Silva"
                              value={newUserData.fullName}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, fullName: e.target.value }))}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="role">Função</Label>
                            <select
                              id="role"
                              value={newUserData.role}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="user">Usuário</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="planType">Plano</Label>
                            <select
                              id="planType"
                              value={newUserData.planType}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, planType: e.target.value as 'free' | 'premium' | 'pro' }))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="free">Gratuito</option>
                              <option value="premium">Premium</option>
                              <option value="pro">Pro</option>
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCreateUser} disabled={creatingUser}>
                            {creatingUser ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Criar Usuário
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Assinatura</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.profile?.full_name || 'Sem nome'}</div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(user.subscription?.status)}
                              {user.subscription?.plan_type && user.subscription.plan_type !== 'free' && (
                                <div className="text-xs text-muted-foreground">
                                  {user.subscription.plan_type}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role || 'user')}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {formatTokens(user.tokenStats?.total_tokens || 0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.tokenStats?.conversation_count || 0} conversas
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {formatCost(user.tokenStats?.total_cost || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <select
                                value={user.subscription?.status || 'inactive'}
                                onChange={(e) => handleUpdateSubscription(user.id, (user.subscription?.plan_type as "free" | "premium" | "pro") || 'premium', user.email)}
                                className="w-24 h-8 text-xs rounded-md border border-input bg-background px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                                <option value="pending">Pendente</option>
                              </select>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o usuário <strong>{user.email}</strong>?
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id, user.email)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Uso de Tokens por Usuário</CardTitle>
                <CardDescription>
                  Monitore o consumo de tokens da API OpenAI por usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Total de Tokens</TableHead>
                        <TableHead>Custo Total</TableHead>
                        <TableHead>Conversas</TableHead>
                        <TableHead>Média por Conversa</TableHead>
                        <TableHead>Último Uso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter(user => user.tokenStats && user.tokenStats.total_tokens > 0)
                        .sort((a, b) => (b.tokenStats?.total_tokens || 0) - (a.tokenStats?.total_tokens || 0))
                        .map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.profile?.full_name || 'Sem nome'}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="font-medium">{formatTokens(user.tokenStats?.total_tokens || 0)}</div>
                                <div className="ml-2 w-20">
                                  <Progress
                                    value={Math.min((user.tokenStats?.total_tokens || 0) / Math.max(totalTokenUsage, 1) * 100, 100)}
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCost(user.tokenStats?.total_cost || 0)}
                            </TableCell>
                            <TableCell>
                              {user.tokenStats?.conversation_count || 0}
                            </TableCell>
                            <TableCell>
                              {formatTokens(user.tokenStats?.avg_tokens_per_conversation || 0)}
                            </TableCell>
                            <TableCell>
                              {user.tokenStats?.last_used_at ?
                                new Date(user.tokenStats.last_used_at).toLocaleDateString('pt-BR') :
                                'Nunca'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Administrador</CardTitle>
                <CardDescription>
                  Promova um usuário existente a administrador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="admin-email">Email do Usuário</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleMakeAdmin}
                      disabled={makingAdmin}
                    >
                      {makingAdmin ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Crown className="h-4 w-4 mr-2" />
                      )}
                      Promover a Admin
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Administradores Atuais</CardTitle>
                    <CardDescription>
                      Lista de todos os administradores do sistema
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleCleanupIncompleteUsers}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Limpar Usuários Incompletos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum administrador encontrado
                    </p>
                  ) : (
                    adminUsers.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Crown className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{admin.profile?.full_name || admin.email}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                            {admin.tokenStats && (
                              <p className="text-xs text-muted-foreground">
                                {formatTokens(admin.tokenStats.total_tokens)} tokens • {formatCost(admin.tokenStats.total_cost)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-purple-100 text-purple-800">
                          Administrador
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Dialog de Importação em Massa ── */}
        <Dialog open={showBulkImportDialog} onOpenChange={(open) => {
          if (!bulkImporting) {
            setShowBulkImportDialog(open);
            if (!open) {
              setBulkImportData([]);
              setBulkImportResults(null);
              setBulkImportProgress(0);
            }
          }
        }}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Importação em Massa de Usuários
              </DialogTitle>
              <DialogDescription>
                Importe usuários a partir de um arquivo CSV ou XLSX. As colunas aceitas são: <strong>email</strong>, <strong>nome</strong>, <strong>plano</strong> (free/premium/pro), <strong>funcao</strong> (user/admin).
              </DialogDescription>
            </DialogHeader>

            {/* Botão de template */}
            <div className="flex items-center gap-2 text-sm">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-3 w-3 mr-1" />
                Baixar template CSV
              </Button>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground text-xs">
                {bulkImportData.length} usuário(s) encontrado(s)
              </span>
            </div>

            {/* Preview da tabela */}
            {bulkImportData.length > 0 && !bulkImportResults && (
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]">#</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Função</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkImportData.map((user, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell className="text-sm">{user.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{user.planType || 'free'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                            {user.role || 'user'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Barra de progresso */}
            {bulkImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Importando usuários...</span>
                  <span className="font-medium">{bulkImportProgress}%</span>
                </div>
                <Progress value={bulkImportProgress} className="h-2" />
              </div>
            )}

            {/* Resultados */}
            {bulkImportResults && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {bulkImportResults.filter(r => r.success).length} sucesso
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    {bulkImportResults.filter(r => !r.success).length} erro(s)
                  </div>
                </div>

                {bulkImportResults.filter(r => !r.success).length > 0 && (
                  <div className="rounded-md border max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkImportResults.filter(r => !r.success).map((result, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{result.email}</TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="text-xs">Erro</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                              {result.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkImportDialog(false);
                  setBulkImportData([]);
                  setBulkImportResults(null);
                }}
                disabled={bulkImporting}
              >
                {bulkImportResults ? 'Fechar' : 'Cancelar'}
              </Button>
              {!bulkImportResults && bulkImportData.length > 0 && (
                <Button onClick={handleBulkImport} disabled={bulkImporting}>
                  {bulkImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Importar {bulkImportData.length} Usuário(s)
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}