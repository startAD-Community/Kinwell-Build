import { useEffect, useState } from "react";
import { Info, Pencil, Plus, Upload, Lock, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useProfileUpdate, byKind, ds, type Rec } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { todayISO } from "@/lib/child";
import { Btn, Surface, Tag, SectionTitle, Empty, RecordDialog, Confirm, Meta } from "@/components/kit";
import { AnimalAvatar } from "@/components/avatar";
import { FloImportDialog } from "@/components/flo-import";

const FIELDS = [{ key: "data.startDate", label: "Start date", type: "date" as const, required: true }, { key: "data.endDate", label: "End date (optional)", type: "date" as const }, { key: "notes", label: "Notes", type: "textarea" as const }];
const line = (r: Rec) => `${fmtDate(ds(r, "startDate"))}${ds(r, "endDate") ? ` – ${fmtDate(ds(r, "endDate"))}` : ""}`;

function estimate(own: Rec[]) {
  const starts = own.map((c) => new Date(ds(c, "startDate") + "T12:00:00").getTime());
  const lens = starts.slice(0, -1).map((s, i) => Math.round((s - starts[i + 1]) / 864e5)).filter((l) => l > 15 && l < 60);
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : null;
  const spread = lens.length > 1 ? Math.max(...lens) - Math.min(...lens) : null;
  if (!avg || !starts[0]) return null;
  const f = (d: number) => new Date(starts[0] + d * 864e5).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { avg, spread, next: `${f(avg - (spread || 3))} – ${f(avg + (spread || 3))}`, window: `${f(avg - 19 - (spread || 0) / 2)} – ${f(avg - 10 + (spread || 0) / 2)}` };
}

export function PeriodsSection() {
  const { boot } = useBoot();
  const p = boot.profile;
  const mine = (r: Rec) => r.authorId === p.id || r.authorId === p.memberId;
  const all = byKind(boot.records, "cycle").filter((c) => ds(c, "startDate")).sort((a, b) => ds(b, "startDate").localeCompare(ds(a, "startDate")));
  const own = all.filter(mine);
  const shared = all.filter((r) => !mine(r));
  const sharedWith = boot.members.filter((m) => m.canSeeYourPeriods && m.id !== p.memberId);
  const est = estimate(own); // own history only — never blended with anyone else's
  const [edit, setEdit] = useState<Rec | "new" | null>(null);
  const [imp, setImp] = useState(false);
  const badge = sharedWith.length ? <Tag tone="sky"><Users className="h-3 w-3" />Read-only for {sharedWith.map((m) => m.name).join(", ")}</Tag> : <Tag tone="peach"><Lock className="h-3 w-3" />Only you</Tag>;
  const authors = Array.from(new Set(shared.map((r) => r.authorName)));
  return (
    <section className="mb-8">
      <SectionTitle title="Periods & cycle" sub="Your own dates, kept for you. Useful for appointments — not contraception or a fertility prediction." />
      <Surface tone="peach" className="mb-4">
        <div className="flex items-start gap-2"><Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div>
          <p className="font-display text-xl">Rough, wide estimate</p>
          {est ? <p className="mt-1 text-[15px]">From your {own.length} start dates (about {Math.round(est.avg)} days apart{est.spread ? `, varying by up to ${est.spread}` : ""}): next period perhaps <strong>{est.next}</strong>{p.stage === "preconception" && <>; a possible fertile window <strong>{est.window}</strong></>}.</p>
            : <p className="mt-1 text-[15px]">Add at least two of your own start dates to see a rough estimate.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Uses only your own history. After birth or while breastfeeding, cycles are often irregular. Sample logic, not clinically reviewed.</p>
        </div></div>
      </Surface>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><h3 className="font-display text-lg">Your history</h3>{badge}</div>
        <div className="flex gap-2">
          <Btn size="sm" variant="outline" onClick={() => setImp(true)} data-testid="button-import-periods"><Upload className="h-4 w-4" />Import file</Btn>
          <Btn size="sm" variant="soft" onClick={() => setEdit("new")} data-testid="button-add-cycle"><Plus className="h-4 w-4" />Add dates</Btn>
        </div>
      </div>
      {own.length === 0 ? <Empty title="No periods recorded">Optional. Add dates by hand or import a file.</Empty> : (
        <ul className="space-y-2">{own.map((r) => (
          <li key={r.id}><Surface className="flex items-center justify-between gap-2 p-3">
            <div><p className="font-semibold">{line(r)}</p>{r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}{ds(r, "source") && <p className="text-xs text-muted-foreground">Imported from {ds(r, "source")}</p>}</div>
            <button type="button" className="press flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted" aria-label={`Edit period ${line(r)}`} onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></button>
          </Surface></li>
        ))}</ul>
      )}

      <PeriodVisibility />

      {shared.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg">Shared with you</h3>
          <p className="text-sm text-muted-foreground">Read only. Each person chose to share; only they can edit or stop sharing. Not included in your estimate.</p>
          {authors.map((a) => (
            <div key={a} className="mt-3 rounded-[20px] border border-card-border bg-sky/50 p-3">
              <p className="text-sm font-semibold">{a}'s periods <Tag tone="sky">Shared with you · read only</Tag></p>
              <ul className="mt-2 space-y-1">{shared.filter((r) => r.authorName === a).map((r) => <li key={r.id} className="rounded-xl bg-card px-3 py-2"><p className="text-sm font-semibold">{line(r)}</p><Meta r={r} /></li>)}</ul>
            </div>
          ))}
        </div>
      )}

      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} kind="cycle" heading="Period" fields={FIELDS} scope="private" defaults={{ title: "Period" }}
        record={edit && edit !== "new" ? edit : undefined} validate={(v) => { const s = String(v["data.startDate"] || ""), e = String(v["data.endDate"] || ""); if (s > todayISO()) return "Start date can't be in the future"; if (e && e < s) return "End date needs to be on or after the start"; if (e > todayISO()) return "End date can't be in the future"; return null; }} />
      <FloImportDialog open={imp} onOpenChange={setImp} />
    </section>
  );
}

