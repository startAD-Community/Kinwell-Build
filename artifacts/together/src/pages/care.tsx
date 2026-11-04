import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Pencil, Pill, Eye, EyeOff, ArrowLeft, ChevronRight, Moon, Utensils, Baby, Sparkles, HeartPulse, CalendarHeart, Leaf, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useChild } from "@/lib/child";
import { useRecords, useProfileUpdate, byKind, ds, dget, when, type Rec } from "@/lib/api";
import { ago, fmtClock, fmtDate, fmtTime, minutesLabel, pregnancyWeek } from "@/lib/format";
import { CHECKLISTS, LIBRARY, type Stage } from "@/lib/content";
import { Btn, Chip, Surface, Tag, SectionTitle, Empty, KindSection, ChecklistCard, RecordDialog, Meta, VoiceButton, inputCls, useStale, type Field } from "@/components/kit";
import { Library, OfflineEssentials, useSavedContent } from "@/components/library";
import { useAdministration } from "@/components/med";
import { SleepSupport, SLEEP_FIELDS } from "@/components/sleep";
import { PeriodsSection } from "@/components/periods";
import { cn } from "@/lib/utils";

type Tone = "peach" | "sky" | "sage" | "sand";
type Topic = { key: string; title: string; sub: string; tone: Tone; icon: typeof Moon };
const BABY_TOPICS: Topic[] = [
  { key: "sleep", title: "Sleep training & routines", sub: "What's common, logging sleeps, gentle plans", tone: "sky", icon: Moon },
  { key: "feeding", title: "Feeding & solids", sub: "Milk feeds, first foods and readiness", tone: "peach", icon: Utensils },
  { key: "everyday", title: "Everyday care", sub: "Timeline, medication, milestones, guides", tone: "sage", icon: Baby },
  { key: "works", title: "What works", sub: "Family know-how for anyone caring", tone: "sand", icon: Sparkles },
];
const YOU_TOPICS: Topic[] = [
  { key: "checkin", title: "Check-in", sub: "How you're doing — private, never scored", tone: "sage", icon: HeartPulse },
  { key: "periods", title: "Periods & cycle", sub: "Your dates, who can see them, import a file", tone: "peach", icon: CalendarHeart },
  { key: "body", title: "Your body & notes", sub: "Preparing, birth prep or recovery, symptom notes", tone: "sky", icon: Leaf },
  { key: "guides", title: "Guides & saved", sub: "Library, bookmarks, kept offline", tone: "sand", icon: BookOpen },
];
// Legacy anchors (#sleep, #solids, #cycle…) still land on the right topic.
const LEGACY: Record<string, [string, string]> = {
  timeline: ["baby", "everyday"], meds: ["baby", "everyday"], milestones: ["baby", "everyday"], demos: ["baby", "everyday"], children: ["baby", "everyday"],
  feeding: ["baby", "feeding"], solids: ["baby", "feeding"], sleep: ["baby", "sleep"], works: ["baby", "works"],
  checkin: ["you", "checkin"], cycle: ["you", "periods"], periods: ["you", "periods"], prep: ["you", "body"], birth: ["you", "body"], recovery: ["you", "body"], symptoms: ["you", "body"],
  library: ["you", "guides"], saved: ["you", "guides"],
};
const READ_TOPIC: Record<string, string> = { sleep: "sleep", feeding: "feeding", solids: "feeding", care: "everyday", concerns: "everyday", play: "everyday", development: "everyday" };

