import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected";

function fmt(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

export default function Dashboard() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Status | undefined>("pending");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const stats = trpc.quickloan.stats.useQuery();
  const list = trpc.quickloan.listApplications.useQuery(
    filter ? { status: filter } : undefined,
  );
  const detail = trpc.quickloan.applicationDetail.useQuery(
    { id: detailId! },
    { enabled: detailId !== null },
  );

  const decide = trpc.quickloan.decide.useMutation({
    onSuccess: (r) => {
      toast.success(`Application ${r.status}`);
      setDetailId(null);
      setNote("");
      utils.quickloan.listApplications.invalidate();
      utils.quickloan.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusBadge = (s: string) =>
    s === "approved" ? (
      <Badge className="bg-green-600">Approved</Badge>
    ) : s === "rejected" ? (
      <Badge variant="destructive">Rejected</Badge>
    ) : (
      <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>
    );

  const d = detail.data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏦 QuickLoan — Lender Dashboard</h1>
      <p className="text-xs text-muted-foreground select-all">Server: {typeof window !== "undefined" ? window.location.origin : ""}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold text-amber-500">{stats.data?.pending ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.data?.approved ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Rejected</div>
          <div className="text-2xl font-bold text-red-500">{stats.data?.rejected ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Lent out</div>
          <div className="text-2xl font-bold">{stats.data ? fmt(stats.data.approvedVolume) : "—"}</div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(filter === s ? undefined : s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.data?.map((a) => (
            <button key={a.id} onClick={() => setDetailId(a.id)}
              className="w-full text-left flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition">
              <div>
                <div className="font-medium">{a.name} <span className="text-muted-foreground text-sm">· {a.ref}</span></div>
                <div className="text-sm text-muted-foreground">
                  {fmt(a.amount)} · {a.durationWeeks} wks · {a.purpose} · {a.district}
                </div>
              </div>
              {statusBadge(a.status)}
            </button>
          ))}
          {list.data?.length === 0 && (
            <p className="text-muted-foreground">No {filter ?? ""} applications yet.</p>
          )}
        </CardContent>
      </Card>

      {detailId !== null && d && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto" onClick={() => setDetailId(null)}>
          <div className="max-w-lg mx-auto my-8 bg-card border rounded-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{d.name}</h2>
              {statusBadge(d.status)}
            </div>
            <div className="text-sm space-y-1">
              <p><b>Ref:</b> {d.ref} · <b>Phone:</b> {d.phone}</p>
              <p><b>Amount:</b> {fmt(d.amount)} for {d.durationWeeks} weeks · <b>Purpose:</b> {d.purpose}</p>
              <p><b>NIN:</b> {d.nin} · <b>DOB:</b> {d.dob} · <b>Gender:</b> {d.gender}</p>
              <p><b>District:</b> {d.district} · <b>Occupation:</b> {d.occupation} · <b>Income:</b> {d.income}</p>
              <p><b>Next of kin:</b> {d.kinName} ({d.kinPhone})</p>
              <p><b>Signature:</b> <i>{d.signature}</i></p>
              <p><b>Applied:</b> {new Date(d.createdAt).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([["ID Front", d.idFrontPhoto], ["ID Back", d.idBackPhoto], ["Liveness", d.livenessPhoto]] as const).map(([label, photo]) => (
                <div key={label} className="text-center">
                  {photo ? (
                    <a href={photo} target="_blank" rel="noreferrer">
                      <img src={photo} alt={label} className="w-full h-28 object-cover rounded-lg border" />
                    </a>
                  ) : (
                    <div className="w-full h-28 rounded-lg border flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>

            {d.status === "pending" && (
              <div className="space-y-2 border-t pt-3">
                <Textarea placeholder="Note to applicant (optional) — e.g. disbursement details or reason"
                  value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: d.id, approved: true, note: note || undefined })}>
                    ✅ Approve
                  </Button>
                  <Button className="flex-1" variant="destructive"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: d.id, approved: false, note: note || undefined })}>
                    ❌ Reject
                  </Button>
                </div>
              </div>
            )}
            {d.status !== "pending" && d.decisionNote && (
              <p className="text-sm border-t pt-3"><b>Decision note:</b> {d.decisionNote}</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => setDetailId(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
