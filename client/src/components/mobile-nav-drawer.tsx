import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Compass, Wrench, Brain, Map, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AIConfig } from "@/components/ai-config-sidebar";

const navItems = [
  {
    name: "Conversation",
    path: "/",
    icon: Compass,
    description: "Chat with the knowledge agent"
  },
  {
    name: "Launchpad",
    path: "/workshop",
    icon: Wrench,
    description: "Interactive tools and utilities"
  },
  {
    name: "Quiz",
    path: "/quiz",
    icon: Brain,
    description: "Test your knowledge"
  },
  {
    name: "Atlas",
    path: "/atlas",
    icon: Map,
    description: "Knowledge map and resources"
  }
];

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  aiConfig?: AIConfig;
  onAIConfigChange?: (config: AIConfig) => void;
}

export function MobileNavDrawer({ isOpen, onClose, aiConfig, onAIConfigChange }: MobileNavDrawerProps) {
  const [location] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<AIConfig>(
    aiConfig || {
      model: "GPT-4o",
      temperature: 0.7,
      hops: 3,
      tokenLimit: 2048,
      systemPrompt: "You are a helpful PUDA urban administration AI assistant.",
    }
  );

  useEffect(() => {
    if (aiConfig) {
      setLocalConfig(aiConfig);
    }
  }, [aiConfig]);

  const updateConfig = (updates: Partial<AIConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onAIConfigChange?.(newConfig);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        data-testid="mobile-menu-backdrop"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 md:hidden transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="mobile-menu-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Navigation</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-9 h-9"
            data-testid="button-close-menu"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col p-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
                data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                aria-label={item.name}
              >
                <Icon className="w-5 h-5" />
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs opacity-70">{item.description}</span>
                </div>
              </Link>
            );
          })}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-3 rounded-lg border-t border-border p-3 pt-4 text-left text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="mobile-nav-settings"
          >
            <Settings className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="font-medium">Settings</span>
              <span className="text-xs opacity-70">AI configuration</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="h-[85vh] md:hidden">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              AI Configuration
            </SheetTitle>
            <SheetDescription>
              Customize AI model settings and behavior
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 overflow-y-auto h-[calc(100%-80px)]">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="mobile-model-select">LLM Model</Label>
              <Select
                value={localConfig.model}
                onValueChange={(value) => updateConfig({ model: value })}
              >
                <SelectTrigger id="mobile-model-select" data-testid="mobile-select-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GraphRAG">GraphRAG</SelectItem>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                  <SelectItem value="GPT-5">GPT-5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-temperature-slider">Temperature</Label>
                <span className="text-sm font-mono text-muted-foreground" data-testid="mobile-text-temperature-value">
                  {localConfig.temperature.toFixed(2)}
                </span>
              </div>
              <Slider
                id="mobile-temperature-slider"
                data-testid="mobile-slider-temperature"
                value={[localConfig.temperature]}
                onValueChange={([value]) => updateConfig({ temperature: value })}
                min={0}
                max={2}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Hops Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-hops-slider">Hops</Label>
                <span className="text-sm font-mono text-muted-foreground" data-testid="mobile-text-hops-value">
                  {localConfig.hops}
                </span>
              </div>
              <Slider
                id="mobile-hops-slider"
                data-testid="mobile-slider-hops"
                value={[localConfig.hops]}
                onValueChange={([value]) => updateConfig({ hops: value })}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            {/* Token Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-token-limit">Token Limit</Label>
                <span className="text-sm font-mono text-muted-foreground" data-testid="mobile-text-token-limit-value">
                  {localConfig.tokenLimit.toLocaleString()}
                </span>
              </div>
              <Input
                id="mobile-token-limit"
                type="number"
                data-testid="mobile-input-token-limit"
                value={localConfig.tokenLimit}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setLocalConfig({ ...localConfig, tokenLimit: value });
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    const clampedValue = Math.max(128, Math.min(32000, value));
                    updateConfig({ tokenLimit: clampedValue });
                  }
                }}
                min={128}
                max={32000}
                step={128}
                className="w-full"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="mobile-system-prompt">System Prompt</Label>
              <Textarea
                id="mobile-system-prompt"
                data-testid="mobile-textarea-system-prompt"
                value={localConfig.systemPrompt}
                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                className="min-h-[100px] resize-none font-mono text-sm"
                placeholder="Enter custom system prompt..."
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
