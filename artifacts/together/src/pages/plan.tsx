import { useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CalendarX2, Download, FileText, Pencil, Plus, RefreshCw, Trash2, Upload, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBootstrapQueryKey } from "@workspace/api-client-react";
import { useBoot } from "@/lib/boot";
import { useRecords, byKind, ds, dget, when, runExport, errMessage, uploadDocument, validateFile, documentUrl, type Rec } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";
import { CHECKLISTS, QUESTION_CHIPS, PROTOTYPE_LOCALE } from "@/lib/content";
import { Btn, Chip, Surface, Tag, SectionTitle, Empty, KindSection, ChecklistCard, Confirm, RecordDialog, Meta, ScopeTag, VoiceButton, inputCls, type Field } from "@/components/kit";
import { describe } from "./care";
import { cn } from "@/lib/utils";

const TABS = [["appointments", "Appointments"], ["questions", "Questions"], ["documents", "Documents"], ["contacts", "Contacts"], ["admin", "Admin timeline"]] as const;

export default function PlanPage() {
  const search = new URLSearchParams(useSearch());
  const [, nav] = useLocation();
  const tab = (search.get("tab") || "appointments") as (typeof TABS)[number][0];
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="pt-4 font-display text-[34px] leading-tight">Plan</h1>
      <p className="text-sm text-muted-foreground">Appointments, questions, documents and the admin that comes with a new baby.</p>
      <div role="tablist" className="sticky top-[68px] z-20 -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => nav(`/plan?tab=${k}`)} data-testid={`tab-plan-${k}`}
            className={cn("press min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold", tab === k ? "bg-primary text-primary-foreground" : "border border-input bg-card")}>{l}</button>
        ))}
      </div>
      <div className="mt-6 rise" key={tab}>
        {tab === "appointments" && <Appointments focus={search.get("appt")} />}
        {tab === "questions" && <Questions />}
        {tab === "documents" && <Documents />}
        {tab === "contacts" && <Contacts />}
        {tab === "admin" && <Admin />}
      </div>
    </div>
  );
}

/* ---------- appointments ---------- */
function apptFields(tz: string): Field[] {
  return [
    { key: "title", label: "Title", required: true, placeholder: "Midwife check", hint: "Calendar exports use a discreet title unless you include details." },
    { key: "occurredAt", label: "Starts", type: "datetime", required: true },
    { key: "data.endAt", label: "Ends", type: "datetime" },
    { key: "data.timezone", label: "Timezone", placeholder: tz, hint: "Kept with the appointment so times stay right across clock changes." },
    { key: "data.location", label: "Location" },
    { key: "data.clinician", label: "Clinician or contact" },
    { key: "data.participants", label: "Who's invited", type: "members", hint: "Only people you choose. Nobody is added automatically." },
    { key: "data.includeNotes", label: "Include notes in calendar exports?", type: "toggle" },
    { key: "scope", label: "Visibility", type: "select", options: [{ value: "private", label: "Only me" }, { value: "household", label: "Household" }] },
    { key: "notes", label: "Notes", type: "textarea" },
  ];
}

