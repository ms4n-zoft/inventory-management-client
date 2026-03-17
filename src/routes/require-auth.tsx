import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/components/auth/auth-provider";

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          Checking your inventory session.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          One moment while access is verified.
        </p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { isInitializing, session } = useAuth();

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
