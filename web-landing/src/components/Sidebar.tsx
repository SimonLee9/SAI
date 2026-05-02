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
 * Sidebar — desktop only. Mobile uses the top-bar nav inside Header.
 *
 * No ASCII tree glyphs. The "you are here" signal is a single 인주
 * vermilion dot to the left of the active label — matching the brand
 * principle of one point of colour to mark importance. Inactive rows
 * reserve the same dot width so the labels never shift horizontally
 * when navigation changes.
 */
export default function Sidebar() {
  return (
    <aside
      className="hidden md:block w-56 shrink-0 border-r border-paper-deep bg-paper-soft/40 sticky top-16 self-start"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <nav className="px-5 py-8 font-mono text-sm overflow-y-auto h-full">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">사이</p>
        <BrushStroke quality="najeon" idSuffix="sb" className="mt-1 block w-8 h-[5px]" />

        <ul className="mt-6 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className="block">
                {({ isActive }) => (
                  <span
                    className={
                      "flex items-center gap-3 px-2 py-1.5 rounded transition-colors " +
                      (isActive ? "bg-paper-deep" : "hover:bg-paper-deep/50")
                    }
                  >
                    {/* Reserved width — only the active row paints in 인주. */}
                    <span
                      aria-hidden
                      className={
                        "w-1.5 h-1.5 rounded-full shrink-0 transition-colors " +
                        (isActive ? "bg-injoo" : "bg-transparent")
                      }
                    />
                    <span
                      className={
                        isActive
                          ? "text-ink-heavy font-semibold"
                          : "text-ink-soft hover:text-ink"
                      }
                    >
                      {item.label}
                    </span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-10 pl-5">
          <p className="text-[10px] tracking-widest text-ink-mute uppercase">v0.1.0</p>
          <p className="text-[10px] tracking-widest text-ink-mute uppercase">Phase 0</p>
        </div>
      </nav>
    </aside>
  );
}