function Appointments({ focus }: { focus: string | null }) {
  const { boot } = useBoot();
  const tz = boot.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [edit, setEdit] = useState<Rec | "new" | null>(null);
  const all = byKind(boot.records, "appointment");
  const upcoming = all.filter((a) => +new Date(when(a)) > Date.now() - 36e5).sort((a, b) => +new Date(when(a)) - +new Date(when(b)));
  const past = all.filter((a) => +new Date(when(a)) <= Date.now() - 36e5);
  return (
    <>
      <Surface tone="sky" className="mb-6">
        <div className="flex items-start gap-3"><CalendarX2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div>
          <p className="font-semibold">Google Calendar: not connected</p>
          <p className="mt-0.5 text-sm">Two-way sync isn't available in this prototype (status: {boot.calendarStatus}). Schedule here and download calendar files instead — they won't update automatically.</p>
          <Btn size="sm" variant="outline" className="mt-2" disabled aria-disabled>Connect Google Calendar — not available yet</Btn>
        </div></div>
      </Surface>
      <SectionTitle title="Upcoming" action={<Btn size="sm" onClick={() => setEdit("new")} data-testid="button-add-appointment"><Plus className="h-4 w-4" />Add</Btn>} />
      {upcoming.length === 0 ? <Empty title="No appointments coming up" action={<Btn size="sm" onClick={() => setEdit("new")}>Add one</Btn>} /> : (
        <ul className="space-y-3">{upcoming.map((a) => <li key={a.id}><ApptCard a={a} onEdit={() => setEdit(a)} open={focus === a.id} /></li>)}</ul>
      )}
      {past.length > 0 && <>
        <div className="mt-8"><SectionTitle title="Past — follow-through" sub="Visit notes, next steps, and turning them into tasks." /></div>
        <ul className="space-y-3">{past.map((a) => <li key={a.id}><ApptCard a={a} onEdit={() => setEdit(a)} open={focus === a.id} past /></li>)}</ul>
      </>}
      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} kind="appointment" heading="Appointment" fields={apptFields(tz)} record={edit && edit !== "new" ? edit : undefined} defaults={{ "data.timezone": tz, scope: "household", "data.participants": [] }} />
    </>
  );
}

function ApptCard({ a, onEdit, open, past }: { a: Rec; onEdit: () => void; open?: boolean; past?: boolean }) {
  const { boot } = useBoot();
  const { create, update } = useRecords();
  const [cancel, setCancel] = useState(false);
  const [summary, setSummary] = useState(false);
  const qs = byKind(boot.records, "question").filter((q) => ds(q, "appointmentId") === a.id);
  const loose = byKind(boot.records, "question").filter((q) => !ds(q, "appointmentId") && !dget(q, "answered"));
  const steps: { text: string; done?: string }[] = dget(a, "nextSteps") || [];
  const [visit, setVisit] = useState(ds(a, "visitNotes"));
  const [step, setStep] = useState("");
  const cancelled = a.status === "cancelled";
  const tz = ds(a, "timezone") || boot.profile.timezone;
  const patchData = (p: Record<string, unknown>) => update.mutate({ id: a.id, data: { data: { ...(a.data as object), ...p } } });
  return (
    <Surface tone={open ? "peach" : undefined} className={cn("p-4", cancelled && "opacity-70")} data-testid={`appt-${a.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2"><p className="font-display text-xl">{a.title}</p>{cancelled && <Tag tone="warn">Cancelled</Tag>}<ScopeTag scope={a.scope} /></div>
          <p className="text-[15px]">{fmtTime(when(a), tz)}{ds(a, "endAt") && ` – ${new Date(ds(a, "endAt")).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz || undefined })}`} <span className="text-xs text-muted-foreground">({tz})</span></p>
          <p className="text-sm text-muted-foreground">{[ds(a, "location"), ds(a, "clinician"), (dget<string[]>(a, "participants") || []).length ? `With ${(dget<string[]>(a, "participants") || []).join(", ")}` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" onClick={onEdit} aria-label={`Edit ${a.title}`} className="press flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted"><Pencil className="h-4 w-4" /></button>
      </div>
      <details open={open} className="mt-3">
        <summary className="min-h-11 cursor-pointer font-semibold">Questions ({qs.length})</summary>
        <ul className="mt-1 space-y-1">{qs.map((q) => (
          <li key={q.id} className="flex items-center gap-2">
            <button type="button" role="checkbox" aria-checked={!!dget(q, "answered")} aria-label={`Answered: ${q.title}`} onClick={() => update.mutate({ id: q.id, data: { data: { ...(q.data as object), answered: !dget(q, "answered") } } })} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", dget(q, "answered") ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card")}>{!!dget(q, "answered") && <Check className="h-4 w-4" />}</button>
            <span className={cn("flex-1 text-[15px]", !!dget(q, "answered") && "text-muted-foreground line-through")}>{q.title}</span>
            <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: q.id, data: { data: { ...(q.data as object), appointmentId: null } } })}>Unlink</Btn>
          </li>
        ))}</ul>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUESTION_CHIPS.filter((c) => !qs.some((q) => q.title === c)).slice(0, 5).map((c) => <Chip key={c} className="min-h-9 text-sm" onClick={() => create.mutate({ kind: "question", title: c, scope: a.scope === "private" ? "private" : "household", data: { appointmentId: a.id, answered: false } })}><Plus className="h-3.5 w-3.5" />{c}</Chip>)}
          {loose.slice(0, 4).map((q) => <Chip key={q.id} className="min-h-9 border-primary/50 text-sm" onClick={() => update.mutate({ id: q.id, data: { data: { ...(q.data as object), appointmentId: a.id } } })}><Plus className="h-3.5 w-3.5" />Saved: {q.title}</Chip>)}
        </div>
      </details>
      {past && !cancelled && (
        <div className="mt-3 rounded-xl bg-muted/60 p-3">
          <label className="text-sm font-semibold" htmlFor={`visit-${a.id}`}>Visit notes</label>
          <textarea id={`visit-${a.id}`} rows={3} className={cn(inputCls, "mt-1")} value={visit} onChange={(e) => setVisit(e.target.value)} placeholder="What was said, in your words" />
          <Btn size="sm" variant="soft" className="mt-2" onClick={() => patchData({ visitNotes: visit })}>Save notes</Btn>
          <p className="mt-4 text-sm font-semibold">Next steps the clinician gave</p>
          <ul className="mt-1 space-y-1.5">{steps.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-card p-2 text-[15px]">
              <span className="flex-1">{s.text}</span>
              {s.done ? <Tag tone="sage">{s.done}</Tag> : <>
                <Btn size="sm" variant="soft" onClick={() => create.mutate({ kind: "task", title: s.text, scope: "household", status: "open", data: { fromAppointment: a.id } }, { onSuccess: () => patchData({ nextSteps: steps.map((x, j) => (j === i ? { ...x, done: "Task created" } : x)) }) })}>Make a task</Btn>
                <Btn size="sm" variant="soft" onClick={() => create.mutate({ kind: "appointment", title: `Follow-up: ${s.text}`, scope: a.scope as "household", occurredAt: new Date(Date.now() + 14 * 864e5).toISOString(), data: { timezone: tz, followUpFrom: a.id } }, { onSuccess: () => { patchData({ nextSteps: steps.map((x, j) => (j === i ? { ...x, done: "Follow-up added — set the date" } : x)) }); toast({ title: "Follow-up added", description: "Placeholder date in two weeks — edit it." }); } })}>Book follow-up</Btn>
              </>}
            </li>
          ))}</ul>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!step.trim()) return; patchData({ nextSteps: [...steps, { text: step.trim() }] }); setStep(""); }}>
            <input className={inputCls} value={step} onChange={(e) => setStep(e.target.value)} placeholder="Add a next step" aria-label="Add a next step" /><Btn type="submit" variant="soft">Add</Btn>
          </form>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn size="sm" variant="outline" onClick={() => runExport({ ids: [a.id], format: "ics", purpose: "calendar file" }).catch((e) => toast({ title: "Couldn't create file", description: errMessage(e), variant: "destructive" }))}><Download className="h-4 w-4" />Calendar file (.ics)</Btn>
        <Btn size="sm" variant="outline" onClick={() => setSummary(true)}><FileText className="h-4 w-4" />Visit summary</Btn>
        {!cancelled ? <Btn size="sm" variant="ghost" onClick={() => setCancel(true)}>Cancel appointment</Btn> : <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: a.id, data: { status: "scheduled" } })}>Restore</Btn>}
      </div>
      <Confirm open={cancel} onOpenChange={setCancel} title="Cancel this appointment?" confirm="Cancel appointment" body="It stays in your history marked as cancelled. Any calendar file you downloaded won't change — remove it from your calendar yourself." onConfirm={() => update.mutate({ id: a.id, data: { status: "cancelled" } })} />
      {summary && <VisitSummary a={a} questions={qs} onClose={() => setSummary(false)} />}
    </Surface>
  );
}

function VisitSummary({ a, questions, onClose }: { a: Rec; questions: Rec[]; onClose: () => void }) {
  const { boot } = useBoot();
  const logs = byKind(boot.records, "feed", "sleep", "diaper", "symptom", "administration").slice(0, 20);
  const [sel, setSel] = useState<Set<string>>(new Set(questions.map((q) => q.id)));
  const [preview, setPreview] = useState<string | null>(null);
  const t = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const go = async (dl: boolean) => { try { const r = await runExport({ ids: [a.id, ...sel], format: "text", purpose: "visit summary" }, dl); if (!dl) setPreview(r.content); } catch (e) { toast({ title: "Couldn't prepare summary", description: errMessage(e), variant: "destructive" }); } };
  return (
    <div className="rise mt-4 rounded-xl border border-input bg-card p-3">
      <p className="font-semibold">Choose what to include (up to 20 recent logs)</p>
      <ul className="mt-2 max-h-64 overflow-y-auto">{[...questions, ...logs].map((r) => (
        <li key={r.id}><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={sel.has(r.id)} onChange={() => t(r.id)} />{r.title} <span className="text-muted-foreground">{describe(r)} · {fmtDate(when(r))}{r.scope === "private" && " · private"}</span></label></li>
      ))}</ul>
      <div className="mt-2 flex flex-wrap gap-2"><Btn size="sm" variant="soft" onClick={() => go(false)}>Preview</Btn><Btn size="sm" onClick={() => go(true)}><Download className="h-4 w-4" />Download</Btn><Btn size="sm" variant="ghost" onClick={onClose}>Close</Btn></div>
      <p className="mt-2 text-xs text-muted-foreground">You review this before sharing. Downloading it doesn't mean a clinician has received or reviewed it.</p>
      {preview && <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-sand p-3 text-sm">{preview}</pre>}
    </div>
  );
}

/* ---------- questions ---------- */
function Questions() {
  const { boot } = useBoot();
  const { create, update, remove } = useRecords();
  const [text, setText] = useState("");
  const [appt, setAppt] = useState("");
  const appts = byKind(boot.records, "appointment").filter((a) => a.status !== "cancelled" && +new Date(when(a)) > Date.now() - 36e5);
  const qs = byKind(boot.records, "question");
  const add = (t: string) => create.mutate({ kind: "question", title: t, scope: "private", data: { appointmentId: appt || undefined, answered: false } }, { onSuccess: () => toast({ title: "Question saved" }) });
  return (
    <>
      <SectionTitle title="Questions" sub="Save them whenever they come to you. Private unless linked to a shared appointment." />
      <Surface tone="sage">
        <div className="flex flex-wrap gap-2">{QUESTION_CHIPS.map((c) => <Chip key={c} className="min-h-9 text-sm" onClick={() => add(c)}><Plus className="h-3.5 w-3.5" />{c}</Chip>)}</div>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { add(text.trim()); setText(""); } }}>
          <input className={cn(inputCls, "flex-1")} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question" aria-label="Type a question" data-testid="input-question" />
          <Btn type="submit">Save</Btn>
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-2"><VoiceButton onText={(t) => setText(t)} />
          <select className={cn(inputCls, "w-auto")} value={appt} onChange={(e) => setAppt(e.target.value)} aria-label="Link to appointment"><option value="">Not linked yet</option>{appts.map((a) => <option key={a.id} value={a.id}>{a.title} · {fmtDate(when(a))}</option>)}</select>
        </div>
      </Surface>
      <ul className="mt-4 space-y-2">{qs.map((q) => {
        const ap = byKind(boot.records, "appointment").find((a) => a.id === ds(q, "appointmentId"));
        return (
          <li key={q.id} className="rounded-2xl border border-card-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div><p className={cn("font-semibold", !!dget(q, "answered") && "line-through text-muted-foreground")}>{q.title}</p><p className="text-xs text-muted-foreground">{ap ? `For ${ap.title} · ${fmtDate(when(ap))}` : "Not linked to an appointment"}</p><Meta r={q} /></div>
              <div className="flex">
                <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: q.id, data: { data: { ...(q.data as object), answered: !dget(q, "answered") } } })}>{dget(q, "answered") ? "Reopen" : "Answered"}</Btn>
                <button type="button" aria-label="Delete question" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted" onClick={() => remove.mutate(q.id)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {!ap && appts.length > 0 && <select className={cn(inputCls, "mt-2 w-auto")} value="" onChange={(e) => update.mutate({ id: q.id, data: { data: { ...(q.data as object), appointmentId: e.target.value } } })} aria-label="Link to appointment"><option value="">Link to an appointment…</option>{appts.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>}
          </li>
        );
      })}</ul>
      {!qs.length && <div className="mt-4"><Empty title="No questions yet">Tap a suggestion above, or type your own.</Empty></div>}
    </>
  );
}

/* ---------- documents ---------- */
function Documents() {
  const { boot, signedIn } = useBoot();
  const { remove } = useRecords();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"private" | "baby">("baby");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState<Rec | null>(null);
  const [del, setDel] = useState<Rec | null>(null);
  const [edit, setEdit] = useState<Rec | null>(null);
  const docs = byKind(boot.records, "document");
  const demo = boot.profile.isDemo;
  const pick = (f: File | undefined) => { setErr(null); if (!f) return; const bad = validateFile(f); if (bad) { setErr(bad); setFile(null); return; } setFile(f); if (!label) setLabel(f.name.replace(/\.[^.]+$/, "")); };
  const upload = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try { await uploadDocument(file, scope, label); qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }); toast({ title: "Uploaded" }); setFile(null); setLabel(""); } catch (e) { setErr(errMessage(e)); }
    setBusy(false);
  };
  const doReplace = async (f: File | undefined) => {
    if (!f || !replacing) return;
    const bad = validateFile(f); if (bad) { toast({ title: bad, variant: "destructive" }); return; }
    setBusy(true);
    try { await uploadDocument(f, (replacing.scope === "private" ? "private" : "baby"), replacing.title, replacing.notes || undefined); await remove.mutateAsync(replacing.id); qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }); toast({ title: "Replaced", description: "The old file was deleted." }); } catch (e) { toast({ title: "Couldn't replace", description: errMessage(e), variant: "destructive" }); }
    setBusy(false); setReplacing(null);
  };
  return (
    <>
      <SectionTitle title="Documents" sub="Discharge notes, vaccination records, letters. PDF, JPEG, PNG or text, up to 10 MB. Stored privately." />
      <Surface tone="sand">
        {demo && <p className="mb-3 rounded-xl bg-sky px-3 py-2 text-sm text-accent-foreground">Uploads are turned off in the demo family. {signedIn ? "Switch to your own family in Settings to upload." : "Sign in to your own family to upload real files."}</p>}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,application/pdf,image/jpeg,image/png,text/plain" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose a file" data-testid="input-file" />
        <Btn variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : "Choose a file"}</Btn>
        {file && <div className="rise mt-3 space-y-3">
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label="Label" />
          <div><p className="mb-1 text-sm font-semibold">Who can see it</p><div className="flex gap-2"><Chip active={scope === "private"} onClick={() => setScope("private")}>Only me (parent document)</Chip><Chip active={scope === "baby"} onClick={() => setScope("baby")}>Baby document — by grant</Chip></div></div>
          <Btn onClick={upload} disabled={busy} data-testid="button-upload">{busy ? "Uploading…" : "Upload"}</Btn>
        </div>}
        {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      </Surface>
      <input ref={replaceRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" className="sr-only" onChange={(e) => doReplace(e.target.files?.[0])} aria-label="Choose replacement file" />
      <ul className="mt-4 space-y-2">{docs.map((d) => (
        <li key={d.id}><Surface className="p-4">
          <div className="flex flex-wrap items-center gap-2"><FileText className="h-5 w-5" aria-hidden /><p className="font-semibold">{d.title}</p><ScopeTag scope={d.scope} />{d.status !== "ready" && <Tag tone="warn">{d.status || "pending"}</Tag>}</div>
          <p className="mt-1 text-xs text-muted-foreground">{ds(d, "contentType")} · {ds(d, "size") ? `${(Number(ds(d, "size")) / 1024).toFixed(0)} KB` : "size unknown"}</p>
          {d.notes && <p className="text-sm">{d.notes}</p>}
          <Meta r={d} />
          <div className="mt-2 flex flex-wrap gap-2">
            {d.status === "ready" && <a href={documentUrl(d.id)} target="_blank" rel="noreferrer" className="press inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" />Open / download</a>}
            <Btn size="sm" variant="soft" onClick={() => setEdit(d)}>Rename</Btn>
            <Btn size="sm" variant="soft" disabled={busy || demo} onClick={() => { setReplacing(d); replaceRef.current?.click(); }}><RefreshCw className="h-4 w-4" />Replace</Btn>
            <Btn size="sm" variant="ghost" className="text-destructive" onClick={() => setDel(d)}><Trash2 className="h-4 w-4" />Delete</Btn>
          </div>
        </Surface></li>
      ))}</ul>
      {!docs.length && <div className="mt-4"><Empty title="No documents yet" /></div>}
      <div className="mt-8"><ChecklistCard source="vaccinations" title="Vaccination record (entered by you)" defaults={[]} scope="baby" tone="sky" /></div>
      <p className="mt-2 text-xs text-muted-foreground">Vaccination entries are what you type in — not an official record. Local schedules aren't shown because they haven't been reviewed for your country.</p>
      <Confirm open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Delete this document?" confirm="Delete" body="The file and its record are removed for everyone with access." onConfirm={() => del && remove.mutate(del.id)} />
      {edit && <RecordDialog open onOpenChange={(o) => !o && setEdit(null)} kind="document" heading="Document" record={edit} deletable={false} fields={[{ key: "title", label: "Label", required: true }, { key: "notes", label: "Notes", type: "textarea" }]} />}
    </>
  );
}

function Contacts() {
  return (
    <KindSection title="Contacts" sub="Clinicians, childcare and people to call. Numbers are shown exactly as you enter them — we don't verify them." kind="contact" scope="household"
      empty="No contacts yet" emptyBody="Add your midwife, GP, health visitor, nursery or a trusted neighbour. They appear in Get help."
      fields={[{ key: "title", label: "Name", required: true }, { key: "data.role", label: "Role", placeholder: "Midwife, GP, nursery" }, { key: "data.phone", label: "Phone" }, { key: "data.hours", label: "When to call", placeholder: "Weekdays 9–5" }, { key: "data.authorised", label: "Authorised to collect baby?", type: "toggle" }, { key: "notes", label: "Notes", type: "textarea" }]}
      line={(r) => <>{ds(r, "role")}{ds(r, "phone") && <> · <a className="underline" href={`tel:${ds(r, "phone")}`}>{ds(r, "phone")}</a></>}{ds(r, "hours") && ` · ${ds(r, "hours")}`}{!!dget(r, "authorised") && <Tag tone="sage" className="ml-2">Authorised for pick-up</Tag>}</>} />
  );
}

function Admin() {
  return (
    <>
      <Surface tone="peach" className="mb-6 text-[15px]">
        <p className="font-semibold">{PROTOTYPE_LOCALE}</p>
        <p className="mt-1">These items are unverified samples. Deadlines and eligibility depend on where you live — check the official government source before relying on anything here. Add your own deadlines below.</p>
      </Surface>
      <ChecklistCard source="admin" title={CHECKLISTS.admin.title} defaults={CHECKLISTS.admin.items} meta={{ jurisdiction: CHECKLISTS.admin.jurisdiction, reviewDate: CHECKLISTS.admin.reviewDate }} />
      <div className="mt-8">
        <KindSection title="Your deadlines" kind="task" scope="household" filter={(r) => !!dget(r, "admin")} extraData={{ admin: true }}
          empty="No deadlines added" fields={[{ key: "title", label: "What", required: true }, { key: "data.dueDate", label: "Deadline", type: "date" }, { key: "data.source", label: "Official source (link or name)" }, { key: "notes", label: "Notes", type: "textarea" }]}
          line={(r) => <>{ds(r, "dueDate") && `Due ${fmtDate(ds(r, "dueDate"))}`}{ds(r, "source") ? ` · Source: ${ds(r, "source")}` : <Tag tone="warn" className="ml-2">No source added</Tag>}</>} />
      </div>
    </>
  );
}
