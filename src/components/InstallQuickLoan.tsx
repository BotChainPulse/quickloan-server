import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function InstallQuickLoan() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const completed = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", completed);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", completed); };
  }, []);
  if (installed) return null;
  return <section className="rounded-xl border p-6 space-y-3">
    <h2 className="text-xl font-semibold">Keep QuickLoan on your phone</h2>
    <p>Install the pilot website for a standalone app window. Signing in and viewing records require an internet connection.</p>
    {prompt ? <button className="rounded-lg border px-5 py-3 font-semibold" onClick={async () => {
      const current = prompt;
      setPrompt(null);
      try { await current.prompt(); await current.userChoice; } catch { /* Browser menu remains available. */ }
    }}>Install QuickLoan</button> : <p className="text-sm text-muted-foreground">In a supported browser, choose “Install app” or “Add to Home Screen” from its menu. On iPhone, use Safari’s Share menu → Add to Home Screen.</p>}
  </section>;
}
