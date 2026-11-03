import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, HeartHandshake, Users, CalendarDays, Plus, LifeBuoy, Bell, Moon, Sun, Settings, LogOut, LogIn, Phone, WifiOff, Baby, Droplet, BedDouble, Milk, Pill, MessageCircleQuestion, Smile, CircleDot, Thermometer } from "lucide-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useBoot } from "@/lib/boot";
import { useRecords, useProfileUpdate, byKind, ds, when, clearLocalData, type Rec } from "@/lib/api";
import { ago, fmtClock } from "@/lib/format";
import { WARNING_SIGNS } from "@/lib/content";
import { Btn, Chip, Tag, inputCls } from "./kit";
import { useAdministration } from "./med";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/care", label: "Care", icon: HeartHandshake },
  { href: "/together", label: "Together", icon: Users },
  { href: "/plan", label: "Plan", icon: CalendarDays },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img src={`${basePath}/logo.svg`} alt="" className="h-8 w-8" />
      <span className="font-display text-xl">Together</span>
    </span>
  );
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return on;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { boot, signedIn } = useBoot();
  const p = boot.profile;
  const [loc] = useLocation();
  const [logOpen, setLogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const online = useOnline();
  useEffect(() => {
    const o = () => setLogOpen(true), h = () => setHelpOpen(true);
    window.addEventListener("together:log", o); window.addEventListener("together:help", h);
    return () => { window.removeEventListener("together:log", o); window.removeEventListener("together:help", h); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !!p.nightMode);
  }, [p.nightMode]);

  return (
    <div className="min-h-[100dvh]">
      {p.isDemo && <DemoBanner signedIn={signedIn} />}
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-peach px-4 py-2 text-sm font-medium text-secondary-foreground">
          <WifiOff className="h-4 w-4" /> You're offline. What you see may be out of date, and nothing new can be saved right now.
        </div>
      )}
      <div className="mx-auto flex max-w-6xl">
        {/* desktop rail */}
        <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col gap-1 px-4 py-6 md:flex">
          <Link href="/home" className="mb-6 px-2" data-testid="link-logo"><Logo /></Link>
          {NAV.map((n) => {
            const active = loc.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} data-testid={`nav-${n.label.toLowerCase()}`}
                className={cn("press flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[16px] font-semibold transition-colors", active ? "bg-sage text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                aria-current={active ? "page" : undefined}>
                <n.icon className="h-5 w-5" />{n.label}
              </Link>
            );
          })}
          <Btn size="lg" className="mt-6 w-full" onClick={() => setLogOpen(true)} data-testid="button-log"><Plus className="h-5 w-5" /> Log</Btn>
          <Btn size="lg" variant="outline" className="mt-2 w-full border-destructive/40 text-destructive" onClick={() => setHelpOpen(true)} data-testid="button-get-help"><LifeBuoy className="h-5 w-5" /> Get help</Btn>
          <div className="mt-auto text-xs text-muted-foreground">
            {p.lowEnergy ? "Low-energy mode is on" : "Quiet by design. No streaks, no scores."}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-background/85 px-4 py-3 backdrop-blur md:px-8">
            <Link href="/home" className="md:hidden" aria-label="Together home"><Logo /></Link>
            <ChildPicker />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setHelpOpen(true)} className="press flex min-h-11 items-center gap-1.5 rounded-full border border-destructive/40 px-3 text-sm font-semibold text-destructive md:hidden" data-testid="button-get-help-mobile">
                <LifeBuoy className="h-4 w-4" /> Help
              </button>
              <NightToggle />
              <Notifications />
              <AccountMenu />
            </div>
          </header>
          <main className="px-4 pb-32 pt-2 md:px-8 md:pb-16">{children}</main>
        </div>
      </div>

      {/* mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 items-end">
          {NAV.slice(0, 2).map((n) => <MobileTab key={n.href} n={n} active={loc.startsWith(n.href)} />)}
          <div className="flex justify-center">
            <button type="button" onClick={() => setLogOpen(true)} data-testid="button-log-mobile"
              className="press -mt-6 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background" aria-label="Log">
              <Plus className="h-6 w-6" /><span className="text-[11px] font-bold">Log</span>
            </button>
          </div>
          {NAV.slice(2).map((n) => <MobileTab key={n.href} n={n} active={loc.startsWith(n.href)} />)}
        </div>
      </nav>

      <LogSheet open={logOpen} onOpenChange={setLogOpen} />
      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

function MobileTab({ n, active }: { n: (typeof NAV)[number]; active: boolean }) {
  return (
    <Link href={n.href} aria-current={active ? "page" : undefined} data-testid={`tab-${n.label.toLowerCase()}`}
      className={cn("flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold", active ? "text-primary" : "text-muted-foreground")}>
      <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-colors", active && "bg-sage")}><n.icon className="h-5 w-5" /></span>
      {n.label}
    </Link>
  );
}

function DemoBanner({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="bg-sky px-4 py-2 text-center text-sm text-accent-foreground" data-testid="banner-demo">
      <strong>Demo family.</strong> Maya, Alex and Noah are sample people with sample data — nothing here is real.{" "}
      {!signedIn && <><Link href="/sign-up" className="font-semibold underline underline-offset-2">Start your own family</Link> · <Link href="/sign-in" className="font-semibold underline underline-offset-2">Sign in</Link></>}
      {signedIn && <Link href="/settings" className="font-semibold underline underline-offset-2">Demo settings</Link>}
    </div>
  );
}

function NightToggle() {
  const { boot } = useBoot();
  const up = useProfileUpdate();
  const on = !!boot.profile.nightMode;
  return (
    <button type="button" className="press flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" aria-label={on ? "Use the light theme" : "Use the dim night theme"} aria-pressed={on}
      onClick={() => { document.documentElement.classList.toggle("dark", !on); up.mutate({ nightMode: !on }); }} data-testid="button-night">
      {on ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function ChildPicker() {
  const { boot, childId, setChildId } = useBoot();
  const kids = byKind(boot.records, "child");
  if (kids.length < 2) return <span className="hidden flex-1 md:block" />;
  return (
    <div className="flex flex-1 items-center gap-2 overflow-x-auto md:justify-start" role="radiogroup" aria-label="Choose child">
      <Baby className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
      {kids.map((k) => (
        <Chip key={k.id} active={(childId || kids[0].id) === k.id} onClick={() => setChildId(k.id)} className="min-h-9 px-3 text-sm">{k.title}</Chip>
      ))}
    </div>
  );
}

const SEEN_KEY = "together.seen";
function Notifications() {
  const { boot } = useBoot();
  const [seen, setSeen] = useState(() => Number(localStorage.getItem(SEEN_KEY) || 0));
  const items = useMemo(() => {
    const cutoff = Date.now() - 3 * 864e5;
    const explicit = byKind(boot.records, "notification");
    const activity = boot.records
      .filter((r) => r.authorId !== boot.profile.id && ["task", "help", "shift", "appointment", "feed", "sleep", "administration", "preference", "transfer"].includes(r.kind) && +new Date(r.updatedAt) > cutoff)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return [...explicit, ...activity].slice(0, 12);
  }, [boot.records, boot.profile.id]);
  const unread = items.filter((r) => +new Date(r.updatedAt) > seen).length;
  const verb = (r: Rec) =>
    r.kind === "notification" ? r.title :
    r.kind === "shift" ? `${r.authorName} ${r.status === "accepted" ? "accepted" : "updated"} a shift: ${r.title}` :
    r.kind === "help" ? `${r.authorName} updated a help request: ${r.title} (${r.status || "open"})` :
    r.kind === "task" ? `${r.authorName} updated "${r.title}"` :
    r.kind === "transfer" ? `Administration transfer: ${r.status || "pending"}` :
    `${r.authorName} recorded ${r.title.toLowerCase()}`;
  return (
    <Popover onOpenChange={(o) => { if (!o) { const n = Date.now(); localStorage.setItem(SEEN_KEY, String(n)); setSeen(n); } }}>
      <PopoverTrigger asChild>
        <button type="button" className="press relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" aria-label={`In-app updates${unread ? `, ${unread} new` : ""}`} data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" aria-hidden />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] rounded-[20px] p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-display text-lg">From your circle</p>
          <p className="text-xs text-muted-foreground">In-app only. No push, email or SMS is sent{boot.profile.quietHours ? ` · Quiet hours ${boot.profile.quietHours}` : ""}.</p>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">Nothing new from your circle.</li>}
          {items.map((r) => (
            <li key={r.id + r.updatedAt} className="flex gap-3 border-b border-border/60 px-4 py-3 last:border-0">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", +new Date(r.updatedAt) > seen ? "bg-primary" : "bg-transparent")} aria-hidden />
              <div><p className="text-sm">{verb(r)}</p><p className="text-xs text-muted-foreground">{ago(r.updatedAt)}</p></div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function AccountMenu() {
  const { boot, signedIn } = useBoot();
  const [, nav] = useLocation();
  const clerk = useClerk();
  const qc = useQueryClient();
  const up = useProfileUpdate();
  const initials = (boot.profile.name || "You").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="press flex h-11 w-11 items-center justify-center rounded-full bg-peach text-sm font-bold text-secondary-foreground" aria-label="Account menu" data-testid="button-account">{initials}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <DropdownMenuLabel>
          <p className="font-display text-base">{boot.profile.name || "You"}</p>
          <p className="text-xs font-normal text-muted-foreground">{boot.profile.isDemo ? "Demo session" : "Your family"} · {boot.profile.stage}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11 rounded-xl" onSelect={() => nav("/settings")}><Settings className="mr-2 h-4 w-4" />Profile, stage & privacy</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 rounded-xl" onSelect={() => up.mutate({ lowEnergy: !boot.profile.lowEnergy })}>
          <CircleDot className="mr-2 h-4 w-4" />{boot.profile.lowEnergy ? "Show the full Home" : "Low-energy mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {signedIn ? (
          <DropdownMenuItem className="min-h-11 rounded-xl" onSelect={() => { clearLocalData(); qc.clear(); clerk.signOut({ redirectUrl: basePath || "/" }); }}><LogOut className="mr-2 h-4 w-4" />Sign out and clear this device</DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="min-h-11 rounded-xl" onSelect={() => nav("/sign-in")}><LogIn className="mr-2 h-4 w-4" />Sign in</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Log sheet ---------- */
const SLEEP_KEY = "together.sleepStart";
export function useSleepTimer() {
  const [start, setStart] = useState<string | null>(() => localStorage.getItem(SLEEP_KEY));
  const begin = () => { const s = new Date().toISOString(); localStorage.setItem(SLEEP_KEY, s); setStart(s); };
  const clear = () => { localStorage.removeItem(SLEEP_KEY); setStart(null); };
  return { start, begin, clear };
}

export function LogSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { boot, childId } = useBoot();
  const p = boot.profile;
  const { create, remove } = useRecords();
  const timer = useSleepTimer();
  const [q, setQ] = useState("");
  const born = p.stage === "postpartum";
  const cats = p.logCategories?.length ? p.logCategories : born ? ["feed", "sleep", "diaper", "pumping", "medication", "checkin", "question"] : ["checkin", "question", "symptom", "cycle"];
  const kids = byKind(boot.records, "child");
  const cid = childId || kids[0]?.id;
  const meds = byKind(boot.records, "medication").filter((m) => m.status !== "stopped");
  const lastFeed = byKind(boot.records, "feed")[0];

  const log = async (input: Parameters<typeof create.mutateAsync>[0], label: string) => {
    try {
      const r = await create.mutateAsync({ occurredAt: new Date().toISOString(), childId: ["feed", "sleep", "diaper", "pumping", "administration"].includes(input.kind) ? cid : undefined, ...input });
      onOpenChange(false);
      toast({
        title: `${label} — logged at ${fmtClock(when(r), p.timezone)}`,
        description: "Wrong time or detail? Correct it in Care.",
        action: <ToastAction altText="Undo" onClick={() => remove.mutate(r.id)}>Undo</ToastAction>,
      });
    } catch { /* toast shown in hook */ }
  };

  const adm = useAdministration();
  const giveMed = (m: Rec) => { adm.give(m); };

  const Tile = ({ icon: I, label, sub, onClick, tone, testid }: { icon: typeof Milk; label: string; sub?: string; onClick: () => void; tone?: string; testid: string }) => (
    <button type="button" onClick={onClick} disabled={create.isPending} data-testid={testid}
      className={cn("press flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-card-border p-3.5 text-left disabled:opacity-50", tone || "bg-card")}>
      <I className="h-5 w-5" aria-hidden />
      <span><span className="block font-semibold leading-tight">{label}</span>{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-[28px] px-4 pb-8 md:mx-auto md:max-w-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">Log something</SheetTitle>
          <SheetDescription>One tap logs it now. You can undo or correct it afterwards.{lastFeed && born ? ` Last feed recorded ${ago(when(lastFeed))} by ${lastFeed.authorName}.` : ""}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {born && cats.includes("feed") && <>
            <Tile testid="log-feed-left" icon={Milk} label="Feed · left" tone="bg-peach" onClick={() => log({ kind: "feed", title: "Feed", scope: "baby", data: { method: "breast", side: "left" } }, "Feed")} />
            <Tile testid="log-feed-right" icon={Milk} label="Feed · right" tone="bg-peach" onClick={() => log({ kind: "feed", title: "Feed", scope: "baby", data: { method: "breast", side: "right" } }, "Feed")} />
            <Tile testid="log-feed-bottle" icon={Milk} label="Bottle" sub="Add amount later" tone="bg-peach" onClick={() => log({ kind: "feed", title: "Bottle feed", scope: "baby", data: { method: "bottle", unit: "ml" } }, "Bottle")} />
          </>}
          {born && cats.includes("sleep") && (timer.start ? (
            <Tile testid="log-sleep-end" icon={Sun} label="Woke up" sub={`Asleep since ${fmtClock(timer.start, p.timezone)}`} tone="bg-sky" onClick={async () => {
              const s = timer.start!; const e = new Date().toISOString();
              await log({ kind: "sleep", title: "Sleep", scope: "baby", occurredAt: s, data: { startAt: s, endAt: e, duration: Math.round((+new Date(e) - +new Date(s)) / 60000) } }, "Sleep");
              timer.clear();
            }} />
          ) : (
            <Tile testid="log-sleep-start" icon={BedDouble} label="Fell asleep" sub="Starts a timer on this device" tone="bg-sky" onClick={() => { timer.begin(); onOpenChange(false); toast({ title: "Sleep timer started", description: "Tap Log, then Woke up, to save it." }); }} />
          ))}
          {born && cats.includes("diaper") && <>
            <Tile testid="log-diaper-wet" icon={Droplet} label="Wet nappy" tone="bg-sage" onClick={() => log({ kind: "diaper", title: "Wet nappy", scope: "baby", data: { type: "wet" } }, "Wet nappy")} />
            <Tile testid="log-diaper-dirty" icon={Droplet} label="Dirty nappy" tone="bg-sage" onClick={() => log({ kind: "diaper", title: "Dirty nappy", scope: "baby", data: { type: "dirty" } }, "Dirty nappy")} />
          </>}
          {born && cats.includes("pumping") && <Tile testid="log-pump" icon={Milk} label="Pumped" sub="Add amount later" onClick={() => log({ kind: "pumping", title: "Pumping", scope: "private", data: { unit: "ml" } }, "Pumping")} />}
          {born && cats.includes("medication") && meds.slice(0, 3).map((m) => <Tile key={m.id} testid={`log-med-${m.id}`} icon={Pill} label={`${m.title} given`} sub="Checks for recent doses" onClick={() => giveMed(m)} />)}
          {cats.includes("checkin") && <Tile testid="log-checkin" icon={Smile} label="A quick check-in" sub="Private to you" onClick={() => { onOpenChange(false); window.location.assign(`${basePath}/care?tab=you#checkin`); }} />}
          {!born && cats.includes("cycle") && <Tile testid="log-cycle" icon={CircleDot} label="Period started today" sub="Private to you" tone="bg-peach" onClick={() => log({ kind: "cycle", title: "Cycle", scope: "private", data: { startDate: new Date().toISOString().slice(0, 10) } }, "Cycle start")} />}
          {!born && cats.includes("symptom") && <Tile testid="log-symptom" icon={Thermometer} label="Note a symptom" sub="Private to you" onClick={() => { onOpenChange(false); window.location.assign(`${basePath}/care?tab=you#symptoms`); }} />}
        </div>
        {cats.includes("question") && (
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!q.trim()) return; log({ kind: "question", title: q.trim(), scope: "private", data: { answered: false } }, "Question saved"); setQ(""); }}>
            <label className="sr-only" htmlFor="quick-q">Question for an appointment</label>
            <MessageCircleQuestion className="mt-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input id="quick-q" className={inputCls} placeholder="A question for the next appointment…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-quick-question" />
            <Btn type="submit">Save</Btn>
          </form>
        )}
        {adm.dialog}
        <p className="mt-4 text-xs text-muted-foreground">Choose which tiles appear in <Link href="/settings" onClick={() => onOpenChange(false)} className="underline">Settings</Link>. This is a web quick-log panel, not a native home-screen widget.</p>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Get help ---------- */
