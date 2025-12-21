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
    
    // Validate inputs
    if (!username || username.trim() === "") {
      setError("Please enter a username");
      return;
    }
    
    if (!password || password.trim() === "") {
      setError("Please enter a password");
      return;
    }
    
    setLoading(true);

    try {
      // Call the real login API endpoint
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }),
        credentials: "include", // Important: Include cookies
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Login failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("✅ Login successful:", data.user.username);
      
      // Clear any old bypass user
      localStorage.removeItem("bypass_user");
      
      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">WealthForce Knowledge Agent</CardTitle>
          <CardDescription>
            Sign in to access your enterprise AI assistant
          </CardDescription>
          
          {/* Test accounts notice */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200 font-semibold mb-1">
              📋 Test Accounts
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
              <span className="block">• <code className="font-mono">john_ba</code> / <code className="font-mono">password123</code></span>
              <span className="block">• <code className="font-mono">M1</code> / <code className="font-mono">password123</code> (Manager)</span>
              <span className="block">• <code className="font-mono">M2</code> / <code className="font-mono">password123</code> (Manager)</span>
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
                autoComplete="username"
                spellCheck={false}
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
                autoComplete="current-password"
                data-testid="input-password"
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
              <div
                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                role="alert"
                aria-live="polite"
              >
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
    </main>
  );
}
