import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const resp = await fetch("/api/lender-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (resp.ok) {
        window.location.href = "/admin";
        return;
      }
      const data = await resp.json().catch(() => ({}));
      setError(data.error || "Login failed");
    } catch {
      setError("Network error — check your connection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>QuickLoan Lender</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="Enter your lender PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            className="w-full"
            size="lg"
            disabled={busy || !pin}
            onClick={submit}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
