import BorrowerShell from "@/components/BorrowerShell";
import { Link } from "react-router";
export default function Help() {
  return (
    <BorrowerShell>
      <h1 className="text-2xl font-black">Safety and help</h1>
      <div className="mt-5 space-y-5 rounded-2xl border bg-white p-5">
        <section>
          <h2 className="font-bold">What is available?</h2>
          <p className="mt-2 text-sm leading-6">
            Pilot accounts, private review requests and an illustrative
            repayment planner. Identity verification, SMS recovery, actual
            lending and mobile-money collections are not connected.
          </p>
        </section>
        <section>
          <h2 className="font-bold">If repayment becomes difficult</h2>
          <p className="mt-2 text-sm leading-6">
            Contact your lender before the due date to discuss hardship support.
            A rescheduled plan must be documented; sending a message does not
            change an agreed due date.
          </p>
        </section>
        <section>
          <h2 className="font-bold">Protect yourself</h2>
          <p className="mt-2 text-sm leading-6">
            Never give Quick Loan your mobile-money PIN. Verify the recipient
            and a provider-confirmed receipt before considering a payment
            successful. References are not guarantors. Do not pay a fee to
            unlock a pilot request.
          </p>
        </section>
        <section>
          <h2 className="font-bold">Questions or a complaint</h2>
          <a
            href="mailto:botchainpulse@gmail.com?subject=Quick%20Loan%20pilot%20support"
            className="mt-2 inline-block text-sm font-bold text-emerald-800 underline"
          >
            Email pilot support
          </a>
          <p className="mt-2 text-xs text-slate-500">
            Include your request reference only. Do not email passwords,
            mobile-money PINs or ID photographs.
          </p>
        </section>
        <Link
          to="/privacy"
          className="block text-sm font-bold text-emerald-800 underline"
        >
          Privacy and deletion requests
        </Link>
      </div>
    </BorrowerShell>
  );
}
