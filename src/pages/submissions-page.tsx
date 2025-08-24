import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Download,
  Calendar,
  Mail,
  User,
  Clock,
  FileText,
  ExternalLink
} from "lucide-react";
import type { FormSubmission } from "@shared/schema";

export default function SubmissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: submissions, isLoading } = useQuery<FormSubmission[]>({
    queryKey: ["/api/submissions"],
  });

  const generateContractMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/contract`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contract Generated!",
        description: "PDF contract has been created and is ready for download.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSubmissionData = (data: any) => {
    return Object.entries(data).map(([key, value]) => {
      if (key === 'email' || key === 'name' || key === 'fullName' || key === 'clientName') {
        return null; // Skip these as they're displayed in the header
      }
      return (
        <div key={key} className="space-y-1">
          <p className="text-sm font-medium text-gray-700 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </p>
          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </p>
        </div>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Client Submissions</h1>
          </div>
          
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Client Submissions</h1>
          <Badge variant="secondary" className="ml-auto" data-testid="badge-submissions-count">
            {submissions?.length || 0} Submissions
          </Badge>
        </div>

        {!submissions || submissions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No submissions yet</h2>
              <p className="text-gray-600 mb-6">
                When clients fill out your forms, their submissions will appear here.
              </p>
              <Link href="/form-builder">
                <Button data-testid="button-create-form">
                  Create Your First Form
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6" data-testid="submissions-list">
            {submissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-lg" data-testid={`client-name-${submission.id}`}>
                          {submission.clientName}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span data-testid={`client-email-${submission.id}`}>
                          {submission.clientEmail}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span data-testid={`submission-date-${submission.id}`}>
                          Submitted {formatDate(submission.submittedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {submission.contractGenerated ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Contract Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          No Contract
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <Separator />
                  
                  {/* Form Responses */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Form Responses</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderSubmissionData(submission.submissionData)}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    {submission.contractGenerated && submission.contractUrl ? (
                      <Button 
                        asChild 
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid={`button-download-contract-${submission.id}`}
                      >
                        <a 
                          href={submission.contractUrl} 
                          download 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Contract
                        </a>
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => generateContractMutation.mutate(submission.id)}
                        disabled={generateContractMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid={`button-generate-contract-${submission.id}`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {generateContractMutation.isPending ? "Generating..." : "Generate Contract"}
                      </Button>
                    )}
                    
                    {submission.calendlyLink && (
                      <Button 
                        asChild 
                        variant="outline"
                        data-testid={`button-scheduling-link-${submission.id}`}
                      >
                        <a 
                          href={submission.calendlyLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          View Scheduling Link
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
