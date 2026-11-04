import { useRef, useState } from "react";
import { CalendarCheck2, CalendarX2, RefreshCw, Unplug } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBootstrapQueryKey } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useRecords, dget, ds, errMessage, type Rec } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";
import { Btn, Surface, Tag } from "@/components/kit";

export const DEMO_PROVIDER = "google-calendar-demo";
export const DEMO_TITLE = "Baby wellbeing check (sample)";

export function isDemoSynced(a: Rec) {
  return ds(a, "source") === DEMO_PROVIDER;
}

function useDemoState() {
  const { boot } = useBoot();
  const pid = boot.profile.id;
  const pref = boot.records.find((r) => r.kind === "preference" && r.authorId === pid && ds(r, "provider") === DEMO_PROVIDER);
  const sample = boot.records.find((r) => r.kind === "appointment" && r.authorId === pid && isDemoSynced(r) && ds(r, "calendarOwnerId") === pid);
  return { pref, sample, pid };
}

export function DemoSyncedNote({ a }: { a: Rec }) {
  const { pref } = useDemoState();
  const last = ds(pref, "lastSynced") || ds(a, "lastSynced");
  return (
    <div className="mt-2 rounded-xl bg-sky/60 px-3 py-2 text-sm" data-testid={`text-demo-synced-${a.id}`}>
      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">Synced from your calendar</span><Tag tone="peach">Demo</Tag></div>
      <p className="mt-0.5 text-xs text-muted-foreground">Simulated source: this sample was created by Kinwell's demo connection. No Google account or real calendar was accessed.{last && ` Last demo sync ${fmtTime(last)}.`}</p>
    </div>
  );
}

export function CalendarDemoPanel() {
  const { boot, me, isAdmin } = useBoot();
  const { create, update } = useRecords();
  const qc = useQueryClient();
  const { pref, sample } = useDemoState();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lock = useRef(false);
  const createRef = useRef(create.mutateAsync); createRef.current = create.mutateAsync;
  const updateRef = useRef(update.mutateAsync); updateRef.current = update.mutateAsync;

  const role = (boot.profile.role || "").toLowerCase();
  const restricted = !isAdmin && !!me && (role.includes("helper") || role.includes("caregiver") || role.includes("viewer")) && !me.grants.includes("appointments");
  const connected = pref?.status === "active";
  const last = ds(pref, "lastSynced");
  const tz = boot.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const sync = async () => {
    if (lock.current || restricted) return;
    lock.current = true; setBusy(true); setErr(null);
    const now = new Date().toISOString();
    let imported = 0;
    try {
      if (!sample) {
        const d = new Date(Date.now() + 9 * 864e5); d.setHours(10, 30, 0, 0);
        const end = new Date(+d + 30 * 6e4);
        await createRef.current({
          kind: "appointment", title: DEMO_TITLE, scope: "private", status: "scheduled", occurredAt: d.toISOString(),
          notes: "Fictional sample created by Kinwell's simulated calendar connection. No Google account was accessed and nothing was read from a real calendar.",
          data: { source: DEMO_PROVIDER, calendarOwnerId: boot.profile.id, timezone: tz, endAt: end.toISOString(), location: "Sample clinic (fictional)", participants: [], includeNotes: false, lastSynced: now },
        });
        imported = 1;
      } else {
        await updateRef.current({ id: sample.id, data: { data: { ...(sample.data as object), lastSynced: now } } });
      }
      const prefData = { ...((pref?.data as object) || {}), provider: DEMO_PROVIDER, status: "active", lastSynced: now, simulated: true };
      if (pref) await updateRef.current({ id: pref.id, data: { status: "active", data: prefData } });
      else await createRef.current({ kind: "preference", title: "Calendar connection (demo)", scope: "private", status: "active", data: prefData });
      toast({ title: connected ? "Demo sync complete" : "Demo calendar connected", description: `${imported} appointment${imported === 1 ? "" : "s"} imported (simulated).` });
    } catch (e) {
      setErr(`${errMessage(e)}${imported ? " The sample appointment was saved; try again to finish connecting." : ""}`);
    } finally {
      await qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
      lock.current = false; setBusy(false);
    }
  };

  const disconnect = async () => {
    if (lock.current || !pref) return;
    lock.current = true; setBusy(true); setErr(null);
    try {
      await updateRef.current({ id: pref.id, data: { status: "disconnected", data: { ...(pref.data as object), status: "disconnected" } } });
      toast({ title: "Demo connection turned off", description: "The sample appointment stays, labelled Demo." });
    } catch (e) { setErr(errMessage(e)); }
    finally { await qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }); lock.current = false; setBusy(false); }
  };

  const Icon = connected ? CalendarCheck2 : CalendarX2;
  return (
    <Surface tone="sky" className="mb-6" data-testid="panel-calendar-demo">
      <div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold" data-testid="status-calendar-demo">Google Calendar: {connected ? "Demo connection" : "not connected"}</p>
          <Tag tone="peach">Simulated</Tag>
        </div>
        <p className="mt-0.5 text-sm">
          {connected
            ? "This is a simulated connection. No real calendar is accessed and automatic sync is unavailable — use Sync demo now to refresh the private sample."
            : `Real sync isn't available in this prototype (status: ${boot.calendarStatus}). You can try a demo connection: it adds one private, fictional sample appointment. No Google account is accessed.`}
        </p>
        {dget(pref, "lastSynced") !== undefined && <p className="mt-1 text-xs text-muted-foreground" data-testid="text-demo-last-synced">Last demo sync {fmtDate(last)} at {fmtTime(last, tz)}</p>}
        {restricted ? (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-demo-restricted">Your access doesn't include appointments, so the calendar demo is off. Ask a family admin for the shared appointments grant.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {connected ? <>
              <Btn size="sm" variant="outline" onClick={sync} disabled={busy} aria-busy={busy} data-testid="button-demo-sync"><RefreshCw className="h-4 w-4" />{busy ? "Working…" : "Sync demo now"}</Btn>
              <Btn size="sm" variant="ghost" onClick={disconnect} disabled={busy} data-testid="button-demo-disconnect"><Unplug className="h-4 w-4" />Disconnect demo</Btn>
            </> : (
              <Btn size="sm" variant="outline" onClick={sync} disabled={busy} aria-busy={busy} data-testid="button-demo-connect">{busy ? "Connecting demo…" : "Connect Google Calendar (demo)"}</Btn>
            )}
          </div>
        )}
        {err && <p role="alert" className="mt-2 text-sm text-destructive" data-testid="text-demo-error">{err}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Calendar files (.ics) below still work as before and won't update automatically.</p>
      </div></div>
    </Surface>
  );
}
