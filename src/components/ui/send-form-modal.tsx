import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, ExternalLink } from "lucide-react";
import type { Form } from "@shared/schema";

interface SendFormModalProps {
  form: Form;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendFormModal({ form, open, onOpenChange }: SendFormModalProps) {
  const [zapLink, setZapLink] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendFormMutation = useMutation({
    mutationFn: async (zapLink: string) => {
      const response = await apiRequest("POST", `/api/forms/${form.id}/send`, { zapLink });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Form sent successfully!",
        description: `"${form.title}" has been sent to ${data.recipientName} (${zapLink.trim().toUpperCase()})`,
      });
      setZapLink("");
      onOpenChange(false);
      // Optionally refresh any relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/zap-inbox"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message;
      let description = "An error occurred while sending the form";
      
      if (errorMessage?.includes("not found") || errorMessage?.includes("invalid")) {
        description = `Invalid ZapLink "${zapLink.trim().toUpperCase()}". Please check the ZapLink and try again.`;
      } else if (errorMessage) {
        description = errorMessage;
      }
      
      toast({
        title: "Failed to send form",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zapLink.trim()) {
      toast({
        title: "ZapLink required",
        description: "Please enter a ZapLink to send the form",
        variant: "destructive",
      });
      return;
    }
    sendFormMutation.mutate(zapLink.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Form
          </DialogTitle>
          <DialogDescription>
            Send "{form.title}" to another ClientZap user using their ZapLink
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zaplink">Recipient's ZapLink</Label>
            <Input
              id="zaplink"
              data-testid="input-zaplink"
              type="text"
              placeholder="e.g., ABC123 or clientzap.com/zap/ABC123"
              value={zapLink}
              onChange={(e) => setZapLink(e.target.value)}
              disabled={sendFormMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Enter the 6-character ZapLink code or full URL
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendFormMutation.isPending}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendFormMutation.isPending || !zapLink.trim()}
              className="flex-1"
              data-testid="button-send-form"
            >
              {sendFormMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Form
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Want to share your forms publicly instead?
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/form/${form.shareableLink}`, "_blank")}
            className="h-8 text-xs"
            data-testid="button-view-public-link"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Public Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
