
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuthSimple';
import { Crown } from 'lucide-react';

export function SubscriptionStatus() {
  const { isSubscribed } = useAuth();

  // Only show status if user is subscribed (no upgrade prompt for non-subscribers)
  if (!isSubscribed) {
    return null;
  }

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
