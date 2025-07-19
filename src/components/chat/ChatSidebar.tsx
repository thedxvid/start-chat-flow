
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConversationMenu } from '@/components/conversation/ConversationMenu';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MessageCircle, Clock, Calendar, Star, Search, Filter, X, LogOut } from 'lucide-react';
import type { Conversation, SearchFilters } from '@/types/chat';
import { searchInConversations } from '@/utils/chatUtils';

interface ChatSidebarProps {
  conversations: Conversation[];
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  activeConversationId?: string;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onDeleteConversation?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onDuplicateConversation?: (id: string) => void;
}

export function ChatSidebar({ 
  conversations, 
  onNewChat, 
  onSelectConversation, 
  activeConversationId,
  onRenameConversation = () => {},
  onDeleteConversation = () => {},
  onToggleFavorite = () => {},
  onDuplicateConversation = () => {}
}: ChatSidebarProps) {
  const { signOut, user, isSubscribed } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Agora';
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const groupConversationsByDate = (conversations: Conversation[]) => {
    const groups: { [key: string]: Conversation[] } = {
      'Hoje': [],
      'Ontem': [],
      'Esta semana': [],
      'Mais antigas': []
    };

    conversations.forEach(conv => {
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - conv.timestamp.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        groups['Hoje'].push(conv);
      } else if (diffInHours < 48) {
        groups['Ontem'].push(conv);
      } else if (diffInHours < 168) {
        groups['Esta semana'].push(conv);
      } else {
        groups['Mais antigas'].push(conv);
      }
    });

    return groups;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedConversations = groupConversationsByDate(filteredConversations);

  return (
    <div className="flex flex-col h-full bg-chat-sidebar border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Sistema Start</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={onNewChat}
              size="sm"
              className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-elegant"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              onClick={signOut}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Subscription Status */}
      {!isSubscribed && <SubscriptionStatus />}

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedConversations).map(([group, convs]) => {
            if (convs.length === 0) return null;
            
            return (
              <div key={group} className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group === 'Hoje' && <Clock className="h-3 w-3" />}
                  {group === 'Ontem' && <Calendar className="h-3 w-3" />}
                  {group === 'Esta semana' && <Calendar className="h-3 w-3" />}
                  {group === 'Mais antigas' && <MessageCircle className="h-3 w-3" />}
                  {group}
                </div>
                
                {convs.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`group relative w-full rounded-lg transition-all duration-200 mb-1 hover:bg-chat-sidebar-active ${
                      activeConversationId === conversation.id
                        ? 'bg-chat-sidebar-active border-l-4 border-l-primary'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 p-3">
                      <button
                        onClick={() => onSelectConversation(conversation.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {conversation.isFavorite && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                          )}
                          <h3 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                            {conversation.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {conversation.lastMessage}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(conversation.timestamp)}
                          </span>
                          {activeConversationId === conversation.id && (
                            <Badge variant="secondary" className="text-xs">
                              Ativa
                            </Badge>
                          )}
                        </div>
                      </button>
                      
                      {/* Menu de contexto */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <ConversationMenu
                          conversation={conversation}
                          onRename={onRenameConversation}
                          onDelete={onDeleteConversation}
                          onToggleFavorite={onToggleFavorite}
                          onDuplicate={onDuplicateConversation}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          
          {filteredConversations.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {searchTerm ? 'Tente outros termos de busca' : 'Comece uma nova conversa!'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
