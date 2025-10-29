import { FileSpreadsheet, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UploadRequirements from "@/pages/rfp/UploadRequirements";
import ViewData from "@/pages/rfp/ViewData";
import { useLocation } from "wouter";

export default function RfpPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-2.5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/workshop")}
            className="flex items-center gap-2"
            data-testid="button-back-to-launchpad"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Launchpad
          </Button>
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-rfp-title">
              RFP Response Generator
            </h1>
            <p className="text-xs text-muted-foreground">
              Upload requirements and generate AI-powered RFP responses
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
              <FileSpreadsheet className="w-4 h-4" />
              Upload Requirements
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2" data-testid="tab-view">
              <FileText className="w-4 h-4" />
              View Responses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-0">
            <UploadRequirements />
          </TabsContent>

          <TabsContent value="view" className="mt-0">
            <ViewData />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
