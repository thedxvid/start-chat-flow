import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  MessageSquare, 
  Star, 
  Clock,
  Hash,
  Target,
  Calendar,
  Award
} from 'lucide-react';
import type { ChatStats, Conversation } from '@/types/chat';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
}

export function StatsModal({ isOpen, onClose, conversations }: StatsModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  const calculateStats = (): ChatStats => {
    const now = new Date();
    const filteredConversations = conversations.filter(conv => {
      if (selectedPeriod === 'all') return true;
      
      const diffInDays = Math.floor((now.getTime() - conv.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (selectedPeriod === 'week') return diffInDays <= 7;
      if (selectedPeriod === 'month') return diffInDays <= 30;
      return true;
    });

    const totalMessages = filteredConversations.reduce((acc, conv) => acc + conv.messages.length, 0);
    const totalWords = filteredConversations.reduce((acc, conv) => {
      return acc + conv.messages.reduce((wordAcc, msg) => {
        return wordAcc + msg.content.split(/\s+/).filter(word => word.length > 0).length;
      }, 0);
    }, 0);

    const favoriteConversations = filteredConversations.filter(conv => conv.isFavorite).length;
    const averageMessages = totalMessages / Math.max(filteredConversations.length, 1);

    // Extract topics (simplified - first 3 words of conversation titles)
    const topTopics = filteredConversations
      .map(conv => conv.title.split(' ').slice(0, 3).join(' '))
      .reduce((acc: Record<string, number>, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});

    const sortedTopics = Object.entries(topTopics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    // Calculate most active day
    const dayActivity = filteredConversations.reduce((acc: Record<string, number>, conv) => {
      const day = conv.updatedAt.toLocaleDateString('pt-BR', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const mostActiveDay = Object.entries(dayActivity)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalConversations: filteredConversations.length,
      totalMessages,
      totalWords,
      favoriteConversations,
      averageMessagesPerConversation: Math.round(averageMessages * 10) / 10,
      topTopics: sortedTopics,
      mostActiveDay,
      timeSpentChatting: Math.round(totalMessages * 2) // Estimate 2 minutes per message
    };
  };

  const stats = calculateStats();

  const activityData = conversations.slice(0, 7).map((conv, index) => ({
    day: conv.updatedAt.toLocaleDateString('pt-BR', { weekday: 'short' }),
    messages: conv.messages.length,
    conversations: 1
  }));

  const topicsData = stats.topTopics.slice(0, 4).map((topic, index) => ({
    name: topic,
    value: conversations.filter(conv => conv.title.includes(topic)).length,
    color: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'][index]
  }));

  const periodLabels = {
    week: 'Última semana',
    month: 'Último mês',
    all: 'Todo período'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas do Chat
          </DialogTitle>
          <DialogDescription>
            Análise detalhada de suas conversas e atividade
          </DialogDescription>
        </DialogHeader>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {Object.entries(periodLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedPeriod === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <Badge variant="secondary" className="text-xs">
                {stats.totalConversations}
              </Badge>
            </div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Conversas
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Hash className="h-5 w-5 text-green-600 dark:text-green-400" />
              <Badge variant="secondary" className="text-xs">
                {stats.totalMessages}
              </Badge>
            </div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Mensagens
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <Badge variant="secondary" className="text-xs">
                {stats.favoriteConversations}
              </Badge>
            </div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Favoritas
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <Badge variant="secondary" className="text-xs">
                {stats.timeSpentChatting}min
              </Badge>
            </div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Tempo
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Atividade Recente
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topics Distribution */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Tópicos Populares
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                  >
                    {topicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {topicsData.map((topic, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: topic.color }}
                  />
                  <span className="truncate">{topic.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.averageMessagesPerConversation}
            </p>
            <p className="text-sm text-muted-foreground">
              Mensagens por conversa
            </p>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.totalWords.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-muted-foreground">
              Palavras escritas
            </p>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.mostActiveDay}
            </p>
            <p className="text-sm text-muted-foreground">
              Dia mais ativo
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}