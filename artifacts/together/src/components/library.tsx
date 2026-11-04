import { useEffect, useState } from "react";
import { Search, Play, Pause, Bookmark, BookmarkCheck, RotateCcw, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { LIBRARY, CONTENT_STATUS, type ContentItem, type Stage } from "@/lib/content";
import { useBoot } from "@/lib/boot";
import { useRecords, byKind, ds, when } from "@/lib/api";
import { readOffline, writeOffline, clearOffline, type OfflinePack } from "@/lib/offline";
import { ago, fmtTime } from "@/lib/format";
import { Btn, Chip, Surface, Tag, SectionTitle, inputCls, Empty } from "./kit";
import { cn } from "@/lib/utils";

export function useSavedContent() {
  const { boot } = useBoot();
  const { create, remove } = useRecords();
  const saved = byKind(boot.records, "saved");
  const find = (id: string) => saved.find((s) => ds(s, "cardKey") === `content-${id}`);
  const toggle = (c: ContentItem) => {
    const s = find(c.id);
    if (s) remove.mutate(s.id);
    else create.mutate({ kind: "saved", title: c.title, scope: "private", data: { cardKey: `content-${c.id}`, contentId: c.id } });
  };
  return { find, toggle, saved };
}

export function Library({ stage, topics, title = "Library", openId, onOpenId }: { stage: Stage; topics?: ContentItem["topic"][]; title?: string; openId?: string | null; onOpenId?: (id: string | null) => void }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [localOpen, setLocalOpen] = useState<string | null>(null);
  const open = openId !== undefined ? openId : localOpen;
  const setOpen = onOpenId || setLocalOpen;
  const pool = LIBRARY.filter((c) => (!topics || topics.includes(c.topic)) && (stage === "paused" ? c.topic === "recovery" : true));
  const tlist = Array.from(new Set(pool.map((c) => c.topic)));
  const list = pool
    .filter((c) => !topic || c.topic === topic)
    .filter((c) => !q || (c.title + c.summary + c.body.join(" ")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.stages.includes(stage)) - Number(a.stages.includes(stage)));
  const { find, toggle } = useSavedContent();
  const item = LIBRARY.find((c) => c.id === open);
  return (
    <section className="mb-8">
      <SectionTitle title={title} sub={CONTENT_STATUS} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <input type="search" className={cn(inputCls, "pl-9")} placeholder="Search guides and demonstrations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search library" data-testid="input-library-search" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={!topic} onClick={() => setTopic(null)} className="min-h-9 text-sm">All</Chip>
        {tlist.map((t) => <Chip key={t} active={topic === t} onClick={() => setTopic(t)} className="min-h-9 text-sm capitalize">{t}</Chip>)}
      </div>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setOpen(c.id)} className="press h-full w-full rounded-[20px] border border-card-border bg-card p-4 text-left hover:bg-muted/50" data-testid={`content-${c.id}`}>
              <div className="flex items-center gap-2"><Tag tone="sky" className="capitalize">{c.topic}</Tag>{c.demo && <Tag tone="peach">Captioned demo</Tag>}{find(c.id) && <Tag tone="sage">Saved</Tag>}</div>
              <p className="mt-2 font-semibold">{c.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{c.summary}</p>
            </button>
          </li>
        ))}
        {!list.length && <li className="text-sm text-muted-foreground">Nothing matches that search.</li>}
      </ul>
      <Dialog open={!!item} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[20px] sm:max-w-lg">
          {item && <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{item.title}</DialogTitle>
              <DialogDescription>{item.summary}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-1.5"><Tag tone="warn">{CONTENT_STATUS}</Tag><Tag>Source: {item.source}</Tag></div>
            {item.demo && <CaptionPlayer steps={item.demo.steps} />}
            <div className="space-y-2 text-[16px] leading-relaxed">{item.body.map((b, i) => <p key={i}>{b}</p>)}</div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Btn variant="soft" onClick={() => toggle(item)}>{find(item.id) ? <><BookmarkCheck className="h-4 w-4" />Saved</> : <><Bookmark className="h-4 w-4" />Save</>}</Btn>
              <Btn variant="outline" onClick={() => {
                const p = readOffline() || { savedAt: new Date().toISOString(), sections: [] };
                const sec = { title: item.title, lines: [...item.body, ...(item.demo?.steps.map((s, i) => `Step ${i + 1}: ${s}`) || []), `(${CONTENT_STATUS})`] };
                writeOffline({ savedAt: new Date().toISOString(), sections: [...p.sections.filter((s) => s.title !== item.title), sec] });
                toast({ title: "Kept on this device", description: "Readable offline. Clear it any time in Care or Settings." });
              }}><Download className="h-4 w-4" />Keep offline</Btn>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function CaptionPlayer({ steps }: { steps: string[] }) {
  const [i, setI] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => (i < steps.length - 1 ? setI(i + 1) : setPlaying(false)), i < 0 ? 0 : 3200);
    return () => clearTimeout(t);
  }, [playing, i, steps.length]);
  return (
    <div className="overflow-hidden rounded-2xl bg-sky">
      <div className="flex aspect-video flex-col items-center justify-center p-6 text-center" aria-live="polite">
        {i < 0 ? <p className="font-display text-xl text-accent-foreground">Tap play. Captions only — no sound.</p> : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground/70">Step {i + 1} of {steps.length}</p>
            <p key={i} className={cn("mt-2 font-display text-2xl text-accent-foreground", !reduce && "rise")}>{steps[i]}</p>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 bg-card/60 p-2">
        <Btn size="sm" onClick={() => { if (i >= steps.length - 1) setI(-1); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play demonstration"}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? "Pause" : "Play"}</Btn>
        <Btn size="sm" variant="ghost" onClick={() => { setPlaying(false); setI(-1); }} aria-label="Restart"><RotateCcw className="h-4 w-4" /></Btn>
        <div className="ml-auto flex gap-1" aria-hidden>{steps.map((_, j) => <span key={j} className={cn("h-1.5 w-5 rounded-full", j <= i ? "bg-primary" : "bg-input")} />)}</div>
      </div>
      <details className="bg-card/60 px-3 pb-3 text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Transcript</summary><ol className="list-decimal space-y-1 pl-5">{steps.map((s) => <li key={s}>{s}</li>)}</ol></details>
    </div>
  );
}

export function OfflineEssentials() {
  const { boot } = useBoot();
  const [pack, setPack] = useState<OfflinePack | null>(() => readOffline());
  const [sel, setSel] = useState<string[]>(["works", "contacts", "meds", "latest"]);
  const tz = boot.profile.timezone;
  const R = boot.records;
  const build = () => {
    const sections: OfflinePack["sections"] = [];
    if (sel.includes("works")) sections.push({ title: "What works for our baby", lines: byKind(R, "preference").map((p) => `${ds(p, "category") || "Note"}: ${p.title}${p.notes ? ` — ${p.notes}` : ""} (${ds(p, "source") === "clinician" ? "clinician instruction" : "family preference"})`) });
    if (sel.includes("contacts")) sections.push({ title: "Contacts", lines: byKind(R, "contact").map((c) => `${c.title} · ${ds(c, "role")} · ${ds(c, "phone")}`) });
    if (sel.includes("meds")) sections.push({ title: "Medication instructions (as recorded)", lines: byKind(R, "medication").map((m) => `${m.title}: ${ds(m, "instructions")}`).concat(byKind(R, "administration").slice(0, 5).map((a) => `Recorded ${a.status || ds(a, "result")}: ${a.title} at ${fmtTime(when(a), tz)} by ${a.authorName}`)) });
    if (sel.includes("latest")) sections.push({ title: "Latest recorded care", lines: (["feed", "sleep", "diaper"] as const).map((k) => { const r = byKind(R, k)[0]; return r ? `${r.title}: ${fmtTime(when(r), tz)} by ${r.authorName}` : `No ${k} has been recorded`; }) });
    const old = readOffline();
    const p = { savedAt: new Date().toISOString(), sections: [...sections, ...(old?.sections.filter((s) => !sections.some((x) => x.title === s.title)) || [])] };
    writeOffline(p);
    setPack(p);
    toast({ title: "Essentials kept on this device" });
  };
  return (
    <section className="mb-8" id="offline">
      <SectionTitle title="Kept on this device" sub="A Kinwell snapshot for a weak signal. A snapshot — not live, and never a substitute for checking with others." />
      <Surface tone="sand">
        <div className="flex flex-wrap gap-2">
          {[["works", "What works"], ["contacts", "Contacts"], ["meds", "Medication"], ["latest", "Latest care"]].map(([k, l]) => (
            <Chip key={k} active={sel.includes(k)} onClick={() => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k])}>{l}</Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn onClick={build} disabled={!sel.length} data-testid="button-save-offline"><Download className="h-4 w-4" />Save snapshot</Btn>
          {pack && <Btn variant="ghost" onClick={() => { clearOffline(); setPack(null); toast({ title: "Removed from this device" }); }} data-testid="button-clear-offline"><Trash2 className="h-4 w-4" />Clear from device</Btn>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Offline logging isn't available in this prototype — new entries need a connection.</p>
      </Surface>
      {pack ? (
        <details className="mt-3 rounded-[20px] border border-card-border bg-card p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">Snapshot saved {ago(pack.savedAt)} <Tag tone="warn" className="ml-2">May be out of date</Tag></summary>
          {pack.sections.map((s) => (
            <div key={s.title} className="mt-3"><p className="text-sm font-bold">{s.title}</p><ul className="list-disc pl-5 text-sm">{s.lines.length ? s.lines.map((l, i) => <li key={i}>{l}</li>) : <li>Nothing recorded</li>}</ul></div>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">Medication history here is stale. Someone else may have recorded a dose since {fmtTime(pack.savedAt, tz)}.</p>
        </details>
      ) : <div className="mt-3"><Empty title="Nothing kept on this device" /></div>}
    </section>
  );
}
