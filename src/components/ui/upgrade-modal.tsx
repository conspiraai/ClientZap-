import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown, CheckCircle, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  trigger: React.ReactNode;
  feature?: string;
}

export function UpgradeModal({ trigger, feature }: UpgradeModalProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

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

  const handleUpgrade = (priceType: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    createCheckoutMutation.mutate(priceType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            {feature 
              ? `To use ${feature}, you need a Pro subscription. Unlock unlimited features and save time.`
              : "Unlock the full power of ClientZap with unlimited features and priority support."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Monthly Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">$9</div>
                  <div className="text-sm text-slate-600">per month</div>
                </div>
                
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
                  data-testid="modal-button-upgrade-monthly"
                >
                  {isUpgrading ? "Redirecting..." : "Choose Monthly"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="border-primary relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-white text-xs">Best Value</Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Yearly Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">$90</div>
                  <div className="text-sm text-slate-600">per year</div>
                  <div className="text-xs text-green-600 font-medium">Save $18/year</div>
                </div>
                
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
                  data-testid="modal-button-upgrade-yearly"
                >
                  {isUpgrading ? "Redirecting..." : "Choose Yearly"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-900">30-day money-back guarantee</div>
              <div className="text-blue-700">
                Try Pro risk-free. If you're not satisfied within 30 days, we'll refund your money.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
