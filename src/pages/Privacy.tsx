import { useState } from "react";
import { Link } from "react-router";
import BorrowerShell from "@/components/BorrowerShell";
import { useBorrower } from "@/hooks/useBorrower";
import { trpc } from "@/providers/trpc";
export default function Privacy() {
  const account = useBorrower();
  const [sent, setSent] = useState(false);
  const deletion = trpc.quickloan.requestDeletion.useMutation({
    onSuccess: () => setSent(true),
  });
  return (
    <BorrowerShell>
      <h1 className="text-2xl font-black">Pilot privacy notice</h1>
      <p className="mt-2 text-xs text-slate-500">Updated 10 October 2026</p>
      <div className="mt-5 space-y-5 rounded-2xl border bg-white p-5 text-sm leading-6">
        <section>
          <h2 className="font-bold">Who handles your information</h2>
          <p>
            This Quick Loan pilot is managed by Reagan Lutwama / BotChainPulse.
            Contact{" "}
            <a className="underline" href="mailto:botchainpulse@gmail.com">
              botchainpulse@gmail.com
            </a>{" "}
            for privacy questions. It is not represented as a licensed lending
            service.
          </p>
        </section>
        <section>
          <h2 className="font-bold">What we collect and why</h2>
          <p>
            Your account mobile number and a salted password hash enable private
            sign-in. If you send a pilot request, we store your name, district,
            occupation, self-reported budget, requested amount and three
            references that you provide with their permission, to review the
            workflow and affordability. We do not request your national ID,
            selfie, contacts list, SMS history or mobile-money PIN in this
            pilot.
          </p>
        </section>
        <section>
          <h2 className="font-bold">Storage and access</h2>
          <p>
            Render hosts the service and TiDB stores its database in Frankfurt,
            Germany. New reference and budget details are encrypted by the
            application before storage. Authorized lender staff can view request
            details; other borrower accounts cannot. A secure session cookie is
            used for login and a service worker caches public interface assets,
            not account or API responses. No advertising or analytics SDK is
            included in this PWA.
          </p>
        </section>
        <section>
          <h2 className="font-bold">Your choices</h2>
          <p>
            You may use the planner without registering. Sending a pilot request
            does not authorize contacting references, sharing information with a
            credit bureau, lending or collecting money. Ask for access,
            correction, withdrawal of consent or deletion through support. No
            retention period for production lending has been finalized; it must
            be set before launch.
          </p>
        </section>
        <section>
          <h2 className="font-bold">Request deletion</h2>
          <p>
            A signed-in request is recorded for operator review; it does not
            immediately erase records. Support will explain any retention
            requirement before completing it. Requests are not automatically
            considered fulfilled.
          </p>
          {account.data?.authenticated ? (
            sent ? (
              <p className="mt-3 font-bold text-emerald-800" role="status">
                Deletion request recorded for review.
              </p>
            ) : (
              <button
                className="mt-3 rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700"
                disabled={deletion.isPending}
                onClick={() => deletion.mutate()}
              >
                Request account and pilot-data deletion
              </button>
            )
          ) : (
            <Link
              className="mt-3 inline-block underline text-emerald-800"
              to="/account"
            >
              Sign in to request deletion
            </Link>
          )}
          {deletion.error ? (
            <p className="text-red-700" role="alert">
              Could not record the request. Contact support.
            </p>
          ) : null}
        </section>
      </div>
    </BorrowerShell>
  );
}
