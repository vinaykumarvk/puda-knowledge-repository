import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, RefreshCw, Check, X, Edit, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface TextEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onApply: (enhancedText: string) => void;
}

export function TextEnhancementModal({ 
  isOpen, 
  onClose, 
  originalText, 
  onApply 
}: TextEnhancementModalProps) {
  const [enhancedText, setEnhancedText] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState<string>('');

  const handleEnhance = async () => {
    if (!originalText.trim()) return;

    setIsEnhancing(true);
    console.log('🚀 Starting enhancement for text:', originalText);

    try {
      const response = await apiRequest('POST', '/api/text/enhance', {
        text: originalText,
        type: 'professional'
      });

      console.log('📥 Raw API Response:', response);
      
      // The apiRequest function returns a Response object, we need to parse it
      const data = await response.json();
      console.log('📄 Parsed JSON data:', data);
      console.log('✨ Enhanced text:', data.enhancedText);

      if (data.enhancedText) {
        setEnhancedText(data.enhancedText);
        setEditableText(data.enhancedText); // Initialize editable text
        setIsEditing(false); // Start in view mode
        console.log('✅ State updated with enhanced text');
      } else {
        console.error('❌ No enhancedText in response data');
        setEnhancedText('');
        setEditableText('');
      }
    } catch (error) {
      console.error('❌ Enhancement failed:', error);
      setEnhancedText('');
      setEditableText('');
    } finally {
      setIsEnhancing(false);
      console.log('🏁 Enhancement process completed');
    }
  };

  const handleSave = () => {
    // Save the edited text and replace the original
    onApply(editableText);
    onClose();
  };

  const handleCancel = () => {
    // Discard AI recommendation and go back
    setEnhancedText('');
    setEditableText('');
    setIsEditing(false);
    onClose();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Revert to original enhanced text
    setEditableText(enhancedText);
    setIsEditing(false);
  };

  const handleApplyEdit = () => {
    // Apply the edited version
    setEnhancedText(editableText);
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Text Enhancement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Text Display */}
          <div>
            <h3 className="font-medium mb-2">Original Text</h3>
            <Textarea 
              value={originalText}
              readOnly
              className="min-h-[100px] bg-gray-50 dark:bg-gray-900"
            />
          </div>

          {/* Enhancement Information */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Comprehensive AI Enhancement</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Our AI will improve your text by:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Grammar & Language:</strong> Fix spelling, grammar, and vocabulary issues</li>
              <li>• <strong>Professional Tone:</strong> Convert to formal business terminology</li>
              <li>• <strong>Clarity & Structure:</strong> Improve readability and organization</li>
              <li>• <strong>Content Preservation:</strong> Keep all key facts and data intact</li>
            </ul>
          </div>

          {/* Enhancement Button */}
          {!enhancedText && !isEnhancing && (
            <div className="text-center">
              <Button
                onClick={handleEnhance}
                className="gap-2"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                Enhance Text
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isEnhancing && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <div>
                <p className="font-medium">Enhancing your text...</p>
                <p className="text-sm">This may take a few seconds</p>
              </div>
            </div>
          )}

          {/* Enhanced Text Result */}
          {enhancedText && !isEnhancing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-green-700 dark:text-green-400">AI Enhanced Text</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleEnhance}
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Re-enhance
                  </Button>
                  {!isEditing && (
                    <Button
                      variant="outline"
                      onClick={handleEdit}
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Enhanced Text Display/Edit */}
              {isEditing ? (
                <Textarea 
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="min-h-[120px] border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20"
                  placeholder="Edit your enhanced text here..."
                />
              ) : (
                <div className="min-h-[120px] p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                  <MarkdownRenderer 
                    content={enhancedText} 
                    className="text-sm"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel Edit
                    </Button>
                    <Button
                      onClick={handleApplyEdit}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Apply Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save & Replace Original
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}