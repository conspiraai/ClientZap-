import { Badge } from "@/components/ui/badge";
import { Crown, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function SubscriptionStatus() {
  const { user } = useAuth();

  if (!user) return null;

  const isPro = user.subscriptionType === "pro" && user.subscriptionStatus === "active";
  const isPastDue = user.subscriptionStatus === "past_due";

  if (isPro) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
        <Crown className="h-3 w-3 mr-1" />
        Pro
      </Badge>
    );
  }

  if (isPastDue) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Payment Due
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      Free
    </Badge>
  );
}