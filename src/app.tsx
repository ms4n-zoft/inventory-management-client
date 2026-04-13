import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/components/auth/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OperationsApp } from "@/components/operations-app";
import { LoginPage } from "@/pages/login-page";
import { RequireAuth } from "@/routes/require-auth";
import { RequireGuest } from "@/routes/require-guest";

export function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <RequireGuest>
                  <LoginPage />
                </RequireGuest>
              }
            />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <OperationsApp />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  );
}
