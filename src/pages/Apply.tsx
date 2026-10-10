import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import BorrowerShell from "@/components/BorrowerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { useBorrower } from "@/hooks/useBorrower";
import { applicationInput, CONSENT_VERSION } from "@contracts/loan-policy";
function Field({
  label,
  name,
  type = "text",
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        min={min}
        max={max}
        required
        maxLength={type === "tel" ? 24 : 100}
      />
    </div>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-white p-4">
      <h2 className="font-bold text-emerald-900">{title}</h2>
      {children}
    </section>
  );
}
export default function Apply() {
  const account = useBorrower();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const submit = trpc.quickloan.submit.useMutation({
    onSuccess: () => navigate("/status"),
    onError: e => setError(e.message),
  });
  function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const data = applicationInput.safeParse({
      ...values,
      amount: Number(values.amount),
      durationWeeks: Number(values.durationWeeks),
      monthlyIncome: Number(values.monthlyIncome),
      monthlyExpenses: Number(values.monthlyExpenses),
      existingDebtPayments: Number(values.existingDebtPayments),
      adultConfirmed: values.adultConfirmed === "on",
      referencesConsent: values.referencesConsent === "on",
      consent: values.consent === "on",
      consentVersion: CONSENT_VERSION,
    });
    if (!data.success) {
      setError(data.error.issues[0]?.message ?? "Check your details");
      return;
    }
    submit.mutate(data.data);
  }
  return (
    <BorrowerShell>
      <h1 className="text-2xl font-black">Request a review</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This is a pilot request, not a credit agreement. No money will be
        disbursed or collected. Do not upload your national ID or a selfie.
      </p>
      {account.isPending ? (
        <p className="mt-4">Checking your account…</p>
      ) : account.error ? (
        <p className="mt-4 text-red-700" role="alert">
          {account.error.message}
        </p>
      ) : !account.data?.authenticated ? (
        <Link
          to="/account"
          className="mt-4 inline-block rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white"
        >
          Sign in or create an account
        </Link>
      ) : (
        <p className="mt-3 text-sm">
          Account mobile: <strong>+{account.data.phone}</strong>
        </p>
      )}
      <form onSubmit={request} className="mt-5">
        <fieldset
          disabled={!account.data?.authenticated || submit.isPending}
          className="space-y-4 disabled:opacity-60"
        >
          <Section title="About you">
            <Field label="Full name" name="name" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="District" name="district" />
              <Field label="Occupation" name="occupation" />
            </div>
          </Section>
          <Section title="Affordability">
            <Field
              label="Monthly income (UGX)"
              name="monthlyIncome"
              type="number"
              min={1}
              max={100000000}
            />
            <Field
              label="Essential monthly expenses (UGX)"
              name="monthlyExpenses"
              type="number"
              min={0}
              max={100000000}
            />
            <Field
              label="Other monthly debt repayments (UGX)"
              name="existingDebtPayments"
              type="number"
              min={0}
              max={100000000}
            />
            <p className="text-xs text-slate-500">
              These figures support a human review. They are not a credit score
              or guarantee.
            </p>
          </Section>
          <Section title="Your request">
            <Field
              label="Requested amount (UGX 20,000–300,000)"
              name="amount"
              type="number"
              min={20000}
              max={300000}
            />
            <Field
              label="Preferred period (2–12 weeks)"
              name="durationWeeks"
              type="number"
              min={2}
              max={12}
            />
            <Field label="Purpose" name="purpose" />
            <Link
              to="/calculator"
              className="inline-block text-sm font-semibold text-emerald-800 underline"
            >
              Explore an illustrative repayment plan
            </Link>
            <p className="text-xs text-slate-500">
              Loan rates, fees and eligibility have not been finalized. A future
              offer must show complete costs before you accept it.
            </p>
          </Section>
          <Section title="Three next-of-kin references">
            <p className="text-sm text-slate-600">
              Enter three different adults who have agreed to be references.
              They are not guarantors and will not automatically owe your loan.
            </p>
            {[
              ["1", "kinName", "kinPhone"],
              ["2", "kin2Name", "kin2Phone"],
              ["3", "kin3Name", "kin3Phone"],
            ].map(([n, nk, pk]) => (
              <div className="space-y-3 rounded-xl bg-slate-50 p-3" key={n}>
                <h3 className="text-sm font-bold">Reference {n}</h3>
                <Field label={`Reference ${n} full name`} name={nk} />
                <Field
                  label={`Reference ${n} mobile number`}
                  name={pk}
                  type="tel"
                />
              </div>
            ))}
          </Section>
          <Section title="Your confirmation">
            <label className="flex gap-2 text-sm">
              <input
                name="adultConfirmed"
                type="checkbox"
                required
                className="mt-1"
              />
              <span>
                I am at least 18 years old and entered accurate details.
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                name="referencesConsent"
                type="checkbox"
                required
                className="mt-1"
              />
              <span>
                All three references agreed that I may provide their names and
                numbers.
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input name="consent" type="checkbox" required className="mt-1" />
              <span>
                I have read the{" "}
                <Link className="underline" to="/privacy">
                  privacy notice
                </Link>{" "}
                and consent to storing these details for pilot review. This does
                not authorize a loan, payment or contact with my references.
              </span>
            </label>
          </Section>
          <Button className="w-full h-12 bg-emerald-800" type="submit">
            {submit.isPending ? "Sending request…" : "Send pilot request"}
          </Button>
        </fieldset>
      </form>
      {error ? (
        <p
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </BorrowerShell>
  );
}
