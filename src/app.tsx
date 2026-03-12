import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import { OperationsApp } from "@/components/operations-app";

export function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <BrowserRouter>
        <div className="dark">
          <Routes>
            <Route path="/*" element={<OperationsApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  );
}
