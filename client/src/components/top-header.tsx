import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  MessageSquare,
  Trophy,
  User,
  Sun,
  Moon,
  Menu,
  LogOut,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { Thread } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/theme-provider";
import { MasteryBar } from "@/components/mastery-bar";
import { useAuth } from "@/contexts/auth-context";
import { conversationStarterCategories } from "@/constants/conversation-starters";

interface TopHeaderProps {
  questionsAsked?: number;
  quizzesCompleted?: number;
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

export function TopHeader({ questionsAsked = 0, quizzesCompleted = 0, onSearch, onMenuClick }: TopHeaderProps) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [isMac, setIsMac] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { data: threads = [] } = useQuery<Thread[]>({
    queryKey: ["/api/threads"],
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMac(/Mac|iPod|iPhone|iPad/.test(window.navigator.platform));
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const starterPrompts = useMemo(
    () =>
      conversationStarterCategories.flatMap((category) =>
        category.prompts.slice(0, 3).map((prompt) => ({
          prompt,
          category: category.category,
        })),
      ),
    [],
  );

  const recentThreads = useMemo(
    () =>
      [...threads]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [threads],
  );

  const handleCommandSelect = (value: string) => {
    onSearch?.(value);
    setIsCommandOpen(false);
    setCommandQuery("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(commandQuery);
    setIsCommandOpen(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
      {/* Left: Hamburger Menu (Mobile) + Stats */}
      <div className="flex items-center gap-3 md:gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden w-9 h-9"
          data-testid="button-mobile-menu"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-2" data-testid="stat-questions">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Questions</span>
            <span className="text-sm font-medium text-foreground" data-testid="text-questions-count">
              {questionsAsked.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2" data-testid="stat-quizzes">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Quizzes</span>
            <span className="text-sm font-medium text-foreground" data-testid="text-quizzes-count">
              {quizzesCompleted.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-2 sm:mx-6">
        <form onSubmit={handleSearch} className="relative">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground"
            data-testid="input-global-search"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Search conversations, documents, or prompts
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              {isMac ? "⌘" : "Ctrl"}
              <span className="font-sans">K</span>
            </span>
          </button>
        </form>
      </div>

      {/* Right: Mastery Bar, Theme Toggle and User Menu */}
      <div className="flex items-center gap-3">
        <MasteryBar />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              title="View help resources"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Browse guided tours and release notes</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9"
              data-testid="button-user-menu"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <User className="w-5 h-5 text-primary" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <p className="text-xs leading-none text-primary mt-1">Team: {user?.team}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-profile">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-preferences">
              Preferences
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-history">
              View History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme} data-testid="menu-theme-toggle">
              {theme === "light" ? (
                <>
                  <Moon className="mr-2 h-4 w-4" /> Switch to dark theme
                </>
              ) : (
                <>
                  <Sun className="mr-2 h-4 w-4" /> Switch to light theme
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="menu-logout"
              className="text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput
          placeholder="Search for threads, documents, or prompt starters..."
          value={commandQuery}
          onValueChange={setCommandQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => handleCommandSelect("Start a fresh conversation")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start a new conversation
              <CommandShortcut>{isMac ? "⌘" : "Ctrl"}+N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("Show mastery dashboard")}>
              <Trophy className="mr-2 h-4 w-4" />
              Open mastery dashboard
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {recentThreads.length > 0 && (
            <CommandGroup heading="Recent Threads">
              {recentThreads.map((thread) => (
                <CommandItem
                  key={thread.id}
                  value={thread.title}
                  onSelect={() => handleCommandSelect(`Open thread: ${thread.title}`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{thread.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Prompt Starters">
            {starterPrompts.map((starter) => (
              <CommandItem
                key={`${starter.category}-${starter.prompt}`}
                onSelect={() => handleCommandSelect(starter.prompt)}
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{starter.prompt}</span>
                  <span className="text-xs text-muted-foreground">{starter.category}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
