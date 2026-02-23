import type { Thread } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ThreadSidebar } from "@/components/thread-sidebar";

interface WorkspacePanelProps {
  onSelectThread: (thread: Thread) => void;
  onNewChat: () => void;
  onRenameThread: (id: number, currentTitle: string) => void;
  onDeleteThread: (id: number) => void;
  selectedThreadId?: number;
  layout?: "desktop" | "mobile";
  className?: string;
}

export function WorkspacePanel({
  onSelectThread,
  onNewChat,
  onRenameThread,
  onDeleteThread,
  selectedThreadId,
  layout = "desktop",
  className,
}: WorkspacePanelProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col min-h-0 border-border bg-card/70 backdrop-blur",
        layout === "desktop" ? "hidden w-[280px] border-r md:flex" : "flex w-full",
        className,
      )}
    >
      <ThreadSidebar
        onSelectThread={onSelectThread}
        onNewChat={onNewChat}
        onRenameThread={onRenameThread}
        onDeleteThread={onDeleteThread}
        selectedThreadId={selectedThreadId}
        variant="panel"
        className="h-full"
      />
    </div>
  );
}
