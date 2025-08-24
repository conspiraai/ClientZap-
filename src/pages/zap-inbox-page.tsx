import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Inbox, 
  FileText, 
  Users, 
  ArrowLeft,
  ExternalLink,
  User,
  Calendar,
  MessageSquare,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SharedForm, Form, User as UserType } from "@shared/schema";

type SharedFormWithDetails = SharedForm & { form: Form; sender: UserType };

export default function ZapInboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: sharedForms, isLoading } = useQuery<SharedFormWithDetails[]>({
    queryKey: ["/api/zap-inbox"],
    enabled: !!user,
  });

  const deleteSharedFormMutation = useMutation({
    mutationFn: async (sharedFormId: string) => {
      const response = await apiRequest("DELETE", `/api/zap-inbox/${sharedFormId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form deleted",
        description: "The form has been removed from your Zap Inbox",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/zap-inbox"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete form",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-primary mb-8">ClientZap</div>
          <nav className="space-y-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="bg-primary/10 text-primary px-3 py-2 rounded-lg flex items-center">
              <Inbox className="mr-2 h-4 w-4" />
              Zap Inbox
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Inbox className="h-6 w-6" />
                Zap Inbox
              </h1>
              <p className="text-slate-600">Forms shared with you by other ClientZap users</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {sharedForms?.length || 0} forms
            </Badge>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your shared forms...</p>
            </div>
          ) : !sharedForms || sharedForms.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <Inbox className="mx-auto h-20 w-20 text-slate-300 mb-6" />
                <h3 className="text-xl font-semibold text-slate-900 mb-3">You don't have any incoming zaps yet</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  When other ClientZap users send you forms via your ZapLink, they'll appear here for you to fill out.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg max-w-md mx-auto">
                  <p className="text-sm font-medium text-blue-900 mb-3">Share your ZapLink to get started:</p>
                  <div className="font-mono text-sm bg-white p-3 rounded border font-semibold text-slate-800">
                    clientzap.com/zap/{user.zapLink}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3" 
                    onClick={() => {
                      navigator.clipboard.writeText(`clientzap.com/zap/${user.zapLink}`);
                      toast({
                        title: "ZapLink copied!",
                        description: "Share this link with other ClientZap users",
                      });
                    }}
                  >
                    Copy ZapLink
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sharedForms.map((sharedForm) => (
                <Card key={sharedForm.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={sharedForm.sender.profilePicture || undefined} />
                          <AvatarFallback>
                            {(sharedForm.sender.displayName || sharedForm.sender.username)
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{sharedForm.form.title}</CardTitle>
                          <CardDescription>
                            From {sharedForm.sender.displayName || sharedForm.sender.username} • 
                            Sent {formatDistanceToNow(new Date(sharedForm.sentAt), { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={sharedForm.status === "pending" ? "secondary" : "default"}
                          className={
                            sharedForm.status === "pending" 
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {sharedForm.status === "pending" ? "New" : "Viewed"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sharedForm.form.description && (
                        <p className="text-slate-600">{sharedForm.form.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {JSON.parse(sharedForm.form.fields as string).length} fields
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {sharedForm.sender.freelancerType || "Freelancer"}
                        </div>
                        {sharedForm.form.calendlyLink && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Includes scheduling
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Ready to fill out this form?
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/form/${sharedForm.form.shareableLink}`} target="_blank">
                            <Button 
                              className="bg-primary hover:bg-primary/90"
                              data-testid={`button-fill-form-${sharedForm.id}`}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Fill Out Form
                              <ExternalLink className="h-3 w-3 ml-2" />
                            </Button>
                          </Link>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              window.open(`mailto:${sharedForm.sender.email || ''}`, "_blank");
                            }}
                            data-testid={`button-message-sender-${sharedForm.id}`}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Sender
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSharedFormMutation.mutate(sharedForm.id)}
                            disabled={deleteSharedFormMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-shared-form-${sharedForm.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
