import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Pause, Play, Share2, Moon, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBoot } from "@/lib/boot";
import { useChild } from "@/lib/child";
import { useRecords, byKind, ds, dget, when, type Rec } from "@/lib/api";
import { ago, fmtClock, fmtDate, fmtTime, minutesLabel, toLocalInput, fromLocalInput } from "@/lib/format";
import { Btn, Chip, Surface, Tag, SectionTitle, ScopeTag, Confirm, RecordDialog, inputCls, type Field } from "@/components/kit";
import { cn } from "@/lib/utils";

export const SLEEP_FIELDS: Field[] = [{ key: "data.startAt", label: "Fell asleep", type: "datetime" }, { key: "data.endAt", label: "Woke up", type: "datetime" }, { key: "occurredAt", label: "Recorded time", type: "datetime" }, { key: "notes", label: "Notes", type: "textarea" }];

/* ---------- explicit sleep log dialog (replaces the old blind 1h shortcut) ---------- */
export function SleepLogDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved?: (r: Rec) => void }) {
  const { boot, childId } = useBoot();
  const { child, name } = useChild();
  const { create, remove } = useRecords();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setStart(toLocalInput(new Date(Date.now() - 36e5).toISOString()));
    setEnd(toLocalInput(new Date().toISOString()));
    setNotes(""); setErr(null);
  }, [open]);
  const s = start ? new Date(start) : null, e = end ? new Date(end) : null;
  const mins = s && e ? Math.round((+e - +s) / 60000) : null;
  const save = async () => {
    if (!s || !e) return setErr("Add both times");
    if (+e <= +s) return setErr("Woke up needs to be after fell asleep");
    if (+e > Date.now() + 5 * 60000) return setErr("Woke up can't be in the future");
    if (mins! > 24 * 60) return setErr("That's longer than 24 hours — check the dates");
    try {
      const r = await create.mutateAsync({ kind: "sleep", title: "Sleep", scope: "baby", childId: child?.id || childId, occurredAt: fromLocalInput(end), notes: notes || undefined, data: { startAt: fromLocalInput(start), endAt: fromLocalInput(end), duration: mins } });
      onOpenChange(false);
      onSaved?.(r);
      toast({ title: `Sleep saved · ${fmtClock(fromLocalInput(start), boot.profile.timezone)}–${fmtClock(fromLocalInput(end), boot.profile.timezone)}`, description: `${minutesLabel(mins)}${name ? ` for ${name}` : ""}. Edit it from the sleep page or timeline.`, action: <ToastAction altText="Undo" onClick={() => remove.mutate(r.id)}>Undo</ToastAction> });
    } catch (x) { setErr((x as Error).message); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[20px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Log a sleep</DialogTitle>
          <DialogDescription>Check the times before saving{name ? ` · for ${name}` : ""}. Rough is fine.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Fell asleep</span><input type="datetime-local" className={inputCls} value={start} onChange={(x) => setStart(x.target.value)} data-testid="input-sleep-start" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Woke up</span><input type="datetime-local" className={inputCls} value={end} onChange={(x) => setEnd(x.target.value)} data-testid="input-sleep-end" /></label>
          <div className="flex flex-wrap gap-2">{[20, 45, 60, 90].map((m) => <Chip key={m} className="min-h-9 text-sm" onClick={() => { const en = end ? new Date(end) : new Date(); setStart(toLocalInput(new Date(+en - m * 60000).toISOString())); }}>{minutesLabel(m)} nap</Chip>)}</div>
          <p className="rounded-xl bg-sky px-3 py-2 text-sm text-accent-foreground" data-testid="text-sleep-duration">{mins && mins > 0 ? `That's ${minutesLabel(mins)}.` : "Choose times to see the length."}</p>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Notes (optional)</span><textarea rows={2} className={inputCls} value={notes} onChange={(x) => setNotes(x.target.value)} /></label>
          {err && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter className="mt-2 flex-row justify-end gap-2">
          <Btn variant="outline" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={create.isPending} data-testid="button-save-sleep">{create.isPending ? "Saving…" : "Save sleep"}</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- approaches ---------- */
type Step = { text: string; done: boolean };
type Approach = { key: string; name: string; min: number; max?: number; training?: boolean; desc: string; steps: string[] };
export const APPROACHES: Approach[] = [
  { key: "routine", name: "Wind-down routine", min: 0, desc: "A short, repeatable bedtime routine. Not training — fine at any age.", steps: ["Dim the lights", "Feed if needed", "Nappy and sleepwear", "Same short song or phrase", "Into the cot drowsy or asleep — whatever works"] },
  { key: "daynight", name: "Day–night cues", min: 0, max: 4, desc: "Bright, chatty days and dim, quiet nights to help body clocks settle.", steps: ["Open curtains and talk during day feeds", "Keep night feeds dim and quiet", "Same place for night sleep", "Swap one night shift with someone if you can"] },
  { key: "settle", name: "Responsive settling routine", min: 4, desc: "Consistent bedtime with your usual help to settle. Still not training.", steps: ["Same wind-down each night", "Settle with your usual help", "Try a consistent cue (phrase, white noise)", "Respond whenever your baby needs you", "Note what seems to help in What works"] },
  { key: "gradual", name: "Gradual presence (sample)", min: 6, training: true, desc: "A caregiver stays nearby and slowly reduces help over many nights.", steps: ["Same wind-down routine", "Settle with your usual help", "Over several nights, offer a little less help", "Respond whenever your baby needs you", "Check in after a week and adjust"] },
  { key: "checks", name: "Timed reassurance (sample)", min: 6, training: true, desc: "Short, regular check-ins with reassurance. Some families prefer it; many don't.", steps: ["Same wind-down routine", "Settle and leave the room", "Return to reassure at intervals you're comfortable with", "Feed when your baby is hungry", "Pause any time"] },
];

export function SleepSupport() {
  const { boot } = useBoot();
  const { child, name, age } = useChild();
  const { update } = useRecords();
  const plan = byKind(boot.records, "sleepPlan").find((p) => p.status !== "ended" && (!p.childId || p.childId === child?.id));
  const [wizard, setWizard] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [saved, setSaved] = useState<Rec | null>(null);
  const [edit, setEdit] = useState<Rec | null>(null);
  const [end, setEnd] = useState(false);
  const steps: Step[] = dget<Step[]>(plan, "steps") || [];
  const checkins = dget<{ at: string; manageable?: string; progress?: string; by?: string }[]>(plan, "checkin") || [];
  const setData = (patch: Record<string, unknown>, status?: string) => plan && update.mutate({ id: plan.id, data: { status, data: patch } });
  const [pauseOpen, setPauseOpen] = useState(false);
  const doneN = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done);
  const sleeps = byKind(boot.records, "sleep").filter((r) => !r.childId || r.childId === child?.id).slice(0, 4);
  const tz = boot.profile.timezone;
  const savedLive = saved && boot.records.find((r) => r.id === saved.id);
  const young = (age?.months ?? 0) < 6;
  return (
    <section className="mb-8" id="sleep">
      <SectionTitle title="Sleep training & routines" sub="Understand what's common, try a routine, and — from around 6 months, only if you want — a gentle plan. Feeds are never removed and nothing is guaranteed." />
      <Surface tone="sand" className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-display text-xl">Log a sleep</p><p className="text-sm text-muted-foreground">Set the start and end before it's saved.</p></div>
          <Btn onClick={() => setLogOpen(true)} data-testid="button-log-sleep"><Moon className="h-4 w-4" />Log a sleep</Btn>
        </div>
        {savedLive && (
          <div className="rise mt-3 flex items-center justify-between gap-2 rounded-xl bg-card p-3" data-testid="row-saved-sleep">
            <div><p className="font-semibold">Saved · {fmtClock(ds(savedLive, "startAt"), tz)}–{fmtClock(ds(savedLive, "endAt"), tz)} ({minutesLabel(ds(savedLive, "duration"))})</p><p className="text-xs text-muted-foreground">Recorded {ago(savedLive.createdAt)} by {savedLive.authorName}</p></div>
            <div className="flex gap-1"><Btn size="sm" variant="soft" onClick={() => setEdit(savedLive)}><Pencil className="h-4 w-4" />Edit</Btn><Link href="/care?tab=baby&topic=everyday#timeline" className="press inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-semibold hover:bg-muted">Timeline</Link></div>
          </div>
        )}
        {!savedLive && sleeps.length > 0 && <ul className="mt-3 space-y-1 text-sm">{sleeps.map((r) => <li key={r.id} className="flex items-center justify-between rounded-xl bg-card/70 px-3 py-1.5"><span>{ds(r, "startAt") ? `${fmtClock(ds(r, "startAt"), tz)}–${fmtClock(ds(r, "endAt"), tz)}` : fmtTime(when(r), tz)} · {r.authorName}</span><button type="button" className="press flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted" aria-label="Edit sleep" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></button></li>)}</ul>}
      </Surface>

      {!plan || wizard ? (
        wizard ? <SleepWizard onDone={() => setWizard(false)} existing={plan} /> : (
          <Surface tone="sky">
            <p className="font-display text-xl">{young ? "Would a routine help?" : "Would a sleep plan help?"}</p>
            <p className="mt-1 text-[15px]">{young ? `${name || "Your baby"} is under 6 months, so Kinwell offers routines and settling ideas rather than sleep training.` : "A few questions, then a preview of every step before anything is saved. You can choose no training at all."}</p>
            <Btn className="mt-4" onClick={() => setWizard(true)} data-testid="button-start-sleep-plan">Start the questions</Btn>
          </Surface>
        )
      ) : (
        <Surface tone="sky" data-testid="sleep-plan">
          <div className="flex flex-wrap gap-1.5"><Tag tone={plan.status === "paused" ? "peach" : "sage"}>{plan.status === "paused" ? `Paused${ds(plan, "pauseReason") ? ` · ${ds(plan, "pauseReason")}` : ""}` : "Active"}</Tag><ScopeTag scope={plan.scope} /><Tag tone="warn">Sample plan</Tag></div>
          <p className="mt-2 font-display text-2xl">{plan.title}</p>
          {(APPROACHES.find((a) => a.key === ds(plan, "approach"))?.training && (age?.months ?? 99) < 6) && <p className="mt-2 rounded-xl bg-card/80 p-3 text-sm" data-testid="text-plan-suitability">The baby profile now shows {age?.label}. Training approaches are only offered from around 6 months — consider pausing or adjusting to a routine. Nothing has been changed or hidden.</p>}
          <p className="text-xs text-muted-foreground">Chosen by {plan.authorName} · started {fmtDate(ds(plan, "startedAt") || plan.createdAt)}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-card/70 p-3"><p className="text-xs font-bold text-muted-foreground">TONIGHT</p><p className="font-semibold">{doneN} of {steps.length} steps</p><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full origin-left bg-primary transition-transform" style={{ transform: `scaleX(${steps.length ? doneN / steps.length : 0})` }} /></div></div>
            <div className="rounded-xl bg-card/70 p-3"><p className="text-xs font-bold text-muted-foreground">CURRENT STEP</p><p className="font-semibold">{current?.text || "All done tonight"}</p></div>
            <div className="rounded-xl bg-card/70 p-3"><p className="text-xs font-bold text-muted-foreground">NEXT ACTION</p><p className="font-semibold">{plan.status === "paused" ? "Resume when ready" : checkins.length ? "Check in after tonight" : "Do a first check-in"}</p></div>
          </div>
          <ol className="mt-3 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i}><button type="button" role="checkbox" aria-checked={s.done} onClick={() => setData({ steps: steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                className={cn("press flex min-h-11 w-full items-center gap-3 rounded-xl bg-card/70 px-3 text-left", s.done && "text-muted-foreground line-through")}>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold", s.done ? "border-primary bg-primary text-primary-foreground" : "border-input")}>{i + 1}</span>{s.text}</button></li>
            ))}
          </ol>
          <Btn size="sm" variant="ghost" className="mt-1" onClick={() => setData({ steps: steps.map((x) => ({ ...x, done: false })) })}>Reset for tonight</Btn>
          <div className="mt-3 rounded-xl bg-card/70 p-3">
            <p className="text-sm font-semibold">How's it going? (optional)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Manageable", "Hard tonight", "Too much right now"].map((m) => <Chip key={m} className="min-h-9 text-sm" onClick={() => setData({ checkin: [{ at: new Date().toISOString(), manageable: m, by: boot.profile.name }, ...checkins].slice(0, 20) })}>{m}</Chip>)}
              {["Feels easier", "About the same", "Feels harder"].map((m) => <Chip key={m} className="min-h-9 text-sm" onClick={() => setData({ checkin: [{ at: new Date().toISOString(), progress: m, by: boot.profile.name }, ...checkins].slice(0, 20) })}>{m}</Chip>)}
            </div>
            {checkins.length > 0 && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer py-1">Last: {checkins[0].manageable || checkins[0].progress} · {ago(checkins[0].at)}{checkins[0].by ? ` by ${checkins[0].by}` : ""} ({checkins.length} check-ins)</summary><ul className="mt-1 space-y-0.5">{checkins.map((c, i) => <li key={i}>{c.manageable || c.progress} · {fmtDate(c.at)}{c.by ? ` · ${c.by}` : ""}</li>)}</ul></details>}
            {checkins[0]?.manageable === "Too much right now" && <p className="mt-2 text-sm">Want to adjust, or pause for a while? Both are good choices.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.status === "paused" ? <Btn disabled={update.isPending} onClick={() => setData({ pauseReason: null }, "active")}><Play className="h-4 w-4" />{update.isPending ? "Saving…" : "Resume"}</Btn> : <Btn variant="soft" disabled={update.isPending} onClick={() => { setData({ pauseReason: null }, "paused"); setPauseOpen(true); }}><Pause className="h-4 w-4" />{update.isPending ? "Saving…" : "Pause"}</Btn>}
            {plan.status === "paused" && <Btn variant="ghost" onClick={() => setPauseOpen(!pauseOpen)}>Add a reason (optional)</Btn>}
            <Btn variant="soft" onClick={() => setWizard(true)}>Adjust</Btn>
            <Btn variant="soft" onClick={() => update.mutate({ id: plan.id, data: { scope: plan.scope === "household" ? "baby" : "household" } }, { onSuccess: () => toast({ title: plan.scope === "household" ? "Visible only to people with baby grants" : "Visible to your household circle" }) })}><Share2 className="h-4 w-4" />{plan.scope === "household" ? "Limit who sees it" : "Show to whole circle"}</Btn>
            <Btn variant="ghost" onClick={() => setEnd(true)}>End plan</Btn>
          </div>
          {pauseOpen && plan.status === "paused" && (
            <div className="rise mt-3 flex flex-wrap gap-2">{["Illness", "Travel", "Teething", "Things changed", "Caregiver preference"].map((r) => <Chip key={r} onClick={() => { setData({ pauseReason: r }, "paused"); setPauseOpen(false); }}>{r}</Chip>)}</div>
          )}
          <Confirm open={end} onOpenChange={setEnd} title="End this plan?" confirm="End plan" body="It'll be kept in history. Your sleep logs stay as they are." onConfirm={() => update.mutate({ id: plan.id, data: { status: "ended" } })} />
        </Surface>
      )}
      <SleepLogDialog open={logOpen} onOpenChange={setLogOpen} onSaved={setSaved} />
      {edit && <RecordDialog open onOpenChange={(o) => !o && setEdit(null)} kind="sleep" heading="Sleep" fields={SLEEP_FIELDS} record={edit} />}
    </section>
  );
}

