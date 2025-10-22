import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./shared/assets/styles.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./app/App.tsx";
import { AppWrapper } from "./shared/ui/common/PageMeta.tsx";
import { ThemeProvider } from "@shared/contexts/ThemeContext";

const apiBaseFromEnv =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_BACKEND_URL ??
  "";
const API_BASE_URL = apiBaseFromEnv ? apiBaseFromEnv.replace(/\/$/, "") : "";

if (API_BASE_URL && typeof window !== "undefined" && typeof window.fetch === "function") {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === "string") {
      if (input.startsWith("http://") || input.startsWith("https://")) {
        return originalFetch(input, init);
      }

      const normalizedPath = input.startsWith("/")
        ? input
        : `/${input}`;

      return originalFetch(`${API_BASE_URL}${normalizedPath}`, init);
    }

    return originalFetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <App />
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>,
);
