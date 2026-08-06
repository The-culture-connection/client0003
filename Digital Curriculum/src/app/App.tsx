import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AdminViewModeProvider } from "./contexts/AdminViewModeContext";
import { FeedbackProvider } from "./contexts/FeedbackContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { Toaster } from "sonner";

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors closeButton theme={theme} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminViewModeProvider>
          <FeedbackProvider>
            <RouterProvider router={router} />
          </FeedbackProvider>
        </AdminViewModeProvider>
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
