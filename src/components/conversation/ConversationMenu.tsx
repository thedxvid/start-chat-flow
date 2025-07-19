import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Download, 
  Copy, 
  Star,
  StarOff
} from 'lucide-react';
import type { Conversation } from '@/types/chat';
import { exportConversationAsText } from '@/utils/chatUtils';

interface ConversationMenuProps {
  conversation: Conversation;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function ConversationMenu({ 
  conversation, 
  onRename, 
  onDelete, 
  onToggleFavorite,
  onDuplicate 
}: ConversationMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);
  const { toast } = useToast();

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== conversation.title) {
      onRename(conversation.id, newTitle.trim());
      toast({
        title: 'Conversa renomeada',
        description: 'O título foi atualizado com sucesso.',
      });
    }
    setIsRenameDialogOpen(false);
  };

  const handleDelete = () => {
    onDelete(conversation.id);
    setIsDeleteDialogOpen(false);
    toast({
      title: 'Conversa excluída',
      description: 'A conversa foi movida para a lixeira.',
    });
  };

  const handleExport = () => {
    try {
      const content = exportConversationAsText(conversation);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Conversa exportada',
        description: 'O arquivo foi baixado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar a conversa.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLastMessage = () => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      navigator.clipboard.writeText(lastMessage.content);
      toast({
        title: 'Mensagem copiada',
        description: 'A última mensagem foi copiada para a área de transferência.',
      });
    }
  };

  const handleToggleFavorite = () => {
    onToggleFavorite(conversation.id);
    toast({
      title: conversation.isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
      description: conversation.isFavorite 
        ? 'A conversa foi removida dos seus favoritos.'
        : 'A conversa foi adicionada aos seus favoritos.',
    });
  };

  const handleDuplicate = () => {
    onDuplicate(conversation.id);
    toast({
      title: 'Conversa duplicada',
      description: 'Uma nova conversa foi criada com o mesmo contexto.',
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleToggleFavorite}>
            {conversation.isFavorite ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Remover dos favoritos
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Adicionar aos favoritos
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Renomear
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar conversa
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar como TXT
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleCopyLastMessage}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar última mensagem
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newTitle">Novo título</Label>
              <Input
                id="newTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Digite o novo título..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRename}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conversa "{conversation.title}"? 
              Esta ação pode ser desfeita através da lixeira por 30 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}