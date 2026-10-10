import { describe, it, expect } from "vitest";
import {
  passwordHash,
  passwordMatches,
  seal,
  unseal,
  opaqueToken,
  isSameOrigin,
  normalizePhone,
  allowAttempt,
} from "./borrower-security";
import {
  applicationInput,
  illustrativeSchedule,
  affordability,
  CONSENT_VERSION,
} from "@contracts/loan-policy";
const input = {
  name: "Example Borrower",
  district: "Kampala",
  occupation: "Trader",
  monthlyIncome: 500000,
  monthlyExpenses: 300000,
  existingDebtPayments: 50000,
  amount: 100000,
  durationWeeks: 4,
  purpose: "Stock purchase",
  kinName: "Example One",
  kinPhone: "0700000001",
  kin2Name: "Example Two",
  kin2Phone: "+256700000002",
  kin3Name: "Example Three",
  kin3Phone: "0700000003",
  adultConfirmed: true,
  referencesConsent: true,
  consent: true,
  consentVersion: CONSENT_VERSION,
};
describe("borrower credentials and confidential data", () => {
  it("salts passwords and rejects a wrong password", async () => {
    const one = await passwordHash("synthetic-test-password");
    const two = await passwordHash("synthetic-test-password");
    expect(one).not.toBe(two);
    expect(await passwordMatches("synthetic-test-password", one)).toBe(true);
    expect(await passwordMatches("wrong-test-password", one)).toBe(false);
  });
  it("encrypts with authenticated integrity", () => {
    const key = "synthetic-test-key-not-production";
    const ciphertext = seal(input, key);
    expect(ciphertext).not.toContain("Example One");
    expect(unseal(ciphertext, key)).toEqual(input);
    expect(() =>
      unseal(ciphertext, "another-synthetic-key-not-production")
    ).toThrow();
    const parts = ciphertext.split(".");
    const bytes = Buffer.from(parts[3], "base64");
    bytes[0] ^= 1;
    parts[3] = bytes.toString("base64");
    expect(() => unseal(parts.join("."), key)).toThrow();
  });
  it("uses unpredictable session tokens", () => {
    expect(opaqueToken().length).toBeGreaterThan(40);
    expect(opaqueToken()).not.toBe(opaqueToken());
  });
  it("rejects foreign or missing request origins", () => {
    expect(
      isSameOrigin(
        new Request("https://example.test/api", {
          headers: { origin: "https://attacker.test" },
        })
      )
    ).toBe(false);
    expect(isSameOrigin(new Request("https://example.test/api"))).toBe(false);
    expect(
      isSameOrigin(
        new Request("https://example.test/api", {
          headers: { origin: "https://example.test" },
        })
      )
    ).toBe(true);
  });
  it("limits repeated attempts", () => {
    const key = opaqueToken();
    expect(allowAttempt(key, 2)).toBe(true);
    expect(allowAttempt(key, 2)).toBe(true);
    expect(allowAttempt(key, 2)).toBe(false);
  });
});
describe("reference validation and transparent planning", () => {
  it("normalizes local and international Uganda numbers", () => {
    expect(normalizePhone("0700 000 001")).toBe("256700000001");
    expect(normalizePhone("+256700000001")).toBe("256700000001");
    expect(() => normalizePhone("123")).toThrow();
  });
  it("requires three distinct numbers even with different formatting", () => {
    expect(applicationInput.safeParse(input).success).toBe(true);
    expect(
      applicationInput.safeParse({ ...input, kin2Phone: "+256700000001" })
        .success
    ).toBe(false);
  });
  it("requires three distinct entered names and explicit consent", () => {
    expect(
      applicationInput.safeParse({ ...input, kin2Name: " example one " })
        .success
    ).toBe(false);
    expect(
      applicationInput.safeParse({ ...input, consent: false }).success
    ).toBe(false);
    expect(
      applicationInput.safeParse({ ...input, referencesConsent: false }).success
    ).toBe(false);
    expect(
      applicationInput.safeParse({ ...input, adultConfirmed: false }).success
    ).toBe(false);
  });
  it("flags budget pressure without approving or rejecting credit", () => {
    const report = affordability({ ...input, monthlyIncome: 10000 });
    expect(report.needsReview).toBe(true);
    expect(report.note).toContain("Human verification");
    expect(report).not.toHaveProperty("approved");
  });
  it("reconciles schedule rounding to principal plus costs", () => {
    const plan = illustrativeSchedule(100001, 3, 10, 1.5);
    expect(plan.interest).toBe(7500);
    expect(plan.fee).toBe(1500);
    expect(plan.payments.reduce((s, p) => s + p.amount, 0)).toBe(plan.total);
    expect(plan.total).toBe(plan.principal + plan.interest + plan.fee);
  });
  it("rejects invalid calculator inputs", () => {
    for (const weeks of [0, 1.5, 53])
      expect(() => illustrativeSchedule(100000, weeks, 10, 1.5)).toThrow();
    expect(() => illustrativeSchedule(NaN, 4, 10, 1.5)).toThrow();
  });
});
