import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/auth/AuthProvider";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors closeButton theme="system" />
    </AuthProvider>
  );
}