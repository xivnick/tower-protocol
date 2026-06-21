import { BrowserRouter } from "react-router-dom";
import { AuthGate } from "./features/auth/AuthGate";
import { EnvironmentBanner, hasEnvironmentBanner } from "./features/environment/EnvironmentBanner";
import { UpdateBanner } from "./features/update/UpdateBanner";
import { ToastProvider } from "./features/toast/ToastProvider";

export function App() {
  return (
    <div className={`app-root ${hasEnvironmentBanner() ? "has-environment-banner" : ""}`}>
      <EnvironmentBanner />
      <BrowserRouter>
        <ToastProvider>
          <AuthGate />
          <UpdateBanner />
        </ToastProvider>
      </BrowserRouter>
    </div>
  );
}
