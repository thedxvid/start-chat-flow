import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Shield, 
  Crown, 
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export function Admin() {
  const { isAdmin, loading, users, makeUserAdmin, fetchUsers } = useAdmin();
  const { toast } = useToast();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [makingAdmin, setMakingAdmin] = useState(false);

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
      toast({
        title: "Erro",
        description: "Digite um email válido",
        variant: "destructive"
      });
      return;
    }

    setMakingAdmin(true);
    const result = await makeUserAdmin(newAdminEmail.trim());
    
    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Usuário promovido a administrador",
      });
      setNewAdminEmail('');
    } else {
      toast({
        title: "Erro",
        description: result.error || "Falha ao promover usuário",
        variant: "destructive"
      });
    }
    
    setMakingAdmin(false);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="text-green-600 bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Sem Assinatura</Badge>;
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

  const adminUsers = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');
  const activeSubscriptions = users.filter(u => u.subscription?.status === 'active');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Painel de Administração</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-2xl font-bold">
                  {users.length > 0 ? Math.round((activeSubscriptions.length / users.length) * 100) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="admins">Administradores</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Usuários</CardTitle>
                <CardDescription>
                  Gerencie todos os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Assinatura</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>{user.profile?.full_name || 'Não informado'}</TableCell>
                          <TableCell>{getStatusBadge(user.subscription?.status)}</TableCell>
                          <TableCell>{getRoleBadge(user.role || 'user')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
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
                <CardTitle>Administradores Atuais</CardTitle>
                <CardDescription>
                  Lista de todos os administradores do sistema
                </CardDescription>
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
      </div>
    </div>
  );
}