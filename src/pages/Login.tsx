import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{ url: string; key: string; token: string; factor: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      let accessToken: string;
      const request = async (url: string, key: string, path: string, body: object, token?: string) => {
        const response = await fetch(`${url}/auth/v1/${path}`, { method: "POST",
          headers: { "Content-Type": "application/json", apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Sign-in failed. Check your details or try again later.");
        return data;
      };
      if (!challenge) {
        const configResponse = await fetch("/api/auth-config");
        if (!configResponse.ok) throw new Error("Secure sign-in is not configured yet.");
        const { url, key } = await configResponse.json();
        const session = await request(url, key, "token?grant_type=password", { email, password });
        setPassword("");
        const factor = session.user?.factors?.find((f: { factor_type: string; status: string }) => f.factor_type === "totp" && f.status === "verified");
        if (!factor) throw new Error("Lender MFA must be enrolled before dashboard access. Ask the operator to complete secure onboarding.");
        setChallenge({ url, key, token: session.access_token, factor: factor.id });
        return;
      }
      const started = await request(challenge.url, challenge.key, `factors/${challenge.factor}/challenge`, {}, challenge.token);
      const verified = await request(challenge.url, challenge.key, `factors/${challenge.factor}/verify`, { challenge_id: started.id, code }, challenge.token);
      accessToken = verified.access_token;
      const resp = await fetch("/api/lender-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      if (resp.ok) {
        setChallenge(null);
        window.location.href = "/dashboard";
        return;
      }
      const data = await resp.json().catch(() => ({}));
      setError(data.error || "Login failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
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
          <p className="text-sm text-muted-foreground">Individual account and authenticator code required. Shared PIN login is disabled.</p>
          {!challenge ? <>
            <label className="block text-sm">Email<Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block text-sm">Password<Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          </> : <label className="block text-sm">Authenticator code<Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            className="w-full"
            size="lg"
            disabled={busy || (challenge ? code.length !== 6 : !email || !password)}
            onClick={submit}
          >
            {busy ? "Signing in…" : challenge ? "Verify and sign in" : "Continue"}
          </Button>
          {challenge && <Button variant="outline" onClick={() => { setChallenge(null); setCode(""); }}>Start again</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
