import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset scroll on route change. React Router doesn't do this by default —
 * without it, navigating from FAQ (scrolled to bottom) to Home keeps the
 * scroll position, which feels broken.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // If the URL has a hash, defer to the browser's anchor behaviour
      // (and re-run after the route's element has mounted).
      const id = hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
