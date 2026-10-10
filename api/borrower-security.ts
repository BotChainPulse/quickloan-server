import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  hkdfSync,
} from "node:crypto";

const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result))
    );
  });
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const normalizePhone = (value: string) => {
  const digits = value.replace(/[\s()+-]/g, "");
  const phone = digits.startsWith("256")
    ? digits
    : digits.startsWith("0")
      ? `256${digits.slice(1)}`
      : `256${digits}`;
  if (!/^2567\d{8}$/.test(phone))
    throw new Error("Enter a valid Uganda mobile number");
  return phone;
};
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return (
      new URL(origin).host === new URL(request.url).host &&
      ["http:", "https:"].includes(new URL(origin).protocol)
    );
  } catch {
    return false;
  }
}
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [scheme, salt, encoded] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !encoded) return false;
  const actual = await derive(password, salt);
  const expected = Buffer.from(encoded, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const opaqueToken = () => randomBytes(32).toString("base64url");
function key(secret: string) {
  if (secret.length < 24)
    throw new Error("Application secret must contain at least 24 characters");
  return Buffer.from(
    hkdfSync(
      "sha256",
      secret,
      "quickloan-payload-v1",
      "borrower-confidential-data",
      32
    )
  );
}
export function seal(data: unknown, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function unseal<T>(encoded: string, secret: string): T {
  const [version, iv, tag, data] = encoded.split(".");
  if (version !== "v1") throw new Error("Unsupported confidential record");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(secret),
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(data, "base64")),
      decipher.final(),
    ]).toString("utf8")
  );
}

const attempts = new Map<string, { count: number; ends: number }>();
// Single-instance pilot limit; use a shared limiter before horizontal scaling.
export function allowAttempt(
  identifier: string,
  maximum = 8,
  windowMs = 15 * 60 * 1000
) {
  const now = Date.now();
  for (const [k, value] of attempts) if (value.ends <= now) attempts.delete(k);
  const id = digest(identifier);
  const previous = attempts.get(id);
  if (previous && previous.count >= maximum) return false;
  if (attempts.size >= 10000 && !previous) return false;
  attempts.set(id, {
    count: (previous?.count ?? 0) + 1,
    ends: previous?.ends ?? now + windowMs,
  });
  return true;
}
