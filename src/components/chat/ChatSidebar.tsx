
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ConversationMenu } from '@/components/conversation/ConversationMenu';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, Clock, Calendar, Star, LogOut, Search, Shield, Crown } from 'lucide-react';
import type { Conversation } from '@/types/chat';

import { useAuth } from '@/hooks/useAuth';

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
  const { signOut, user, isSubscribed, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFavorites = !showFavoritesOnly || conv.isFavorite;
    
    return matchesSearch && matchesFavorites;
  });

  const groupedConversations = groupConversationsByDate(filteredConversations);
  const favoriteCount = conversations.filter(c => c.isFavorite).length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20 border-r border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Start Chat</h1>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button
                onClick={() => navigate('/admin')}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                title="Painel de Administração"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={signOut}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-lg border-0 h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
        
        {/* Search */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 focus:bg-background"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="flex items-center gap-2 h-8"
            >
              <Star className="h-3 w-3" />
              Favoritas
              {favoriteCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {favoriteCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <SubscriptionStatus />

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2">
          {Object.entries(groupedConversations).map(([group, convs]) => {
            if (convs.length === 0) return null;
            
            return (
              <div key={group} className="mb-6">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group === 'Hoje' && <Clock className="h-3 w-3" />}
                  {group === 'Ontem' && <Calendar className="h-3 w-3" />}
                  {group === 'Esta semana' && <Calendar className="h-3 w-3" />}
                  {group === 'Mais antigas' && <MessageCircle className="h-3 w-3" />}
                  {group}
                </div>
                
                <div className="space-y-1">
                  {convs.map(conversation => (
                    <div
                      key={conversation.id}
                      className={`group relative rounded-xl transition-all duration-200 hover:bg-muted/50 ${
                        activeConversationId === conversation.id
                          ? 'bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <button
                          onClick={() => onSelectConversation(conversation.id)}
                          className="flex-1 text-left min-w-0 group"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {conversation.isFavorite && (
                              <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                            )}
                            <h3 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                              {conversation.title}
                            </h3>
                            {activeConversationId === conversation.id && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {conversation.lastMessage}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatTimestamp(conversation.timestamp)}
                            </span>
                            {conversation.messages.length > 0 && (
                              <Badge variant="outline" className="text-xs h-5 px-1.5">
                                {conversation.messages.length}
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
              </div>
            );
          })}
          
          {filteredConversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">
                {searchTerm || showFavoritesOnly ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm ? 'Tente outros termos de busca' : 
                 showFavoritesOnly ? 'Você ainda não tem conversas favoritas' :
                 'Comece uma nova conversa!'}
              </p>
              {!searchTerm && !showFavoritesOnly && (
                <Button 
                  onClick={onNewChat} 
                  className="mt-4"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
