import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useRecords } from "@/lib/api";
import { useChild, todayISO, monthsAgoISO } from "@/lib/child";
import { babyAge, fmtDate } from "@/lib/format";
import { Btn, Chip, Surface, SectionTitle, Tag, inputCls } from "@/components/kit";

export function BabyEditor() {
  const { boot, isAdmin, setChildId } = useBoot();
  const { child, kids, name, birthDate } = useChild();
  const { create, update } = useRecords();
  const [n, setN] = useState(name);
  const [d, setD] = useState(birthDate);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setN(name); setD(birthDate); setErr(null); }, [child?.id, name, birthDate]);
  const preview = babyAge(d);
  const busy = create.isPending || update.isPending;

  const save = (date: string, title: string, label?: string) => {
    setErr(null);
    if (!title.trim()) return setErr("Add a name (a nickname is fine)");
    if (date && date > todayISO()) return setErr("Birth date can't be in the future");
    const done = () => toast({ title: label || "Baby profile saved", description: date ? `Now ${babyAge(date)?.label}. Logs and plans are kept.` : undefined });
    if (child) update.mutate({ id: child.id, data: { title: title.trim(), data: { birthDate: date || "" } } }, { onSuccess: done });
    else create.mutate({ kind: "child", title: title.trim(), scope: "baby", data: { birthDate: date || undefined } }, { onSuccess: (r) => { setChildId(r.id); done(); } });
  };

  return (
    <section><SectionTitle title="Baby profile" sub="The selected child's name and birth date drive age-relevant content across Home, Care and plans." />
      <Surface className="space-y-4" data-testid="section-baby-profile">
        {kids.length > 1 && <div><p className="mb-1.5 text-sm font-semibold">Editing</p><div className="flex flex-wrap gap-2">{kids.map((k) => <Chip key={k.id} active={k.id === child?.id} onClick={() => setChildId(k.id)}>{k.title}</Chip>)}</div></div>}
        {!isAdmin ? (
          <p className="text-[15px]">{name || "Baby"}{birthDate ? ` · born ${fmtDate(birthDate)} (${babyAge(birthDate)?.label})` : " · no birth date yet"}. <span className="text-muted-foreground">Only an administrator can change this.</span></p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Name</span><input className={inputCls} value={n} onChange={(e) => setN(e.target.value)} data-testid="input-baby-name" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Birth date</span><input type="date" max={todayISO()} className={inputCls} value={d} onChange={(e) => setD(e.target.value)} data-testid="input-baby-birthdate" /></label>
            </div>
            <p className="text-sm" data-testid="text-baby-age">{preview ? <>Age: <strong>{preview.label}</strong></> : d ? "That date is in the future" : "No birth date yet"}</p>
            {err && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
            <Btn onClick={() => save(d, n)} disabled={busy} data-testid="button-save-baby">{busy ? "Saving…" : child ? "Save baby profile" : "Create baby profile"}</Btn>
            {boot.profile.isDemo && (
              <div className="rounded-xl bg-sky p-3">
                <p className="text-sm font-semibold">Demo: try another age <Tag>Updates the same baby record</Tag></p>
                <div className="mt-2 flex flex-wrap gap-2">{[2, 5, 6, 9].map((m) => <Chip key={m} className="min-h-9 text-sm" disabled={busy} onClick={() => save(monthsAgoISO(m), n || name || "Baby", `Demo baby now about ${m} months`)} data-testid={`button-age-preset-${m}`}>{m} months</Chip>)}</div>
                <p className="mt-1 text-xs">Stage doesn't change. Existing logs, foods and plans stay; plans show a note if they no longer suit the age.</p>
              </div>
            )}
          </>
        )}
      </Surface>
    </section>
  );
}
