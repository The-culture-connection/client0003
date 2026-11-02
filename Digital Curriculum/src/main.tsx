
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // A preloaded chunk 404s when a new deploy replaced it while this tab was
  // open. Reload once to pick up the new build instead of showing a broken page.
  window.addEventListener("vite:preloadError", (event) => {
    const key = "mortar:preload-reload-at";
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(key) ?? 0);
    } catch {
      /* storage unavailable */
    }
    if (Date.now() - last > 30_000) {
      event.preventDefault();
      try {
        sessionStorage.setItem(key, String(Date.now()));
      } catch {
        /* storage unavailable */
      }
      window.location.reload();
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  