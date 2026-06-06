import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AdminViewModeProvider } from "./contexts/AdminViewModeContext";
import { FeedbackProvider } from "./contexts/FeedbackContext";
import { ImplicitFeedbackWidget } from "./components/feedback/ImplicitFeedbackWidget";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <AdminViewModeProvider>
        <FeedbackProvider>
          <RouterProvider router={router} />
          <ImplicitFeedbackWidget />
        </FeedbackProvider>
      </AdminViewModeProvider>
      <Toaster richColors closeButton theme="system" />
    </AuthProvider>
  );
}