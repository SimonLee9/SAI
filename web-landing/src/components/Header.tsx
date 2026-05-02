import Logo from "./Logo";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#showcase", label: "Product" },
  { href: "#lab",      label: "Sound Lab" },
  { href: "#faq",      label: "FAQ" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-paper/80 border-b border-paper-deep">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 text-ink hover:text-amber transition-colors">
          <Logo size={28} />
          <span className="font-bold tracking-wide">S.A.I</span>
          <span className="hidden sm:inline text-ink-mute text-sm">사이</span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-ink transition-colors">
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#waitlist"
          className="rounded-md bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-amber-deep transition-colors"
        >
          알림 받기
        </a>
      </div>
    </header>
  );
}
