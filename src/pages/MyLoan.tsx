import { Link } from "react-router";
import BorrowerShell from "@/components/BorrowerShell";
import { useBorrower } from "@/hooks/useBorrower";
import { trpc } from "@/providers/trpc";
export default function MyLoan() {
  const account = useBorrower();
  const enabled = !!account.data?.authenticated;
  const requests = trpc.quickloan.myApplications.useQuery(undefined, {
    enabled,
    retry: false,
  });
  const notices = trpc.quickloan.myNotifications.useQuery(undefined, {
    enabled,
    retry: false,
  });
  return (
    <BorrowerShell>
      <h1 className="text-2xl font-black">My requests</h1>
      <p className="mt-2 text-sm text-slate-600">
        An application decision and a payment confirmation are separate. This
        pilot does not disburse or collect money.
      </p>
      {account.isPending ? (
        <p className="mt-5">Checking your account…</p>
      ) : account.error ? (
        <p className="mt-5 text-red-700" role="alert">
          {account.error.message}
        </p>
      ) : !enabled ? (
        <Link
          to="/account"
          className="mt-5 inline-block rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white"
        >
          Sign in to view my requests
        </Link>
      ) : (
        <>
          {requests.isPending ? (
            <p className="mt-5" role="status">
              Loading your requests…
            </p>
          ) : requests.error ? (
            <p className="mt-5 text-red-700" role="alert">
              Could not load requests. Refresh and try again.
            </p>
          ) : requests.data?.length === 0 ? (
            <div className="mt-5 rounded-2xl border bg-white p-5">
              <h2 className="font-bold">No requests yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Older phone-only records cannot be claimed by entering a number.
                Ownership must be verified separately.
              </p>
              <Link
                className="mt-4 inline-block font-bold text-emerald-800 underline"
                to="/apply"
              >
                Start a pilot request
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {requests.data?.map(a => (
                <article
                  key={a.ref}
                  className="rounded-2xl border bg-white p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h2 className="break-all font-bold">{a.ref}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                      {a.status === "approved"
                        ? "Application approved"
                        : a.status === "rejected"
                          ? "Not approved"
                          : "Awaiting review"}
                    </span>
                  </div>
                  <p className="mt-3 text-xl font-bold">
                    UGX {Number(a.amount).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Requested period: {a.durationWeeks} weeks ·{" "}
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-sm">{a.purpose}</p>
                  {a.decisionNote ? (
                    <p className="mt-3 border-t pt-3 text-sm">
                      {a.decisionNote}
                    </p>
                  ) : null}
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-950">
                    No funded balance or repayment schedule is recorded. Do not
                    send money to an unverified destination.
                  </p>
                </article>
              ))}
            </div>
          )}
          {notices.error ? (
            <p className="mt-4 text-sm text-red-700">
              Updates are temporarily unavailable.
            </p>
          ) : notices.data?.length ? (
            <section className="mt-6">
              <h2 className="font-bold">Updates</h2>
              {notices.data.map(n => (
                <article
                  key={n.id}
                  className="mt-3 rounded-xl border bg-white p-3"
                >
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{n.body}</p>
                </article>
              ))}
            </section>
          ) : null}
        </>
      )}
    </BorrowerShell>
  );
}
