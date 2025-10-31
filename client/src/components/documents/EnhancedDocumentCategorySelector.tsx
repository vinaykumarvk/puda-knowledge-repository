import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DocumentCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
  isSystem: boolean;
}

interface SelectedCategory {
  categoryId: number;
  customCategoryName?: string;
}

interface DocumentCategoryAssociation {
  id: number;
  documentId: number;
  categoryId: number;
  customCategoryName?: string;
  category: DocumentCategory;
}

interface EnhancedDocumentCategorySelectorProps {
  onCategoriesChange: (categories: SelectedCategory[]) => void;
  initialCategories?: SelectedCategory[];
  disabled?: boolean;
  documentId?: number; // For editing existing documents
}

export function EnhancedDocumentCategorySelector({
  onCategoriesChange,
  initialCategories = [],
  disabled = false,
  documentId
}: EnhancedDocumentCategorySelectorProps) {
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>(initialCategories);
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📄");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [selectedCategoryForCustom, setSelectedCategoryForCustom] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
    enabled: true
  });

  // Load existing categories for the document if documentId is provided
  const { data: existingAssociations = [] } = useQuery<DocumentCategoryAssociation[]>({
    queryKey: ['/api/documents', documentId, 'categories'],
    enabled: !!documentId
  });

  // Initialize with existing categories when editing
  useEffect(() => {
    if (documentId && existingAssociations.length > 0) {
      const categories = existingAssociations.map((assoc: DocumentCategoryAssociation) => ({
        categoryId: assoc.categoryId,
        customCategoryName: assoc.customCategoryName
      }));
      setSelectedCategories(categories);
      onCategoriesChange(categories);
    }
  }, [existingAssociations, documentId, onCategoriesChange]);

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: { name: string; description?: string; icon: string }) => {
      return apiRequest('POST', '/api/document-categories', categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      setIsNewCategoryDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryIcon("📄");
    },
  });

  const addCategory = (categoryId: number, customName?: string) => {
    const newCategory: SelectedCategory = {
      categoryId,
      customCategoryName: customName
    };

    // Check if category is already selected
    const exists = selectedCategories.some(cat => cat.categoryId === categoryId);
    if (exists) {
      return;
    }

    const updated = [...selectedCategories, newCategory];
    setSelectedCategories(updated);
    onCategoriesChange(updated);
    setCustomCategoryName("");
    setSelectedCategoryForCustom(null);
  };

  const removeCategory = (categoryId: number) => {
    const updated = selectedCategories.filter(cat => cat.categoryId !== categoryId);
    setSelectedCategories(updated);
    onCategoriesChange(updated);
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        icon: newCategoryIcon
      });
    }
  };

  const handleAddOthersCategory = () => {
    const othersCategory = categories.find((cat) => cat.name === 'Others');
    if (othersCategory && customCategoryName.trim()) {
      addCategory(othersCategory.id, customCategoryName.trim());
    }
  };

  const getCategoryById = (id: number) => {
    return categories.find((cat) => cat.id === id);
  };

  const getAvailableCategories = () => {
    return categories.filter((cat) => 
      !selectedCategories.some(selected => selected.categoryId === cat.id)
    );
  };

  const othersCategory = categories.find((cat) => cat.name === 'Others');

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Document Categories</Label>
        <p className="text-xs text-muted-foreground">Select multiple categories to classify this document</p>
      </div>

      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(({ categoryId, customCategoryName }) => {
            const category = getCategoryById(categoryId);
            if (!category) return null;

            const displayName = customCategoryName || category.name;
            return (
              <Badge key={`${categoryId}-${customCategoryName || ''}`} variant="secondary" className="flex items-center gap-1">
                <span>{category.icon}</span>
                <span>{displayName}</span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeCategory(categoryId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {!disabled && (
        <div className="space-y-3">
          {/* Add Category Dropdown */}
          <div className="flex gap-2">
            <Select
              onValueChange={(value) => {
                const categoryId = parseInt(value);
                if (categoryId === othersCategory?.id) {
                  setSelectedCategoryForCustom(categoryId);
                } else {
                  addCategory(categoryId);
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add a category..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableCategories().map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Create New Category Button */}
            <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryDescription">Description (Optional)</Label>
                    <Textarea
                      id="categoryDescription"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      placeholder="Describe this category"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryIcon">Icon</Label>
                    <Input
                      id="categoryIcon"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      placeholder="📄"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsNewCategoryDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                    >
                      {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Custom "Others" Category Input */}
          {selectedCategoryForCustom === othersCategory?.id && (
            <div className="flex gap-2">
              <Input
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                placeholder="Enter custom category name"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddOthersCategory}
                disabled={!customCategoryName.trim()}
              >
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategoryForCustom(null);
                  setCustomCategoryName("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedCategories.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No categories selected</p>
        </div>
      )}
    </div>
  );
}