export default function CarePage() {
  const { boot } = useBoot();
  const search = new URLSearchParams(useSearch());
  const [, nav] = useLocation();
  const stage = (boot.profile.stage || "preconception") as Stage;
  const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  const legacy = LEGACY[hash];
  const read = search.get("read");
  const rawTab = search.get("tab");
  const readItem = read ? LIBRARY.find((l) => l.id === read) : undefined;
  const tab = rawTab === "you" || rawTab === "baby" ? rawTab : legacy?.[0] || (stage === "paused" ? "you" : "baby");
  let topic = search.get("topic") || (legacy && legacy[0] === tab ? legacy[1] : null);
  if (!topic && readItem) topic = tab === "baby" ? READ_TOPIC[readItem.topic] || "everyday" : "guides";
  if (!topic && hash === "offline") topic = tab === "you" ? "guides" : "everyday";
  const go = (t: string, tp?: string | null, rd?: string | null) => nav(`/care?tab=${t}${tp ? `&topic=${tp}` : ""}${rd ? `&read=${rd}` : ""}`);
  const setRead = (id: string | null) => go(tab, topic, id);

  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 250);
  }, [hash, topic]);

  const topics = tab === "you" ? YOU_TOPICS : BABY_TOPICS;
  const cur = topics.find((t) => t.key === topic);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <h1 className="font-display text-[34px] leading-tight">Care</h1>
        <div role="tablist" aria-label="Whose care" className="flex rounded-full bg-muted p-1">
          {[["you", "You"], ["baby", "Baby"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)} data-testid={`tab-care-${k}`}
              className={cn("press min-h-11 min-w-24 rounded-full px-5 font-semibold transition-colors", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
          ))}
        </div>
      </div>
      {!cur ? (
        <div className="rise mt-5" key={tab}>
          {tab === "baby" ? <BabyHeader stage={stage} /> : stage === "paused" ? <PausedNote /> : <p className="mb-4 text-sm text-muted-foreground">Your wellbeing and your own records. Each section says who can see it.</p>}
          {tab === "baby" && stage === "paused" ? <Empty title="Baby content is paused">Your plans and contacts are still in Plan and Circle.</Empty> : (
            <ul className="grid gap-3 sm:grid-cols-2" aria-label="Topics">
              {topics.map((t, i) => (
                <li key={t.key} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
                  <button type="button" onClick={() => go(tab, t.key)} data-testid={`topic-${t.key}`}
                    className={cn("press flex min-h-[112px] w-full items-start gap-3 rounded-[20px] border border-card-border p-5 text-left", { peach: "bg-peach", sky: "bg-sky", sage: "bg-sage", sand: "bg-sand" }[t.tone])}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card/80"><t.icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1"><span className="block font-display text-xl leading-snug">{t.title}</span><span className="mt-0.5 block text-sm text-foreground/75">{t.sub}</span></span>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rise mt-4" key={`${tab}-${topic}`}>
          <button type="button" onClick={() => go(tab)} className="press -ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:bg-muted" data-testid="button-topics-back"><ArrowLeft className="h-4 w-4" />All {tab === "you" ? "your" : "baby"} topics</button>
          <h2 className="mb-5 mt-1 font-display text-[28px] leading-tight">{cur.title}</h2>
          {tab === "you" ? <YouTopic topic={cur.key} stage={stage} read={read} setRead={setRead} /> : <BabyTopic topic={cur.key} stage={stage} read={read} setRead={setRead} />}
        </div>
      )}
    </div>
  );
}

function PausedNote() {
  return (
    <Surface tone="sand" className="mb-5">
      <p className="font-display text-xl">Pregnancy updates are paused</p>
      <p className="mt-1 text-[15px]">No week-by-week or celebratory content. Your GP or midwife can help if you'd like to talk, and your contacts are in Get help. Change stage in Settings whenever you're ready — or not at all.</p>
    </Surface>
  );
}

function BabyHeader({ stage }: { stage: Stage }) {
  const { name, age, fromRecord } = useChild();
  const { boot } = useBoot();
  const week = pregnancyWeek(boot.profile.dueDate);
  if (stage !== "postpartum") return <p className="mb-4 text-sm text-muted-foreground">{stage === "pregnancy" && week ? `Week ${week}. ` : ""}Understanding and preparing before birth.</p>;
  return (
    <div className="mb-4">
      <p className="font-display text-2xl" data-testid="text-child-age">{name || "Your baby"}{age ? `, ${age.label}` : ""}</p>
      <p className="text-sm text-muted-foreground">{age ? `${fromRecord ? "From the baby profile" : "From your profile"} · ` : "Add a birth date in Settings for age-relevant guides. "}Every baby develops at their own pace.</p>
    </div>
  );
}

/* ================= YOU ================= */
function YouTopic({ topic, stage, read, setRead }: { topic: string; stage: Stage; read: string | null; setRead: (id: string | null) => void }) {
  if (topic === "checkin") return <div id="checkin"><FeelingsCheckin /></div>;
  if (topic === "periods") return <div id="cycle"><PeriodsSection /></div>;
  if (topic === "guides") return <><div id="library"><Library stage={stage} topics={["recovery", "nutrition", "movement", "preparation"]} title="Guides for you" openId={read} onOpenId={setRead} /></div><div id="saved"><SavedList /></div><OfflineEssentials /></>;
  return (
    <>
      {stage === "paused" && <PausedNote />}
      {stage === "preconception" && <div id="prep" className="mb-8 grid gap-4">
        <ChecklistCard source="preconception" title={CHECKLISTS.preconception.title} defaults={CHECKLISTS.preconception.items} scope="private" tone="sage" />
        <ChecklistCard source="agenda" title={CHECKLISTS.agenda.title} defaults={CHECKLISTS.agenda.items} scope="private" />
      </div>}
      {stage === "pregnancy" && <div id="birth" className="mb-8 grid gap-4">
        <ChecklistCard source="birthplan" title={CHECKLISTS.birthplan.title} defaults={CHECKLISTS.birthplan.items} scope="private" tone="peach" />
        <ChecklistCard source="firstweeks" title={CHECKLISTS.firstweeks.title} defaults={CHECKLISTS.firstweeks.items} scope="household" />
      </div>}
      {stage === "postpartum" && <div id="recovery">
        <KindSection title="Recovery reminders" sub="Follow-ups and things to keep an eye on. Only you can see these." kind="task" scope="private"
          filter={(r) => !!dget(r, "recovery")} extraData={{ recovery: true }} empty="No recovery reminders" emptyBody="Add your postnatal check or anything a clinician asked you to follow up."
          fields={[{ key: "title", label: "Reminder", required: true, placeholder: "Postnatal check" }, { key: "data.dueDate", label: "When", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }]}
          line={(r) => ds(r, "dueDate") && `Due ${fmtDate(ds(r, "dueDate"))}`} />
      </div>}
      <div id="symptoms">
        <KindSection title={stage === "preconception" ? "Health notes" : "Symptoms & body notes"} sub="Optional. Only you can see these. Nothing is interpreted or scored." kind="symptom" scope="private"
          empty="Nothing noted" emptyBody="Only if useful — perhaps to bring up at an appointment."
          fields={[{ key: "title", label: "What you noticed", required: true }, { key: "occurredAt", label: "When", type: "datetime" }, { key: "data.severity", label: "How much is it bothering you?", type: "select", options: [{ value: "a little", label: "A little" }, { value: "quite a bit", label: "Quite a bit" }, { value: "a lot", label: "A lot" }] }, { key: "notes", label: "Notes", type: "textarea" }]}
          line={(r) => ds(r, "severity") && `Bothering you ${ds(r, "severity")}`} />
      </div>
    </>
  );
}

/* ================= BABY ================= */
function BabyTopic({ topic, stage, read, setRead }: { topic: string; stage: Stage; read: string | null; setRead: (id: string | null) => void }) {
  const born = stage === "postpartum";
  if (topic === "works") return <div id="works"><PreferencesSection /></div>;
  if (topic === "sleep") return (
    <>
      {born ? <SleepSupport /> : <Surface tone="sky" className="mb-6"><p className="font-display text-xl">Before baby arrives</p><p className="mt-1 text-[15px]">Newborn sleep is short and frequent, day and night. No routine or training is expected early on — after birth you'll be able to log sleeps and, later, try a routine.</p></Surface>}
      <Library stage={stage} topics={["sleep"]} title="Sleep guides" openId={read} onOpenId={setRead} />
    </>
  );
  if (topic === "feeding") return (
    <>
      <div id="feeding"><Feeding /></div>
      <div id="solids"><Solids /></div>
      <Library stage={stage} topics={["feeding", "solids"]} title="Feeding guides" openId={read} onOpenId={setRead} />
    </>
  );
  return (
    <>
      {!born && <BeforeBirth stage={stage} />}
      {born && <div id="timeline"><Timeline /></div>}
      {born && <div id="meds"><Medication /></div>}
      {born && <div id="milestones"><KindSection title="Milestone notes" sub="Moments you want to remember. No rankings or comparisons." kind="milestone" scope="baby"
        empty="No notes yet" fields={[{ key: "title", label: "What happened", required: true }, { key: "occurredAt", label: "When", type: "datetime" }, { key: "notes", label: "Details", type: "textarea" }]} /></div>}
      <div id="demos"><Library stage={stage} topics={born ? ["care", "concerns", "play", "development"] : ["care", "preparation"]} title="Guides & demonstrations" openId={read} onOpenId={setRead} /></div>
      <div id="children"><KindSection title="Children" sub="More than one child? Add them here and choose at the top of the screen. Birth dates are edited in Settings." kind="child" scope="baby"
        empty="No child profiles yet" fields={[{ key: "title", label: "Name", required: true }, { key: "data.birthDate", label: "Birth date", type: "date" }]} line={(r) => ds(r, "birthDate") && `Born ${fmtDate(ds(r, "birthDate"))}`} /></div>
      {born && <OfflineEssentials />}
    </>
  );
}

function Solids() {
  const { age, name } = useChild();
  const { boot } = useBoot();
  const m = age?.months ?? null;
  const born = boot.profile.stage === "postpartum";
  const phase = !born || m === null ? "ahead" : m < 4 ? "ahead" : m < 6 ? "prepare" : "now";
  return (
    <section className="mb-8">
      <SectionTitle title="Solids" sub="UK NHS guidance: start around 6 months, when readiness signs show up together." />
      <Surface tone={phase === "now" ? "peach" : "sand"} className="mb-4" data-testid="solids-readiness">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{phase === "now" ? "Around now" : phase === "prepare" ? "Getting ready" : "Coming later"}</p>
        <p className="mt-1 font-display text-xl">{phase === "now" ? `${name || "Your baby"} may be ready for first foods` : phase === "prepare" ? "Prepare now; start when the signs appear" : "Nothing to do yet"}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
          <li>Sits steadily and holds their head up</li>
          <li>Coordinates eyes, hands and mouth to pick up food</li>
          <li>Swallows food rather than pushing it back out</li>
        </ul>
        <p className="mt-2 text-sm">{phase === "prepare" ? "Chewing fists, waking more or wanting extra milk aren't signs of readiness. Meanwhile: a high chair, soft spoons, and reading about allergens with your health visitor." : phase === "now" ? "Milk is still the main food. Start with small tastes and let your baby lead." : "Readiness usually comes around 6 months."}</p>
        <div className="mt-3 flex flex-wrap gap-1.5"><Tag tone="warn">Sample summary · not clinically reviewed</Tag><a className="text-xs font-semibold underline" href="https://www.nhs.uk/baby/weaning-and-feeding/babys-first-solid-foods/" target="_blank" rel="noreferrer">NHS: first solid foods</a></div>
      </Surface>
      <KindSection title="Foods tried" sub="Shared with people who have baby access. Not an allergy test — contact a clinician about reactions." kind="food" scope="baby"
        empty="No foods recorded yet" emptyBody="When solids begin, note what was offered and anything you observed."
        fields={[{ key: "title", label: "Food", required: true }, { key: "data.date", label: "Date offered", type: "date" }, { key: "data.reaction", label: "What you observed", type: "select", options: [{ value: "none noticed", label: "Nothing noticed" }, { value: "liked", label: "Seemed to like it" }, { value: "refused", label: "Not interested" }, { value: "possible reaction", label: "Possible reaction" }] }, { key: "notes", label: "Notes", type: "textarea" }]}
        line={(r) => <>{fmtDate(ds(r, "date"))} {ds(r, "reaction") && <Tag tone={ds(r, "reaction") === "possible reaction" ? "warn" : "muted"}>{ds(r, "reaction")}</Tag>}</>} />
    </section>
  );
}

function BeforeBirth({ stage }: { stage: Stage }) {
  const { boot } = useBoot();
  const week = pregnancyWeek(boot.profile.dueDate);
  const [imagery, setImagery] = useState(() => localStorage.getItem("together.imagery") !== "off");
  const d = week ? DEV.find(([w]) => week <= w) : null;
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
          {imagery && week && <div className="my-4 flex items-end gap-3" aria-hidden>{[8, 16, 24, 32, 40].map((w) => <div key={w} className={cn("rounded-full", w <= week ? "bg-primary/70" : "bg-card")} style={{ width: 10 + w * 1.4, height: 10 + w * 1.4 }} />)}</div>}
          {d ? <><p className="mt-2 font-semibold">{d[1]}</p><p className="text-[15px]">{d[2]}</p></> : <p className="mt-2">Set an estimated due date in Settings to see week-by-week notes. "Not sure" is fine.</p>}
          <Tag tone="warn" className="mt-3">Sample content — not clinically reviewed</Tag>
        </Surface>
      )}
      <div className="mb-8 grid gap-4"><ChecklistCard source="firstweeks" title={CHECKLISTS.firstweeks.title} defaults={CHECKLISTS.firstweeks.items} /></div>
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
              <button type="button" className="min-h-11 flex-1 text-left font-semibold" onClick={() => cid ? nav(`/care?tab=${["recovery", "nutrition", "movement", "preparation"].includes(LIBRARY.find((l) => l.id === cid)?.topic || "") ? "you" : "baby"}&read=${cid}`) : ds(s, "href") && nav(ds(s, "href"))}>{s.title}</button>
              <Btn size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>Remove</Btn>
            </li>
          );
        })}</ul>
      )}
      <p className="sr-only">{boot.records.length} records</p>
    </section>
  );
}

