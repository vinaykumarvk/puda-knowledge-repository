import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { useQuery } from '@tanstack/react-query';

interface DocumentCategory {
  id: number;
  name: string;
  icon: string;
  description: string;
}

interface DocumentUploadTab {
  id: string;
  categoryId: number | null;
  customCategoryName: string;
  files: File[];
}

interface MultiTabDocumentUploadProps {
  onDocumentTabsChange: (tabs: DocumentUploadTab[]) => void;
  initialTabs?: DocumentUploadTab[];
}

export function MultiTabDocumentUpload({ onDocumentTabsChange, initialTabs = [] }: MultiTabDocumentUploadProps) {
  const [documentTabs, setDocumentTabs] = useState<DocumentUploadTab[]>(
    initialTabs.length > 0 ? initialTabs : [
      {
        id: 'tab-1',
        categoryId: null,
        customCategoryName: '',
        files: []
      }
    ]
  );

  // Fetch available categories
  const { data: categories = [] } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
  });

  const addNewTab = () => {
    const newTab: DocumentUploadTab = {
      id: `tab-${Date.now()}`,
      categoryId: null,
      customCategoryName: '',
      files: []
    };
    const updatedTabs = [...documentTabs, newTab];
    setDocumentTabs(updatedTabs);
    onDocumentTabsChange(updatedTabs);
  };

  const removeTab = (tabId: string) => {
    if (documentTabs.length <= 1) return; // Don't allow removing the last tab
    const updatedTabs = documentTabs.filter(tab => tab.id !== tabId);
    setDocumentTabs(updatedTabs);
    onDocumentTabsChange(updatedTabs);
  };

  const updateTab = (tabId: string, updates: Partial<DocumentUploadTab>) => {
    const updatedTabs = documentTabs.map(tab =>
      tab.id === tabId ? { ...tab, ...updates } : tab
    );
    setDocumentTabs(updatedTabs);
    onDocumentTabsChange(updatedTabs);
  };

  const handleCategoryChange = (tabId: string, categoryId: string) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    updateTab(tabId, {
      categoryId: parseInt(categoryId),
      customCategoryName: category?.name === 'Uncategorized' ? '' : ''
    });
  };

  const handleCustomNameChange = (tabId: string, customName: string) => {
    updateTab(tabId, { customCategoryName: customName });
  };

  const handleFilesChange = (tabId: string, files: File[]) => {
    updateTab(tabId, { files });
  };

  const getCategoryName = (tab: DocumentUploadTab) => {
    if (!tab.categoryId) return 'No category selected';
    const category = categories.find(c => c.id === tab.categoryId);
    if (category?.name === 'Uncategorized' && tab.customCategoryName) {
      return tab.customCategoryName;
    }
    return category?.name || 'Unknown category';
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Supporting Documents</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNewTab}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Document Category
        </Button>
      </div>

      {/* Document Upload Tabs */}
      <div className="space-y-4">
        {documentTabs.map((tab, index) => {
          const selectedCategory = categories.find(c => c.id === tab.categoryId);
          const isUncategorized = selectedCategory?.name === 'Uncategorized';

          return (
            <Card key={tab.id} className="relative">
              <CardContent className="pt-6">
                {/* Tab Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Document Set {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm font-medium">
                      {getCategoryName(tab)}
                    </span>
                  </div>
                  {documentTabs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTab(tab.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Category Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Document Category</Label>
                    <Select
                      value={tab.categoryId?.toString() || ''}
                      onValueChange={(value) => handleCategoryChange(tab.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Category Name for Uncategorized */}
                  {isUncategorized && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Custom Category Name</Label>
                      <Input
                        placeholder="Enter custom category name..."
                        value={tab.customCategoryName}
                        onChange={(e) => handleCustomNameChange(tab.id, e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Provide a specific name for this uncategorized document type
                      </p>
                    </div>
                  )}

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Upload Documents</Label>
                    <FileUpload
                      multiple={true}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      maxSize={50 * 1024 * 1024}
                      onFilesChange={(files: File[]) => handleFilesChange(tab.id, files)}
                    />
                    {tab.files.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {tab.files.length} file{tab.files.length !== 1 ? 's' : ''} selected for this category
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {documentTabs.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total document categories: {documentTabs.length} • 
          Total files: {documentTabs.reduce((sum, tab) => sum + tab.files.length, 0)}
        </div>
      )}
    </div>
  );
}