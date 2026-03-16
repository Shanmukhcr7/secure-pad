import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force LTR at the document level before React mounts.
// This prevents bidi auto-detection (triggered by unicode in the Matrix rain canvas)
// from flipping the entire document to RTL.
document.documentElement.setAttribute("dir", "ltr");
document.documentElement.setAttribute("lang", "en");

createRoot(document.getElementById("root")!).render(<App />);

