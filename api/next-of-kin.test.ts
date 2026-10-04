import { describe, expect, it } from "vitest";
import { z } from "zod";
import { nextOfKinFields, validateNextOfKin } from "@contracts/next-of-kin";

const schema = z.object({ name: z.string(), phone: z.string(), ...nextOfKinFields }).superRefine(validateNextOfKin);
const valid = { name: "Applicant Test", phone: "0700000001", kinName: "Contact One", kinPhone: "0700000002", kinName2: "Contact Two", kinPhone2: "+256700000003", kinName3: "Contact Three", kinPhone3: "700000004" };
describe("three next-of-kin contacts", () => {
  it("requires all three names and mobile numbers", () => {
    const { kinName3: _name, ...missing } = valid;
    expect(schema.safeParse(missing).success).toBe(false);
    expect(schema.safeParse({ ...valid, kinPhone2: "" }).success).toBe(false);
  });
  it("normalizes local and international mobile numbers", () => {
    const result = schema.parse(valid);
    expect([result.kinPhone, result.kinPhone2, result.kinPhone3]).toEqual(["+256700000002", "+256700000003", "+256700000004"]);
  });
  it("rejects duplicate phone numbers even in different formats", () => {
    expect(schema.safeParse({ ...valid, kinPhone2: "+256700000002" }).success).toBe(false);
  });
  it("rejects repeated names with whitespace or case differences", () => {
    expect(schema.safeParse({ ...valid, kinName2: " CONTACT   ONE " }).success).toBe(false);
  });
  it("rejects the applicant as their own contact", () => {
    expect(schema.safeParse({ ...valid, kinPhone3: "+256700000001" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, kinName3: "Applicant Test" }).success).toBe(false);
  });
  it("rejects invalid or non-mobile numbers", () => {
    for (const number of ["123", "+256200000002", "070000000x"]) {
      expect(schema.safeParse({ ...valid, kinPhone3: number }).success).toBe(false);
    }
  });
});
