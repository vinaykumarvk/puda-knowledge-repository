import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Download, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: number;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  analysisStatus?: string;
  createdAt: string;
  uploader: {
    firstName: string;
    lastName: string;
  };
}

interface DocumentCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
  isSystem: boolean;
}

interface DocumentCategoryAssociation {
  id: number;
  documentId: number;
  categoryId: number;
  customCategoryName?: string;
  category: DocumentCategory;
}

interface DocumentCategoryViewProps {
  requestType: string;
  requestId: number;
  documents: Document[];
  onDocumentPreview?: (documentId: number) => void;
  onDocumentDownload?: (documentId: number) => void;
  onDocumentAnalyze?: (documentId: number) => void;
  showAnalysisActions?: boolean;
}

export function DocumentCategoryView({
  requestType,
  requestId,
  documents,
  onDocumentPreview,
  onDocumentDownload,
  onDocumentAnalyze,
  showAnalysisActions = true
}: DocumentCategoryViewProps) {
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  const { data: categories = [] } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
    enabled: true
  });

  // Get category associations for all documents
  const { data: documentCategories = {} } = useQuery({
    queryKey: ['/api/documents-categories', documents.map(d => d.id)],
    queryFn: async () => {
      const associations: { [documentId: number]: DocumentCategoryAssociation[] } = {};
      
      for (const doc of documents) {
        try {
          const response = await fetch(`/api/documents/${doc.id}/categories`, {
            credentials: 'include'
          });
          if (response.ok) {
            associations[doc.id] = await response.json();
          } else {
            associations[doc.id] = [];
          }
        } catch (error) {
          associations[doc.id] = [];
        }
      }
      
      return associations;
    },
    enabled: documents.length > 0
  });

  const toggleCategory = (categoryId: number) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(categoryId)) {
      newOpen.delete(categoryId);
    } else {
      newOpen.add(categoryId);
    }
    setOpenCategories(newOpen);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAnalysisStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAnalysisStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Analyzed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  // Group documents by their assigned categories using the new association system
  const groupedDocuments = categories.reduce((acc: any, category) => {
    const categoryDocs: { document: Document; associations: DocumentCategoryAssociation[] }[] = [];

    documents.forEach(doc => {
      const docAssociations = documentCategories[doc.id] || [];
      const hasThisCategory = docAssociations.some(assoc => assoc.categoryId === category.id);
      
      if (hasThisCategory) {
        categoryDocs.push({
          document: doc,
          associations: docAssociations.filter(assoc => assoc.categoryId === category.id)
        });
      }
    });

    if (categoryDocs.length > 0) {
      acc[category.id] = {
        category,
        documents: categoryDocs
      };
    }
    return acc;
  }, {});

  // Handle uncategorized documents (those without any category associations)
  const uncategorizedDocs = documents.filter(doc => {
    const docAssociations = documentCategories[doc.id] || [];
    return docAssociations.length === 0;
  });
  
  if (uncategorizedDocs.length > 0) {
    const uncategorizedCategory = categories.find(cat => cat.name === 'Uncategorized');
    if (uncategorizedCategory) {
      groupedDocuments[uncategorizedCategory.id] = {
        category: uncategorizedCategory,
        documents: uncategorizedDocs.map(doc => ({ document: doc, associations: [] }))
      };
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.values(groupedDocuments).map((group: any) => {
        const { category, documents: categoryDocs } = group;
        const isOpen = openCategories.has(category.id);
        const totalDocs = categoryDocs.length;

        return (
          <Card key={category.id}>
            <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-xl">{category.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {categoryDocs.map(({ document: doc, associations }: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          {getAnalysisStatusIcon(doc.analysisStatus)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.originalName}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>Uploaded {formatDistanceToNow(new Date(doc.createdAt))} ago</span>
                              <span>by {doc.uploader.firstName} {doc.uploader.lastName}</span>
                            </div>
                            {/* Show custom category names if any */}
                            {associations.length > 0 && associations.some((assoc: any) => assoc.customCategoryName) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {associations.filter((assoc: any) => assoc.customCategoryName).map((assoc: any) => (
                                  <Badge key={assoc.id} variant="outline" className="text-xs">
                                    {assoc.customCategoryName}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {getAnalysisStatusText(doc.analysisStatus)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDocumentPreview?.(doc.id)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDocumentDownload?.(doc.id)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {showAnalysisActions && doc.analysisStatus !== 'processing' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDocumentAnalyze?.(doc.id)}
                              title="Analyze"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}