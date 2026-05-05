import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AdminViewModeProvider } from "./contexts/AdminViewModeContext";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <AdminViewModeProvider>
        <RouterProvider router={router} />
      </AdminViewModeProvider>
      <Toaster richColors closeButton theme="system" />
    </AuthProvider>
  );
}