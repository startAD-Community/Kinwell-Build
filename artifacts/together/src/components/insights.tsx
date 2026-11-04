import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown, BookOpen, PenLine, HelpCircle, ListPlus, HandHeart, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useRecords } from "@/lib/api";
import { useChild } from "@/lib/child";
import { pregnancyWeek } from "@/lib/format";
import { insightsFor, type Insight, type InsightAction } from "@/lib/insights";
import type { Stage } from "@/lib/content";
import { Btn, Surface, Tag } from "@/components/kit";
import { openLog } from "@/components/shell";
import { cn } from "@/lib/utils";

const ICON = { topic: ArrowRight, read: BookOpen, log: PenLine, question: HelpCircle, task: ListPlus, help: HandHeart };

export function InsightCards() {
  const { boot } = useBoot();
  const { age, name } = useChild();
  const stage = (boot.profile.stage || "preconception") as Stage;
  const list = insightsFor(stage, age?.months ?? null, pregnancyWeek(boot.profile.dueDate));
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, 2);
  return (
    <section className="mt-6" aria-labelledby="insights-h">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 id="insights-h" className="font-display text-[22px] leading-tight">{stage === "postpartum" ? `What may be happening${name ? ` for ${name}` : ""}` : "What may be happening now"}</h2>
          <p className="text-sm text-muted-foreground">{stage === "postpartum" && age ? `Based on ${age.label}. ` : ""}Common patterns and variation — not predictions or diagnosis.</p>
        </div>
      </div>
      <ul className="space-y-3">
        {shown.map((c, i) => <li key={c.id} className="rise" style={{ animationDelay: `${60 + i * 60}ms` }}><InsightCard c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} /></li>)}
      </ul>
      {list.length > 2 && <Btn variant="ghost" size="sm" className="mt-2" onClick={() => setAll(!all)} data-testid="button-insights-more">{all ? "Show fewer" : `${list.length - 2} more for this stage`}</Btn>}
    </section>
  );
}

function InsightCard({ c, open, onToggle }: { c: Insight; open: boolean; onToggle: () => void }) {
  const run = useAction();
  return (
    <Surface tone={c.tone} className="p-0" data-testid={`insight-${c.id}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="press flex w-full items-start gap-3 p-5 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{c.who === "you" ? "For you · " : "Baby · "}{c.eyebrow}</p>
          <h3 className="mt-1 font-display text-[21px] leading-snug">{c.title}</h3>
          <p className="mt-1 text-[15px] text-foreground/80">{c.short}</p>
        </div>
        <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="rise -mt-2 px-5 pb-5">
          <ul className="space-y-1.5 text-[15px]">{c.more.map((m, i) => <li key={i} className="rounded-xl bg-card/60 px-3 py-2">{m}</li>)}</ul>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">If you'd like to do something (all optional)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {c.actions.map((a) => { const I = ICON[a.kind]; return <Btn key={a.label} size="sm" variant={a.kind === "topic" ? "primary" : "outline"} onClick={() => run(a)} data-testid={`insight-action-${c.id}-${a.kind}`}><I className="h-4 w-4" />{a.label}</Btn>; })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5"><Tag tone="warn">Not clinically reviewed</Tag><Tag>{c.source}</Tag></div>
        </div>
      )}
    </Surface>
  );
}

function useAction() {
  const [, nav] = useLocation();
  const { create } = useRecords();
  return (a: InsightAction) => {
    if (a.kind === "topic") nav(a.href);
    else if (a.kind === "read") nav(`/care?tab=${a.tab}&read=${a.id}`);
    else if (a.kind === "log") openLog();
    else if (a.kind === "help") nav(`/together?tab=help&prepare=${a.need}`);
    else if (a.kind === "question") create.mutate({ kind: "question", title: a.text, scope: "private", status: "open", data: {} }, { onSuccess: () => toast({ title: "Question saved privately", description: "Find it in Plan › Questions." }) });
    else if (a.kind === "task") create.mutate({ kind: "task", title: a.text, scope: "household", status: "open", data: { priority: true, why: "From an insight card" } }, { onSuccess: () => toast({ title: "Added to this week", description: "Visible to your household circle. Nobody is responsible yet." }) });
  };
}
