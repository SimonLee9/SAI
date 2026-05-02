import BrushStroke from "./BrushStroke";
import InkSeal from "./InkSeal";
import Logo from "./Logo";
import TraditionalBand from "./TraditionalBand";

export default function Footer() {
  return (
    <footer className="bg-ink text-paper">
      {/* 회문 hem — 한복 끝단처럼 surface 경계에 한 번. opacity로 은은하게. */}
      <TraditionalBand
        idSuffix="footer-top"
        className="block w-full h-1.5 text-paper/35"
      />
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-12 grid gap-8 md:grid-cols-3 items-start">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={28} className="text-paper" />
            <span className="font-bold tracking-wide">S.A.I</span>
            <span className="text-paper/60 text-sm">사이</span>
          </div>
          <p className="mt-3 text-sm text-paper/70 max-w-xs leading-relaxed">
            공간과 소리, 그 사이를 채우는 지능. Seoul, KR · 2026.
          </p>
          {/* 낙관 — single 인주 punctuation in the otherwise mono footer. */}
          <InkSeal size={48} className="mt-6 text-injoo" />
        </div>

        <nav className="text-sm">
          <p className="text-xs tracking-widest text-paper/50">EXPLORE</p>
          <BrushStroke quality="najeon" idSuffix="ftr-explore" className="mt-1 block w-10 h-[5px]" />
          <ul className="mt-3 space-y-2">
            <li><a href="#features"  className="hover:text-paper transition-colors">Features</a></li>
            <li><a href="#showcase"  className="hover:text-paper transition-colors">Product</a></li>
            <li><a href="#lab"       className="hover:text-paper transition-colors">Sound Lab</a></li>
            <li><a href="#faq"       className="hover:text-paper transition-colors">FAQ</a></li>
          </ul>
        </nav>

        <nav className="text-sm">
          <p className="text-xs tracking-widest text-paper/50">CONNECT</p>
          <BrushStroke quality="najeon" idSuffix="ftr-connect" className="mt-1 block w-10 h-[5px]" />
          <ul className="mt-3 space-y-2">
            <li>
              <a
                href="https://github.com/SimonLee9/SAI"
                target="_blank"
                rel="noreferrer"
                className="hover:text-paper transition-colors"
              >
                GitHub
              </a>
            </li>
            <li>
              <a href="#waitlist" className="hover:text-paper transition-colors">
                사전 알림 신청
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-6 mt-12 pt-6 border-t border-paper/10 flex flex-col md:flex-row justify-between gap-2 text-xs text-paper/50">
        <span>© 2026 S.A.I — MIT Licensed (open source)</span>
        <span className="font-mono">v0.1.0 · Phase 0</span>
      </div>
    </footer>
  );
}
