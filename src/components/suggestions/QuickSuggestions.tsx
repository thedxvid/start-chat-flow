import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight } from 'lucide-react';

interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
  className?: string;
}

const suggestions = [
  {
    category: 'Produtividade',
    items: [
      'Como posso melhorar minha produtividade diária?',
      'Técnicas eficazes de gestão de tempo',
      'Como eliminar distrações no trabalho?',
    ]
  },
  {
    category: 'Carreira',
    items: [
      'Como criar um plano de carreira efetivo?',
      'Dicas para networking profissional',
      'Como negociar um aumento salarial?',
    ]
  },
  {
    category: 'Desenvolvimento Pessoal',
    items: [
      'Como desenvolver autoconfiança?',
      'Estratégias para lidar com ansiedade',
      'Como definir e alcançar metas pessoais?',
    ]
  },
  {
    category: 'Liderança',
    items: [
      'Como desenvolver habilidades de liderança?',
      'Técnicas de comunicação assertiva',
      'Como motivar uma equipe eficazmente?',
    ]
  }
];

export function QuickSuggestions({ onSelectSuggestion, className = '' }: QuickSuggestionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSuggestionClick = (suggestion: string) => {
    onSelectSuggestion(suggestion);
  };

  return (
    <div className={`p-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Como posso ajudar você hoje?
          </h2>
          <p className="text-muted-foreground">
            Selecione uma das sugestões abaixo ou digite sua própria pergunta
          </p>
        </div>

        {!selectedCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((category) => (
              <button
                key={category.category}
                onClick={() => setSelectedCategory(category.category)}
                className="p-6 bg-card border border-border rounded-lg hover:bg-accent/50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {category.category}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {category.items.length} sugestões disponíveis
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {category.items.slice(0, 2).map((item, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {item.split('?')[0].substring(0, 15)}...
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Voltar às categorias
              </Button>
              <Badge variant="outline">{selectedCategory}</Badge>
            </div>

            <div className="grid gap-3">
              {suggestions
                .find(cat => cat.category === selectedCategory)
                ?.items.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-4 bg-card border border-border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {suggestion}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Ou comece digitando sua pergunta no campo abaixo
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="text-xs">
              💡 Dica: Seja específico para respostas mais precisas
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}