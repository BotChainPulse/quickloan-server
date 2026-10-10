import { Banknote, UserRound, ClipboardList, Home } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { ReactNode } from "react";

const links = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/apply", label: "Apply", Icon: Banknote },
  { to: "/status", label: "My requests", Icon: ClipboardList },
  { to: "/account", label: "Account", Icon: UserRound },
];

export default function BorrowerShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-950 pb-24">
      <header className="bg-[#0b5d3b] text-white px-4 py-4 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label="Quick Loan home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ffd34e] text-[#0b5d3b] font-black">
              QL
            </span>
            <div>
              <div className="font-black text-lg leading-none">Quick Loan</div>
              <div className="text-xs text-emerald-100 mt-1">
                Uganda · pilot
              </div>
            </div>
          </Link>
          <Link to="/account" aria-label="Your account">
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-5">
        {children}
        <footer className="mt-8 flex flex-wrap gap-4 border-t pt-4 text-xs text-slate-500">
          <Link to="/privacy">Privacy</Link>
          <Link to="/help">Help</Link>
          <Link to="/admin">Lender sign in</Link>
        </footer>
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur z-40">
        <div className="max-w-xl mx-auto grid grid-cols-4 h-16">
          {links.map(({ to, label, Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-[#0b5d3b]" : "text-slate-500"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
