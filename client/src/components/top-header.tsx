import { useState } from "react";
import { Search, MessageSquare, Trophy, User, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

interface TopHeaderProps {
  questionsAsked?: number;
  quizzesCompleted?: number;
  onSearch?: (query: string) => void;
}

export function TopHeader({ questionsAsked = 0, quizzesCompleted = 0, onSearch }: TopHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Left: Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2" data-testid="stat-questions">
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

        <div className="flex items-center gap-2" data-testid="stat-quizzes">
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
      <div className="flex-1 max-w-md mx-6">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations, topics, or documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-9 bg-background"
            data-testid="input-global-search"
          />
        </form>
      </div>

      {/* Right: Theme Toggle and User Menu */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="w-9 h-9"
          data-testid="button-theme-toggle"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>
        
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
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
            <DropdownMenuItem data-testid="menu-logout" className="text-destructive">
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
