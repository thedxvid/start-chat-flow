export const defaultChatSettings = {
  aiPersonality: 'Você é uma mentora IA amigável e prestativa, especializada em ajudar pessoas a alcançar seus objetivos pessoais e profissionais. Seja empática, motivacional e ofereça conselhos práticos.',
  creativity: 0.7,
  formalMode: false,
  theme: 'system' as const,
  colorScheme: 'default' as const,
  fontSize: 'medium' as const,
  soundEnabled: true,
};

export const quickSuggestions = [
  'Como posso melhorar minha produtividade?',
  'Quais são as melhores práticas para networking?',
  'Como criar um plano de carreira efetivo?',
  'Dicas para equilibrar vida pessoal e profissional',
  'Como desenvolver habilidades de liderança?',
  'Estratégias para lidar com o estresse no trabalho',
  'Como definir e alcançar metas de vida?',
  'Dicas para melhorar a comunicação interpessoal',
];

export const colorSchemes = {
  default: {
    primary: '175 60% 45%',
    accent: '200 50% 50%',
    name: 'Azul Verdejante',
  },
  purple: {
    primary: '268 75% 60%',
    accent: '280 65% 55%',
    name: 'Violeta Real',
  },
  green: {
    primary: '142 70% 45%',
    accent: '160 55% 50%',
    name: 'Verde Esmeralda',
  },
  orange: {
    primary: '25 85% 60%',
    accent: '35 75% 55%',
    name: 'Laranja Energético',
  },
};

export function generateConversationTitle(firstMessage: string): string {
  const title = firstMessage.substring(0, 50);
  return title.length < firstMessage.length ? `${title}...` : title;
}

export function calculateWordCount(messages: Message[]): number {
  return messages.reduce((count, message) => {
    return count + message.content.split(/\s+/).filter(word => word.length > 0).length;
  }, 0);
}

export function exportConversationAsText(conversation: Conversation): string {
  let output = `=== ${conversation.title} ===\n`;
  output += `Criada em: ${conversation.createdAt.toLocaleString('pt-BR')}\n`;
  output += `Atualizada em: ${conversation.updatedAt.toLocaleString('pt-BR')}\n\n`;

  conversation.messages.forEach((message, index) => {
    const timestamp = message.timestamp.toLocaleString('pt-BR');
    const sender = message.sender === 'user' ? 'Você' : 'IA';
    output += `[${timestamp}] ${sender}:\n${message.content}\n\n`;
  });

  return output;
}

export function searchInConversations(
  conversations: Conversation[], 
  query: string,
  filters: SearchFilters
): Conversation[] {
  if (!query.trim() && !filters.onlyFavorites) {
    return filterAndSortConversations(conversations, filters);
  }

  const searchTerms = query.toLowerCase().split(/\s+/);
  
  const filteredConversations = conversations.filter(conv => {
    // Apply favorite filter
    if (filters.onlyFavorites && !conv.isFavorite) {
      return false;
    }

    // Apply date filter
    if (!isWithinDateRange(conv.updatedAt, filters.dateRange)) {
      return false;
    }

    // Apply search query
    if (query.trim()) {
      const titleMatch = searchTerms.some(term => 
        conv.title.toLowerCase().includes(term)
      );
      
      const messageMatch = conv.messages.some(message =>
        searchTerms.some(term => 
          message.content.toLowerCase().includes(term)
        )
      );

      return titleMatch || messageMatch;
    }

    return true;
  });

  return sortConversations(filteredConversations, filters.sortBy);
}

function filterAndSortConversations(conversations: Conversation[], filters: SearchFilters): Conversation[] {
  let filtered = conversations.filter(conv => {
    if (filters.onlyFavorites && !conv.isFavorite) {
      return false;
    }
    return isWithinDateRange(conv.updatedAt, filters.dateRange);
  });

  return sortConversations(filtered, filters.sortBy);
}

function isWithinDateRange(date: Date, range: string): boolean {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  switch (range) {
    case 'week':
      return diffInDays <= 7;
    case 'month':
      return diffInDays <= 30;
    case 'year':
      return diffInDays <= 365;
    default:
      return true;
  }
}

function sortConversations(conversations: Conversation[], sortBy: string): Conversation[] {
  switch (sortBy) {
    case 'oldest':
      return [...conversations].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    case 'alphabetical':
      return [...conversations].sort((a, b) => a.title.localeCompare(b.title));
    default: // 'recent'
      return [...conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

import type { Message, Conversation, SearchFilters } from '@/types/chat';