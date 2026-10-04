import { Link } from "react-router";
import InstallQuickLoan from "../components/InstallQuickLoan";

export default function Pilot() {
  return <main className="min-h-screen bg-background px-5 py-16 text-foreground">
    <div className="mx-auto max-w-2xl space-y-8">
      <p className="text-sm font-semibold tracking-widest text-muted-foreground">QUICKLOAN · UGANDA</p>
      <h1 className="text-4xl font-bold">Clear information. Responsible lending.</h1>
      <p className="text-lg">QuickLoan is being prepared for a controlled pilot. It is not currently accepting new loan applications or sending loan funds.</p>
      <section className="rounded-xl border p-6 space-y-3">
        <h2 className="text-xl font-semibold">Before lending opens</h2>
        <p>Verified identity, affordability checks, transparent costs, accepted agreements and tested repayments must be in place. Operator and licensing details will be published before any live lending offer.</p>
        <p>Do not send a processing fee, payment, password or identity document to anyone claiming to activate a QuickLoan loan.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Existing pilot records</h2>
        <p>Existing records are restricted to verified account holders. An approved review is not proof of a transfer. The borrower app is being updated for secure sign-in.</p>
      </section>
      <Link to="/login" className="inline-block rounded-lg border px-5 py-3">Authorised lender sign-in</Link>
      <InstallQuickLoan />
      <p className="text-sm text-muted-foreground">Pilot preparation — not affiliated with Botim or CashNow.</p>
    </div>
  </main>;
}
