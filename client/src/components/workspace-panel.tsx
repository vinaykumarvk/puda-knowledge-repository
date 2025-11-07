import { useState } from "react";

import type { Thread } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThreadSidebar } from "@/components/thread-sidebar";
import { AIConfigSidebar, type AIConfig } from "@/components/ai-config-sidebar";

interface WorkspacePanelProps {
  onSelectThread: (thread: Thread) => void;
  onNewChat: () => void;
  onDeleteThread: (id: number) => void;
  selectedThreadId?: number;
  onConfigChange?: (config: AIConfig) => void;
  layout?: "desktop" | "mobile";
  className?: string;
}

export function WorkspacePanel({
  onSelectThread,
  onNewChat,
  onDeleteThread,
  selectedThreadId,
  onConfigChange,
  layout = "desktop",
  className,
}: WorkspacePanelProps) {
  const [tabValue, setTabValue] = useState("threads");

  return (
    <div
      className={cn(
        "flex h-full flex-col border-border bg-card/70 backdrop-blur",
        layout === "desktop" ? "hidden w-[340px] border-r md:flex" : "flex w-full",
        className,
      )}
    >
      <Tabs value={tabValue} onValueChange={setTabValue} className="flex h-full flex-col">
        <TabsList className="m-3 grid grid-cols-2">
          <TabsTrigger value="threads" className="text-xs">
            Threads
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs">
            AI Config
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="threads"
          forceMount
          className="flex-1 overflow-hidden p-0 focus-visible:outline-none"
        >
          <ThreadSidebar
            onSelectThread={onSelectThread}
            onNewChat={onNewChat}
            onDeleteThread={onDeleteThread}
            selectedThreadId={selectedThreadId}
            variant="panel"
            className="h-full"
          />
        </TabsContent>
        <TabsContent
          value="config"
          forceMount
          className="flex-1 overflow-hidden p-0 focus-visible:outline-none"
        >
          <AIConfigSidebar
            onConfigChange={onConfigChange}
            variant="panel"
            className="h-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
