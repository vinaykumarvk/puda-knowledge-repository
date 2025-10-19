import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, MessageSquarePlus, Search } from "lucide-react";
import { useState } from "react";
import type { Thread } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ThreadSidebarProps {
  onSelectThread: (thread: Thread) => void;
  onNewChat: () => void;
  onDeleteThread: (id: number) => void;
  selectedThreadId?: number;
}

export function ThreadSidebar({ onSelectThread, onNewChat, onDeleteThread, selectedThreadId }: ThreadSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: threads = [], isLoading } = useQuery<Thread[]>({
    queryKey: ["/api/threads"],
  });

  const filteredThreads = threads.filter((thread) =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <Button
          data-testid="button-new-chat"
          onClick={onNewChat}
          className="w-full gap-2"
          size="lg"
        >
          <MessageSquarePlus className="w-5 h-5" />
          New Chat
        </Button>

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
        <div className="p-2 space-y-1">
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
                className={`group relative flex items-center gap-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedThreadId === thread.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectThread(thread)}
                data-testid={`thread-item-${thread.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {thread.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  data-testid={`button-delete-thread-${thread.id}`}
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
