import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import BorrowerShell from "@/components/BorrowerShell";
import { useBorrower } from "@/hooks/useBorrower";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function BorrowerAccount() {
  const account = useBorrower();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/borrower/${register ? "register" : "login"}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: values.get("phone"),
            password: values.get("password"),
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in");
      window.location.assign("/status");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection failed. Try again."
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/borrower/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error("Unable to sign out");
      window.location.assign("/account");
    } catch {
      setError("Unable to sign out. Try again.");
      setBusy(false);
    }
  }
  return (
    <BorrowerShell>
      <h1 className="text-2xl font-black">Your account</h1>
      {account.isPending ? (
        <p className="mt-4" role="status">
          Checking your session…
        </p>
      ) : account.error ? (
        <p className="mt-4 text-red-700" role="alert">
          {account.error.message}
        </p>
      ) : account.data?.authenticated ? (
        <section className="mt-5 rounded-2xl border bg-white p-5 space-y-4">
          <p>
            Signed in as <strong>+{account.data.phone}</strong>
          </p>
          <p className="text-sm text-slate-600">
            Phone ownership is{" "}
            {account.data.phoneVerified ? "verified" : "not yet verified"}.
            Registration does not verify identity or qualify you for a loan.
          </p>
          <Link
            className="block font-bold text-emerald-800 underline"
            to="/status"
          >
            View my requests
          </Link>
          <Button disabled={busy} variant="outline" onClick={logout}>
            Sign out
          </Button>
        </section>
      ) : (
        <form
          onSubmit={submit}
          className="mt-5 space-y-4 rounded-2xl border bg-white p-5"
        >
          <p className="text-sm text-slate-600">
            {register
              ? "Create a pilot account using your own mobile number."
              : "Sign in to see only requests belonging to your account."}
          </p>
          <div className="space-y-2">
            <Label htmlFor="account-phone">Uganda mobile number</Label>
            <Input
              id="account-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={24}
              placeholder="07… or +2567…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-password">Password</Label>
            <Input
              id="account-password"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={10}
              maxLength={128}
            />
            <p className="text-xs text-slate-500">
              At least 10 characters. Never use your mobile-money PIN.
            </p>
          </div>
          {register ? (
            <label className="flex gap-2 text-sm">
              <input type="checkbox" required className="mt-1" />
              <span>
                I have read the{" "}
                <Link className="underline" to="/privacy">
                  pilot privacy notice
                </Link>{" "}
                and understand this is not a loan agreement.
              </span>
            </label>
          ) : null}
          <Button className="w-full bg-emerald-800" disabled={busy}>
            {busy
              ? "Please wait…"
              : register
                ? "Create pilot account"
                : "Sign in"}
          </Button>
          <button
            type="button"
            className="text-sm font-semibold text-emerald-800 underline"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already registered? Sign in"
              : "New here? Create an account"}
          </button>
          <p className="text-xs leading-5 text-slate-500">
            Verified SMS recovery is not connected yet. Keep your password safe.
            A different account cannot access older records.
          </p>
        </form>
      )}
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </BorrowerShell>
  );
}
