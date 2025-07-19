import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Star } from 'lucide-react';

export function SubscriptionStatus() {
  const { isSubscribed, user } = useAuth();

  if (isSubscribed) {
    return (
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-500">
            Premium Ativo
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="m-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Upgrade para Premium</CardTitle>
        </div>
        <CardDescription>
          Acesso ilimitado à mentora expert em marketing digital
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          <div className="text-sm text-muted-foreground">✓ Conversas ilimitadas</div>
          <div className="text-sm text-muted-foreground">✓ Respostas detalhadas</div>
          <div className="text-sm text-muted-foreground">✓ Suporte prioritário</div>
        </div>
        <Button 
          className="w-full bg-gradient-primary hover:bg-primary-hover"
          onClick={() => {
            // Redirect to payment page or show payment modal
            window.open('https://pay.kiwify.com.br/your-product-link', '_blank');
          }}
        >
          Assinar Premium
        </Button>
      </CardContent>
    </Card>
  );
}