function PeriodVisibility() {
  const { boot } = useBoot();
  const p = boot.profile;
  const save = useProfileUpdate();
  const eligible = boot.members.filter((m) => m.id !== p.memberId && m.status === "active" && !m.role.toLowerCase().includes("helper"));
  const current = boot.members.filter((m) => m.canSeeYourPeriods && m.id !== p.memberId).map((m) => m.id);
  const [sel, setSel] = useState<string[]>(current);
  const [confirm, setConfirm] = useState(false);
  const [revoke, setRevoke] = useState<string | null>(null);
  const key = current.join(",");
  useEffect(() => { setSel(current); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const adding = sel.filter((x) => !current.includes(x));
  const changed = sel.length !== current.length || adding.length > 0;
  const name = (id: string) => boot.members.find((m) => m.id === id)?.name || "them";
  const apply = (ids: string[], msg: string) => save.mutate({ periodSharingMemberIds: ids, confirmPeriodSharing: true }, { onSuccess: () => toast({ title: msg }) });
  return (
    <Surface className="mt-6" data-testid="panel-period-visibility">
      <p className="font-display text-xl">Who can see your periods</p>
      <p className="mt-1 text-sm text-muted-foreground">Private by default. Sharing is read-only and covers your existing and future period dates. Check-ins, symptoms and notes are never included. Limited helpers can't be chosen.</p>
      <p className="mt-3 text-sm font-semibold" data-testid="text-period-sharing">{current.length ? `Shared read-only with ${current.map(name).join(", ")}` : "Not shared — only you"}</p>
      {eligible.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No one in your circle can be chosen yet (active caregivers or co-administrators only).</p> : (
        <ul className="mt-3 space-y-2">{eligible.map((m) => {
          const on = sel.includes(m.id);
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-2">
              <label className="flex min-h-11 flex-1 items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={on} onChange={() => setSel(on ? sel.filter((x) => x !== m.id) : [...sel, m.id])} data-testid={`checkbox-period-share-${m.id}`} /><AnimalAvatar member={m} size="xs" decorative /><span className="font-semibold">{m.name}</span>{m.familyRole && <span className="text-sm text-muted-foreground">{m.familyRole}</span>}</label>
              {current.includes(m.id) && <Btn size="sm" variant="ghost" className="text-destructive" onClick={() => setRevoke(m.id)} data-testid={`button-period-revoke-${m.id}`}>Stop sharing</Btn>}
            </li>
          );
        })}</ul>
      )}
      {changed && <div className="mt-3 flex gap-2"><Btn onClick={() => (adding.length ? setConfirm(true) : apply(sel, "Sharing updated"))} disabled={save.isPending} data-testid="button-period-share-save">Review and save</Btn><Btn variant="ghost" onClick={() => setSel(current)}>Undo</Btn></div>}
      <Confirm open={confirm} onOpenChange={setConfirm} title={`Share your periods with ${adding.map(name).join(", ")}?`} confirm="Yes, share read-only"
        body={<><p>They'll see all your existing period dates and any you add later, read-only, labelled as yours. They can't edit them.</p><p className="mt-2">You can stop sharing any time. Anything they've already seen or exported can't be recalled.</p></>}
        onConfirm={() => apply(sel, "Period dates shared read-only")} />
      <Confirm open={!!revoke} onOpenChange={(o) => !o && setRevoke(null)} title={`Stop sharing with ${name(revoke || "")}?`} confirm="Stop sharing"
        body="They'll no longer see your period dates. Anything they've already seen or exported can't be recalled." onConfirm={() => revoke && apply(current.filter((x) => x !== revoke), "Sharing stopped")} />
    </Surface>
  );
}
