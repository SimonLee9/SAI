import { useEffect, useState } from "react";

const STORAGE_KEY = "sai.theme";

type Theme = "light" | "dark";

function readSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readInitialTheme(): Theme {
  // Stay in sync with the no-flash script in index.html.
  const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as
    | Theme
    | null;
  if (saved === "light" || saved === "dark") return saved;
  return readSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  // Track whether the user has chosen — until they do, follow system.
  const [explicit, setExplicit] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== null,
  );

  useEffect(() => {
    applyTheme(theme);
    if (explicit) {
      localStorage.setItem(STORAGE_KEY, theme);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [theme, explicit]);

  // While following system, react to its changes.
  useEffect(() => {
    if (explicit) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setTheme(readSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [explicit]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        setExplicit(true);
        setTheme(isDark ? "light" : "dark");
      }}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드" : "다크 모드"}
      className="rounded-md border border-ink/15 p-2 text-ink hover:bg-ink hover:text-paper transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {isDark ? (
          // Sun — clicking goes to light
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          // Crescent moon — clicking goes to dark
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}
