import { Link, NavLink } from "react-router-dom";

import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import TraditionalBand from "./TraditionalBand";

// Mobile-only nav: tree sidebar collapses on small screens, so the
// nav lives in a horizontal scroller in the header instead.
const MOBILE_NAV = [
  { to: "/",         label: "Home",      end: true },
  { to: "/features", label: "Features"  },
  { to: "/product",  label: "Product"   },
  { to: "/lab",      label: "Lab"       },
  { to: "/studio",   label: "Studio"    },
  { to: "/tuner",    label: "Tuner"     },
  { to: "/faq",      label: "FAQ"       },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-paper/80">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-ink hover:text-ink-soft transition-colors shrink-0"
        >
          <Logo size={28} />
          <span className="font-bold tracking-wide">S.A.I</span>
          <span className="hidden sm:inline text-ink-mute text-sm">사이</span>
        </Link>

        {/* Mobile-only horizontal nav. Desktop relies on the left sidebar. */}
        <nav className="md:hidden flex-1 min-w-0 overflow-x-auto">
          <ul className="flex items-center gap-4 text-xs">
            {MOBILE_NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    "py-1 transition-colors " +
                    (isActive ? "text-ink font-semibold" : "text-ink-soft")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {/* Anchors to the in-page Waitlist that's mounted at the bottom of
              every route by App.tsx — works on any page. */}
          <a
            href="#waitlist"
            className="rounded-md bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            알림 받기
          </a>
        </div>
      </div>
      {/* 회문 chrome trim — replaces the previous flat border. Subtler than
          Footer's prominent band so the page bottom stays the dominant trim. */}
      <TraditionalBand
        idSuffix="header-bot"
        className="block w-full h-[3px] text-ink-soft/35"
      />
    </header>
  );
}
