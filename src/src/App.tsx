import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import FormBuilderPage from "@/pages/form-builder-page";
import FormPreviewPage from "@/pages/form-preview-page";
import SubmissionsPage from "@/pages/submissions-page";
import ProfileSettingsPage from "@/pages/profile-settings-page";
import ZapInboxPage from "@/pages/zap-inbox-page";
import BillingPage from "@/pages/billing-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/form/:shareableLink" component={FormPreviewPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/form-builder" component={FormBuilderPage} />
      <ProtectedRoute path="/submissions" component={SubmissionsPage} />
      <ProtectedRoute path="/profile" component={ProfileSettingsPage} />
      <ProtectedRoute path="/zap-inbox" component={ZapInboxPage} />
      <ProtectedRoute path="/billing" component={BillingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
