import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate username is provided
    if (!username || username.trim() === "") {
      setError("Please enter a username");
      return;
    }
    
    setLoading(true);

    // TEMPORARY: Database unavailable - always use bypass mode
    console.warn("⚠️ Database unavailable - creating bypass session for:", username);
    
    // Store bypass user in localStorage
    const bypassUser = {
      id: `bypass-${username.toLowerCase()}`,
      username: username.trim(),
      fullName: username.trim(),
      team: "Development",
      email: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    console.log("✅ Bypass user created:", bypassUser);
    localStorage.setItem("bypass_user", JSON.stringify(bypassUser));
    
    // Small delay to show the loading state, then navigate to home
    setTimeout(() => {
      console.log("🔄 Navigating to home page...");
      window.location.href = "/";
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">WealthForce Knowledge Agent</CardTitle>
          <CardDescription>
            Sign in to access your enterprise AI assistant
          </CardDescription>
          
          {/* Database connectivity notice */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold mb-1">
              ⚠️ Database Bypass Mode Active
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Enter <strong>ANY username</strong> (admin, user, test, etc.) and <strong>ANY password</strong> to continue. All usernames work equally.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-signin"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              For access, contact your system administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
