import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  History,
  Download
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { SolutionTemplate, TemplateSection, TemplateWorkItem, TemplateRevision } from '@shared/schema';

interface CompleteTemplate {
  template: SolutionTemplate;
  sections: Array<TemplateSection & { workItems: TemplateWorkItem[] }>;
  revisions: TemplateRevision[];
}

export default function Templates() {
  const { toast } = useToast();
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);

  // Fetch complete template
  const { data: completeTemplate, isLoading } = useQuery({
    queryKey: ['/api/solution-templates', 'complete'],
    queryFn: async (): Promise<CompleteTemplate | null> => {
      // First try to get default template
      const defaultResponse = await fetch('/api/solution-templates/default', {
        credentials: 'include'
      });
      
      if (!defaultResponse.ok) {
        // If no default template exists, create one
        const createResponse = await apiRequest('POST', '/api/solution-templates/init');
        if (!createResponse.ok) {
          throw new Error('Failed to initialize template');
        }
        const newTemplate = await createResponse.json();
        
        // Get complete template
        const completeResponse = await fetch(`/api/solution-templates/${newTemplate.id}/complete`, {
          credentials: 'include'
        });
        return completeResponse.json();
      }
      
      const defaultTemplate = await defaultResponse.json();
      
      // Get complete template with sections
      const completeResponse = await fetch(`/api/solution-templates/${defaultTemplate.id}/complete`, {
        credentials: 'include'
      });
      return completeResponse.json();
    }
  });

  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return apiRequest('PUT', `/api/template-sections/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/solution-templates'] });
      setEditingSectionId(null);
      toast({
        title: "Section Updated",
        description: "Template section has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section.",
        variant: "destructive",
      });
    },
  });

  // Add work item mutation
  const addWorkItemMutation = useMutation({
    mutationFn: async ({ sectionId, title }: { sectionId: number; title: string }) => {
      // Get current work items count for order index
      const section = completeTemplate?.sections.find(s => s.id === sectionId);
      const orderIndex = section?.workItems.length || 0;
      
      return apiRequest('POST', '/api/template-work-items', {
        sectionId,
        title,
        content: '',
        orderIndex,
        isIncluded: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/solution-templates'] });
      toast({
        title: "Work Item Added",
        description: "New work item has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add work item.",
        variant: "destructive",
      });
    },
  });

  // Update work item mutation
  const updateWorkItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<TemplateWorkItem> }) => {
      return apiRequest('PUT', `/api/template-work-items/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/solution-templates'] });
      toast({
        title: "Work Item Updated",
        description: "Work item has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update work item.",
        variant: "destructive",
      });
    },
  });

  // Delete work item mutation
  const deleteWorkItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/template-work-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/solution-templates'] });
      toast({
        title: "Work Item Deleted",
        description: "Work item has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete work item.",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (section: TemplateSection) => {
    setEditingSectionId(section.id);
    setEditingContent(section.content || '');
  };

  const handleSaveSection = () => {
    if (editingSectionId) {
      updateSectionMutation.mutate({
        id: editingSectionId,
        content: editingContent
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingSectionId(null);
    setEditingContent('');
  };

  const toggleSection = (sectionType: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionType]: !prev[sectionType]
    }));
  };

  const getSectionIcon = (sectionType: string) => {
    return <FileText className="w-5 h-5" />;
  };

  const getSectionDescription = (sectionType: string) => {
    const descriptions: Record<string, string> = {
      heading: "Document title and header information",
      revisionHistory: "Track all changes made to this document",
      tableOfContents: "Automatically generated navigation",
      changeRequirement: "Explain why this change is being done",
      businessImpact: "Impact analysis of implementing or not implementing",
      affectedSystems: "List of systems impacted by this change",
      solution: "Detailed technical solution with work items",
      testScenarios: "Test cases and validation criteria"
    };
    return descriptions[sectionType] || "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading template...</div>
      </div>
    );
  }

  if (!completeTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">No template found</div>
      </div>
    );
  }

  const { template, sections, revisions } = completeTemplate;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solution Document Template</h1>
          <p className="text-muted-foreground mt-1">
            Business Analyst standard format for system change documentation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevisionHistory(!showRevisionHistory)}
            data-testid="button-show-history"
          >
            <History className="w-4 h-4 mr-2" />
            History ({revisions.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-export-template"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {template.title}
            </CardTitle>
            {template.isDefault && (
              <Badge variant="secondary">Default Template</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Revision History */}
      {showRevisionHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revision History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revisions yet</p>
              ) : (
                revisions.map((revision) => (
                  <div key={revision.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{revision.version}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {revision.changeDate ? new Date(revision.changeDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{revision.changeDescription}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections[section.sectionType] !== false;
          const isEditing = editingSectionId === section.id;
          const hasFocusArea = section.sectionType === 'solution';

          return (
            <Card key={section.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.sectionType)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        {getSectionIcon(section.sectionType)}
                        <div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getSectionDescription(section.sectionType)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        {section.sectionType}
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-4 space-y-4">
                    {/* Section Content */}
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          placeholder="Enter content for this section..."
                          className="min-h-[200px] font-mono text-sm"
                          data-testid={`textarea-section-${section.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveSection}
                            disabled={updateSectionMutation.isPending}
                            data-testid={`button-save-section-${section.id}`}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-edit-${section.id}`}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {section.content ? (
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
                              {section.content}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No content yet. Click Edit to add content.
                          </p>
                        )}
                        {section.isEditable && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(section)}
                            className="mt-3"
                            data-testid={`button-edit-section-${section.id}`}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Work Items for Solution Section */}
                    {hasFocusArea && section.workItems && (
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Work Items</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const title = prompt("Enter work item title:");
                              if (title) {
                                addWorkItemMutation.mutate({ sectionId: section.id, title });
                              }
                            }}
                            data-testid="button-add-work-item"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Work Item
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {section.workItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              No work items yet. Add work items like "Description of Change", "Logic and Validations", etc.
                            </p>
                          ) : (
                            section.workItems.map((workItem) => (
                              <Card key={workItem.id} className="bg-muted/30">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">{workItem.title}</h4>
                                        <Badge 
                                          variant={workItem.isIncluded ? "default" : "secondary"}
                                          className="text-xs"
                                        >
                                          {workItem.isIncluded ? "Included" : "Optional"}
                                        </Badge>
                                      </div>
                                      {workItem.content && (
                                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                                          {workItem.content}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const content = prompt("Edit work item content:", workItem.content || "");
                                          if (content !== null) {
                                            updateWorkItemMutation.mutate({
                                              id: workItem.id,
                                              updates: { content }
                                            });
                                          }
                                        }}
                                        data-testid={`button-edit-work-item-${workItem.id}`}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          if (confirm("Delete this work item?")) {
                                            deleteWorkItemMutation.mutate(workItem.id);
                                          }
                                        }}
                                        data-testid={`button-delete-work-item-${workItem.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
