import { Outlet } from "react-router-dom";

import Footer from "./components/Footer";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import Sidebar from "./components/Sidebar";
import Waitlist from "./components/Waitlist";

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <ScrollToTop />
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
          {/* Always-on conversion surface — the waitlist anchors every page. */}
          <Waitlist />
        </main>
      </div>
      <Footer />
    </div>
  );
}
