import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionLimits {
  maxForms: number;
  maxZaps: number;
  hasCustomBranding: boolean;
  hasSavedContracts: boolean;
  hasMultiFormFlows: boolean;
}

interface UsageStats {
  formsCount: number;
  zapsCount: number;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: usage } = useQuery<UsageStats>({
    queryKey: ["/api/subscription/usage"],
    enabled: !!user,
  });

  const isPro = user?.subscriptionType === "pro" && user?.subscriptionStatus === "active";
  const isPastDue = user?.subscriptionStatus === "past_due";

  const limits: SubscriptionLimits = {
    maxForms: isPro ? Infinity : 1,
    maxZaps: isPro ? Infinity : 3,
    hasCustomBranding: isPro,
    hasSavedContracts: isPro,
    hasMultiFormFlows: isPro,
  };

  const canCreateForm = !usage || usage.formsCount < limits.maxForms;
  const canCreateZap = !usage || usage.zapsCount < limits.maxZaps;

  const getFormLimitText = () => {
    if (isPro) return "Unlimited forms";
    return `${usage?.formsCount || 0}/${limits.maxForms} forms used`;
  };

  const getZapLimitText = () => {
    if (isPro) return "Unlimited zaps";
    return `${usage?.zapsCount || 0}/${limits.maxZaps} zaps used`;
  };

  return {
    user,
    isPro,
    isPastDue,
    limits,
    usage,
    canCreateForm,
    canCreateZap,
    getFormLimitText,
    getZapLimitText,
  };
}