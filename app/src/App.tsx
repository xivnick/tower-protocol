import { BrowserRouter } from "react-router-dom";
import { AuthGate } from "./features/auth/AuthGate";
import { UpdateBanner } from "./features/update/UpdateBanner";

export function App() {
  return (
    <BrowserRouter>
      <AuthGate />
      <UpdateBanner />
    </BrowserRouter>
  );
}
