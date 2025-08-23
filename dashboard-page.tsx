import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  Users, 
  Edit, 
  FileText, 
  Settings, 
  Plus, 
  Bell,
  Calendar,
  MessageSquare,
  TrendingUp,
  Copy,
  ExternalLink,
  Send,
  Inbox,
  CreditCard,
  Crown
} from "lucide-react";
import { SendFormModal } from "@/components/send-form-modal";
import type { Client, Form } from "@shared/schema";
import { useState } from "react";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [sendFormOpen, setSendFormOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  // Fetch zapLink data
  const { data: zapLinkData } = useQuery<{ zapLink: string; fullUrl: string }>({
    queryKey: ["/api/user/zaplink"],
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: forms, isLoading: formsLoading } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
  });

  const sendContractMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest("POST", "/api/integrations/docusign/send-contract", {
        clientId,
        contractData: { template: "standard" }
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Contract sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scheduleCallMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest("POST", "/api/integrations/calendly/schedule", { clientId });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Call scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      signed: "default",
      sent: "secondary",
      not_sent: "outline",
      scheduled: "default",
      not_scheduled: "outline",
    };
    
    const colors: Record<string, string> = {
      completed: "bg-emerald-100 text-emerald-800",
      pending: "bg-amber-100 text-amber-800",
      signed: "bg-blue-100 text-blue-800",
      sent: "bg-blue-100 text-blue-800",
      not_sent: "bg-slate-100 text-slate-800",
      scheduled: "bg-purple-100 text-purple-800",
      not_scheduled: "bg-slate-100 text-slate-800",
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const handleSendForm = (form: Form) => {
    setSelectedForm(form);
    setSendFormOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-primary mb-8">ClientZap</div>
          <nav className="space-y-2">
            <Link href="/dashboard">
              <a className="flex items-center px-4 py-3 text-primary bg-blue-50 rounded-lg font-medium">
                <Home className="mr-3 h-4 w-4" />
                Overview
              </a>
            </Link>
            <Link href="/form-builder">
              <a className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium" data-testid="link-form-builder">
                <Edit className="mr-3 h-4 w-4" />
                Form Builder
              </a>
            </Link>
            <Link href="/submissions">
              <a className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium" data-testid="link-submissions">
                <FileText className="mr-3 h-4 w-4" />
                Client Submissions
              </a>
            </Link>
            <Link href="/zap-inbox">
              <a className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium" data-testid="link-zap-inbox">
                <Inbox className="mr-3 h-4 w-4" />
                Zap Inbox
              </a>
            </Link>
            <Link href="/billing">
              <a className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium" data-testid="link-billing">
                {user?.subscriptionType === "pro" ? (
                  <CreditCard className="mr-3 h-4 w-4" />
                ) : (
                  <Crown className="mr-3 h-4 w-4 text-yellow-500" />
                )}
                {user?.subscriptionType === "pro" ? "Billing" : "Upgrade"}
              </a>
            </Link>
            {/* Commented out sidebar items as requested */}
            {/* <a href="#" className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium">
              <Users className="mr-3 h-4 w-4" />
              Clients
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium">
              <FileText className="mr-3 h-4 w-4" />
              Contracts
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg font-medium">
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </a> */}
          </nav>
        </div>
        <div className="absolute bottom-0 w-64 p-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <Link href="/profile" className="flex items-center hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback>{(user?.displayName || user?.username)?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="font-medium text-slate-900" data-testid="text-username">
                  {user?.displayName || user?.username}
                </div>
                <div className="text-sm text-slate-500">
                  {user?.freelancerType || "Freelancer"}
                </div>
              </div>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
              <p className="text-slate-600">Welcome back! Here's what's happening with your clients.</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/form-builder">
                <Button data-testid="button-create-form">
                  <Plus className="mr-2 h-4 w-4" />
                  Send New Form
                </Button>
              </Link>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Simple Overview Card with Fake Stats */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Edit className="text-white h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-forms-created">2</p>
                  <p className="text-sm font-medium text-slate-600">Forms Created</p>
                </div>
                
                <div className="text-center p-6 bg-emerald-50 rounded-lg">
                  <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="text-white h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-clients-onboarded">5</p>
                  <p className="text-sm font-medium text-slate-600">Clients Onboarded</p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-white h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900" data-testid="stat-last-activity">Aug 6, 2025</p>
                  <p className="text-sm font-medium text-slate-600">Last Activity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ZapLink Card */}
          <Card className="mb-8 border-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-primary">
                <ExternalLink className="h-5 w-5" />
                <span>Your Zap Link</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Share this permanent link with clients to access your branded intake forms and onboarding process.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-lg font-mono text-sm text-slate-800 break-all">
                    {zapLinkData?.fullUrl || `clientzap.com/zap/${user?.zapLink || "loading..."}`}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const url = zapLinkData?.fullUrl || `clientzap.com/zap/${user?.zapLink || ""}`;
                      navigator.clipboard.writeText(url);
                      toast({
                        title: "✅ Zap Link copied!",
                        description: "Your permanent client link is ready to share",
                      });
                    }}
                    data-testid="button-copy-zaplink-dashboard"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/70 border border-primary/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Ready to Share
                    </p>
                    <p className="text-xs text-slate-600">
                      This link never changes and leads clients through your branded flow
                    </p>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {user?.zapLink || "Generating..."}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Forms Section */}
          {forms && forms.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Your Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{form.title}</h3>
                        <p className="text-sm text-slate-600">{form.description || "No description"}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={form.isPublished ? "default" : "secondary"}>
                            {form.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendForm(form)}
                          data-testid={`button-send-form-${form.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                        <Link href={`/form-builder?edit=${form.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-edit-form-${form.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/form/${form.shareableLink}`;
                            navigator.clipboard.writeText(url);
                            toast({
                              title: "✅ Form link copied!",
                              description: "Share this link with your clients",
                            });
                          }}
                          data-testid={`button-copy-form-${form.id}`}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Edit className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 mb-6">Ready to onboard your next client?</p>
                <Link href="/form-builder">
                  <Button className="mr-4" data-testid="button-create-form-action">
                    Create New Form
                  </Button>
                </Link>
                <Button variant="outline" disabled>
                  View Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Send Form Modal */}
      {selectedForm && (
        <SendFormModal
          form={selectedForm}
          open={sendFormOpen}
          onOpenChange={setSendFormOpen}
        />
      )}
    </div>
  );
}
