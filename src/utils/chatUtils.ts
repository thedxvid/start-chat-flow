
import type { Conversation, Message } from '@/types/chat';

export const generateConversationTitle = (firstMessage: string): string => {
  // Remove excessive whitespace and limit length
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  
  // If message is short enough, use it as title
  if (cleaned.length <= 50) {
    return cleaned;
  }
  
  // Find a good breaking point (sentence end, question mark, etc.)
  const breakPoints = ['. ', '? ', '! '];
  for (const breakPoint of breakPoints) {
    const index = cleaned.indexOf(breakPoint);
    if (index > 20 && index <= 45) {
      return cleaned.substring(0, index + 1).trim();
    }
  }
  
  // If no good break point, just truncate at word boundary
  const truncated = cleaned.substring(0, 47);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

export const searchInConversations = (
  conversations: Conversation[],
  searchTerm: string
): Conversation[] => {
  if (!searchTerm.trim()) {
    return conversations;
  }

  const term = searchTerm.toLowerCase();
  
  return conversations.filter(conv => {
    // Search in title
    if (conv.title.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in last message
    if (conv.lastMessage.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in all messages content
    return conv.messages.some(message => 
      message.content.toLowerCase().includes(term)
    );
  });
};

export const exportConversationAsText = (conversation: Conversation): string => {
  const header = `Conversa: ${conversation.title}\nData: ${conversation.createdAt.toLocaleDateString('pt-BR')}\n${'='.repeat(50)}\n\n`;
  
  const messages = conversation.messages.map(message => {
    const sender = message.sender === 'user' ? 'Você' : 'Mentora';
    const timestamp = new Date(message.timestamp).toLocaleString('pt-BR');
    return `[${timestamp}] ${sender}:\n${message.content}\n`;
  }).join('\n');
  
  return header + messages;
};

export const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatConversationDate = (date: Date): string => {
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
