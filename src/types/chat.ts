export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  image?: string;
  audio?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  messages: Message[];
  messageCount?: number;
  wordCount?: number;
}

export interface ChatSettings {
  aiPersonality: string;
  creativity: number; // 0-1 (temperature)
  formalMode: boolean;
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'default' | 'purple' | 'green' | 'orange';
  fontSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
}

export interface SearchFilters {
  dateRange: 'all' | 'week' | 'month' | 'year';
  onlyFavorites: boolean;
  sortBy: 'recent' | 'oldest' | 'alphabetical';
}

export interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  totalWords: number;
  favoriteConversations: number;
  averageMessagesPerConversation: number;
  topTopics: string[];
  mostActiveDay: string;
  timeSpentChatting: number; // in minutes
}