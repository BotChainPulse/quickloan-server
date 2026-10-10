import { useState } from "react";
import BorrowerShell from "@/components/BorrowerShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { illustrativeSchedule } from "@contracts/loan-policy";
const format = (n: number) => "UGX " + n.toLocaleString();
export default function Calculator() {
  const [amount, setAmount] = useState(100000);
  const [weeks, setWeeks] = useState(4);
  const [rate, setRate] = useState(0);
  const [fee, setFee] = useState(0);
  let plan: ReturnType<typeof illustrativeSchedule> | undefined;
  try {
    plan = illustrativeSchedule(amount, weeks, rate, fee);
  } catch {
    /* Render validation rather than a misleading number. */
  }
  return (
    <BorrowerShell>
      <h1 className="text-2xl font-black">Repayment planner</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        An illustration, not a loan offer. Enter assumptions or a lender's
        written terms. A month is treated as four weeks in this flat-rate
        example.
      </p>
      <section className="mt-5 space-y-4 rounded-2xl border bg-white p-5">
        {[
          {
            id: "amount",
            label: "Amount (UGX)",
            value: amount,
            set: setAmount,
            min: 1,
            max: 10000000,
          },
          {
            id: "weeks",
            label: "Period (weeks)",
            value: weeks,
            set: setWeeks,
            min: 1,
            max: 52,
          },
          {
            id: "rate",
            label: "Assumed monthly flat interest (%)",
            value: rate,
            set: setRate,
            min: 0,
            max: 30,
          },
          {
            id: "fee",
            label: "Assumed one-time fee (%)",
            value: fee,
            set: setFee,
            min: 0,
            max: 30,
          },
        ].map(f => (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={f.id}>{f.label}</Label>
            <Input
              id={f.id}
              type="number"
              min={f.min}
              max={f.max}
              step={f.id === "rate" || f.id === "fee" ? "0.1" : "1"}
              value={f.value}
              onChange={e => f.set(e.currentTarget.valueAsNumber)}
            />
          </div>
        ))}
      </section>
      {plan ? (
        <>
          <section className="mt-4 space-y-2 rounded-2xl bg-emerald-900 p-5 text-white">
            <div className="flex justify-between">
              <span>Principal</span>
              <strong>{format(plan.principal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Illustrative interest</span>
              <strong>{format(plan.interest)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Illustrative fee</span>
              <strong>{format(plan.fee)}</strong>
            </div>
            <div className="flex justify-between border-t border-emerald-700 pt-3">
              <span>Total repayment</span>
              <strong>{format(plan.total)}</strong>
            </div>
          </section>
          <section className="mt-5 rounded-2xl border bg-white p-4">
            <h2 className="font-bold">Illustrative schedule</h2>
            <p className="mt-2 text-xs text-slate-500">
              Week numbers are relative to a future confirmed disbursement. No
              loan due dates are created by this calculator.
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th scope="col" className="py-2">
                    Week
                  </th>
                  <th scope="col" className="text-right">
                    Repayment
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.payments.map(p => (
                  <tr key={p.week} className="border-b last:border-0">
                    <td className="py-2">{p.week}</td>
                    <td className="text-right">{format(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <p role="alert" className="mt-4 text-red-700">
          Enter a positive amount, 1–52 whole weeks, and rates from 0–30%.
        </p>
      )}
    </BorrowerShell>
  );
}
