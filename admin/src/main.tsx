import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./shared/assets/styles.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./app/App.tsx";
import { AppWrapper } from "./shared/ui/common/PageMeta.tsx";
import { ThemeProvider } from "@shared/contexts/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <App />
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>,
);
