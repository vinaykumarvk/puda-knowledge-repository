import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2, MessageSquarePlus, Search, ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Pencil } from "lucide-react";

import type { Thread } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ThreadSidebarProps {
  onSelectThread: (thread: Thread) => void;
  onNewChat: () => void;
  onRenameThread: (id: number, currentTitle: string) => void;
  onDeleteThread: (id: number) => void;
  selectedThreadId?: number;
  variant?: "default" | "panel";
  className?: string;
}

export function ThreadSidebar({
  onSelectThread,
  onNewChat,
  onRenameThread,
  onDeleteThread,
  selectedThreadId,
  variant = "default",
  className,
}: ThreadSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const enableCollapse = variant === "default";
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: threads = [], isLoading } = useQuery<Thread[]>({
    queryKey: ["/api/threads"],
  });

  // Fetch thread statuses (for active deep mode jobs)
  // Note: JSON keys are strings, so we use Record<string, ...>
  const { data: threadStatuses = {} } = useQuery<Record<string, { status: string; jobId?: string; messageId?: number }>>({
    queryKey: ["/api/threads/statuses"],
    refetchInterval: (query) => {
      // If there are active polling jobs, refetch more frequently (every 10 seconds)
      // Otherwise, refetch every 30 seconds
      const statuses = query.state.data || {};
      const hasActiveJobs = Object.values(statuses).some(
        (status) => status.status && status.status !== 'completed' && status.status !== 'failed'
      );
      return hasActiveJobs ? 10 * 1000 : 30 * 1000;
    },
  });

  // Deduplicate threads by ID (in case API returns duplicates)
  const uniqueThreads = Array.from(
    new Map(threads.map((thread) => [thread.id, thread])).values()
  );

  const filteredThreads = uniqueThreads.filter((thread) =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get status display
  const getStatusDisplay = (threadId: number) => {
    // JSON keys are strings, so convert threadId to string for lookup
    const status = threadStatuses[String(threadId)];
    if (!status) return null;

    const statusLabels: Record<string, string> = {
      polling: "Working...",
      retrieving: "Working...",
      formatting: "Working...",
      queued: "Working...",
    };

    return {
      label: statusLabels[status.status] || "Processing...",
      isActive: true,
    };
  };

  if (enableCollapse && isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-card flex flex-col h-full items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          data-testid="button-expand-sidebar"
          className="mb-4"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          data-testid="button-new-chat-collapsed"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        enableCollapse
          ? "w-64 border-r border-border bg-card"
          : "bg-transparent",
        className,
      )}
    >
      <div
        className={cn(
          "p-4 border-border space-y-3",
          enableCollapse ? "border-b" : "border-b border-border/60 bg-card/60 backdrop-blur",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            data-testid="button-new-chat"
            onClick={onNewChat}
            className="flex-1 gap-2"
            size="lg"
          >
            <MessageSquarePlus className="w-5 h-5" />
            New Chat
          </Button>
          {enableCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              data-testid="button-collapse-sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-threads"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading threads...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No threads found" : "No conversations yet"}
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "group relative flex items-start gap-2 rounded-lg p-2.5 cursor-pointer transition-colors",
                  selectedThreadId === thread.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50",
                )}
                onClick={() => onSelectThread(thread)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectThread(thread);
                  }
                }}
                role="button"
                tabIndex={0}
                data-testid={`thread-item-${thread.id}`}
              >
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-normal text-foreground break-words line-clamp-2 flex-1">
                      {thread.title}
                    </p>
                    {getStatusDisplay(thread.id) && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-xs text-primary font-medium">
                          {getStatusDisplay(thread.id)?.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {thread.updatedAt ? formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true }) : 'recently'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      data-testid={`button-thread-menu-${thread.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Thread actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      data-testid={`button-rename-thread-${thread.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameThread(thread.id, thread.title);
                      }}
                    >
                      <Pencil className="mr-2 w-4 h-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid={`button-delete-thread-${thread.id}`}
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation? This action cannot be undone.")) {
                          onDeleteThread(thread.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
