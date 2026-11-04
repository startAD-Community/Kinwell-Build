import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { X, Bookmark, BookmarkCheck, ArrowRight, Plus, LifeBuoy, Check, CalendarClock, UserRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useRecords, byKind, ds, dget, when, type Rec } from "@/lib/api";
import { ago, babyAge, fmtClock, fmtDate, fmtTime, greeting, pregnancyWeek } from "@/lib/format";
import { LIBRARY, PLAY_IDEAS, PRIORITY_SUGGESTIONS, CONTENT_STATUS, type Stage } from "@/lib/content";
import { Btn, Chip, Surface, Tag, SectionTitle, inputCls } from "@/components/kit";
import { openHelp, openLog } from "@/components/shell";
import { cn } from "@/lib/utils";

type Card = { key: string; tone?: "peach" | "sky" | "sage" | "sand"; eyebrow: string; title: string; body?: ReactNode; why?: string; action?: { label: string; href?: string; onClick?: () => void }; custom?: ReactNode; saveable?: boolean };

export default function HomePage({ intro }: { intro?: boolean }) {
  const { boot, signedIn, switchDemo } = useBoot();
  const p = boot.profile;
  const stage = (p.stage || "preconception") as Stage;
  const { create, remove } = useRecords();
  const [more, setMore] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [, nav] = useLocation();
  const tz = p.timezone;
  const R = boot.records;

  const dismissed = new Set(byKind(R, "dismissal").map((d) => ds(d, "cardKey")));
  const saved = byKind(R, "saved");
  const savedKeys = new Map(saved.map((s) => [ds(s, "cardKey"), s]));

  const now = Date.now();
  const nextAppt = byKind(R, "appointment").filter((a) => a.status !== "cancelled" && +new Date(when(a)) > now - 36e5).sort((a, b) => +new Date(when(a)) - +new Date(when(b)))[0];
  const shifts = byKind(R, "shift").filter((s) => +new Date(ds(s, "endAt") || when(s)) > now).sort((a, b) => +new Date(ds(a, "startAt") || when(a)) - +new Date(ds(b, "startAt") || when(b)));
  const current = shifts.find((s) => s.status === "accepted" && +new Date(ds(s, "startAt")) <= now);
  const next = shifts.find((s) => s.status === "accepted" && +new Date(ds(s, "startAt")) > now);
  const lastFeed = byKind(R, "feed")[0];
  const help = byKind(R, "help").find((h) => h.status === "claimed");
  const week = pregnancyWeek(p.dueDate);
  const age = babyAge(p.birthDate);
  const child = p.childName || "your baby";

  const cards: Card[] = useMemo(() => {
    const c: Card[] = [];
    if (stage === "pregnancy") c.push({ key: `week-${week}`, tone: "sky", eyebrow: "This week", title: week ? `You're at week ${week}. Here's what's changing.` : "Here's what's changing in pregnancy.", why: week ? "Because of your due date" : "Add a due date for week-by-week detail", action: { label: "Take a look", href: "/care?tab=baby" }, saveable: true });
    if (stage === "postpartum") c.push({ key: `age-${age?.weeks}`, tone: "sky", eyebrow: "What's changing", title: age ? `${child} is ${age.label}. Here's what's changing this week.` : `What's changing for ${child} this week.`, why: "Because of the birth date you entered", action: { label: "Take a look", href: "/care?tab=baby" }, saveable: true });
    if (stage === "preconception") c.push({ key: "prep", tone: "sage", eyebrow: "Getting ready", title: "A short list for preparing, at your own pace.", why: "Because you're preparing", action: { label: "Open the list", href: "/care?tab=you" } });
    if (stage === "paused") c.push({ key: "paused", tone: "sand", eyebrow: "Taking time", title: "We've paused pregnancy updates. Take whatever time you need.", body: "Your plans, contacts and circle are still here. Nothing celebratory will be shown.", action: { label: "Support options", href: "/care?tab=you" } });
    if (nextAppt) c.push({ key: `appt-${nextAppt.id}`, tone: "peach", eyebrow: "Appointment", title: `Your appointment is ${new Date(when(nextAppt)).toLocaleDateString(undefined, { weekday: "long", timeZone: tz || undefined })}. Anything you want to ask?`, body: `${nextAppt.title} · ${fmtTime(when(nextAppt), tz)}`, why: "Because your appointment is coming up", action: { label: "Choose questions", href: `/plan?tab=appointments&appt=${nextAppt.id}` } });
    if (next) c.push({ key: `shift-${next.id}-${next.status}`, eyebrow: "Your circle", title: `${ds(next, "assignee") || next.authorName} has taken ${next.title.toLowerCase()}.`, body: `${fmtTime(ds(next, "startAt"), tz)} – ${fmtClock(ds(next, "endAt"), tz)}`, action: { label: "View plan", href: "/together?tab=shifts" } });
    if (stage !== "paused") c.push({ key: `needs-${new Date().toDateString()}`, tone: "sage", eyebrow: "A quick check-in?", title: "What would help today?", custom: <NeedChips /> });
    if (lastFeed && stage === "postpartum") c.push({ key: `feed-${lastFeed.id}`, eyebrow: "Care", title: `Last feed recorded at ${fmtClock(when(lastFeed), tz)} by ${lastFeed.authorName}.`, body: ago(when(lastFeed)), action: { label: "View care history", href: "/care?tab=baby#timeline" } });
    if (help) c.push({ key: `help-${help.id}-claimed`, tone: "peach", eyebrow: "Help request", title: `${ds(help, "claimedBy") || "Someone"} has claimed "${help.title}".`, body: "Claimed isn't done yet — it'll show as complete when they mark it.", action: { label: "View request", href: "/together?tab=help" } });
    if (stage === "postpartum" && (age?.months ?? 0) >= 1) {
      const idea = PLAY_IDEAS[new Date().getDate() % PLAY_IDEAS.length];
      c.push({ key: `play-${new Date().toDateString()}`, eyebrow: "Play", title: "A little play idea for today.", body: idea, action: { label: "Try this", onClick: () => create.mutate({ kind: "milestone", title: "Play: " + idea.slice(0, 60), scope: "baby", notes: idea, data: { type: "play" } }, { onSuccess: () => toast({ title: "Saved to milestone notes" }) }) }, saveable: true });
    }
    const content = LIBRARY.filter((x) => x.stages.includes(stage));
    content.slice(0, 3).forEach((x) => c.push({ key: `content-${x.id}`, eyebrow: x.topic, title: x.title, body: <>{x.summary} <Tag tone="warn" className="ml-1">Sample</Tag></>, action: { label: "Read", href: `/care?tab=${["recovery", "nutrition", "movement", "preparation"].includes(x.topic) ? "you" : "baby"}&read=${x.id}` }, saveable: true }));
    return c.filter((x) => !dismissed.has(x.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, stage, p.dueDate, p.birthDate]);

  const shown = cards.slice(0, more ? 8 : 5);

  const dismiss = (k: string) => create.mutate({ kind: "dismissal", title: "Hidden from Home", scope: "private", data: { cardKey: k } });
  const toggleSave = (c: Card) => {
    const s = savedKeys.get(c.key);
    if (s) remove.mutate(s.id);
    else create.mutate({ kind: "saved", title: c.title, scope: "private", data: { cardKey: c.key, href: c.action?.href } }, { onSuccess: () => toast({ title: "Saved", description: "Find it in Care, under Saved." }) });
  };

  return (
    <div className="mx-auto max-w-2xl">
      {intro && <Intro signedIn={signedIn} switching={switching} onSwitch={async (s) => { setSwitching(s); try { await switchDemo(s as "postpartum"); } finally { setSwitching(null); } }} current={stage} />}

      <section className="rise pt-4">
        <p className="text-sm font-semibold text-muted-foreground">{greeting()}{p.name ? `, ${p.name.split(" ")[0]}` : ""}</p>
        <h1 className="font-display text-[34px] leading-[1.1] md:text-[42px]">
          {p.lowEnergy ? "Just the essentials." : stage === "postpartum" ? "Here's today, gently." : stage === "pregnancy" ? "Here's what's next." : stage === "paused" ? "We're here when you need us." : "One step at a time."}
        </h1>
      </section>

      <NowNext current={current} next={next} />

      {p.lowEnergy ? (
        <LowEnergy />
      ) : (
        <>
          <ol className="mt-6 space-y-4" aria-label="Your feed">
            {shown.map((c, i) => (
              <li key={c.key} className="rise" style={{ animationDelay: `${80 + i * 60}ms` }}>
                <Surface tone={c.tone} className="relative" data-testid={`card-${c.key}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{c.eyebrow}</p>
                    <div className="-mr-2 -mt-2 flex">
                      {c.saveable && (
                        <button type="button" className="press flex h-11 w-11 items-center justify-center rounded-full hover:bg-card/70" aria-label={savedKeys.has(c.key) ? "Remove from saved" : "Save"} onClick={() => toggleSave(c)}>
                          {savedKeys.has(c.key) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                        </button>
                      )}
                      <button type="button" className="press flex h-11 w-11 items-center justify-center rounded-full hover:bg-card/70" aria-label="Hide this card" onClick={() => dismiss(c.key)} data-testid={`dismiss-${c.key}`}>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <h2 className="mt-1 font-display text-[22px] leading-snug">{c.title}</h2>
                  {c.body && <div className="mt-1.5 text-[15px] text-foreground/80">{c.body}</div>}
                  {c.custom}
                  {c.action && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {c.action.href ? (
                        <Link href={c.action.href} className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">{c.action.label}<ArrowRight className="h-4 w-4" /></Link>
                      ) : (
                        <Btn onClick={c.action.onClick}>{c.action.label}</Btn>
                      )}
                      {c.why && <span className="text-right text-xs text-muted-foreground">{c.why}</span>}
                    </div>
                  )}
                </Surface>
              </li>
            ))}
          </ol>
          <Priorities stage={stage} />
          <div className="mt-10 rounded-[20px] bg-sand px-6 py-8 text-center">
            <Check className="mx-auto h-6 w-6 text-primary" aria-hidden />
            <p className="mt-2 font-display text-xl">You're caught up. Your plan is here whenever you need it.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!more && cards.length > 5 && <Btn variant="outline" onClick={() => setMore(true)} data-testid="button-explore-more">Explore more</Btn>}
              {(more || cards.length <= 5) && <Btn variant="outline" onClick={() => nav("/care")}>Explore Care</Btn>}
            </div>
          </div>
        </>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">{CONTENT_STATUS}. Cards are chosen from your stage, dates, plans and circle — no engagement ranking.</p>
    </div>
  );
}

function Intro({ signedIn, onSwitch, switching, current }: { signedIn: boolean; onSwitch: (s: string) => void; switching: string | null; current: string }) {
  return (
    <section className="rise mb-6 overflow-hidden rounded-[28px] bg-primary text-primary-foreground">
      <div className="relative p-6 md:p-8">
        <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-peach/40" />
        <div aria-hidden className="absolute -right-2 top-16 h-28 w-28 rounded-full bg-sky/40" />
        <p className="relative text-xs font-bold uppercase tracking-[0.14em] opacity-80">A companion for becoming parents</p>
        <h1 className="relative mt-2 max-w-md font-display text-[34px] leading-[1.05] md:text-[44px]">Know what comes next. Share the work. Feel more prepared.</h1>
        <p className="relative mt-3 max-w-md text-[15px] opacity-90">You're looking at a live demo family. Tap around — log a feed, take a care window, ask for a meal. It's a separate sample space, reset any time.</p>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {!signedIn && <Link href="/sign-up" className="press inline-flex min-h-12 items-center rounded-xl bg-card px-5 font-semibold text-foreground" data-testid="link-start-own">Start your own family</Link>}
          {!signedIn && <Link href="/sign-in" className="press inline-flex min-h-12 items-center rounded-xl border border-primary-foreground/40 px-5 font-semibold" data-testid="link-sign-in">Sign in</Link>}
        </div>
        <div className="relative mt-5">
          <p className="text-xs font-semibold opacity-80">See the demo at another stage</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[["postpartum", "After birth"], ["pregnancy", "Pregnant · week 24"], ["preconception", "Preparing"]].map(([k, l]) => (
              <button key={k} type="button" disabled={!!switching} onClick={() => onSwitch(k)} aria-pressed={current === k}
                className={cn("press min-h-11 rounded-full px-4 text-sm font-semibold", current === k ? "bg-card text-foreground" : "bg-primary-foreground/15")} data-testid={`demo-${k}`}>
                {switching === k ? "Loading…" : l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NowNext({ current, next }: { current?: Rec; next?: Rec }) {
  const { boot } = useBoot();
  if (!current && !next) return null;
  const tz = boot.profile.timezone;
  return (
    <Link href="/together?tab=shifts" className="rise mt-4 flex items-stretch gap-2 rounded-2xl border border-card-border bg-card p-1.5 text-sm" data-testid="strip-now-next">
      <div className="flex-1 rounded-xl bg-sage px-3 py-2">
        <p className="text-xs font-bold text-muted-foreground">NOW</p>
        <p className="font-semibold">{current ? `${ds(current, "assignee") || current.authorName} · until ${fmtClock(ds(current, "endAt"), tz)}` : "No care time agreed yet"}</p>
      </div>
      <div className="flex-1 rounded-xl px-3 py-2">
        <p className="text-xs font-bold text-muted-foreground">NEXT</p>
        <p className="font-semibold">{next ? `${ds(next, "assignee") || next.authorName} · ${fmtClock(ds(next, "startAt"), tz)}` : "Nothing accepted yet"}</p>
      </div>
      <span className="sr-only">Shows who has accepted responsibility. The app doesn't verify who is physically caring.</span>
    </Link>
  );
}

export function NeedChips({ compact }: { compact?: boolean }) {
  const { create } = useRecords();
  const [, nav] = useLocation();
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (need: string, key: string) => {
    setPicked(key);
    create.mutate({ kind: "checkin", title: `Needs: ${need}`, scope: "private", occurredAt: new Date().toISOString(), data: { need: key } });
  };
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {[["Rest", "rest"], ["A meal", "meal"], ["Company", "company"], ["All good", "none"]].map(([l, k]) => (
          <Chip key={k} active={picked === k} onClick={() => pick(l, k)} data-testid={`need-${k}`}>{l}</Chip>
        ))}
      </div>
      {picked && picked !== "none" && (
        <div className="rise mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-card/70 p-3 text-sm">
          <span>Kept private. Want to ask someone?</span>
          <Btn size="sm" onClick={() => nav(`/together?tab=help&prepare=${picked}`)}>Prepare a request</Btn>
        </div>
      )}
      {picked === "none" && !compact && <p className="mt-2 text-sm text-muted-foreground">Noted, privately. Nothing else needed.</p>}
    </div>
  );
}

function LowEnergy() {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={openLog} className="press flex min-h-28 flex-col justify-between rounded-[20px] bg-primary p-4 text-left text-primary-foreground" data-testid="le-log">
          <Plus className="h-6 w-6" /><span className="font-display text-xl">Log</span>
        </button>
        <button type="button" onClick={openHelp} className="press flex min-h-28 flex-col justify-between rounded-[20px] border-2 border-destructive/40 bg-card p-4 text-left" data-testid="le-help">
          <LifeBuoy className="h-6 w-6 text-destructive" /><span className="font-display text-xl">Get help</span>
        </button>
      </div>
      <Surface tone="sage">
        <p className="font-display text-xl">What would help today?</p>
        <NeedChips compact />
      </Surface>
      <p className="text-center text-sm text-muted-foreground">Optional prompts are quiet. Turn the full Home back on from your account menu or Settings.</p>
    </div>
  );
}

function Priorities({ stage }: { stage: Stage }) {
  const { boot } = useBoot();
  const { create, update, remove } = useRecords();
  const R = boot.records;
  const dismissed = new Set(byKind(R, "dismissal").map((d) => ds(d, "cardKey")));
  const tasks = byKind(R, "task").filter((t) => dget(t, "priority"));
  const used = new Set(tasks.map((t) => ds(t, "suggestionKey")));
  const sugg = (PRIORITY_SUGGESTIONS[stage] || []).filter((s) => !used.has(s.key) && !dismissed.has(`prio-${s.key}`));
  const [open, setOpen] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [custom, setCustom] = useState("");
  const active = tasks.filter((t) => t.status !== "done").slice(0, 5);
  return (
    <section className="mt-10" aria-labelledby="prio">
      <SectionTitle id="prio" title="This week" sub="A few priorities. Edit freely — none are required." />
      <ul className="space-y-2.5">
        {active.map((t) => (
          <li key={t.id}>
            <Surface className="p-4">
              <div className="flex items-start gap-3">
                <button type="button" role="checkbox" aria-checked={false} aria-label={`Mark ${t.title} done`} onClick={() => update.mutate({ id: t.id, data: { status: "done" } })}
                  className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input" data-testid={`prio-done-${t.id}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ds(t, "why") && <>{ds(t, "why")} · </>}
                    {ds(t, "assignee") ? <><UserRound className="inline h-3 w-3" /> {ds(t, "assignee")}</> : "Unassigned"}
                    {ds(t, "dueDate") && <> · <CalendarClock className="inline h-3 w-3" /> {fmtDate(ds(t, "dueDate"))}</>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Btn size="sm" variant="soft" onClick={() => { setOpen(open === `r-${t.id}` ? null : `r-${t.id}`); setDate(ds(t, "dueDate")); }}>Reschedule</Btn>
                    <Btn size="sm" variant="soft" onClick={() => setOpen(open === `a-${t.id}` ? null : `a-${t.id}`)}>Assign</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>Remove</Btn>
                  </div>
                  {open === `r-${t.id}` && (
                    <form className="rise mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); update.mutate({ id: t.id, data: { data: { ...(t.data as object), dueDate: date } } }); setOpen(null); }}>
                      <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} aria-label="New date" />
                      <Btn type="submit">Save</Btn>
                    </form>
                  )}
                  {open === `a-${t.id}` && (
                    <div className="rise mt-2 flex flex-wrap gap-2">
                      {boot.members.map((m) => <Chip key={m.id} active={ds(t, "assignee") === m.name} onClick={() => { update.mutate({ id: t.id, data: { data: { ...(t.data as object), assignee: m.name } } }); setOpen(null); }}>{m.name}</Chip>)}
                    </div>
                  )}
                </div>
              </div>
            </Surface>
          </li>
        ))}
        {sugg.map((s) => (
          <li key={s.key}>
            <div className="rounded-[20px] border border-dashed border-input p-4">
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-muted-foreground">Suggested · {s.why}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn size="sm" onClick={() => create.mutate({ kind: "task", title: s.title, scope: "household", status: "open", data: { priority: true, suggestionKey: s.key, why: s.why } })} data-testid={`prio-add-${s.key}`}>Add to this week</Btn>
                <Btn size="sm" variant="soft" onClick={() => create.mutate({ kind: "saved", title: s.title, scope: "private", data: { cardKey: `prio-${s.key}` } }, { onSuccess: () => toast({ title: "Saved for later" }) })}>Save</Btn>
                <Btn size="sm" variant="ghost" onClick={() => create.mutate({ kind: "dismissal", title: "Priority dismissed", scope: "private", data: { cardKey: `prio-${s.key}` } })}>Not now</Btn>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!custom.trim()) return; create.mutate({ kind: "task", title: custom.trim(), scope: "household", status: "open", data: { priority: true, why: "Added by you" } }); setCustom(""); }}>
        <input className={inputCls} placeholder="Add your own priority" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Add your own priority" />
        <Btn type="submit" variant="soft"><Plus className="h-4 w-4" />Add</Btn>
      </form>
    </section>
  );
}
