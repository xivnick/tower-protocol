import { AuthGate } from "./features/auth/AuthGate";
import { UpdateBanner } from "./features/update/UpdateBanner";

export function App() {
  return (
    <>
      <AuthGate />
      <UpdateBanner />
    </>
  );
}
