import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Download, Calculator, ShieldCheck } from "lucide-react";
import BorrowerShell from "@/components/BorrowerShell";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function BorrowerHome() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return (
    <BorrowerShell>
      <section className="rounded-3xl bg-gradient-to-br from-[#0b5d3b] to-[#063d29] p-6 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-[#ffd34e]">
          Quick Loan · Uganda pilot
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight">
          Plan first.
          <br />
          Borrow responsibly.
        </h1>
        <p className="mt-3 text-sm leading-6 text-emerald-50">
          Explore repayments, create your own account and send a request for
          review. Real loans and payments are not available in this pilot.
        </p>
        <Link
          to="/apply"
          className="mt-6 flex items-center justify-between rounded-2xl bg-[#ffd34e] px-5 py-4 font-black text-[#12372a]"
        >
          Request a review <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/calculator" className="rounded-2xl border bg-white p-4">
          <Calculator className="h-6 w-6 text-emerald-800" />
          <h2 className="mt-3 font-bold">Repayment planner</h2>
          <p className="mt-1 text-xs text-slate-500">
            Explore the cost before borrowing
          </p>
        </Link>
        <Link to="/status" className="rounded-2xl border bg-white p-4">
          <ShieldCheck className="h-6 w-6 text-emerald-800" />
          <h2 className="mt-3 font-bold">My requests</h2>
          <p className="mt-1 text-xs text-slate-500">Private account access</p>
        </Link>
      </div>
      <section className="mt-5 rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Before you borrow</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Keep rent, food and existing repayments in your budget.</li>
          <li>Check total repayment and dates, not just the rate.</li>
          <li>Never share your Airtel Money or MTN MoMo PIN.</li>
          <li>
            Your references are not automatically responsible for your debt.
          </li>
        </ul>
        <Link
          to="/help"
          className="mt-3 inline-block text-sm font-bold text-emerald-800 underline"
        >
          Safety and repayment help
        </Link>
      </section>
      <button
        type="button"
        onClick={async () => {
          if (install) {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }
        }}
        disabled={!install}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left disabled:opacity-70"
      >
        <Download className="h-5 w-5" />
        <span>
          <strong className="block text-sm">Install Quick Loan</strong>
          <span className="text-xs text-slate-500">
            {install
              ? "Add this app to your home screen"
              : "Open in Chrome, then menu → Install app"}
          </span>
        </span>
      </button>
    </BorrowerShell>
  );
}