const DEV: [number, string, string][] = [
  [12, "Early development", "Major organs are forming. Many people feel very tired in these weeks."],
  [20, "Growing and moving", "Movements may start to be felt — often like flutters at first."],
  [27, "Hearing and responding", "Your baby may respond to sounds. Backache and heartburn are common body changes."],
  [36, "Gaining weight", "Babies put on weight in the third trimester. Sleep may get harder for you."],
  [43, "Getting ready", "Your baby could arrive any time from here. Keep your bag and plans handy."],
];
const FEED_FIELDS: Field[] = [
  { key: "occurredAt", label: "When it happened", type: "datetime" },
  { key: "data.method", label: "Type", type: "select", options: [{ value: "breast", label: "Breast" }, { value: "bottle", label: "Bottle" }, { value: "formula", label: "Formula" }, { value: "expressed", label: "Expressed milk" }] },
  { key: "data.side", label: "Side", type: "select", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }, { value: "both", label: "Both" }] },
  { key: "data.amount", label: "Amount", type: "number" },
  { key: "data.unit", label: "Unit", type: "select", options: [{ value: "ml", label: "ml" }, { value: "oz", label: "oz" }] },
  { key: "data.duration", label: "Duration (minutes)", type: "number" },
  { key: "notes", label: "Notes", type: "textarea" },
];
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
      <KindSection title="Medication" sub="Instructions exactly as a clinician gave them. Kinwell never calculates or suggests doses." kind="medication" scope="baby"
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
