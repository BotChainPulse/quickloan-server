import { z } from "zod";

export function normalizeMobile(value: string): string {
  const phone = value.trim().replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (/^07\d{8}$/.test(phone)) return "+256" + phone.slice(1);
  if (/^7\d{8}$/.test(phone)) return "+256" + phone;
  if (/^2567\d{8}$/.test(phone)) return "+" + phone;
  throw new Error("Enter a Uganda mobile number, for example 07XXXXXXXX or +2567XXXXXXXX");
}

const name = z.string().trim().min(3, "Enter the contact's full name").max(255);
const mobile = z.string().max(30).transform((value, ctx) => {
  try { return normalizeMobile(value); }
  catch { ctx.addIssue({ code: "custom", message: "Enter a valid Uganda mobile number" }); return z.NEVER; }
});

// Existing field names represent contact 1; retain them for historical records.
export const nextOfKinFields = {
  kinName: name, kinPhone: mobile,
  kinName2: name, kinPhone2: mobile,
  kinName3: name, kinPhone3: mobile,
};

type Contacts = { name: string; phone: string; kinName: string; kinPhone: string; kinName2: string; kinPhone2: string; kinName3: string; kinPhone3: string };
export function validateNextOfKin(input: Contacts, ctx: z.RefinementCtx) {
  const names = [input.kinName, input.kinName2, input.kinName3];
  const phones = [input.kinPhone, input.kinPhone2, input.kinPhone3];
  const canonicalName = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  for (let i = 0; i < 3; i++) {
    const suffix = i === 0 ? "" : String(i + 1);
    if (names.slice(0, i).some((value) => canonicalName(value) === canonicalName(names[i]))) {
      ctx.addIssue({ code: "custom", path: [`kinName${suffix}`], message: "Choose three different contacts; this name is repeated" });
    }
    if (phones.slice(0, i).includes(phones[i])) {
      ctx.addIssue({ code: "custom", path: [`kinPhone${suffix}`], message: "Each contact must have a different mobile number" });
    }
    let ownPhone: string | undefined;
    try { ownPhone = normalizeMobile(input.phone); } catch { /* Borrower phone is checked separately by authentication. */ }
    if (phones[i] === ownPhone || canonicalName(names[i]) === canonicalName(input.name)) {
      ctx.addIssue({ code: "custom", path: [`kinName${suffix}`], message: "A next-of-kin contact must be someone other than the applicant" });
    }
  }
}