export function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { boot } = useBoot();
  const contacts = byKind(boot.records, "contact");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">Get help</SheetTitle>
          <SheetDescription>This app doesn't monitor emergencies, diagnose symptoms or send anyone.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-4" role="alert">
          <p className="text-lg font-bold text-destructive">If you think someone is in danger now</p>
          <p className="mt-1 text-[15px]">Call your local emergency number straight away.</p>
          <p className="mt-2 text-sm text-muted-foreground">Emergency numbers for {boot.profile.country || "your region"} have not been verified in this prototype, so none are shown here.</p>
        </div>

        <h3 className="mt-6 font-display text-xl">Your saved contacts</h3>
        {contacts.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No contacts saved yet. Add your midwife, GP or health visitor in Plan.</p> : (
          <ul className="mt-2 space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 border border-card-border">
                <div><p className="font-semibold">{c.title}</p><p className="text-sm text-muted-foreground">{ds(c, "role")}{ds(c, "hours") && ` · ${ds(c, "hours")}`}</p></div>
                {ds(c, "phone") && <a href={`tel:${ds(c, "phone")}`} className="press flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Phone className="h-4 w-4" />Call</a>}
              </li>
            ))}
          </ul>
        )}
        <Link href="/plan?tab=contacts" onClick={() => onOpenChange(false)} className="mt-2 inline-block text-sm font-semibold underline">Manage contacts</Link>

        <h3 className="mt-6 font-display text-xl">Signs to get urgent advice</h3>
        <Tag tone="warn" className="mt-1">Sample list — not clinically reviewed</Tag>
        {(["parent", "baby"] as const).map((k) => (
          <div key={k} className="mt-3">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{k === "parent" ? "For a parent" : "For a baby"}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">{WARNING_SIGNS[k].map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        ))}
        <p className="mt-5 text-sm text-muted-foreground">Logs in this app may be incomplete. A missing or recent record doesn't mean everything is fine — trust what you're seeing and ask a professional.</p>
      </SheetContent>
    </Sheet>
  );
}

export const openLog = () => window.dispatchEvent(new Event("together:log"));
export const openHelp = () => window.dispatchEvent(new Event("together:help"));
