import { useState } from "react";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { useRecords, errStatus, byKind, ds, when, type Rec } from "@/lib/api";
import { useBoot } from "@/lib/boot";
import { ago, fmtClock } from "@/lib/format";
import { Confirm } from "./kit";

type Result = "given" | "skipped" | "unknown";

export function useAdministration() {
  const { boot, childId } = useBoot();
  const { create, remove } = useRecords();
  const [pending, setPending] = useState<{ m: Rec; result: Result; at: string } | null>(null);

  const recent = (m: Rec) => byKind(boot.records, "administration").find((a) => ds(a, "medicationId") === m.id && ds(a, "result") === "given");

  const send = async (m: Rec, result: Result, at: string, confirmDuplicate = false) => {
    const r = await create.mutateAsync({
      kind: "administration",
      title: `${m.title} — ${result}`,
      status: result,
      scope: m.scope === "private" ? "private" : "baby",
      occurredAt: at,
      childId: m.childId || childId,
      data: { medicationId: m.id, result, confirmDuplicate },
    });
    toast({ title: `${m.title}: recorded as ${result} at ${fmtClock(at, boot.profile.timezone)}`, description: "Recorded by you. Corrections are kept in history.", action: <ToastAction altText="Undo" onClick={() => remove.mutate(r.id)}>Undo</ToastAction> });
  };

  const give = async (m: Rec, result: Result = "given", at = new Date().toISOString()) => {
    try {
      await send(m, result, at);
    } catch (e) {
      if (errStatus(e) === 409) setPending({ m, result, at });
    }
  };

  const last = pending ? recent(pending.m) : undefined;
  const dialog = (
    <Confirm
      open={!!pending}
      onOpenChange={(o) => !o && setPending(null)}
      title="This might be a duplicate"
      confirm="Record it anyway"
      body={
        <div className="space-y-2">
          <p>{last ? <>A dose of <strong>{pending?.m.title}</strong> was recorded as given {ago(when(last))} by {last.authorName}.</> : <>A recent dose of {pending?.m.title} was already recorded.</>}</p>
          <p>Kinwell can't know whether a dose was actually taken — only what was recorded, and other people's records may not have reached this device yet. Check with anyone else caring before giving more. Follow the clinician's instructions.</p>
        </div>
      }
      onConfirm={() => { if (pending) send(pending.m, pending.result, pending.at, true).catch(() => undefined); setPending(null); }}
    />
  );
  return { give, dialog, recent, busy: create.isPending };
}
