import { NavLink } from "react-router-dom";
import BrushStroke from "./BrushStroke";

type NavItem = { to: string; label: string; end?: boolean };

const NAV_ITEMS: NavItem[] = [
  { to: "/",         label: "Home",      end: true },
  { to: "/features", label: "Features"  },
  { to: "/product",  label: "Product"   },
  { to: "/lab",      label: "Sound Lab" },
  { to: "/faq",      label: "FAQ"       },
];

/**
 * Tree-style sidebar — desktop only. Mobile gets the top-bar nav inside
 * Header. The branch glyphs (├─ / └─) are rendered as actual characters
 * in the mono font so they stay aligned at any zoom.
 */
export default function Sidebar() {
  return (
    <aside
      className="hidden md:block w-56 shrink-0 border-r border-paper-deep bg-paper-soft/40 sticky top-16 self-start"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <nav className="px-5 py-8 font-mono text-sm overflow-y-auto h-full">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">사이</p>
        <BrushStroke className="mt-1 block w-8 h-[5px] text-ink-soft" idSuffix="sb" />

        <ul className="mt-5 space-y-0.5">
          {NAV_ITEMS.map((item, i) => {
            const isLast = i === NAV_ITEMS.length - 1;
            return (
              <li key={item.to} className="flex items-baseline gap-1.5 leading-7">
                <span className="select-none text-ink-mute" aria-hidden>
                  {isLast ? "└─" : "├─"}
                </span>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    "flex-1 px-2 py-0.5 rounded transition-colors " +
                    (isActive
                      ? "text-ink-heavy font-semibold bg-paper-deep"
                      : "text-ink-soft hover:text-ink hover:bg-paper-deep/50")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 pl-5">
          <p className="text-[10px] tracking-widest text-ink-mute uppercase">v0.1.0</p>
          <p className="text-[10px] tracking-widest text-ink-mute uppercase">Phase 0</p>
        </div>
      </nav>
    </aside>
  );
}
