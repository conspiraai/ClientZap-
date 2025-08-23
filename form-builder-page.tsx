import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft,
  Edit,
  Mail,
  AlignLeft,
  List,
  Circle,
  CheckSquare,
  Plus,
  Eye,
  Save,
  Send,
  Trash,
  GripVertical,
  MoreVertical
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

const fieldTypes = [
  { type: "text" as const, icon: Edit, label: "Text Input" },
  { type: "email" as const, icon: Mail, label: "Email" },
  { type: "textarea" as const, icon: AlignLeft, label: "Text Area" },
  { type: "select" as const, icon: List, label: "Dropdown" },
  { type: "radio" as const, icon: Circle, label: "Radio" },
  { type: "checkbox" as const, icon: CheckSquare, label: "Checkbox" },
];

export default function FormBuilderPage() {
  const { toast } = useToast();
  const [formTitle, setFormTitle] = useState("Client Intake Form");
  const [formDescription, setFormDescription] = useState("Please fill out this form so we can better understand your project needs.");
  const [calendlyLink, setCalendlyLink] = useState("");
  const [fields, setFields] = useState<FormField[]>([
    {
      id: "1",
      type: "text",
      label: "Full Name",
      placeholder: "Enter your full name",
      required: true,
    },
    {
      id: "2",
      type: "email",
      label: "Email Address",
      placeholder: "your@email.com",
      required: true,
    },
    {
      id: "3",
      type: "select",
      label: "Project Budget",
      required: false,
      options: ["Under $5,000", "$5,000 - $10,000", "$10,000 - $25,000", "$25,000+"],
    },
    {
      id: "4",
      type: "textarea",
      label: "Project Description",
      placeholder: "Tell us about your project...",
      required: false,
    },
  ]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const { data: forms } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
  });

  const createFormMutation = useMutation({
    mutationFn: async (formData: { title: string; description: string; fields: FormField[]; isPublished: boolean; calendlyLink?: string }) => {
      const res = await apiRequest("POST", "/api/forms", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Form ${data.isPublished ? 'published' : 'saved as draft'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setShowSaveConfirm(false);
      setShowPublishConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setShowSaveConfirm(false);
      setShowPublishConfirm(false);
    },
  });

  const updateFormMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string, formData: { title: string; description: string; fields: FormField[]; isPublished: boolean; calendlyLink?: string } }) => {
      const res = await apiRequest("PUT", `/api/forms/${id}`, formData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Form updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setEditingFormId(null);
      // Reset form builder to default state
      setFormTitle("Client Intake Form");
      setFormDescription("Please fill out this form so we can better understand your project needs.");
      setCalendlyLink("");
      setFields([
        {
          id: "1",
          type: "text",
          label: "Full Name",
          placeholder: "Enter your full name",
          required: true,
        },
        {
          id: "2",
          type: "email",
          label: "Email Address",
          placeholder: "your@email.com",
          required: true,
        },
        {
          id: "3",
          type: "select",
          label: "Project Budget",
          required: false,
          options: ["Under $5,000", "$5,000 - $10,000", "$10,000 - $25,000", "$25,000+"],
        },
        {
          id: "4",
          type: "textarea",
          label: "Project Description",
          placeholder: "Tell us about your project...",
          required: false,
        },
      ]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const res = await apiRequest("DELETE", `/api/forms/${formId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Form deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setShowDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setShowDeleteConfirm(null);
    },
  });

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `New ${type} field`,
      placeholder: type === "select" ? undefined : `Enter ${type === "email" ? "email" : "text"}`,
      required: false,
      options: type === "select" || type === "radio" ? ["Option 1", "Option 2"] : undefined,
    };
    setFields([...fields, newField]);
    setEditingField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => field.id === id ? { ...field, ...updates } : field));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    setEditingField(null);
  };

  const saveForm = (isPublished: boolean = false) => {
    const formData = {
      title: formTitle,
      description: formDescription,
      fields,
      isPublished,
      calendlyLink: calendlyLink.trim() || undefined,
    };

    if (editingFormId) {
      updateFormMutation.mutate({ id: editingFormId, formData });
    } else {
      createFormMutation.mutate(formData);
    }
  };

  const loadFormForEditing = (form: Form) => {
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormDescription(form.description || "");
    setCalendlyLink(form.calendlyLink || "");
    setFields(form.fields as FormField[]);
    setEditingField(null);
    toast({
      title: "Form Loaded",
      description: "Form loaded for editing. Make your changes and save.",
    });
  };

  const cancelEditing = () => {
    setEditingFormId(null);
    setFormTitle("Client Intake Form");
    setFormDescription("Please fill out this form so we can better understand your project needs.");
    setCalendlyLink("");
    setFields([
      {
        id: "1",
        type: "text",
        label: "Full Name",
        placeholder: "Enter your full name",
        required: true,
      },
      {
        id: "2",
        type: "email",
        label: "Email Address",
        placeholder: "your@email.com",
        required: true,
      },
      {
        id: "3",
        type: "select",
        label: "Project Budget",
        required: false,
        options: ["Under $5,000", "$5,000 - $10,000", "$10,000 - $25,000", "$25,000+"],
      },
      {
        id: "4",
        type: "textarea",
        label: "Project Description",
        placeholder: "Tell us about your project...",
        required: false,
      },
    ]);
    setEditingField(null);
  };

  const renderFieldPreview = (field: FormField) => {
    const isEditing = editingField === field.id;

    if (isEditing) {
      return (
        <div className="space-y-4 p-4 border-2 border-primary rounded-lg bg-blue-50">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-slate-900">Edit Field</h4>
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => setEditingField(null)} data-testid={`button-save-field-${field.id}`}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => removeField(field.id)} data-testid={`button-remove-field-${field.id}`}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Field Label</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              data-testid={`input-field-label-${field.id}`}
            />
          </div>
          {field.type !== "select" && field.type !== "radio" && (
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ""}
                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                data-testid={`input-field-placeholder-${field.id}`}
              />
            </div>
          )}
          {(field.type === "select" || field.type === "radio") && (
            <div>
              <Label>Options (one per line)</Label>
              <Textarea
                value={field.options?.join("\n") || ""}
                onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").filter(o => o.trim()) })}
                data-testid={`textarea-field-options-${field.id}`}
              />
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`required-${field.id}`}
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
              data-testid={`checkbox-field-required-${field.id}`}
            />
            <Label htmlFor={`required-${field.id}`}>Required field</Label>
          </div>
        </div>
      );
    }

    return (
      <div className="form-field-wrapper group relative" data-testid={`field-preview-${field.id}`}>
        <Label className="block text-sm font-medium text-slate-700 mb-2">
          {field.label} {field.required && "*"}
        </Label>
        {field.type === "text" && (
          <Input 
            placeholder={field.placeholder}
            className="w-full"
            disabled
          />
        )}
        {field.type === "email" && (
          <Input 
            type="email"
            placeholder={field.placeholder}
            className="w-full"
            disabled
          />
        )}
        {field.type === "textarea" && (
          <Textarea 
            rows={4}
            placeholder={field.placeholder}
            className="w-full"
            disabled
          />
        )}
        {field.type === "select" && (
          <Select disabled>
            <SelectTrigger className="w-full">
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
        )}
        {field.type === "radio" && (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="radio" name={field.id} disabled />
                <label>{option}</label>
              </div>
            ))}
          </div>
        )}
        {field.type === "checkbox" && (
          <div className="flex items-center space-x-2">
            <input type="checkbox" disabled />
            <label>{field.label}</label>
          </div>
        )}
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setEditingField(field.id)}
            data-testid={`button-edit-field-${field.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar with form elements */}
      <div className="w-80 bg-white shadow-lg border-r border-slate-200">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-6">Form Builder</h2>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Elements</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {fieldTypes.map((fieldType) => (
                <button
                  key={fieldType.type}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors"
                  onClick={() => addField(fieldType.type)}
                  data-testid={`button-add-${fieldType.type}-field`}
                >
                  <fieldType.icon className="text-slate-400 text-xl mb-2 mx-auto h-6 w-6" />
                  <div className="text-sm font-medium text-slate-600">{fieldType.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form Canvas */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-sm border border-slate-200 mb-6">
              <CardHeader className="text-center">
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-3xl font-bold text-center border-none text-slate-900 text-center"
                  data-testid="input-form-title"
                />
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="text-center border-none text-slate-600 resize-none"
                  rows={2}
                  data-testid="textarea-form-description"
                />
                
                {/* Calendly Scheduling Section */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                  <Label htmlFor="calendly-link" className="text-sm font-medium text-slate-700">
                    Calendly Scheduling Link (Optional)
                  </Label>
                  <Input
                    id="calendly-link"
                    value={calendlyLink}
                    onChange={(e) => setCalendlyLink(e.target.value)}
                    placeholder="https://calendly.com/your-link"
                    className="mt-2"
                    data-testid="input-calendly-link"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Add your Calendly link to show booking option after form submission
                  </p>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-6 min-h-96" data-testid="form-canvas">
                  {fields.map((field) => (
                    <div key={field.id}>
                      {renderFieldPreview(field)}
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-400 hover:border-primary hover:text-primary transition-colors">
                      <Plus className="text-2xl mb-2 mx-auto h-8 w-8" />
                      <div>Drag elements here or click to add new field</div>
                    </div>
                  )}
                </div>

                <Separator className="my-8" />

                {/* Form Actions */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPreviewModal(true)}
                      data-testid="button-preview-form"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Form
                    </Button>
                    {editingFormId && (
                      <Button 
                        variant="outline" 
                        onClick={cancelEditing}
                        data-testid="button-cancel-editing"
                      >
                        Cancel Editing
                      </Button>
                    )}
                  </div>
                  <div className="space-x-3">
                    <Button 
                      variant="outline"
                      onClick={() => setShowSaveConfirm(true)}
                      disabled={createFormMutation.isPending || updateFormMutation.isPending}
                      data-testid="button-save-draft"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {editingFormId ? "Update Form" : "Save Draft"}
                    </Button>
                    <Button 
                      onClick={() => setShowPublishConfirm(true)}
                      disabled={createFormMutation.isPending || updateFormMutation.isPending}
                      data-testid="button-publish-form"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {(createFormMutation.isPending || updateFormMutation.isPending) ? "Processing..." : editingFormId ? "Update & Publish" : "Publish Form"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Published Forms List */}
            {forms && forms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Forms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {forms.map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow" data-testid={`form-item-${form.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900" data-testid={`text-form-title-${form.id}`}>{form.title}</h4>
                              <p className="text-sm text-slate-600">
                                {form.isPublished ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Published
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Draft
                                  </span>
                                )}
                                <span className="ml-2">Created {new Date(form.createdAt).toLocaleDateString()}</span>
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {form.isPublished && form.shareableLink && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const formUrl = `${window.location.origin}/form/${form.shareableLink}`;
                                    navigator.clipboard.writeText(formUrl);
                                    toast({ title: "Success!", description: "Form link copied to clipboard" });
                                  }}
                                  data-testid={`button-copy-link-${form.id}`}
                                >
                                  Copy Link
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`button-form-menu-${form.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem 
                                    onClick={() => loadFormForEditing(form)}
                                    data-testid={`button-edit-form-${form.id}`}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setShowDeleteConfirm(form.id)}
                                    className="text-red-600 focus:text-red-600"
                                    data-testid={`button-delete-form-${form.id}`}
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {form.isPublished && form.shareableLink && (
                            <p className="text-xs text-slate-500 mt-2">
                              Share: /form/{form.shareableLink}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Preview Form Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
            <DialogDescription>
              This is how your form will appear to clients
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-4">{formTitle}</h1>
                <p className="text-slate-600 leading-relaxed">{formDescription}</p>
              </div>
              
              <form className="space-y-6" data-testid="preview-form">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === "text" && (
                      <Input placeholder={field.placeholder} />
                    )}
                    {field.type === "email" && (
                      <Input type="email" placeholder={field.placeholder} />
                    )}
                    {field.type === "textarea" && (
                      <Textarea placeholder={field.placeholder} rows={4} />
                    )}
                    {field.type === "select" && (
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "radio" && (
                      <div className="space-y-2">
                        {field.options?.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input type="radio" id={`${field.id}-${index}`} name={field.id} />
                            <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {field.type === "checkbox" && (
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id={field.id} />
                        <Label htmlFor={field.id}>{field.label}</Label>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="pt-6">
                  <Button type="button" className="w-full" disabled>
                    Submit Form
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Modal */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save</DialogTitle>
            <DialogDescription>
              {editingFormId 
                ? "Are you sure you want to update this form with your changes?"
                : "Are you sure you want to save this draft?"
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveConfirm(false)} data-testid="button-cancel-save">
              Cancel
            </Button>
            <Button onClick={() => saveForm(false)} data-testid="button-confirm-save">
              {editingFormId ? "Update" : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Modal */}
      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Publish</DialogTitle>
            <DialogDescription>
              {editingFormId 
                ? "Are you ready to update and publish this form? It will be immediately shareable with clients."
                : "Are you ready to publish this form and start sharing it with clients?"
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishConfirm(false)} data-testid="button-cancel-publish">
              Cancel
            </Button>
            <Button onClick={() => saveForm(true)} data-testid="button-confirm-publish">
              {editingFormId ? "Update & Publish" : "Publish Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this form? This action cannot be undone and will remove all associated form submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && deleteFormMutation.mutate(showDeleteConfirm)}
              data-testid="button-confirm-delete"
            >
              Delete Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
