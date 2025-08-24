import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Crown, Calendar, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface BillingInfo {
  hasSubscription: boolean;
  subscriptionType: string;
  subscriptionStatus: string;
  currentPeriodEnd?: number;
  nextBillDate?: number;
  nextBillAmount?: number;
  cancelAtPeriodEnd?: boolean;
}

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: billing, isLoading } = useQuery<BillingInfo>({
    queryKey: ["/api/billing"],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (priceType: 'monthly' | 'yearly') => {
      const res = await apiRequest("POST", "/api/create-checkout-session", { priceType });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
      setIsUpgrading(false);
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cancel-subscription");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will be cancelled at the end of the current period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reactivate-subscription");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (priceType: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    createCheckoutMutation.mutate(priceType);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading billing information...</div>
      </div>
    );
  }

  const isPro = billing?.subscriptionType === "pro" && billing?.subscriptionStatus === "active";
  const isPending = billing?.subscriptionStatus === "past_due";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Billing & Subscription</h1>
        <p className="text-slate-600">Manage your ClientZap subscription and billing settings</p>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isPro ? <Crown className="h-5 w-5 text-yellow-500" /> : <CreditCard className="h-5 w-5" />}
              Current Plan
            </CardTitle>
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isPro ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Pro Plan - Unlimited Access</span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <div>✅ Unlimited forms and zaps</div>
                  <div>✅ Custom branding</div>
                  <div>✅ Saved contracts</div>
                  <div>✅ Priority support</div>
                </div>
                {billing?.currentPeriodEnd && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {billing.cancelAtPeriodEnd ? "Expires" : "Renews"} on{" "}
                      {formatDate(billing.currentPeriodEnd)}
                    </span>
                  </div>
                )}
                {billing?.nextBillAmount && !billing.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span>Next bill: ${formatCurrency(billing.nextBillAmount)}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Free Plan - Limited Access</span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <div>📝 1 form template</div>
                  <div>⚡ 3 zaps maximum</div>
                  <div>🚫 No custom branding</div>
                  <div>🚫 No saved contracts</div>
                </div>
              </>
            )}

            {isPending && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Payment Issue</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Your subscription payment is past due. Please update your payment method.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Actions */}
      {isPro ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billing?.cancelAtPeriodEnd ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800">
                    Your subscription is set to cancel at the end of the current period.
                  </p>
                </div>
                <Button
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                  data-testid="button-reactivate-subscription"
                >
                  {reactivateSubscriptionMutation.isPending ? "Reactivating..." : "Reactivate Subscription"}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
                data-testid="button-cancel-subscription"
              >
                {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Upgrade Plans */
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Pro Monthly
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">$9</div>
                  <div className="text-sm text-slate-600">per month</div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Unlimited forms & zaps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Custom branding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Saved contracts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Priority support</span>
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade('monthly')}
                  disabled={isUpgrading}
                  data-testid="button-upgrade-monthly"
                >
                  {isUpgrading ? "Redirecting..." : "Upgrade to Pro"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-white">Best Value</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Pro Yearly
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">$90</div>
                  <div className="text-sm text-slate-600">per year</div>
                  <div className="text-xs text-green-600 font-medium">Save $18/year</div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Unlimited forms & zaps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Custom branding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Saved contracts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Priority support</span>
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade('yearly')}
                  disabled={isUpgrading}
                  data-testid="button-upgrade-yearly"
                >
                  {isUpgrading ? "Redirecting..." : "Upgrade to Pro"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
