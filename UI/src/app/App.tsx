import { RouterProvider } from "react-router";
import { router } from "./routes";
import { PasswordGate } from "./components/PasswordGate";

export default function App() {
  return (
    <PasswordGate>
      <RouterProvider router={router} />
    </PasswordGate>
  );
}