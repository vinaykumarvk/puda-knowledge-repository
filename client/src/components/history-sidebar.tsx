import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Conversation } from "@shared/schema";

interface HistorySidebarProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: number;
}

export function HistorySidebar({ onSelectConversation, selectedId }: HistorySidebarProps) {
  const { toast } = useToast();

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
    deleteMutation.mutate(id);
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
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium uppercase tracking-wide">Chat History</h2>
        <p className="text-xs text-muted-foreground mt-1">{conversations.length} conversations</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-2" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                data-testid={`conversation-${conversation.id}`}
                onClick={() => onSelectConversation(conversation)}
                className={`w-full text-left p-3 rounded-lg border transition-colors group hover-elevate ${
                  selectedId === conversation.id
                    ? "border-primary bg-primary/10"
                    : "border-card-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conversation.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.createdAt), "MMM d, h:mm a")}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {conversation.mode}
                      </span>
                    </div>
                  </div>
                  <Button
                    data-testid={`delete-conversation-${conversation.id}`}
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={(e) => handleDelete(e, conversation.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
