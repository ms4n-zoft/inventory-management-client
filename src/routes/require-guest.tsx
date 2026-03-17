import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/components/auth/auth-provider";

export function RequireGuest({ children }: PropsWithChildren) {
  const { isInitializing, session } = useAuth();

  if (isInitializing) {
    return null;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return children;
}
