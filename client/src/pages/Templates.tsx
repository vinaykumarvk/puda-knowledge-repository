import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Edit, Trash2, Brain, Sparkles, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Template } from '@shared/schema';

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  investmentType: z.enum(["equity", "debt", "real_estate", "alternative", "general"]),
  description: z.string().optional(),
  templateData: z.object({
    sections: z.array(z.object({
      name: z.string(),
      description: z.string(),
      wordLimit: z.number().min(50).max(1000),
      focusAreas: z.array(z.string()).optional()
    })).min(1, "At least one section is required")
  })
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const Templates: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState([{ name: '', description: '', wordLimit: 200, focusAreas: [] as string[] }]);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/templates/investment'],
    queryFn: async () => {
      const response = await fetch('/api/templates/investment', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    }
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      investmentType: 'equity',
      description: '',
      templateData: {
        sections: [{ name: '', description: '', wordLimit: 200, focusAreas: [] }]
      }
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest('POST', '/api/templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/investment'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Template Created",
        description: "Template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest('PUT', `/api/templates/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/investment'] });
      setEditingTemplate(null);
      resetForm();
      toast({
        title: "Template Updated",
        description: "Template has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/investment'] });
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    },
  });

  const addSection = () => {
    setSections([...sections, { name: '', description: '', wordLimit: 200, focusAreas: [] }]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updatedSections = [...sections];
    updatedSections[index] = { ...updatedSections[index], [field]: value };
    setSections(updatedSections);
    form.setValue('templateData.sections', updatedSections);
  };

  const resetForm = () => {
    form.reset();
    setSections([{ name: '', description: '', wordLimit: 200, focusAreas: [] }]);
    setEditingTemplate(null);
    setIsCreateModalOpen(false);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    const templateData = typeof template.templateData === 'string' 
      ? JSON.parse(template.templateData) 
      : template.templateData;
    
    // Ensure sections have focusAreas arrays
    const sectionsWithFocusAreas = (templateData.sections || [{ name: '', description: '', wordLimit: 200, focusAreas: [] }]).map((section: any) => ({
      ...section,
      focusAreas: section.focusAreas || []
    }));

    form.reset({
      name: template.name,
      investmentType: template.investmentType as any,
      description: template.description || '',
      templateData: {
        sections: sectionsWithFocusAreas
      }
    });
    
    setSections(sectionsWithFocusAreas);
    setIsCreateModalOpen(true);
  };

  const onSubmit = (data: TemplateFormData) => {
    const formData = {
      ...data,
      templateData: {
        sections: sections.filter(s => s.name && s.description)
      }
    };
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...formData, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const getInvestmentTypeColor = (type: string) => {
    const colors = {
      equity: 'bg-blue-100 text-blue-800',
      debt: 'bg-green-100 text-green-800',
      real_estate: 'bg-purple-100 text-purple-800',
      alternative: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.general;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposal Templates</h1>
          <p className="text-gray-600">
            Create and manage templates for investment proposals
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {editingTemplate ? 'Edit Investment Analysis Template' : 'Create Investment Analysis Template'}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Equity Analysis Template" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="investmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select investment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="debt">Debt</SelectItem>
                            <SelectItem value="real_estate">Real Estate</SelectItem>
                            <SelectItem value="alternative">Alternative</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this template covers..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Analysis Sections</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {sections.map((section, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Section {index + 1}</h4>
                          {sections.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSection(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Section Name</label>
                            <Input
                              placeholder="e.g., Financial Analysis"
                              value={section.name}
                              onChange={(e) => updateSection(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Word Limit</label>
                            <Input
                              type="number"
                              min="50"
                              max="1000"
                              value={section.wordLimit}
                              onChange={(e) => updateSection(index, 'wordLimit', parseInt(e.target.value) || 200)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Section Description</label>
                          <Textarea
                            placeholder="Describe what this section should cover..."
                            value={section.description}
                            onChange={(e) => updateSection(index, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Key Focus Areas</label>
                          <Textarea
                            placeholder="Enter focus areas separated by line breaks (each line will be a bullet point)..."
                            value={(section.focusAreas || []).join('\n')}
                            onChange={(e) => {
                              const focusAreas = e.target.value.split('\n').filter(area => area.trim() !== '');
                              updateSection(index, 'focusAreas', focusAreas);
                            }}
                            rows={3}
                          />
                          <p className="text-xs text-gray-500 mt-1">Each line will appear as a bullet point in the template view</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    {createTemplateMutation.isPending 
                      ? 'Creating...' 
                      : updateTemplateMutation.isPending 
                      ? 'Updating...'
                      : editingTemplate 
                      ? 'Update Template' 
                      : 'Create Template'
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : (
        <div className="space-y-6">
          {templates && (templates as Template[]).length > 0 ? (
            (templates as Template[]).map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getInvestmentTypeColor(template.investmentType || 'general')}>
                                {template.investmentType?.replace('_', ' ') || 'General'}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {((template.templateData as any)?.sections?.length || 0)} sections
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            disabled={updateTemplateMutation.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplateMutation.mutate(template.id);
                            }}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            {deleteTemplateMutation.isPending ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <p className="text-gray-600 mb-6">{template.description}</p>
                      
                      {/* Template Sections */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-base">Analysis Sections</h4>
                        <div className="grid gap-4">
                          {((template.templateData as any)?.sections || []).map((section: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-base">{section.name}</h5>
                                <span className="text-sm text-gray-500 bg-white dark:bg-gray-700 px-2 py-1 rounded">
                                  {section.wordLimit} words
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                              
                              {/* Focus Areas */}
                              {section.focusAreas && section.focusAreas.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Key Focus Areas:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {section.focusAreas.map((area: string, areaIndex: number) => (
                                      <li key={areaIndex} className="flex items-start gap-2">
                                        <span className="text-gray-400 mt-0.5">•</span>
                                        <span>{area}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 pt-4 border-t mt-6">
                        Created by {template.createdBy} • {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first investment analysis template to enable AI-powered rationale generation.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Template
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Templates;