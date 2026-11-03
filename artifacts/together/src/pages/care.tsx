import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Pencil, Pill, Pause, Play, Share2, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useRecords, useProfileUpdate, byKind, ds, dget, when, type Rec } from "@/lib/api";
import { ago, babyAge, fmtClock, fmtDate, fmtTime, minutesLabel, pregnancyWeek } from "@/lib/format";
import { CHECKLISTS, type Stage } from "@/lib/content";
import { Btn, Chip, Surface, Tag, SectionTitle, Empty, KindSection, ChecklistCard, RecordDialog, Meta, VoiceButton, inputCls, ScopeTag, useStale, type Field } from "@/components/kit";
import { Library, OfflineEssentials, useSavedContent } from "@/components/library";
import { useAdministration } from "@/components/med";
import { cn } from "@/lib/utils";
import { LIBRARY } from "@/lib/content";

export default function CarePage() {
  const { boot } = useBoot();
  const search = new URLSearchParams(useSearch());
  const [, nav] = useLocation();
  const tab = search.get("tab") === "you" ? "you" : search.get("tab") === "baby" ? "baby" : "baby";
  const read = search.get("read");
  const stage = (boot.profile.stage || "preconception") as Stage;
  const setTab = (t: string) => nav(`/care?tab=${t}`);
  const setRead = (id: string | null) => nav(`/care?tab=${tab}${id ? `&read=${id}` : ""}`);

  useEffect(() => {
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" }), 200);
  }, [tab]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <h1 className="font-display text-[34px] leading-tight">Care</h1>
        <div role="tablist" aria-label="Whose care" className="flex rounded-full bg-muted p-1">
          {[["you", "You"], ["baby", "Baby"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`tab-care-${k}`}
              className={cn("press min-h-11 min-w-24 rounded-full px-5 font-semibold transition-colors", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tab === "you" ? "Your wellbeing and private records. Only you see entries marked private." : stage === "postpartum" ? "Routines, feeding, sleep, logs and care history." : "Development and preparation before birth."}</p>
      <div className="mt-6">
        {tab === "you" ? <YouTab stage={stage} read={read} setRead={setRead} /> : stage === "postpartum" ? <BabyTab read={read} setRead={setRead} /> : <BeforeBirth stage={stage} read={read} setRead={setRead} />}
      </div>
    </div>
  );
}

function Jump({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="Sections" className="sticky top-[68px] z-20 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur">
      {items.map(([id, l]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">{l}</a>)}
    </nav>
  );
}

/* ================= YOU ================= */
function YouTab({ stage, read, setRead }: { stage: Stage; read: string | null; setRead: (id: string | null) => void }) {
  return (
    <>
      <Jump items={[["checkin", "Check-in"], ...(stage === "preconception" ? [["prep", "Preparing"], ["cycle", "Cycle"]] as [string, string][] : []), ...(stage === "pregnancy" ? [["birth", "Birth prep"]] as [string, string][] : []), ...(stage === "postpartum" ? [["recovery", "Recovery"]] as [string, string][] : []), ["symptoms", "Notes"], ["library", "Library"], ["saved", "Saved"], ["offline", "Offline"]]} />
      {stage === "paused" && (
        <Surface tone="sand" className="mb-8">
          <p className="font-display text-xl">Pregnancy updates are paused</p>
          <p className="mt-1 text-[15px]">We won't show week-by-week or celebratory content. If you'd like to talk to someone, your GP or midwife can help, and your contacts are in Get help. You can change stage in Settings whenever you're ready — or not at all.</p>
        </Surface>
      )}
      <div id="checkin"><FeelingsCheckin /></div>
      {stage === "preconception" && (
        <>
          <div id="prep" className="mb-8 grid gap-4">
            <ChecklistCard source="preconception" title={CHECKLISTS.preconception.title} defaults={CHECKLISTS.preconception.items} scope="private" tone="sage" />
            <ChecklistCard source="agenda" title={CHECKLISTS.agenda.title} defaults={CHECKLISTS.agenda.items} scope="private" />
          </div>
          <div id="cycle"><CycleSection /></div>
        </>
      )}
      {stage === "pregnancy" && (
        <div id="birth" className="mb-8 grid gap-4">
          <ChecklistCard source="birthplan" title={CHECKLISTS.birthplan.title} defaults={CHECKLISTS.birthplan.items} scope="private" tone="peach" />
          <ChecklistCard source="firstweeks" title={CHECKLISTS.firstweeks.title} defaults={CHECKLISTS.firstweeks.items} scope="household" />
        </div>
      )}
      {stage === "postpartum" && (
        <div id="recovery">
          <KindSection title="Recovery reminders" sub="Follow-ups and things to keep an eye on. Private to you." kind="task" scope="private"
            filter={(r) => !!dget(r, "recovery")} extraData={{ recovery: true }} empty="No recovery reminders" emptyBody="Add your postnatal check or anything a clinician asked you to follow up."
            fields={[{ key: "title", label: "Reminder", required: true, placeholder: "Postnatal check" }, { key: "data.dueDate", label: "When", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }]}
            line={(r) => ds(r, "dueDate") && `Due ${fmtDate(ds(r, "dueDate"))}`} />
        </div>
      )}
      <div id="symptoms">
        <KindSection title={stage === "preconception" ? "Health notes" : "Symptoms & body notes"} sub="Optional. Always private to you. Nothing here is interpreted or scored." kind="symptom" scope="private"
          empty="Nothing noted" emptyBody="Only if useful — perhaps to bring up at an appointment."
          fields={[{ key: "title", label: "What you noticed", required: true }, { key: "occurredAt", label: "When", type: "datetime" }, { key: "data.severity", label: "How much is it bothering you?", type: "select", options: [{ value: "a little", label: "A little" }, { value: "quite a bit", label: "Quite a bit" }, { value: "a lot", label: "A lot" }] }, { key: "notes", label: "Notes", type: "textarea" }]}
          line={(r) => ds(r, "severity") && `Bothering you ${ds(r, "severity")}`} />
      </div>
      <div id="library"><Library stage={stage} topics={["recovery", "nutrition", "movement", "preparation"]} title="Guides for you" openId={read} onOpenId={setRead} /></div>
      <div id="saved"><SavedList /></div>
      <OfflineEssentials />
    </>
  );
}

function FeelingsCheckin() {
  const { boot } = useBoot();
  const { create, remove } = useRecords();
  const [, nav] = useLocation();
  const [feeling, setFeeling] = useState<string | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<Rec | null>(null);
  const mine = byKind(boot.records, "checkin").filter((c) => c.authorId === boot.profile.id || c.scope === "private").slice(0, 5);
  const save = async () => {
    const r = await create.mutateAsync({ kind: "checkin", title: [feeling && `Feeling ${feeling.toLowerCase()}`, need && `Needs: ${need}`].filter(Boolean).join(" · ") || "Check-in", scope: "private", occurredAt: new Date().toISOString(), notes: text || undefined, data: { feeling, need } });
    setDone(r);
    setText("");
  };
  return (
    <section className="mb-8">
      <SectionTitle title="A quick check-in?" sub="Optional, skippable, and private to you. Nothing is scored or diagnosed." />
      <Surface tone="sage">
        {done ? (
          <div className="rise">
            <p className="font-display text-xl">Thanks. Kept privately.</p>
            {need && need !== "Nothing right now" && <div className="mt-3 flex flex-wrap gap-2"><Btn onClick={() => nav(`/together?tab=help&prepare=${encodeURIComponent(need)}`)}>Ask someone for {need.toLowerCase()}</Btn></div>}
            {feeling === "Struggling" && <p className="mt-3 text-[15px]">If things feel heavy, talking to your GP, midwife or health visitor can help. If you feel unsafe, use Get help.</p>}
            <Btn variant="ghost" className="mt-2" onClick={() => { setDone(null); setFeeling(null); setNeed(null); }}>Done</Btn>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold">How are you feeling?</p>
            <div className="mt-2 flex flex-wrap gap-2">{["Okay", "Mixed", "Struggling"].map((f) => <Chip key={f} active={feeling === f} onClick={() => setFeeling(feeling === f ? null : f)} data-testid={`feeling-${f}`}>{f}</Chip>)}<Chip onClick={() => setFeeling(null)} active={false}>Skip</Chip></div>
            <p className="mt-4 text-sm font-semibold">Anything that would help?</p>
            <div className="mt-2 flex flex-wrap gap-2">{["Some rest", "A meal", "Help with baby", "Someone to talk to", "Nothing right now"].map((n) => <Chip key={n} active={need === n} onClick={() => setNeed(need === n ? null : n)}>{n}</Chip>)}</div>
            <details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Add a few words (optional)</summary>
              <textarea className={cn(inputCls, "mt-2")} rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Optional detail" />
              <div className="mt-2"><VoiceButton onText={(t) => setText((x) => (x ? x + " " : "") + t)} /></div>
            </details>
            <Btn className="mt-4" onClick={save} disabled={(!feeling && !need && !text) || create.isPending} data-testid="button-save-checkin">Save privately</Btn>
          </>
        )}
      </Surface>
      {mine.length > 0 && (
        <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-muted-foreground">Your recent check-ins</summary>
          <ul className="mt-2 space-y-2">{mine.map((c) => <li key={c.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 border border-card-border"><div><p className="text-sm font-semibold">{c.title}</p><p className="text-xs text-muted-foreground">{fmtTime(when(c), boot.profile.timezone)}</p></div><Btn size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}>Delete</Btn></li>)}</ul>
        </details>
      )}
    </section>
  );
}

function CycleSection() {
  const { boot } = useBoot();
  const cycles = byKind(boot.records, "cycle").filter((c) => ds(c, "startDate")).sort((a, b) => ds(b, "startDate").localeCompare(ds(a, "startDate")));
  const starts = cycles.map((c) => new Date(ds(c, "startDate") + "T12:00:00").getTime());
  const lens = starts.slice(0, -1).map((s, i) => Math.round((s - starts[i + 1]) / 864e5)).filter((l) => l > 15 && l < 60);
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : null;
  const spread = lens.length > 1 ? Math.max(...lens) - Math.min(...lens) : null;
  let est: string | null = null;
  if (avg && starts[0]) {
    const from = new Date(starts[0] + (avg - 19 - (spread || 0) / 2) * 864e5);
    const to = new Date(starts[0] + (avg - 10 + (spread || 0) / 2) * 864e5);
    est = `${from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${to.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return (
    <>
      <Surface tone="peach" className="mb-4">
        <div className="flex items-start gap-2"><Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div>
          <p className="font-display text-xl">Educational estimate</p>
          {est ? <p className="mt-1 text-[15px]">From {cycles.length} recorded start dates (average about {Math.round(avg!)} days{spread ? `, varying by up to ${spread} days` : ""}), a rough possible window is <strong>{est}</strong>. The range is deliberately wide.</p>
            : <p className="mt-1 text-[15px]">Add at least two period start dates to see a rough, wide estimate.</p>}
          <p className="mt-2 text-sm text-muted-foreground">This is not contraception, a diagnosis, or a prediction of fertility. Cycles vary. Flo or other apps aren't needed — enter dates manually.</p>
        </div></div>
      </Surface>
      <KindSection title="Cycle history" sub="Private to you. Edit or delete any entry." kind="cycle" scope="private"
        empty="No cycles recorded" emptyBody="Optional. Add start dates if a rough estimate would help."
        fields={[{ key: "data.startDate", label: "Start date", type: "date", required: true }, { key: "data.endDate", label: "End date (optional)", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }]}
        defaults={{ title: "Cycle" }} addLabel="Add dates"
        line={(r) => `${fmtDate(ds(r, "startDate"))}${ds(r, "endDate") ? ` – ${fmtDate(ds(r, "endDate"))}` : ""}`} />
    </>
  );
}

function SavedList() {
  const { boot } = useBoot();
  const { remove } = useRecords();
  const [, nav] = useLocation();
  const { saved } = useSavedContent();
  return (
    <section className="mb-8">
      <SectionTitle title="Saved" sub="Things you bookmarked from Home or the library." />
      {saved.length === 0 ? <Empty title="Nothing saved yet" /> : (
        <ul className="space-y-2">{saved.map((s) => {
          const cid = ds(s, "contentId");
          return (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-card-border bg-card p-3">
              <button type="button" className="min-h-11 flex-1 text-left font-semibold" onClick={() => cid ? nav(`/care?tab=${LIBRARY.find((l) => l.id === cid)?.topic === "recovery" ? "you" : "baby"}&read=${cid}`) : ds(s, "href") && nav(ds(s, "href"))}>{s.title}</button>
              <Btn size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>Remove</Btn>
            </li>
          );
        })}</ul>
      )}
      <p className="sr-only">{boot.records.length} records</p>
    </section>
  );
}

/* ================= BEFORE BIRTH ================= */
const DEV: [number, string, string][] = [
  [12, "Early development", "Major organs are forming. Many people feel very tired in these weeks."],
  [20, "Growing and moving", "Movements may start to be felt — often like flutters at first."],
  [27, "Hearing and responding", "Your baby may respond to sounds. Backache and heartburn are common body changes."],
  [36, "Gaining weight", "Babies put on weight in the third trimester. Sleep may get harder for you."],
  [43, "Getting ready", "Your baby could arrive any time from here. Keep your bag and plans handy."],
];
function BeforeBirth({ stage, read, setRead }: { stage: Stage; read: string | null; setRead: (id: string | null) => void }) {
  const { boot } = useBoot();
  const week = pregnancyWeek(boot.profile.dueDate);
  const [imagery, setImagery] = useState(() => localStorage.getItem("together.imagery") !== "off");
  const d = week ? DEV.find(([w]) => week <= w) : null;
  if (stage === "paused") return <Empty title="Nothing to show here right now">Baby content is paused. Your plans and contacts are still in Plan and Together.</Empty>;
  return (
    <>
      {stage === "pregnancy" && (
        <Surface tone="sky" className="mb-8">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">What's changing this week</p>
              <h2 className="mt-1 font-display text-3xl">{week ? `Week ${week}` : "Add your due date"}</h2>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => { setImagery(!imagery); localStorage.setItem("together.imagery", imagery ? "off" : "on"); }} aria-pressed={imagery}>{imagery ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{imagery ? "Hide imagery" : "Show imagery"}</Btn>
          </div>
          {imagery && week && (
            <div className="my-4 flex items-end gap-3" aria-hidden>
              {[8, 16, 24, 32, 40].map((w) => <div key={w} className={cn("rounded-full", w <= week ? "bg-primary/70" : "bg-card")} style={{ width: 10 + w * 1.4, height: 10 + w * 1.4 }} />)}
            </div>
          )}
          {d ? <><p className="mt-2 font-semibold">{d[1]}</p><p className="text-[15px]">{d[2]}</p></> : <p className="mt-2">Set an estimated due date in Settings to see week-by-week notes. "Not sure" is fine.</p>}
          <Tag tone="warn" className="mt-3">Sample content — not clinically reviewed</Tag>
        </Surface>
      )}
      <div className="mb-8 grid gap-4">
        <ChecklistCard source="firstweeks" title={CHECKLISTS.firstweeks.title} defaults={CHECKLISTS.firstweeks.items} />
      </div>
      <PreferencesSection />
      <Library stage={stage} topics={["sleep", "feeding", "care", "preparation"]} title="Getting ready for baby" openId={read} onOpenId={setRead} />
    </>
  );
}

/* ================= BABY ================= */
const FEED_FIELDS: Field[] = [
  { key: "occurredAt", label: "When it happened", type: "datetime" },
  { key: "data.method", label: "Type", type: "select", options: [{ value: "breast", label: "Breast" }, { value: "bottle", label: "Bottle" }, { value: "formula", label: "Formula" }, { value: "expressed", label: "Expressed milk" }] },
  { key: "data.side", label: "Side", type: "select", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }, { value: "both", label: "Both" }] },
  { key: "data.amount", label: "Amount", type: "number" },
  { key: "data.unit", label: "Unit", type: "select", options: [{ value: "ml", label: "ml" }, { value: "oz", label: "oz" }] },
  { key: "data.duration", label: "Duration (minutes)", type: "number" },
  { key: "notes", label: "Notes", type: "textarea" },
];
const SLEEP_FIELDS: Field[] = [{ key: "data.startAt", label: "Fell asleep", type: "datetime" }, { key: "data.endAt", label: "Woke up", type: "datetime" }, { key: "occurredAt", label: "Recorded time", type: "datetime" }, { key: "notes", label: "Notes", type: "textarea" }];
const DIAPER_FIELDS: Field[] = [{ key: "occurredAt", label: "When", type: "datetime" }, { key: "data.type", label: "Type", type: "select", options: [{ value: "wet", label: "Wet" }, { value: "dirty", label: "Dirty" }, { value: "both", label: "Both" }] }, { key: "notes", label: "Notes", type: "textarea" }];
const PUMP_FIELDS: Field[] = [{ key: "occurredAt", label: "When", type: "datetime" }, { key: "data.amount", label: "Amount", type: "number" }, { key: "data.unit", label: "Unit", type: "select", options: [{ value: "ml", label: "ml" }, { value: "oz", label: "oz" }] }, { key: "data.duration", label: "Duration (minutes)", type: "number" }, { key: "notes", label: "Notes", type: "textarea" }];
const FIELDS_BY: Record<string, Field[]> = { feed: FEED_FIELDS, sleep: SLEEP_FIELDS, diaper: DIAPER_FIELDS, pumping: PUMP_FIELDS };

export function describe(r: Rec) {
  if (r.kind === "feed") return [ds(r, "method"), ds(r, "side"), ds(r, "amount") && `${ds(r, "amount")} ${ds(r, "unit")}`, minutesLabel(ds(r, "duration"))].filter(Boolean).join(" · ");
  if (r.kind === "sleep") { const s = ds(r, "startAt"), e = ds(r, "endAt"); const m = s && e ? (+new Date(e) - +new Date(s)) / 60000 : Number(ds(r, "duration")); return [s && `from ${fmtClock(s)}`, e && `to ${fmtClock(e)}`, minutesLabel(m)].filter(Boolean).join(" ") || "Times not recorded"; }
  if (r.kind === "diaper") return ds(r, "type");
  if (r.kind === "pumping") return [ds(r, "amount") && `${ds(r, "amount")} ${ds(r, "unit")}`, minutesLabel(ds(r, "duration"))].filter(Boolean).join(" · ") || "Amount not recorded";
  return "";
}

function BabyTab({ read, setRead }: { read: string | null; setRead: (id: string | null) => void }) {
  const { boot } = useBoot();
  const age = babyAge(boot.profile.birthDate);
  return (
    <>
      <Jump items={[["timeline", "Timeline"], ["feeding", "Feeding"], ["sleep", "Sleep"], ["meds", "Medication"], ["works", "What works"], ["solids", "Solids"], ["milestones", "Milestones"], ["demos", "Guides"], ["children", "Children"], ["offline", "Offline"]]} />
      <Surface tone="sky" className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">What's changing</p>
        <h2 className="mt-1 font-display text-3xl">{boot.profile.childName || "Your baby"}{age ? `, ${age.label}` : ""}</h2>
        <p className="mt-1 text-[15px]">{!age ? "Add a birth date in Settings to see age-relevant guides." : age.months < 3 ? "Lots of short sleeps and frequent feeds are common now. Faces and voices are fascinating." : age.months < 6 ? "Longer awake times, more smiles and sounds. Rolling may start." : "Sitting, reaching and — around now — getting ready for first foods."}</p>
        <p className="mt-2 text-xs text-muted-foreground">General, not a prediction. Every baby develops at their own pace. Sample content.</p>
      </Surface>
      <div id="timeline"><Timeline /></div>
      <div id="feeding"><Feeding /></div>
      <div id="sleep"><SleepSupport /></div>
      <div id="meds"><Medication /></div>
      <div id="works"><PreferencesSection /></div>
      <div id="solids">
        {(age?.months ?? 0) >= 4 ? (
          <KindSection title="Foods tried" sub="Shared list of foods offered and what you noticed. Not an allergy test — contact a clinician about reactions." kind="food" scope="baby"
            empty="No foods recorded yet" emptyBody="When solids begin, note what was offered and anything you observed."
            fields={[{ key: "title", label: "Food", required: true }, { key: "data.date", label: "Date offered", type: "date" }, { key: "data.reaction", label: "What you observed", type: "select", options: [{ value: "none noticed", label: "Nothing noticed" }, { value: "liked", label: "Seemed to like it" }, { value: "refused", label: "Not interested" }, { value: "possible reaction", label: "Possible reaction" }] }, { key: "notes", label: "Notes", type: "textarea" }]}
            line={(r) => <>{fmtDate(ds(r, "date"))} {ds(r, "reaction") && <Tag tone={ds(r, "reaction") === "possible reaction" ? "warn" : "muted"}>{ds(r, "reaction")}</Tag>}</>} />
        ) : (
          <Surface tone="sand" className="mb-8"><p className="font-display text-xl">Starting solids</p><p className="mt-1 text-[15px]">Food logging appears from around four months, alongside readiness guides. Changes in sleep aren't a sign to start.</p></Surface>
        )}
      </div>
      <div id="milestones">
        <KindSection title="Milestone notes" sub="Moments you want to remember. No rankings or comparisons." kind="milestone" scope="baby"
          empty="No notes yet" fields={[{ key: "title", label: "What happened", required: true }, { key: "occurredAt", label: "When", type: "datetime" }, { key: "notes", label: "Details", type: "textarea" }]} />
      </div>
      <div id="demos"><Library stage="postpartum" topics={["sleep", "feeding", "care", "concerns", "solids", "play", "development"]} title="Guides & demonstrations" openId={read} onOpenId={setRead} /></div>
      <div id="children">
        <KindSection title="Children" sub="More than one child? Add them here and choose at the top of the screen." kind="child" scope="baby"
          empty="No child profiles yet" fields={[{ key: "title", label: "Name", required: true }, { key: "data.birthDate", label: "Birth date", type: "date" }]} line={(r) => ds(r, "birthDate") && `Born ${fmtDate(ds(r, "birthDate"))}`} />
      </div>
      <OfflineEssentials />
    </>
  );
}

function Timeline() {
  const { boot, childId } = useBoot();
  const [filter, setFilter] = useState<string | null>(null);
  const [edit, setEdit] = useState<Rec | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const stale = useStale();
  const tz = boot.profile.timezone;
  const list = byKind(boot.records, "feed", "sleep", "diaper", "pumping").filter((r) => !filter || r.kind === filter).filter((r) => !childId || !r.childId || r.childId === childId || r.kind === "pumping");
  const today = list.filter((r) => new Date(when(r)).toDateString() === new Date().toDateString());
  const count = (k: string) => today.filter((r) => r.kind === k).length;
  const lastOf = (k: string) => byKind(boot.records, k)[0];
  return (
    <section className="mb-8">
      <SectionTitle title="Care timeline" sub={stale.label} action={<Btn size="sm" variant="soft" onClick={() => setAdding("feed")}>Add past entry</Btn>} />
      <Surface tone="sand" className="mb-3 p-4">
        <p className="text-[15px]">Today so far: {count("feed")} feeds, {count("sleep")} sleeps and {count("diaper")} nappies recorded. {["feed", "sleep"].map((k) => { const l = lastOf(k); return l ? ` Last ${k} recorded ${ago(when(l))} by ${l.authorName}.` : ` No ${k} has been recorded.`; }).join("")}</p>
        <p className="mt-1 text-xs text-muted-foreground">Only what's been recorded. Not every feed needs logging — gaps aren't a problem.</p>
      </Surface>
      <div className="mb-3 flex flex-wrap gap-2">
        {[[null, "All"], ["feed", "Feeds"], ["sleep", "Sleep"], ["diaper", "Nappies"], ["pumping", "Pumping"]].map(([k, l]) => <Chip key={l} className="min-h-9 text-sm" active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
      </div>
      {list.length === 0 ? <Empty title="Nothing recorded yet">Use Log for one-tap entries.</Empty> : (
        <ol className="relative space-y-2 border-l-2 border-border pl-4">
          {list.slice(0, 25).map((r) => (
            <li key={r.id} className="relative">
              <span className={cn("absolute -left-[23px] top-4 h-3 w-3 rounded-full ring-4 ring-background", r.kind === "feed" ? "bg-chart-2" : r.kind === "sleep" ? "bg-chart-3" : "bg-primary")} aria-hidden />
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-card-border bg-card p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{fmtClock(when(r), tz)} · {r.title} <span className="font-normal text-muted-foreground">{describe(r)}</span></p>
                  <Meta r={r} />
                </div>
                <button type="button" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted" aria-label={`Correct ${r.title} at ${fmtClock(when(r), tz)}`} onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {edit && <RecordDialog open onOpenChange={(o) => !o && setEdit(null)} kind={edit.kind} heading={edit.title} fields={FIELDS_BY[edit.kind] || []} record={edit} />}
      {adding && (
        <RecordDialog open onOpenChange={(o) => !o && setAdding(null)} kind={adding as "feed"} heading={adding === "feed" ? "Feed" : adding === "sleep" ? "Sleep" : adding === "diaper" ? "Nappy" : "Pumping"}
          fields={[{ key: "title", label: "Label", placeholder: "Feed" }, ...FIELDS_BY[adding]]} scope={adding === "pumping" ? "private" : "baby"} defaults={{ title: adding === "feed" ? "Feed" : adding === "sleep" ? "Sleep" : adding === "diaper" ? "Nappy" : "Pumping" }} extraData={{}} />
      )}
      {adding && (
        <div className="mt-2 flex flex-wrap gap-2">{["feed", "sleep", "diaper", "pumping"].map((k) => <Chip key={k} className="min-h-9 text-sm" active={adding === k} onClick={() => setAdding(k)}>{k}</Chip>)}</div>
      )}
    </section>
  );
}

function Feeding() {
  const { boot } = useBoot();
  const up = useProfileUpdate();
  const current = boot.profile.feedingApproach || "";
  const feeds = byKind(boot.records, "feed").filter((r) => +new Date(when(r)) > Date.now() - 864e5);
  return (
    <section className="mb-8">
      <SectionTitle title="Feeding" sub="Whichever way works. Change any time — nothing resets." />
      <Surface>
        <p className="text-sm font-semibold">Current approach</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Breastfeeding", "Pumping", "Formula", "Combination"].map((f) => <Chip key={f} active={current === f} onClick={() => up.mutate({ feedingApproach: f }, { onSuccess: () => toast({ title: `Feeding approach: ${f}` }) })}>{f}</Chip>)}
        </div>
        <p className="mt-4 text-[15px]">{feeds.length ? `${feeds.length} feeds recorded in the last 24 hours. Most recent ${ago(when(feeds[0]))}.` : "No feed has been recorded in the last 24 hours."}</p>
        <p className="mt-2 text-sm text-muted-foreground">Worried about feeding or weight? A midwife, health visitor or lactation professional can help — add them in Plan › Contacts.</p>
      </Surface>
    </section>
  );
}

/* ---------- sleep plan ---------- */
type Step = { text: string; done: boolean };
const APPROACHES = [
  { key: "routine", name: "Wind-down routine only", min: 0, desc: "A short, repeatable bedtime routine. No training. Suitable to try at any age.", steps: ["Dim the lights", "Feed if needed", "Nappy and sleepwear", "Same short song or phrase", "Into the cot drowsy or asleep — whatever works"] },
  { key: "gradual", name: "Gradual presence (sample)", min: 6, desc: "A caregiver stays nearby and slowly reduces help over many nights.", steps: ["Same wind-down routine", "Settle with your usual help", "Over several nights, offer a little less help", "Respond whenever your baby needs you", "Check in after a week and adjust"] },
  { key: "checks", name: "Timed reassurance (sample)", min: 6, desc: "Short, regular check-ins with reassurance. Some families prefer it; many don't.", steps: ["Same wind-down routine", "Settle and leave the room", "Return to reassure at intervals you're comfortable with", "Feed when your baby is hungry", "Pause any time"] },
];

function SleepSupport() {
  const { boot } = useBoot();
  const { create, update } = useRecords();
  const plans = byKind(boot.records, "sleepPlan").filter((p) => p.status !== "ended");
  const plan = plans[0];
  const [wizard, setWizard] = useState(false);
  const steps: Step[] = dget<Step[]>(plan, "steps") || [];
  const checkins = (dget<{ at: string; manageable?: string; progress?: string; by?: string }[]>(plan, "checkin") || []);
  const setData = (patch: Record<string, unknown>, status?: string) => plan && update.mutate({ id: plan.id, data: { status, data: { ...(plan.data as object), ...patch } } });
  const [pauseOpen, setPauseOpen] = useState(false);
  return (
    <section className="mb-8">
      <SectionTitle title="Sleep support" sub="Education, a simple routine, and optional plans. No promises about sleep — and feeds are never removed by a plan." />
      {!plan || wizard ? (
        wizard ? <SleepWizard onDone={() => setWizard(false)} existing={plan} /> : (
          <Surface tone="sky">
            <p className="font-display text-xl">Would a plan help?</p>
            <p className="mt-1 text-[15px]">We'll ask a few questions first: age, circumstances, goals, feeding and how you'd like to approach it. You can decline training and still use the routine and sleep log.</p>
            <Btn className="mt-4" onClick={() => setWizard(true)} data-testid="button-start-sleep-plan">Start the questions</Btn>
          </Surface>
        )
      ) : (
        <Surface tone="sky" data-testid="sleep-plan">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap gap-1.5"><Tag tone={plan.status === "paused" ? "peach" : "sage"}>{plan.status === "paused" ? `Paused${ds(plan, "pauseReason") ? ` · ${ds(plan, "pauseReason")}` : ""}` : "Active"}</Tag><ScopeTag scope={plan.scope} /><Tag tone="warn">Sample plan</Tag></div>
              <p className="mt-2 font-display text-2xl">{plan.title}</p>
              <p className="text-xs text-muted-foreground">Chosen by {plan.authorName} · {fmtDate(plan.createdAt)}</p>
            </div>
          </div>
          <ol className="mt-3 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i}><button type="button" role="checkbox" aria-checked={s.done} onClick={() => setData({ steps: steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                className={cn("press flex min-h-11 w-full items-center gap-3 rounded-xl bg-card/70 px-3 text-left", s.done && "text-muted-foreground line-through")}>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold", s.done ? "border-primary bg-primary text-primary-foreground" : "border-input")}>{i + 1}</span>{s.text}</button></li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Tonight's steps reset each day on your side — ticks are just for tonight.</p>
          <div className="mt-4 rounded-xl bg-card/70 p-3">
            <p className="text-sm font-semibold">How's it going? (optional)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Manageable", "Hard tonight", "Too much right now"].map((m) => <Chip key={m} className="min-h-9 text-sm" onClick={() => setData({ checkin: [{ at: new Date().toISOString(), manageable: m, by: boot.profile.name }, ...checkins].slice(0, 20) })}>{m}</Chip>)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Feels easier", "About the same", "Feels harder"].map((m) => <Chip key={m} className="min-h-9 text-sm" onClick={() => setData({ checkin: [{ at: new Date().toISOString(), progress: m, by: boot.profile.name }, ...checkins].slice(0, 20) })}>{m}</Chip>)}
            </div>
            {checkins[0] && <p className="mt-2 text-xs text-muted-foreground">Last: {checkins[0].manageable || checkins[0].progress} · {ago(checkins[0].at)}{checkins[0].by ? ` by ${checkins[0].by}` : ""}</p>}
            {checkins[0]?.manageable === "Too much right now" && <p className="mt-2 text-sm">Want to adjust tonight's plan, or pause for a while? Both are fine choices.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.status === "paused" ? <Btn onClick={() => setData({ pauseReason: null }, "active")}><Play className="h-4 w-4" />Resume</Btn> : <Btn variant="soft" onClick={() => setPauseOpen(!pauseOpen)}><Pause className="h-4 w-4" />Pause</Btn>}
            <Btn variant="soft" onClick={() => setWizard(true)}>Adjust</Btn>
            <Btn variant="soft" onClick={() => update.mutate({ id: plan.id, data: { scope: plan.scope === "household" ? "baby" : "household" } }, { onSuccess: () => toast({ title: plan.scope === "household" ? "Shared only via caregiver grants" : "Shared with your household circle" }) })}><Share2 className="h-4 w-4" />{plan.scope === "household" ? "Limit sharing" : "Share with circle"}</Btn>
            <Btn variant="ghost" onClick={() => update.mutate({ id: plan.id, data: { status: "ended" } })}>End plan</Btn>
          </div>
          {pauseOpen && plan.status !== "paused" && (
            <div className="rise mt-3 flex flex-wrap gap-2">{["Illness", "Travel", "Things changed", "Caregiver preference"].map((r) => <Chip key={r} onClick={() => { setData({ pauseReason: r }, "paused"); setPauseOpen(false); }}>{r}</Chip>)}</div>
          )}
        </Surface>
      )}
      <div className="mt-3"><Btn variant="outline" size="sm" onClick={() => create.mutate({ kind: "sleep", title: "Sleep", scope: "baby", occurredAt: new Date().toISOString(), data: { startAt: new Date(Date.now() - 36e5).toISOString(), endAt: new Date().toISOString(), duration: 60 } })}>Log a sleep that just ended (1 h — edit after)</Btn></div>
    </section>
  );
}

function SleepWizard({ onDone, existing }: { onDone: () => void; existing?: Rec }) {
  const { boot } = useBoot();
  const { create, update } = useRecords();
  const age = babyAge(boot.profile.birthDate);
  const [ageMonths, setAge] = useState(String(dget(existing, "ageMonths") ?? age?.months ?? ""));
  const [circ, setCirc] = useState<string[]>(dget<string[]>(existing, "circumstances") || []);
  const [goals, setGoals] = useState<string[]>(dget<string[]>(existing, "goals") || []);
  const [feeding, setFeeding] = useState<string>(ds(existing, "feeding") || "");
  const [prefs, setPrefs] = useState<string[]>(dget<string[]>(existing, "preferences") || []);
  const [choice, setChoice] = useState<string | null>(null);
  const tog = (arr: string[], set: (x: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const n = Number(ageMonths);
  const declined = prefs.includes("No training, thanks");
  const blocked = circ.includes("Recently unwell") || circ.includes("Born early");
  const options = useMemo(() => APPROACHES.map((a) => ({ ...a, eligible: a.min === 0 || (!declined && !blocked && n >= a.min) })), [n, declined, blocked]);
  const Group = ({ label, opts, arr, set }: { label: string; opts: string[]; arr: string[]; set: (x: string[]) => void }) => (
    <fieldset className="mt-4"><legend className="text-sm font-semibold">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{opts.map((o) => <Chip key={o} active={arr.includes(o)} onClick={() => tog(arr, set, o)}>{o}</Chip>)}</div></fieldset>
  );
  const save = () => {
    const a = APPROACHES.find((x) => x.key === choice)!;
    const data = { ageMonths: n, circumstances: circ, goals, feeding, preferences: prefs, approach: a.key, steps: a.steps.map((t) => ({ text: t, done: false })), checkin: dget(existing, "checkin") || [] };
    if (existing) update.mutate({ id: existing.id, data: { title: a.name, status: "active", data } }, { onSuccess: onDone });
    else create.mutate({ kind: "sleepPlan", title: a.name, status: "active", scope: "baby", data }, { onSuccess: onDone });
  };
  return (
    <Surface tone="sky" className="rise">
      <p className="font-display text-xl">A few questions first</p>
      <label className="mt-3 block text-sm font-semibold" htmlFor="sp-age">Baby's age in months</label>
      <input id="sp-age" type="number" inputMode="numeric" className={cn(inputCls, "mt-1 max-w-32")} value={ageMonths} onChange={(e) => setAge(e.target.value)} />
      <Group label="Anything relevant right now?" opts={["Recently unwell", "Born early", "Travel coming up", "Sharing a room", "Teething", "None of these"]} arr={circ} set={setCirc} />
      <Group label="What would you like?" opts={["A calmer bedtime", "A predictable routine", "More rest for parents", "Just to understand sleep"]} arr={goals} set={setGoals} />
      <fieldset className="mt-4"><legend className="text-sm font-semibold">Night feeds</legend><div className="mt-2 flex flex-wrap gap-2">{["Feeds overnight — keep them", "Not sure yet", "Few or no night feeds"].map((o) => <Chip key={o} active={feeding === o} onClick={() => setFeeding(o)}>{o}</Chip>)}</div><p className="mt-1 text-xs text-muted-foreground">No plan here removes night feeds.</p></fieldset>
      <Group label="Caregiver preferences" opts={["Stay in the room", "Go gradually", "Minimal crying", "No training, thanks"]} arr={prefs} set={setPrefs} />
      <p className="mt-6 text-sm font-semibold">Approaches</p>
      <ul className="mt-2 space-y-2">
        {options.map((o) => (
          <li key={o.key}>
            <button type="button" disabled={!o.eligible} aria-pressed={choice === o.key} onClick={() => setChoice(o.key)}
              className={cn("press w-full rounded-2xl border p-4 text-left disabled:opacity-60", choice === o.key ? "border-primary bg-card ring-2 ring-primary" : "border-input bg-card/70")}>
              <p className="font-semibold">{o.name}</p><p className="text-sm text-muted-foreground">{o.desc}</p>
              {!o.eligible && <p className="mt-1 text-xs font-semibold">Not offered: {declined ? "you chose no training" : blocked ? "circumstances suggest waiting — talk to your health visitor" : `sample rule shows this from ${o.min} months (needs qualified review)`}</p>}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2"><Btn onClick={save} disabled={!choice}>Use this plan</Btn><Btn variant="ghost" onClick={onDone}>Cancel</Btn></div>
      <p className="mt-3 text-xs text-muted-foreground">Sample eligibility rules and steps — not clinically reviewed. Results vary; there's no right outcome.</p>
    </Surface>
  );
}

/* ---------- medication ---------- */
function Medication() {
  const { boot } = useBoot();
  const adm = useAdministration();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [time, setTime] = useState<Record<string, string>>({});
  const tz = boot.profile.timezone;
  const admins = byKind(boot.records, "administration");
  const stale = useStale();
  return (
    <>
      <KindSection title="Medication" sub="Instructions exactly as a clinician gave them. Together never calculates or suggests doses." kind="medication" scope="baby"
        empty="No medication instructions" emptyBody="Add instructions from a prescription or clinician. They're kept separate from what was actually given."
        fields={[{ key: "title", label: "Medication name", required: true }, { key: "data.instructions", label: "Clinician's instructions (as written)", type: "textarea", required: true }, { key: "data.unit", label: "Unit used in the instructions", placeholder: "ml, drops, tablet" }, { key: "data.scheduledAt", label: "Scheduled times (as instructed)", placeholder: "e.g. morning and evening" }, { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "stopped", label: "Stopped" }] }, { key: "notes", label: "Notes", type: "textarea" }]}
        line={(r) => <><span className="block"><Pill className="mr-1 inline h-3.5 w-3.5" />{ds(r, "instructions")}</span>{ds(r, "scheduledAt") && <span className="block text-muted-foreground">Scheduled: {ds(r, "scheduledAt")}</span>}{(() => { const l = adm.recent(r); return <span className="mt-1 block font-semibold">{l ? `Last recorded as given ${ago(when(l))} (${fmtClock(when(l), tz)}) by ${l.authorName}` : "No administration recorded"}</span>; })()}<Corrections r={r} />{stale.stale && <Tag tone="warn">May be out of date — {stale.label.toLowerCase()}</Tag>}</>}
        actions={(r) => r.status === "stopped" ? null : <>
          <input type="datetime-local" aria-label="Actual time (optional)" className={cn(inputCls, "w-auto min-w-0")} value={time[r.id] || ""} onChange={(e) => setTime({ ...time, [r.id]: e.target.value })} />
          {(["given", "skipped", "unknown"] as const).map((res) => <Btn key={res} size="sm" variant={res === "given" ? "primary" : "soft"} disabled={adm.busy} onClick={() => adm.give(r, res, time[r.id] ? new Date(time[r.id]).toISOString() : new Date().toISOString())} data-testid={`button-med-${res}-${r.id}`}>{res === "given" ? "Record given" : res === "skipped" ? "Skipped" : "Not sure"}</Btn>)}
        </>} />
      <section className="mb-8 -mt-4">
        <details className="rounded-[20px] border border-card-border bg-card p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">Administration history ({admins.length})</summary>
          <ul className="mt-2 space-y-2">{admins.slice(0, 30).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <div><p className="text-sm font-semibold">{a.title} <Tag>{ds(a, "result") || a.status}</Tag></p><Meta r={a} /><Corrections r={a} /></div>
              <Btn size="sm" variant="ghost" onClick={() => setEdit(a)}>Correct</Btn>
            </li>
          ))}</ul>
          <p className="mt-2 text-xs text-muted-foreground">Corrections are recorded with the time they were made; the server keeps an audit trail.</p>
        </details>
      </section>
      {edit && <RecordDialog open onOpenChange={(o) => !o && setEdit(null)} kind="administration" heading="Administration" record={edit}
        fields={[{ key: "occurredAt", label: "Actual time", type: "datetime" }, { key: "status", label: "What happened", type: "select", options: [{ value: "given", label: "Given" }, { value: "skipped", label: "Skipped" }, { value: "unknown", label: "Not sure" }] }, { key: "notes", label: "Reason for correction", type: "textarea" }]} />}
      {adm.dialog}
    </>
  );
}

type Correction = { correctedAt?: string; authorName?: string; previousTitle?: string; previousStatus?: string; previousOccurrence?: string; previousNotes?: string; previousResult?: string; previousInstructions?: string };
export function Corrections({ r }: { r: Rec }) {
  const list = dget<Correction[]>(r, "corrections") || [];
  if (!list.length) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer py-1 font-semibold text-muted-foreground">Correction history ({list.length})</summary>
      <ul className="mt-1 space-y-1">{list.map((c, i) => (
        <li key={i} className="rounded-lg bg-muted px-2 py-1">
          {c.authorName || "Someone"} corrected this {c.correctedAt ? ago(c.correctedAt) : ""}. Previously: {[c.previousTitle, c.previousResult || c.previousStatus, c.previousOccurrence && fmtTime(c.previousOccurrence), c.previousInstructions && `instructions "${c.previousInstructions}"`, c.previousNotes].filter(Boolean).join(" · ")}
        </li>
      ))}</ul>
    </details>
  );
}

/* ---------- what works ---------- */
export function PreferencesSection() {
  return (
    <KindSection title="What works for our baby" sub="Family know-how for anyone caring. Powers handover and childcare packs." kind="preference" scope="baby" testid="section-what-works"
      empty="Nothing added yet" emptyBody="Settling tricks, feeding preferences, comfort cues, likes and things to avoid."
      fields={[{ key: "title", label: "What works", required: true, placeholder: "Swaying by the window" }, { key: "data.category", label: "Category", type: "select", options: ["Settling", "Feeding", "Comfort cues", "Likes", "Dislikes", "Avoid"].map((v) => ({ value: v, label: v })) }, { key: "data.source", label: "Where it comes from", type: "select", options: [{ value: "family", label: "Family preference" }, { value: "clinician", label: "Clinician instruction" }] }, { key: "notes", label: "Details", type: "textarea" }]}
      line={(r) => <span className="flex flex-wrap gap-1.5">{ds(r, "category") && <Tag tone="sky">{ds(r, "category")}</Tag>}<Tag tone={ds(r, "source") === "clinician" ? "peach" : "sage"}>{ds(r, "source") === "clinician" ? "Clinician instruction" : "Family preference"}</Tag></span>} addLabel="Add" />
  );
}
