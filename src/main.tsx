import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  } else {
    window.addEventListener("load", () => {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        // Controlla nuove versioni quando l'app torna in primo piano
        // e almeno una volta l'ora (tablet/PC lasciati aperti a lungo).
        const check = () => reg.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        setInterval(check, 60 * 60 * 1000);
      });
      // Un nuovo service worker ha preso il controllo: i chunk vecchi non
      // esistono piu', quindi proponiamo di ricaricare (senza interrompere
      // uno scout in corso).
      if (hadController) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.dispatchEvent(new Event("app-update-ready"));
        });
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
