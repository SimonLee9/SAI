import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import FAQPage from "./pages/FAQPage";
import FeaturesPage from "./pages/FeaturesPage";
import Home from "./pages/Home";
import LabPage from "./pages/LabPage";
import ProductPage from "./pages/ProductPage";
import StudioPage from "./pages/StudioPage";
import TunerPage from "./pages/TunerPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/"          element={<Home />} />
          <Route path="/features"  element={<FeaturesPage />} />
          <Route path="/product"   element={<ProductPage />} />
          <Route path="/lab"       element={<LabPage />} />
          <Route path="/studio"    element={<StudioPage />} />
          <Route path="/tuner"     element={<TunerPage />} />
          <Route path="/faq"       element={<FAQPage />} />
          {/* Unknown paths fall back to Home rather than blanking out. */}
          <Route path="*"          element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
