import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  Calendar,
  Building,
  User,
  Clock
} from "lucide-react";
import type { Form } from "@shared/schema";

interface FormField {
  id: string;
  type: "text" | "email" | "textarea" | "select" | "radio" | "checkbox";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export default function FormPreviewPage() {
  const [match, params] = useRoute("/form/:shareableLink");
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: form, isLoading } = useQuery<Form>({
    queryKey: ["/api/public/forms", params?.shareableLink],
    queryFn: async () => {
      const response = await fetch(`/api/public/forms/${params?.shareableLink}`);
      if (!response.ok) {
        throw new Error("Form not found");
      }
      return response.json();
    },
    enabled: !!params?.shareableLink,
  });

  const submitFormMutation = useMutation({
    mutationFn: async (submissionData: Record<string, any>) => {
      const response = await fetch(`/api/public/forms/${params?.shareableLink}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });
      if (!response.ok) {
        throw new Error("Failed to submit form");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Form submitted successfully!",
        description: "Thank you for filling out the form.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;
    
    const fields = JSON.parse(form.fields as string) as FormField[];
    
    // Validate required fields
    const missingFields = fields
      .filter(field => field.required && !formData[field.id])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill out: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    submitFormMutation.mutate(formData);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            data-testid={`input-${field.id}`}
          />
        );
      
      case "email":
        return (
          <Input
            type="email"
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            data-testid={`input-${field.id}`}
          />
        );
      
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            rows={4}
            data-testid={`textarea-${field.id}`}
          />
        );
      
      case "select":
        return (
          <Select
            value={formData[field.id] || ""}
            onValueChange={(value) => handleFieldChange(field.id, value)}
          >
            <SelectTrigger data-testid={`select-${field.id}`}>
              <SelectValue placeholder="Choose an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "radio":
        return (
          <RadioGroup
            value={formData[field.id] || ""}
            onValueChange={(value) => handleFieldChange(field.id, value)}
            data-testid={`radio-${field.id}`}
          >
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData[field.id] || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              id={field.id}
              data-testid={`checkbox-${field.id}`}
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Form not found</h3>
            <p className="text-slate-600 mb-6">
              This form may have been removed or the link is invalid.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Form submitted successfully!</h3>
            <p className="text-slate-600 mb-6">
              Thank you for filling out the form. We'll be in touch soon.
            </p>
            {form.calendlyLink && (
              <div className="space-y-4">
                <Separator />
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-3">
                    Want to schedule a call?
                  </p>
                  <Button 
                    onClick={() => window.open(form.calendlyLink!, "_blank")}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields = JSON.parse(form.fields as string) as FormField[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <Card className="shadow-lg border-0 mb-8">
            <CardHeader className="text-center bg-gradient-to-r from-primary to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center justify-center mb-4">
                <Building className="h-8 w-8 mr-3" />
                <span className="text-lg font-semibold">ClientZap</span>
              </div>
              <CardTitle className="text-3xl font-bold">{form.title}</CardTitle>
              {form.description && (
                <CardDescription className="text-blue-100 text-lg">
                  {form.description}
                </CardDescription>
              )}
            </CardHeader>
          </Card>

          {/* Form */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8" data-testid="public-form">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-base font-medium text-slate-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}

                <Separator className="my-8" />

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center text-sm text-slate-500">
                    <Clock className="h-4 w-4 mr-2" />
                    Powered by ClientZap
                  </div>
                  <Button 
                    type="submit" 
                    disabled={submitFormMutation.isPending}
                    className="px-8 py-3 text-lg"
                    data-testid="button-submit-form"
                  >
                    {submitFormMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Submit Form
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
