import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sparkles, User, Brain, Loader2 } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface InvestmentRationaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  investmentId: number;
  investmentType?: string;
}

const InvestmentRationaleModal: React.FC<InvestmentRationaleModalProps> = ({
  isOpen,
  onClose,
  investmentId,
  investmentType = 'equity'
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [manualContent, setManualContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [manualTemplateId, setManualTemplateId] = useState<string>('');

  // Fetch templates for AI generation
  const { data: templates } = useQuery({
    queryKey: ['/api/templates/investment'],
    queryFn: async () => {
      const response = await fetch('/api/templates/investment', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    },
    enabled: isOpen
  });

  // Create rationale mutation
  const createRationaleMutation = useMutation({
    mutationFn: async (data: { content: string; type: 'manual' | 'ai_generated'; templateId?: number }) => {
      return apiRequest('POST', `/api/investments/${investmentId}/rationales`, data);
    },
    onSuccess: async (response: Response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}/rationales`] });
      toast({
        title: "Rationale Added",
        description: "Investment rationale has been added successfully.",
      });
      onClose();
      setManualContent('');
      setSelectedTemplateId('');
      setManualTemplateId('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add investment rationale.",
        variant: "destructive",
      });
    },
  });

  // Generate comprehensive AI rationale mutation  
  const generateAIRationaleMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return apiRequest('POST', `/api/investments/${investmentId}/rationales/generate-comprehensive`, { templateId });
    },
    onSuccess: async (response: Response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investmentId}/rationales`] });
      const metadata = result?.metadata;
      toast({
        title: "Comprehensive Proposal Generated",
        description: `AI-powered investment proposal generated using ${metadata?.dataSourcesCounts?.documents || 0} documents, ${metadata?.dataSourcesCounts?.crossDocQueries || 0} document queries, and ${metadata?.dataSourcesCounts?.webSearchQueries || 0} web searches.`,
      });
      onClose();
      setSelectedTemplateId('');
      setManualTemplateId('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to generate comprehensive proposal.",
        variant: "destructive",
      });
    },
  });

  const handleManualSubmit = () => {
    if (!manualContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter rationale content.",
        variant: "destructive",
      });
      return;
    }

    createRationaleMutation.mutate({
      content: manualContent,
      type: 'manual',
      templateId: (manualTemplateId && manualTemplateId !== 'none') ? parseInt(manualTemplateId) : undefined
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    setManualTemplateId(templateId);
    
    // Clear content if "none" selected
    if (templateId === 'none' || !templateId) {
      setManualContent('');
      return;
    }
    
    // Find selected template and populate skeleton
    const selectedTemplate = templates?.find((t: any) => t.id.toString() === templateId);
    if (selectedTemplate && selectedTemplate.templateData?.sections) {
      const skeleton = selectedTemplate.templateData.sections
        .map((section: any, index: number) => 
          `## ${index + 1}. ${section.name}

${section.description}

Focus Areas: ${(section.focusAreas || []).join(', ') || 'Not specified'}

[Enter your analysis here for ${section.name}]

`
        ).join('\n');
      
      setManualContent(skeleton);
    }
  };

  const handleAIGenerate = () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template for AI generation.",
        variant: "destructive",
      });
      return;
    }

    generateAIRationaleMutation.mutate(parseInt(selectedTemplateId));
  };

  const filteredTemplates = templates?.filter((template: any) => 
    template.investmentType === investmentType || template.investmentType === 'general'
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Investment Rationale
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Manual Rationale Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Template (Optional)
                  </label>
                  <Select value={manualTemplateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template to populate skeleton structure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Template (Free Form)</SelectItem>
                      {filteredTemplates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select a template to auto-populate section headers and guidelines, or write freely without a template.
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Investment Rationale Content
                  </label>
                  <Textarea
                    placeholder="Enter your investment rationale, including analysis, risk assessment, expected returns, and justification for this investment..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    rows={12}
                    className="min-h-[300px]"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Provide comprehensive analysis including financial projections, risk factors, market analysis, and strategic fit.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleManualSubmit}
                    disabled={createRationaleMutation.isPending || !manualContent.trim()}
                  >
                    {createRationaleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Rationale'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Comprehensive Proposal Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Analysis Template
                  </label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template for AI analysis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.length > 0 ? (
                        filteredTemplates.map((template: any) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{template.name}</span>
                              <Badge 
                                variant="secondary" 
                                className="ml-2 text-xs"
                              >
                                {template.investmentType?.replace('_', ' ') || 'General'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-templates" disabled>
                          No templates available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {filteredTemplates.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      No templates found for {investmentType} investments. Create templates in the Templates page.
                    </p>
                  )}
                </div>

                {selectedTemplateId && (
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <h4 className="font-medium mb-2">Template Preview</h4>
                    {(() => {
                      const selectedTemplate = filteredTemplates.find((t: any) => t.id.toString() === selectedTemplateId);
                      return selectedTemplate ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            {selectedTemplate.description}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Analysis Sections:</p>
                            {((selectedTemplate.templateData as any)?.sections || []).map((section: any, index: number) => (
                              <div key={index} className="text-xs bg-white dark:bg-gray-900 p-2 rounded border">
                                <div className="font-medium">{section.name}</div>
                                <div className="text-gray-500">{section.description} ({section.wordLimit} words)</div>
                                {section.focusAreas && section.focusAreas.length > 0 && (
                                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                                    <strong>Focus Areas:</strong> {section.focusAreas.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                    🧠 World-Class AI Analysis
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Generates comprehensive investment proposals by integrating:
                    <br />• All existing document analysis & insights
                    <br />• Complete research Q&A history 
                    <br />• Real-time web search & market data
                    <br />• Professional template structure with word limits
                    <br />• OpenAI file_search + web_search tools
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAIGenerate}
                    disabled={generateAIRationaleMutation.isPending || !selectedTemplateId}
                  >
                    {generateAIRationaleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Comprehensive Analysis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Comprehensive Proposal
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentRationaleModal;