import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mic, MicOff, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { RecordInputKind, RecordInputScope } from "@workspace/api-client-react";
import { useRecords, ds, dget, edited, when, type Rec, byKind } from "@/lib/api";
import { useBoot } from "@/lib/boot";
import { fmtTime, toLocalInput, fromLocalInput, ago } from "@/lib/format";

/* ---------- primitives ---------- */
export function Surface({ className, children, tone, ...rest }: { className?: string; children: ReactNode; tone?: "peach" | "sky" | "sage" | "sand" } & React.HTMLAttributes<HTMLDivElement>) {
  const toneCls = tone === "peach" ? "bg-peach" : tone === "sky" ? "bg-sky" : tone === "sage" ? "bg-sage" : tone === "sand" ? "bg-sand" : "bg-card";
  return (
    <div className={cn("rounded-[20px] border border-card-border p-5 shadow-[0_1px_0_hsl(var(--border)),0_8px_24px_-18px_hsl(150_30%_20%/0.35)]", toneCls, className)} {...rest}>
      {children}
    </div>
  );
}

export function Btn({ variant = "primary", size = "md", className, children, ...rest }: { variant?: "primary" | "soft" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    soft: "bg-muted text-foreground hover:bg-sage",
    ghost: "text-foreground hover:bg-muted",
    outline: "border border-input bg-card text-foreground hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:brightness-110",
  }[variant];
  const s = { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-4 text-[15px]", lg: "min-h-14 px-6 text-base" }[size];
  return (
    <button type="button" className={cn("press inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none", v, s, className)} {...rest}>
      {children}
    </button>
  );
}

export function Chip({ active, className, children, ...rest }: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "press inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-muted",
        className,
      )}
      {...rest}
    >
      {active && <Check className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

export function Tag({ children, tone = "muted", className }: { children: ReactNode; tone?: "muted" | "peach" | "sky" | "sage" | "warn"; className?: string }) {
  const t = { muted: "bg-muted text-muted-foreground", peach: "bg-peach text-secondary-foreground", sky: "bg-sky text-accent-foreground", sage: "bg-sage text-foreground", warn: "bg-destructive/10 text-destructive" }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", t, className)}>{children}</span>;
}

export function SectionTitle({ title, sub, action, id }: { title: string; sub?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3" id={id}>
      <div>
        <h2 className="font-display text-[22px] leading-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-input bg-sand/60 px-5 py-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-card">
        <span className="block h-3 w-3 rounded-full bg-primary/40" />
      </div>
      <p className="font-display text-lg">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Meta({ r, prefix }: { r: Rec; prefix?: string }) {
  const { boot } = useBoot();
  return (
    <p className="text-xs text-muted-foreground">
      {prefix}
      {fmtTime(when(r), boot.profile.timezone)} · recorded by {r.authorName || "someone"}
      {edited(r) && <> · corrected {ago(r.updatedAt)}</>}
    </p>
  );
}

export function ScopeTag({ scope }: { scope?: string }) {
  if (scope === "private") return <Tag tone="peach">Only you</Tag>;
  if (scope === "baby") return <Tag tone="sky">People with baby access</Tag>;
  return <Tag tone="sage">Whole circle</Tag>;
}

export function Confirm({ open, onOpenChange, title, body, confirm = "Confirm", danger, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; body: ReactNode; confirm?: string; danger?: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[20px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="text-[15px] text-muted-foreground">{body}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="button-confirm" className={cn("min-h-11 rounded-xl", danger && "bg-destructive text-destructive-foreground")} onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- voice ---------- */
type SR = { start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; interimResults: boolean; lang: string };
export function VoiceButton({ onText }: { onText: (t: string) => void }) {
  const Ctor = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
  const [on, setOn] = useState(false);
  const [consent, setConsent] = useState(false);
  const rec = useRef<SR | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  useEffect(() => () => rec.current?.stop(), []);
  if (!Ctor) return <span className="text-xs text-muted-foreground">Voice input isn't supported in this browser — typing works.</span>;
  const start = () => {
    const r = new Ctor();
    r.interimResults = false;
    r.lang = navigator.language || "en-GB";
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      cb.current(t);
    };
    r.onend = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };
  return (
    <>
      <Btn variant="outline" size="sm" onClick={() => (on ? rec.current?.stop() : setConsent(true))} aria-label={on ? "Stop recording" : "Speak instead"}>
        {on ? <><MicOff className="h-4 w-4" /> Recording — tap to stop</> : <><Mic className="h-4 w-4" /> Speak</>}
      </Btn>
      <Confirm open={consent} onOpenChange={setConsent} title="Use your microphone?" confirm="Start recording"
        body="Your browser will listen until you stop. Speech is turned into text by your browser's speech service, and you can edit it before saving. Nothing is saved automatically."
        onConfirm={start} />
    </>
  );
}

/* ---------- generic record dialog ---------- */
export type Field = {
  key: string; // title | notes | occurredAt | status | scope | data.x
  label: string;
  type?: "text" | "textarea" | "datetime" | "date" | "number" | "select" | "member" | "members" | "toggle";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

function getVal(r: Rec | undefined, f: Field, defaults: Record<string, unknown>): unknown {
  if (r) {
    if (f.key.startsWith("data.")) return dget(r, f.key.slice(5));
    return (r as unknown as Record<string, unknown>)[f.key];
  }
  return defaults[f.key];
}

export function RecordDialog({ open, onOpenChange, kind, heading, fields, record, defaults = {}, scope = "household", extraData, onSaved, deletable = true, validate }: {
  open: boolean; onOpenChange: (o: boolean) => void; kind: RecordInputKind; heading: string; fields: Field[]; record?: Rec; defaults?: Record<string, unknown>; scope?: RecordInputScope; extraData?: Record<string, unknown>; onSaved?: (r: Rec) => void; deletable?: boolean; validate?: (v: Record<string, unknown>) => string | null;
}) {
  const { create, update, remove } = useRecords();
  const { boot } = useBoot();
  const [vals, setVals] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    const v: Record<string, unknown> = {};
    fields.forEach((f) => {
      let x = getVal(record, f, defaults);
      if (f.type === "datetime") x = toLocalInput(x as string) || (record ? "" : toLocalInput(new Date().toISOString()));
      if (f.type === "date" && typeof x === "string") x = x.slice(0, 10);
      if (f.type === "toggle") x = x === true || x === "true" ? true : x === false || x === "false" ? false : null;
      v[f.key] = x ?? (f.type === "members" ? [] : f.type === "toggle" ? null : "");
    });
    setVals(v);
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id]);

  const set = (k: string, x: unknown) => setVals((p) => ({ ...p, [k]: x }));

  const submit = async () => {
    for (const f of fields) if (f.required && !String(vals[f.key] ?? "").trim()) return setErr(`${f.label} is needed`);
    const bad = validate?.(vals);
    if (bad) return setErr(bad);
    const top: Record<string, unknown> = {};
    const data: Record<string, unknown> = { ...(record?.data as Record<string, unknown> | undefined), ...extraData };
    fields.forEach((f) => {
      let x = vals[f.key];
      if (f.type === "datetime") x = fromLocalInput(String(x || ""));
      if (f.type === "number") x = x === "" || x === undefined ? undefined : Number(x);
      if (f.type === "toggle") x = x === true ? true : x === false ? false : undefined;
      if (f.key.startsWith("data.")) data[f.key.slice(5)] = x === "" ? undefined : x;
      else if (x !== "" && x !== undefined) top[f.key] = x;
    });
    try {
      let saved: Rec;
      if (record) saved = await update.mutateAsync({ id: record.id, data: { ...top, data } });
      else saved = await create.mutateAsync({ kind, title: String(top.title || heading), scope: (top.scope as RecordInputScope) || scope, ...top, data } as never);
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const busy = create.isPending || update.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[20px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{record ? `Edit ${heading.toLowerCase()}` : heading}</DialogTitle>
          <DialogDescription>{record ? "Changes are kept with a correction time." : "Only what's useful — everything else is optional."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map((f) => (
            <FieldInput key={f.key} f={f} value={vals[f.key]} onChange={(x) => set(f.key, x)} members={boot.members.filter((m) => m.status !== "revoked" || (Array.isArray(vals[f.key]) ? (vals[f.key] as string[]).includes(m.name) : vals[f.key] === m.name)).map((m) => ({ value: m.name, label: m.familyRole ? `${m.name} · ${m.familyRole}` : m.name }))} />
          ))}
          {err && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter className="mt-2 flex-row justify-between gap-2 sm:justify-between">
          {record && deletable ? (
            <Btn variant="ghost" className="text-destructive" onClick={() => setDel(true)} data-testid="button-delete-record"><Trash2 className="h-4 w-4" /> Delete</Btn>
          ) : <span />}
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => onOpenChange(false)}>Cancel</Btn>
            <Btn onClick={submit} disabled={busy} data-testid="button-save-record">{busy ? "Saving…" : "Save"}</Btn>
          </div>
        </DialogFooter>
        {record && (
          <Confirm open={del} onOpenChange={setDel} danger title="Delete this record?" confirm="Delete"
            body="It will be removed for everyone who can see it. This can't be undone."
            onConfirm={async () => { await remove.mutateAsync(record.id); onOpenChange(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export const inputCls = "w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2 text-[16px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FieldInput({ f, value, onChange, members = [] }: { f: Field; value: unknown; onChange: (v: unknown) => void; members?: { value: string; label: string }[] }) {
  const id = `f-${f.key.replace(/\W/g, "-")}`;
  const opts = f.type === "member" || f.type === "members" ? members : f.options || [];
  return (
    <div>
      <label htmlFor={id} id={`${id}-label`} className="mb-1.5 block text-sm font-semibold">{f.label}{f.required && <span className="sr-only"> (required)</span>}</label>
      {f.type === "textarea" ? (
        <textarea id={id} rows={3} className={inputCls} placeholder={f.placeholder} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === "select" || f.type === "member" ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
          {f.type === "member" && <Chip active={!value} onClick={() => onChange("")}>Nobody yet</Chip>}
          {opts.map((o) => <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)} role="radio" aria-checked={value === o.value}>{o.label}</Chip>)}
        </div>
      ) : f.type === "members" ? (
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
          {(() => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            // Keep saved names that no longer match a member visible so they can be removed, not silently kept.
            const all = [...opts, ...arr.filter((x) => !opts.some((o) => o.value === x)).map((x) => ({ value: x, label: `${x} (not in circle)` }))];
            return all.map((o) => {
              const on = arr.includes(o.value);
              return <Chip key={o.value} role="checkbox" aria-checked={on} aria-pressed={undefined} active={on} onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])} data-testid={`chip-member-${o.value}`}>{o.label}</Chip>;
            });
          })()}
          {!opts.length && <span className="text-sm text-muted-foreground">No one in your circle yet.</span>}
        </div>
      ) : f.type === "toggle" ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
          <Chip role="radio" aria-checked={value === true} aria-pressed={undefined} active={value === true} onClick={() => onChange(true)} data-testid={`${id}-yes`}>Yes</Chip>
          <Chip role="radio" aria-checked={value === false} aria-pressed={undefined} active={value === false} onClick={() => onChange(false)} data-testid={`${id}-no`}>No</Chip>
          {value !== true && value !== false && <span className="self-center text-xs text-muted-foreground">Not recorded yet</span>}
        </div>
      ) : (
        <input id={id} className={inputCls} placeholder={f.placeholder}
          type={f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
          inputMode={f.type === "number" ? "decimal" : undefined}
          value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
    </div>
  );
}

/* ---------- kind section ---------- */
const COLORFUL = ["task", "shift", "appointment", "help", "question"];
export const TONES = ["peach", "sky", "sage", "sand"] as const;
export function KindSection({ title, sub, kind, fields, scope = "household", filter, defaults, extraData, empty, emptyBody, line, actions, addLabel = "Add", testid }: {
  title: string; sub?: string; kind: RecordInputKind; fields: Field[]; scope?: RecordInputScope; filter?: (r: Rec) => boolean; defaults?: Record<string, unknown>; extraData?: Record<string, unknown>;
  empty: string; emptyBody?: string; line?: (r: Rec) => ReactNode; actions?: (r: Rec) => ReactNode; addLabel?: string; testid?: string;
}) {
  const { boot } = useBoot();
  const list = byKind(boot.records, kind).filter(filter || (() => true));
  const [edit, setEdit] = useState<Rec | "new" | null>(null);
  return (
    <section className="mb-8" data-testid={testid || `section-${kind}`}>
      <SectionTitle title={title} sub={sub} action={<Btn size="sm" variant="soft" onClick={() => setEdit("new")} data-testid={`button-add-${kind}`}><Plus className="h-4 w-4" />{addLabel}</Btn>} />
      {list.length === 0 ? (
        <Empty title={empty} action={<Btn size="sm" onClick={() => setEdit("new")}><Plus className="h-4 w-4" />{addLabel}</Btn>}>{emptyBody}</Empty>
      ) : (
        <ul className="space-y-2.5">
          {list.map((r, i) => (
            <li key={r.id} className="rise" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
              <Surface className="p-4" tone={COLORFUL.includes(kind) && r.status !== "done" ? TONES[i % TONES.length] : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.title}</p>
                      {r.status && <Tag>{r.status}</Tag>}
                      {r.scope === "private" && <ScopeTag scope="private" />}
                    </div>
                    {line && <div className="mt-1 text-sm text-foreground/80">{line(r)}</div>}
                    {r.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.notes}</p>}
                    <div className="mt-1.5"><Meta r={r} /></div>
                  </div>
                  <button type="button" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted" aria-label={`Edit ${r.title}`} onClick={() => setEdit(r)} data-testid={`button-edit-${r.id}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(r)}</div>}
              </Surface>
            </li>
          ))}
        </ul>
      )}
      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} kind={kind} heading={title.replace(/s$/, "")} fields={fields}
        record={edit && edit !== "new" ? edit : undefined} defaults={defaults} scope={scope} extraData={extraData} />
    </section>
  );
}

/* ---------- checklist ---------- */
type Item = { text: string; done: boolean };
export function ChecklistCard({ source, title, defaults, scope = "household", meta, tone }: { source: string; title: string; defaults: string[]; scope?: RecordInputScope; meta?: { jurisdiction?: string; reviewDate?: string }; tone?: "peach" | "sky" | "sage" | "sand" }) {
  const { boot } = useBoot();
  const { create, update, remove } = useRecords();
  const rec = boot.records.find((r) => r.kind === "checklist" && ds(r, "source") === source);
  const items: Item[] = (dget<Item[]>(rec, "items") || []).filter(Boolean);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const save = (next: Item[]) => rec && update.mutate({ id: rec.id, data: { data: { ...(rec.data as object), items: next } } });

  if (!rec)
    return (
      <Surface tone={tone || "sand"} data-testid={`checklist-${source}`}>
        <p className="font-display text-xl">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{defaults.length} suggested items to start from. You can edit or remove any of them.</p>
        <Btn className="mt-4" onClick={() => create.mutate({ kind: "checklist", title, scope, data: { source, items: defaults.map((t) => ({ text: t, done: false })), ...meta } })} disabled={create.isPending}>
          Start this list
        </Btn>
      </Surface>
    );
  const done = items.filter((i) => i.done).length;
  return (
    <Surface tone={tone} data-testid={`checklist-${source}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl">{rec.title}</p>
          <p className="text-sm text-muted-foreground">{done} of {items.length} done</p>
          {(ds(rec, "jurisdiction") || meta?.jurisdiction) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Tag tone="warn">Unverified sample</Tag>
              <Tag>{ds(rec, "jurisdiction") || meta?.jurisdiction}</Tag>
              <Tag>Last reviewed: {ds(rec, "reviewDate") || meta?.reviewDate || "never"}</Tag>
            </div>
          )}
        </div>
        <Btn variant="ghost" size="sm" aria-label="Remove list" onClick={() => remove.mutate(rec.id)}><Trash2 className="h-4 w-4" /></Btn>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <button type="button" role="checkbox" aria-checked={it.done} aria-label={it.text}
              className={cn("press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", it.done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card")}
              onClick={() => save(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}>
              {it.done && <Check className="h-5 w-5" />}
            </button>
            {editing === i ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); save(items.map((x, j) => (j === i ? { ...x, text: editText } : x))); setEditing(null); }}>
                <input className={inputCls} value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit item" autoFocus />
                <Btn type="submit" size="sm">Save</Btn>
              </form>
            ) : (
              <button type="button" className={cn("flex-1 text-left text-[15px]", it.done && "text-muted-foreground line-through")} onClick={() => { setEditing(i); setEditText(it.text); }}>{it.text}</button>
            )}
            <button type="button" aria-label={`Remove ${it.text}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted" onClick={() => save(items.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; save([...items, { text: text.trim(), done: false }]); setText(""); }}>
        <input className={inputCls} placeholder="Add your own item or deadline" value={text} onChange={(e) => setText(e.target.value)} aria-label={`Add to ${title}`} />
        <Btn type="submit" variant="soft"><Plus className="h-4 w-4" /> Add</Btn>
      </form>
    </Surface>
  );
}

export function useStale() {
  const { fetchedAt } = useBoot();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const age = Date.now() - fetchedAt;
  return { label: `Last updated ${ago(new Date(fetchedAt).toISOString())}`, stale: age > 90000 || !navigator.onLine };
}
