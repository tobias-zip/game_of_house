import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { loadThemeName } from "./theme";
import "./index.css";

// Set before the first render so a stored light theme doesn't flash dark.
document.documentElement.dataset.theme = loadThemeName();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element in index.html");

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
