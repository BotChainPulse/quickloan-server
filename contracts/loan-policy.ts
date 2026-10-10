import { z } from "zod";

export const CONSENT_VERSION = "pilot-2026-10-10";
export function ugandaPhone(value: string) {
  const digits = value.replace(/[\s()+-]/g, "");
  const normalized = digits.startsWith("256")
    ? digits
    : digits.startsWith("0")
      ? `256${digits.slice(1)}`
      : `256${digits}`;
  return /^2567\d{8}$/.test(normalized) ? normalized : null;
}
const phone = z
  .string()
  .max(24)
  .transform(ugandaPhone)
  .refine(v => v !== null, "Use a valid Uganda mobile number");
const name = z.string().trim().min(3).max(100);
export const applicationInput = z
  .object({
    name,
    district: z.string().trim().min(2).max(100),
    occupation: z.string().trim().min(2).max(50),
    monthlyIncome: z.number().int().positive().max(100_000_000),
    monthlyExpenses: z.number().int().nonnegative().max(100_000_000),
    existingDebtPayments: z.number().int().nonnegative().max(100_000_000),
    amount: z.number().int().min(20000).max(300000),
    durationWeeks: z.number().int().min(2).max(12),
    purpose: z.string().trim().min(3).max(50),
    kinName: name,
    kinPhone: phone,
    kin2Name: name,
    kin2Phone: phone,
    kin3Name: name,
    kin3Phone: phone,
    adultConfirmed: z.literal(true),
    referencesConsent: z.literal(true),
    consent: z.literal(true),
    consentVersion: z.literal(CONSENT_VERSION),
  })
  .superRefine((input, context) => {
    if (new Set([input.kinPhone, input.kin2Phone, input.kin3Phone]).size !== 3)
      context.addIssue({
        code: "custom",
        path: ["kinPhone"],
        message: "Enter three different reference mobile numbers",
      });
    const names = [input.kinName, input.kin2Name, input.kin3Name].map(n =>
      n.toLowerCase().replace(/\s+/g, " ")
    );
    if (new Set(names).size !== 3)
      context.addIssue({
        code: "custom",
        path: ["kinName"],
        message: "Enter three different people",
      });
  });
export type ApplicationInput = z.infer<typeof applicationInput>;
export function affordability(
  input: Pick<
    ApplicationInput,
    | "monthlyIncome"
    | "monthlyExpenses"
    | "existingDebtPayments"
    | "amount"
    | "durationWeeks"
  >
) {
  const disposable =
    input.monthlyIncome - input.monthlyExpenses - input.existingDebtPayments;
  const weeklyPrincipal = Math.ceil(input.amount / input.durationWeeks);
  return {
    disposableMonthlyIncome: disposable,
    weeklyPrincipal,
    needsReview: disposable <= 0 || weeklyPrincipal > (disposable * 12) / 52,
    note: "Self-reported figures; interest and fees excluded. Human verification required.",
  };
}
export function illustrativeSchedule(
  amount: number,
  weeks: number,
  monthlyRate: number,
  feePercent: number
) {
  if (
    ![amount, weeks, monthlyRate, feePercent].every(Number.isFinite) ||
    amount <= 0 ||
    !Number.isInteger(weeks) ||
    weeks < 1 ||
    weeks > 52 ||
    monthlyRate < 0 ||
    monthlyRate > 30 ||
    feePercent < 0 ||
    feePercent > 30
  )
    throw new Error("Enter valid calculator values");
  // Transparent flat-rate illustration: one month means four weeks here.
  const interest = Math.round((((amount * monthlyRate) / 100) * weeks) / 4);
  const fee = Math.round((amount * feePercent) / 100);
  const total = amount + interest + fee;
  const base = Math.floor(total / weeks);
  const payments = Array.from({ length: weeks }, (_, index) => ({
    week: index + 1,
    amount: base + (index === weeks - 1 ? total - base * weeks : 0),
  }));
  return { principal: amount, interest, fee, total, payments };
}
