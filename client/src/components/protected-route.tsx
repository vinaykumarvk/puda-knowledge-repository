import { ReactNode, useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // RBAC postponed - bypass authentication for now
  const bypassAuth = true;

  if (bypassAuth) {
    // Wait for initial auth check
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    
    // In bypass mode, allow access regardless of user state
    // RBAC will be implemented later
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground">If this takes too long, there may be a database connectivity issue.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