function SleepWizard({ onDone, existing }: { onDone: () => void; existing?: Rec }) {
  const { child, age } = useChild();
  const { create, update } = useRecords();
  const [ageMonths, setAge] = useState(String(age?.months ?? dget(existing, "ageMonths") ?? ""));
  const [circ, setCirc] = useState<string[]>(dget<string[]>(existing, "circumstances") || []);
  const [goals, setGoals] = useState<string[]>(dget<string[]>(existing, "goals") || []);
  const [feeding, setFeeding] = useState<string>(ds(existing, "feeding") || "");
  const [prefs, setPrefs] = useState<string[]>(dget<string[]>(existing, "preferences") || []);
  const [choice, setChoice] = useState<string | null>(ds(existing, "routineVariant") || ds(existing, "approach") || null);
  const tog = (arr: string[], set: (x: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const n = Number(ageMonths);
  const declined = prefs.includes("No training, thanks");
  const blocked = circ.includes("Recently unwell") || circ.includes("Born early");
  const options = APPROACHES.filter((a) => a.max === undefined || n < a.max).map((a) => ({ ...a, eligible: n >= a.min && (!a.training || (!declined && !blocked)) }));
  const chosen = APPROACHES.find((x) => x.key === choice && options.some((o) => o.key === x.key && o.eligible));
  const Group = ({ label, opts, arr, set }: { label: string; opts: string[]; arr: string[]; set: (x: string[]) => void }) => (
    <fieldset className="mt-4"><legend className="text-sm font-semibold">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{opts.map((o) => <Chip key={o} active={arr.includes(o)} onClick={() => tog(arr, set, o)}>{o}</Chip>)}</div></fieldset>
  );
  const save = () => {
    if (!chosen) return;
    const data = { ageMonths: n, circumstances: circ, goals, feeding, preferences: prefs, approach: chosen.training ? chosen.key : "routine", routineVariant: chosen.training ? undefined : chosen.key, startedAt: ds(existing, "startedAt") || new Date().toISOString(), steps: chosen.steps.map((t) => ({ text: t, done: false })), checkin: dget(existing, "checkin") || [] };
    if (existing) update.mutate({ id: existing.id, data: { title: chosen.name, status: "active", data } }, { onSuccess: onDone });
    else create.mutate({ kind: "sleepPlan", title: chosen.name, status: "active", scope: "baby", childId: child?.id, data }, { onSuccess: onDone });
  };
  return (
    <Surface tone="sky" className="rise">
      <p className="font-display text-xl">A few questions first</p>
      <label className="mt-3 block text-sm font-semibold" htmlFor="sp-age">Baby's age in months</label>
      <input id="sp-age" type="number" min={0} inputMode="numeric" className={cn(inputCls, "mt-1 max-w-32")} value={ageMonths} onChange={(e) => setAge(e.target.value)} />
      {age && <p className="mt-1 text-xs text-muted-foreground">From the baby profile: {age.label}.</p>}
      <Group label="Anything relevant right now?" opts={["Recently unwell", "Born early", "Travel coming up", "Sharing a room", "Teething", "None of these"]} arr={circ} set={setCirc} />
      <Group label="What would you like?" opts={["A calmer bedtime", "A predictable routine", "More rest for parents", "Just to understand sleep"]} arr={goals} set={setGoals} />
      <fieldset className="mt-4"><legend className="text-sm font-semibold">Night feeds</legend><div className="mt-2 flex flex-wrap gap-2">{["Feeds overnight — keep them", "Not sure yet", "Few or no night feeds"].map((o) => <Chip key={o} active={feeding === o} onClick={() => setFeeding(o)}>{o}</Chip>)}</div><p className="mt-1 text-xs text-muted-foreground">No plan here removes or limits feeds.</p></fieldset>
      <Group label="Caregiver preferences" opts={["Stay in the room", "Go gradually", "Minimal crying", "No training, thanks"]} arr={prefs} set={setPrefs} />
      <p className="mt-6 text-sm font-semibold">Options for {Number.isFinite(n) && ageMonths !== "" ? `${n} months` : "your baby"}</p>
      {n < 6 && <p className="mt-1 text-xs text-muted-foreground">Sleep training isn't offered under 6 months. These are routines.</p>}
      <ul className="mt-2 space-y-2">
        {options.map((o) => (
          <li key={o.key}>
            <button type="button" disabled={!o.eligible} aria-pressed={choice === o.key} onClick={() => setChoice(o.key)}
              className={cn("press w-full rounded-2xl border p-4 text-left disabled:opacity-60", choice === o.key ? "border-primary bg-card ring-2 ring-primary" : "border-input bg-card/70")}>
              <p className="font-semibold">{o.name} {o.training ? <Tag tone="peach">Training</Tag> : <Tag tone="sage">Routine</Tag>}</p><p className="text-sm text-muted-foreground">{o.desc}</p>
              {!o.eligible && <p className="mt-1 text-xs font-semibold">Not offered: {n < o.min ? `from around ${o.min} months` : declined ? "you chose no training" : "circumstances suggest waiting — talk to your health visitor"}</p>}
            </button>
          </li>
        ))}
      </ul>
      {chosen && (
        <div className="rise mt-4 rounded-2xl bg-card p-4" data-testid="sleep-plan-preview">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview · what you'll do each night</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">{chosen.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="mt-2 text-sm">Check in after a few nights. Pause, adjust or end any time — nothing is lost.</p>
        </div>
      )}
      <div className="mt-4 flex gap-2"><Btn onClick={save} disabled={!chosen}>{existing ? "Save changes" : "Start this plan"}</Btn><Btn variant="ghost" onClick={onDone}>Cancel</Btn></div>
      <p className="mt-3 text-xs text-muted-foreground">Sample eligibility rules and steps — not clinically reviewed. Results vary; there's no right outcome.</p>
    </Surface>
  );
}
