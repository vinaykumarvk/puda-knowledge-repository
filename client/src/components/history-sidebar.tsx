import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, MessageSquare, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Conversation } from "@shared/schema";

interface HistorySidebarProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: number;
}

export function HistorySidebar({ onSelectConversation, selectedId }: HistorySidebarProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Deleted",
        description: "Conversation removed from history",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this conversation? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesSearch = conv.question.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMode = modeFilter === "all" || conv.mode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [conversations, searchQuery, modeFilter]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setModeFilter("all");
  };

  if (isLoading) {
    return (
      <div className="w-80 border-r border-border bg-card p-4">
        <div className="space-y-2">
          <div className="h-16 bg-muted rounded animate-pulse"></div>
          <div className="h-16 bg-muted rounded animate-pulse"></div>
          <div className="h-16 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border space-y-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide">Chat History</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredConversations.length} of {conversations.length} conversations
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-history"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {searchQuery && (
              <Button
                data-testid="button-clear-search"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={handleClearSearch}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger data-testid="select-mode-filter" className="h-9">
              <SelectValue placeholder="Filter by mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="deep">Deep</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-2" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Search className="w-12 h-12 mb-2" />
              <p className="text-sm text-center px-4">No conversations match your filters</p>
              <Button
                data-testid="button-reset-filters"
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`w-full p-3 rounded-lg border transition-colors group hover-elevate ${
                  selectedId === conversation.id
                    ? "border-primary bg-primary/10"
                    : "border-card-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    data-testid={`conversation-${conversation.id}`}
                    onClick={() => onSelectConversation(conversation)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium truncate">{conversation.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.createdAt), "MMM d, h:mm a")}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {conversation.mode}
                      </span>
                    </div>
                  </button>
                  <Button
                    data-testid={`delete-conversation-${conversation.id}`}
                    variant="ghost"
                    size="icon"
                    className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                    onClick={(e) => handleDelete(e, conversation.id)}
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
