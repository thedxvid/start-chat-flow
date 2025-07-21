
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Download, 
  Copy, 
  Star,
  StarOff,
  FileText
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

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== conversation.title) {
      onRename(conversation.id, newTitle.trim());
      toast.success('Conversa renomeada com sucesso!');
    }
    setIsRenameDialogOpen(false);
  };

  const handleDelete = () => {
    onDelete(conversation.id);
    setIsDeleteDialogOpen(false);
  };

  const handleExport = () => {
    try {
      const content = exportConversationAsText(conversation);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Conversa exportada com sucesso!');
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error('Não foi possível exportar a conversa.');
    }
  };

  const handleCopyLastMessage = async () => {
    try {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage) {
        await navigator.clipboard.writeText(lastMessage.content);
        toast.success('Última mensagem copiada!');
      } else {
        toast.error('Nenhuma mensagem encontrada.');
      }
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  const handleToggleFavorite = () => {
    onToggleFavorite(conversation.id);
    toast.success(
      conversation.isFavorite 
        ? 'Removido dos favoritos' 
        : 'Adicionado aos favoritos!'
    );
  };

  const handleDuplicate = () => {
    onDuplicate(conversation.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-muted/50 rounded-lg opacity-70 hover:opacity-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2">
          <DropdownMenuItem 
            onClick={handleToggleFavorite}
            className="rounded-md cursor-pointer"
          >
            {conversation.isFavorite ? (
              <>
                <StarOff className="h-4 w-4 mr-3 text-yellow-500" />
                <span>Remover dos favoritos</span>
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-3 text-yellow-500" />
                <span>Adicionar aos favoritos</span>
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setIsRenameDialogOpen(true)}
            className="rounded-md cursor-pointer"
          >
            <Edit className="h-4 w-4 mr-3 text-blue-500" />
            <span>Renomear conversa</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleDuplicate}
            className="rounded-md cursor-pointer"
          >
            <Copy className="h-4 w-4 mr-3 text-green-500" />
            <span>Duplicar conversa</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2" />
          
          <DropdownMenuItem 
            onClick={handleExport}
            className="rounded-md cursor-pointer"
          >
            <Download className="h-4 w-4 mr-3 text-purple-500" />
            <span>Exportar como TXT</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleCopyLastMessage}
            className="rounded-md cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-3 text-orange-500" />
            <span>Copiar última mensagem</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2" />
          
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive rounded-md cursor-pointer"
          >
            <Trash2 className="h-4 w-4 mr-3" />
            <span>Excluir conversa</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              Renomear Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTitle" className="text-sm font-medium">
                Novo título
              </Label>
              <Input
                id="newTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Digite o novo título..."
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsRenameDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRename}
              disabled={!newTitle.trim() || newTitle === conversation.title}
              className="flex-1"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir Conversa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Tem certeza que deseja excluir a conversa <strong>"{conversation.title}"</strong>?
              <br />
              <br />
              Esta ação é <strong>irreversível</strong> e todos os dados da conversa serão perdidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
