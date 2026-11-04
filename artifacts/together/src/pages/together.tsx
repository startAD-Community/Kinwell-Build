import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Copy, Download, Eye, Link2, ShieldCheck, UserPlus, ArrowLeftRight } from "lucide-react";
import { createInvitation, type InvitationInputRole } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBoot } from "@/lib/boot";
import { useRecords, useMemberAdmin, useAccountActions, byKind, ds, dget, when, runExport, errMessage, type Rec } from "@/lib/api";
import { ago, fmtClock, fmtDate, fmtTime } from "@/lib/format";
import { GRANTS, CHECKLISTS } from "@/lib/content";
import { Btn, Chip, Surface, Tag, SectionTitle, Empty, KindSection, ChecklistCard, Confirm, Meta, inputCls, useStale, FieldInput } from "@/components/kit";
import { cn } from "@/lib/utils";
import { AnimalAvatar, permissionLabel } from "@/components/avatar";
import { FamilyRolePicker } from "@/components/profile-editor";

const TABS = [["circle", "Circle"], ["tasks", "Tasks"], ["help", "Help"], ["shifts", "Care time"], ["handover", "Handover"], ["childcare", "Childcare"], ["export", "Export"]] as const;

export default function TogetherPage() {
  const search = new URLSearchParams(useSearch());
  const [, nav] = useLocation();
  const tab = (search.get("tab") || "circle") as (typeof TABS)[number][0];
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="pt-4 font-display text-[34px] leading-tight">Together</h1>
      <p className="text-sm text-muted-foreground">Your support circle, shared work, and handovers.</p>
      <div role="tablist" className="sticky top-[68px] z-20 -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => nav(`/together?tab=${k}`)} data-testid={`tab-together-${k}`}
            className={cn("press min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold", tab === k ? "bg-primary text-primary-foreground" : "bg-card border border-input")}>{l}</button>
        ))}
      </div>
      <div className="mt-6 rise" key={tab}>
        {tab === "circle" && <Circle />}
        {tab === "tasks" && <Tasks />}
        {tab === "help" && <Help prepare={search.get("prepare")} />}
        {tab === "shifts" && <Shifts />}
        {tab === "handover" && <Handover />}
        {tab === "childcare" && <Childcare />}
        {tab === "export" && <ExportPanel />}
      </div>
    </div>
  );
}

/* ---------------- circle ---------------- */
function Circle() {
  const { boot, me, isAdmin } = useBoot();
  const { patch, transfer } = useMemberAdmin();
  const { acceptTransfer } = useAccountActions();
  const { update } = useRecords();
  const [invite, setInvite] = useState(false);
  const [revoke, setRevoke] = useState<string | null>(null);
  const [xfer, setXfer] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  const transfers = byKind(boot.records, "transfer").filter((t) => t.status === "pending");
  const name = (id: string) => boot.members.find((m) => m.id === id)?.name || "a member";
  return (
    <>
      <SectionTitle title="Your support circle" sub="Family roles are how people are known; access is what you grant. One never sets the other. Administration doesn't establish legal guardianship."
        action={isAdmin && <Btn size="sm" onClick={() => setInvite(true)} data-testid="button-invite"><UserPlus className="h-4 w-4" />Invite</Btn>} />

      {transfers.map((t) => {
        const forMe = ds(t, "targetMemberId") === boot.profile.memberId;
        return (
          <Surface key={t.id} tone="peach" className="mb-4" data-testid={`transfer-${t.id}`}>
            <p className="font-display text-xl">{forMe ? "You've been asked to take over baby-profile administration" : `Waiting for ${name(ds(t, "targetMemberId"))} to accept administration`}</p>
            <p className="mt-1 text-[15px]">Requested by {t.authorName} {ago(t.createdAt)}. Baby care history moves with the role. Nobody's private health records (cycle, symptoms, check-ins, private documents) are transferred or exposed.</p>
            {forMe ? (
              <>
                <label className="mt-3 flex min-h-11 items-center gap-3 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I understand and agree to become the administrator.</label>
                <div className="mt-2 flex gap-2">
                  <Btn disabled={!consent || acceptTransfer.isPending} onClick={() => acceptTransfer.mutate(t.id, { onSuccess: () => toast({ title: "You're now the administrator" }) })} data-testid="button-accept-transfer">Accept administration</Btn>
                  <Btn variant="ghost" onClick={() => update.mutate({ id: t.id, data: { status: "declined" } })}>Decline</Btn>
                </div>
              </>
            ) : (
              <Btn className="mt-3" variant="soft" onClick={() => update.mutate({ id: t.id, data: { status: "cancelled" } })}>Withdraw request</Btn>
            )}
          </Surface>
        );
      })}

      <ul className="space-y-3">
        {boot.members.map((m) => {
          const self = m.id === boot.profile.memberId;
          const revoked = m.status === "revoked";
          return (
            <li key={m.id}>
              <Surface className={cn("p-4", revoked && "opacity-70")} data-testid={`member-${m.id}`}>
                <div className="flex items-start gap-3">
                  <AnimalAvatar member={m} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold" data-testid={`text-member-name-${m.id}`}>{m.name}{self && " (you)"}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-family-role-${m.id}`}>{m.familyRole || (self ? "Add your family role in Settings" : "Family role not set")}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Tag tone="sage" className="capitalize"><span className="sr-only">Access: </span>{permissionLabel(m.role)}</Tag>
                      <Tag tone={revoked ? "warn" : "muted"}>{m.status}</Tag>
                      {m.expiresAt ? <Tag tone="peach">Temporary · until {fmtDate(m.expiresAt)}</Tag> : <Tag>Ongoing</Tag>}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Can see</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {isAdmin && !self && !revoked ? GRANTS.map((g) => {
                        const on = m.grants.includes(g.key);
                        return <Chip key={g.key} className="min-h-9 text-sm" active={on} onClick={() => patch.mutate({ id: m.id, body: { grants: on ? m.grants.filter((x) => x !== g.key) : [...m.grants, g.key] } })}>{g.label}</Chip>;
                      }) : (m.grants.length ? m.grants.map((g) => <Tag key={g}>{GRANTS.find((x) => x.key === g)?.label || g}</Tag>) : <span className="text-sm text-muted-foreground">{m.role.includes("admin") ? "Administrator access" : "Nothing yet"}</span>)}
                    </div>
                    {isAdmin && !self && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!revoked && <>
                          <input type="date" className={cn(inputCls, "w-auto")} aria-label={`Access end date for ${m.name}`} value={expiry[m.id] ?? (m.expiresAt || "").slice(0, 10)} onChange={(e) => setExpiry({ ...expiry, [m.id]: e.target.value })} />
                          <Btn size="sm" variant="soft" onClick={() => patch.mutate({ id: m.id, body: { expiresAt: expiry[m.id] ? new Date(expiry[m.id] + "T23:59:00").toISOString() : null } }, { onSuccess: () => toast({ title: expiry[m.id] ? "Access is now temporary" : "Access is ongoing" }) })}>Save end date</Btn>
                          <Btn size="sm" variant="ghost" className="text-destructive" onClick={() => setRevoke(m.id)} data-testid={`button-revoke-${m.id}`}>Revoke access</Btn>
                          {!m.role.includes("helper") && <Btn size="sm" variant="ghost" onClick={() => { setXfer(m.id); }}><ArrowLeftRight className="h-4 w-4" />Transfer administration</Btn>}
                        </>}
                        {revoked && <Btn size="sm" variant="soft" onClick={() => patch.mutate({ id: m.id, body: { status: "active" } })}>Restore access</Btn>}
                      </div>
                    )}
                  </div>
                </div>
              </Surface>
            </li>
          );
        })}
      </ul>
      <Surface tone="sand" className="mt-6">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5" />If an administrator becomes unavailable</p>
        <p className="mt-1 text-sm">Transfers only happen when both people confirm. Access is never moved automatically because of inactivity or a check-in. If the administrator can't be reached, recovery is a documented, controlled support process requiring identity verification — not available inside this prototype.</p>
      </Surface>
      <InviteDialog open={invite} onOpenChange={setInvite} />
      <Confirm open={!!revoke} onOpenChange={(o) => !o && setRevoke(null)} danger title={`Revoke ${name(revoke || "")}'s access?`} confirm="Revoke access"
        body="They'll lose access to this family straight away, including any shared links. Records they created stay in the family's history." onConfirm={() => revoke && patch.mutate({ id: revoke, body: { status: "revoked" } })} />
      <Confirm open={!!xfer} onOpenChange={(o) => !o && setXfer(null)} title={`Ask ${name(xfer || "")} to take over administration?`} confirm="Send request"
        body={<><p>They'll need to sign in and accept. Until then, nothing changes.</p><p className="mt-2">Baby-care history stays with the baby profile. Your private records stay private. Administration is an app role, not legal guardianship.</p></>}
        onConfirm={() => xfer && transfer.mutate(xfer, { onSuccess: () => toast({ title: "Transfer requested", description: "Waiting for them to accept." }) })} />
      {me === undefined && <p className="sr-only">Membership loading</p>}
    </>
  );
}

function InviteDialog({ open, onOpenChange, requestId, presetName }: { open: boolean; onOpenChange: (o: boolean) => void; requestId?: string; presetName?: string }) {
  const [name, setName] = useState(presetName || "");
  const [familyRole, setFamilyRole] = useState("");
  const [role, setRole] = useState<InvitationInputRole>(requestId ? "helper" : "caregiver");
  const [grants, setGrants] = useState<string[]>(requestId ? ["tasks"] : ["baby-logs", "routines", "shifts"]);
  const [temp, setTemp] = useState(false);
  const [until, setUntil] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setUrl(null); setName(presetName || ""); setFamilyRole(""); } }, [open, presetName]);
  const go = async () => {
    setBusy(true);
    try {
      const inv = await createInvitation({ name: name || "Helper", familyRole: familyRole.trim().slice(0, 40) || undefined, role, grants, expiresAt: temp && until ? new Date(until + "T23:59:00").toISOString() : undefined, requestId });
      const full = inv.url ? (inv.url.startsWith("http") ? inv.url : `${window.location.origin}${inv.url}`) : "";
      setUrl(full);
    } catch (e) { toast({ title: "Couldn't create the link", description: errMessage(e), variant: "destructive" }); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[20px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{requestId ? "Share a limited link" : "Invite someone"}</DialogTitle>
          <DialogDescription>{requestId ? "The link shows only this request and the logistics needed — no health information." : "They'll land straight in your family with only what you grant."}</DialogDescription>
        </DialogHeader>
        {url ? (
          <div className="space-y-3">
            <p className="text-[15px]">Here's the link. <strong>Nothing has been sent</strong> — share it yourself, by message or in person.</p>
            <div className="flex gap-2"><input readOnly className={inputCls} value={url} aria-label="Invitation link" onFocus={(e) => e.target.select()} /><Btn onClick={() => { navigator.clipboard?.writeText(url); toast({ title: "Link copied" }); }}><Copy className="h-4 w-4" />Copy</Btn></div>
            <Btn variant="ghost" onClick={() => onOpenChange(false)}>Done</Btn>
          </div>
        ) : (
          <div className="space-y-4">
            <FieldInput f={{ key: "name", label: "Their name" }} value={name} onChange={(v) => setName(String(v))} />
            {!requestId && <FamilyRolePicker value={familyRole} onChange={setFamilyRole} optional idPrefix="inv-fr" />}
            {!requestId && <FieldInput f={{ key: "role", label: "Access level", hint: "This sets what they can do — separate from their family role. They can change their own role and avatar later.", type: "select", options: [{ value: "caregiver", label: "Caregiver" }, { value: "helper", label: "Limited helper" }, { value: "coadministrator", label: "Co-administrator" }] }} value={role} onChange={(v) => setRole(v as InvitationInputRole)} />}
            {!requestId && <div><p className="mb-1.5 text-sm font-semibold">What they can see</p><div className="flex flex-wrap gap-2">{GRANTS.map((g) => <Chip key={g.key} className="min-h-9 text-sm" active={grants.includes(g.key)} onClick={() => setGrants(grants.includes(g.key) ? grants.filter((x) => x !== g.key) : [...grants, g.key])}>{g.label}</Chip>)}</div><p className="mt-1 text-xs text-muted-foreground">Your private records are never included.</p></div>}
            <div><p className="mb-1.5 text-sm font-semibold">How long</p><div className="flex gap-2"><Chip active={!temp} onClick={() => setTemp(false)}>Ongoing</Chip><Chip active={temp} onClick={() => setTemp(true)}>Until a date</Chip></div>{temp && <input type="date" className={cn(inputCls, "mt-2")} value={until} onChange={(e) => setUntil(e.target.value)} aria-label="Access end date" />}</div>
            <Btn onClick={go} disabled={busy || (temp && !until)} data-testid="button-create-invite"><Link2 className="h-4 w-4" />{busy ? "Creating…" : "Create link"}</Btn>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- tasks ---------------- */
function Tasks() {
  const { boot, me } = useBoot();
  const { update } = useRecords();
  const myName = me?.name || boot.profile.name || "Me";
  const today = new Date().toISOString().slice(0, 10);
  return (
    <KindSection title="Tasks" sub="Who's doing what. No scores, no shaming." kind="task" scope="household" filter={(r) => !dget(r, "recovery") && r.scope !== "private"}
      empty="No shared tasks" emptyBody="Add something someone could take on — supplies, appointments, a meal rota."
      defaults={{ status: "open" }}
      fields={[{ key: "title", label: "Task", required: true }, { key: "data.assignee", label: "Who's doing it", type: "member" }, { key: "data.dueDate", label: "By when", type: "date" }, { key: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "accepted", label: "Accepted" }, { value: "done", label: "Done" }] }, { key: "notes", label: "Notes", type: "textarea" }]}
      line={(r) => <>{ds(r, "assignee") ? `${ds(r, "assignee")} ${r.status === "accepted" ? "has accepted this" : "is assigned"}` : "Unassigned"}{ds(r, "dueDate") && ` · by ${fmtDate(ds(r, "dueDate"))}`}{ds(r, "dueDate") && ds(r, "dueDate") < today && r.status !== "done" && <Tag tone="peach" className="ml-2">Plans changed? Adjust the date</Tag>}</>}
      actions={(r) => r.status === "done" ? <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, data: { status: "open" } })}>Reopen</Btn> : <>
        {r.status !== "accepted" && <Btn size="sm" variant="soft" onClick={() => update.mutate({ id: r.id, data: { status: "accepted", data: { ...(r.data as object), assignee: ds(r, "assignee") || myName } } })} data-testid={`button-accept-task-${r.id}`}>I'll take it</Btn>}
        <Btn size="sm" onClick={() => update.mutate({ id: r.id, data: { status: "done" } })} data-testid={`button-complete-task-${r.id}`}>Mark done</Btn>
      </>} />
  );
}

/* ---------------- help ---------------- */
const HELP_CATS = ["A meal", "Groceries", "Transport", "Household jobs", "Company", "Baby care", "Some rest"];
const PREP_MAP: Record<string, string> = { meal: "A meal", rest: "Some rest", company: "Company", "A meal": "A meal", "Some rest": "Some rest", "Help with baby": "Baby care", "Someone to talk to": "Company" };

function Help({ prepare }: { prepare: string | null }) {
  const { boot, me } = useBoot();
  const { create, update } = useRecords();
  const [, nav] = useLocation();
  const [step, setStep] = useState<"compose" | "preview" | null>(prepare ? "compose" : null);
  const [cat, setCat] = useState(PREP_MAP[prepare || ""] || "A meal");
  const [msg, setMsg] = useState("");
  const [when_, setWhen] = useState("");
  const [recips, setRecips] = useState<string[]>([]);
  const [link, setLink] = useState<Rec | null>(null);
  useEffect(() => { if (prepare) { setCat(PREP_MAP[prepare] || "A meal"); setStep("compose"); setMsg(""); } }, [prepare]);
  const others = boot.members.filter((m) => m.id !== boot.profile.memberId && m.status !== "revoked");
  const list = byKind(boot.records, "help");
  const share = async () => {
    const r = await create.mutateAsync({ kind: "help", title: `${cat}${when_ ? ` · ${fmtDate(when_)}` : ""}`, notes: msg, status: "open", scope: "household", data: { category: cat, dueDate: when_ || undefined, recipients: recips } });
    toast({ title: "Request shared in-app", description: recips.length ? `Visible to ${recips.join(", ")} in Together. No email or SMS was sent.` : "Visible in Together. No email or SMS was sent." });
    setStep(null); setMsg(""); setRecips([]); nav("/together?tab=help");
    setLink(r);
  };
  const statusTone = (s?: string) => (s === "completed" ? "sage" : s === "claimed" ? "sky" : s === "cancelled" ? "muted" : "peach") as "sage";
  return (
    <>
      <SectionTitle title="Help requests" sub="Ask for practical help. You confirm who sees it before it's shared." action={!step && <Btn size="sm" onClick={() => setStep("compose")} data-testid="button-new-help">Ask for help</Btn>} />
      {step === "compose" && (
        <Surface tone="sage" className="mb-6 rise">
          <p className="text-sm font-semibold">What would help?</p>
          <div className="mt-2 flex flex-wrap gap-2">{HELP_CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
          <label className="mt-4 block text-sm font-semibold" htmlFor="help-msg">Message (optional)</label>
          <textarea id="help-msg" rows={3} className={cn(inputCls, "mt-1")} placeholder="Anything vegetarian, any evening this week would be lovely" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <label className="mt-4 block text-sm font-semibold" htmlFor="help-when">When (optional)</label>
          <input id="help-when" type="date" className={cn(inputCls, "mt-1")} value={when_} onChange={(e) => setWhen(e.target.value)} />
          <p className="mt-4 text-sm font-semibold">Who should see it?</p>
          <div className="mt-2 flex flex-wrap gap-2">{others.map((m) => <Chip key={m.id} aria-label={`${m.name}${m.familyRole ? `, ${m.familyRole}` : ""}`} active={recips.includes(m.name)} onClick={() => setRecips(recips.includes(m.name) ? recips.filter((x) => x !== m.name) : [...recips, m.name])}><AnimalAvatar member={m} size="xs" decorative />{m.name}{m.familyRole && <span className="text-xs opacity-75">{m.familyRole}</span>}</Chip>)}{!others.length && <span className="text-sm text-muted-foreground">No one in your circle yet — you can share a limited link after.</span>}</div>
          <div className="mt-4 flex gap-2"><Btn onClick={() => setStep("preview")} data-testid="button-preview-help"><Eye className="h-4 w-4" />Preview</Btn><Btn variant="ghost" onClick={() => setStep(null)}>Cancel</Btn></div>
        </Surface>
      )}
      {step === "preview" && (
        <Surface className="mb-6 rise border-2 border-primary">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This is exactly what they'll see</p>
          <p className="mt-2 font-display text-2xl">{cat}{when_ && ` · ${fmtDate(when_)}`}</p>
          {msg && <p className="mt-1 text-[15px]">{msg}</p>}
          <p className="mt-2 text-sm">From {me?.name || boot.profile.name || "you"} · To: {recips.length ? recips.join(", ") : "your household circle"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Your check-in and any health details are not included.</p>
          <div className="mt-4 flex gap-2"><Btn onClick={share} disabled={create.isPending} data-testid="button-share-help">Confirm and share</Btn><Btn variant="ghost" onClick={() => setStep("compose")}>Edit</Btn></div>
        </Surface>
      )}
      {list.length === 0 ? <Empty title="No requests yet">When someone claims a request, you'll see it here — claimed isn't the same as done.</Empty> : (
        <ul className="space-y-3">{list.map((h) => (
          <li key={h.id}><Surface className="p-4" data-testid={`help-${h.id}`}>
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{h.title}</p><Tag tone={statusTone(h.status)}>{h.status || "open"}</Tag></div>
            {h.notes && <p className="mt-1 text-sm">{h.notes}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{(dget<string[]>(h, "recipients") || []).length ? `Shared with ${(dget<string[]>(h, "recipients") || []).join(", ")}` : "Shared with household"}{ds(h, "claimedBy") && ` · claimed by ${ds(h, "claimedBy")}`}</p>
            <Meta r={h} />
            <div className="mt-3 flex flex-wrap gap-2">
              {h.status === "open" && <Btn size="sm" variant="soft" onClick={() => update.mutate({ id: h.id, data: { status: "claimed", data: { ...(h.data as object), claimedBy: me?.name || boot.profile.name } } })}>I'll do it</Btn>}
              {h.status === "claimed" && <Btn size="sm" onClick={() => update.mutate({ id: h.id, data: { status: "completed" } })}>Mark completed</Btn>}
              {(h.status === "open" || !h.status) && <Btn size="sm" variant="outline" onClick={() => setLink(h)}><Link2 className="h-4 w-4" />Limited link</Btn>}
              {h.status !== "cancelled" && h.status !== "completed" && <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: h.id, data: { status: "cancelled" } })}>Cancel request</Btn>}
              {(h.status === "cancelled" || h.status === "completed") && <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: h.id, data: { status: "open", data: { ...(h.data as object), claimedBy: null } } })}>Reopen</Btn>}
            </div>
          </Surface></li>
        ))}</ul>
      )}
      <InviteDialog open={!!link} onOpenChange={(o) => !o && setLink(null)} requestId={link?.id} presetName={link ? `Helper: ${link.title}` : ""} />
    </>
  );
}

/* ---------------- shifts ---------------- */
function Shifts() {
  const { boot, me } = useBoot();
  const { update } = useRecords();
  const [change, setChange] = useState<Rec | null>(null);
  const [changeText, setChangeText] = useState("");
  const myName = me?.name || boot.profile.name || "Me";
  const tz = boot.profile.timezone;
  return (
    <>
      <Surface tone="sand" className="mb-6 text-sm">Care time shows who has <strong>accepted</strong> responsibility. Together doesn't verify who is physically caring. If someone is feeding, agree with them before scheduling them away — the app never does it automatically.</Surface>
      <KindSection title="Care time & protected rest" kind="shift" scope="household" testid="section-shifts"
        empty="No care time planned yet" emptyBody="Offer to cover a night, or protect a rest window for someone recovering."
        defaults={{ status: "offered", "data.type": "care" }}
        fields={[{ key: "title", label: "Name", required: true, placeholder: "Night care window" }, { key: "data.type", label: "Type", type: "select", options: [{ value: "care", label: "Care window" }, { value: "rest", label: "Protected rest" }] }, { key: "data.startAt", label: "Starts", type: "datetime" }, { key: "data.endAt", label: "Ends", type: "datetime" }, { key: "data.assignee", label: "Responsible person", type: "member" }, { key: "status", label: "Status", type: "select", options: [{ value: "offered", label: "Offered" }, { value: "accepted", label: "Accepted" }] }, { key: "notes", label: "Notes", type: "textarea", hint: "e.g. bottles in the fridge, feeding parent sleeping in the back room" }]}
        line={(r) => <><span className="flex flex-wrap gap-1.5"><Tag tone={ds(r, "type") === "rest" ? "peach" : "sky"}>{ds(r, "type") === "rest" ? "Protected rest" : "Care window"}</Tag><Tag tone={r.status === "accepted" ? "sage" : r.status === "change requested" ? "warn" : "muted"}>{r.status === "accepted" ? "Accepted" : r.status === "change requested" ? "Change requested" : "Offered — not yet accepted"}</Tag></span>
          <span className="mt-1 block">{fmtTime(ds(r, "startAt"), tz)} – {fmtClock(ds(r, "endAt"), tz)} · {ds(r, "assignee") || "Nobody yet"}</span>
          {ds(r, "changeRequest") && <span className="mt-1 block text-sm">Change asked: "{ds(r, "changeRequest")}"</span>}</>}
        actions={(r) => <>
          {r.status !== "accepted" && <Btn size="sm" onClick={() => update.mutate({ id: r.id, data: { status: "accepted", data: { ...(r.data as object), assignee: ds(r, "assignee") || myName, changeRequest: null } } })} data-testid={`button-accept-shift-${r.id}`}>Accept{ds(r, "assignee") ? ` for ${ds(r, "assignee")}` : " — I'll take it"}</Btn>}
          <Btn size="sm" variant="soft" onClick={() => { setChange(r); setChangeText(""); }}>Request a change</Btn>
          {r.status === "accepted" && <Btn size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, data: { status: "offered", data: { ...(r.data as object), assignee: null } } })}>Hand back</Btn>}
        </>} />
      <Confirm open={!!change} onOpenChange={(o) => !o && setChange(null)} title="Request a change" confirm="Send request"
        body={<><p>Everyone who can see care time will see this request. The care window stays as it is until someone accepts the change.</p><textarea rows={3} className={cn(inputCls, "mt-2")} value={changeText} onChange={(e) => setChangeText(e.target.value)} placeholder="Could we swap to Thursday night?" aria-label="Change request" /></>}
        onConfirm={() => change && update.mutate({ id: change.id, data: { status: "change requested", data: { ...(change.data as object), changeRequest: changeText || "Change requested" } } })} />
    </>
  );
}

/* ---------------- handover ---------------- */
function Handover() {
  const { boot } = useBoot();
  const stale = useStale();
  const tz = boot.profile.timezone;
  const R = boot.records;
  const [sel, setSel] = useState<string[]>(["feed", "sleep", "meds", "works", "upcoming", "contacts"]);
  const [busy, setBusy] = useState(false);
  const feed = byKind(R, "feed")[0], sleep = byKind(R, "sleep")[0];
  const meds = byKind(R, "medication"), admins = byKind(R, "administration").slice(0, 3);
  const works = byKind(R, "preference");
  const upcoming = [...byKind(R, "shift").filter((s) => +new Date(ds(s, "endAt") || when(s)) > Date.now()), ...byKind(R, "task").filter((t) => t.status !== "done" && t.scope !== "private")].slice(0, 6);
  const contacts = byKind(R, "contact");
  const plan = byKind(R, "sleepPlan").find((p) => p.status !== "ended");
  const ids = useMemo(() => {
    const out: Rec[] = [];
    if (sel.includes("feed") && feed) out.push(feed);
    if (sel.includes("sleep") && sleep) out.push(sleep);
    if (sel.includes("meds")) out.push(...meds, ...admins);
    if (sel.includes("works")) out.push(...works, ...(plan ? [plan] : []));
    if (sel.includes("upcoming")) out.push(...upcoming);
    if (sel.includes("contacts")) out.push(...contacts);
    return out.map((r) => r.id);
  }, [sel, R]); // eslint-disable-line react-hooks/exhaustive-deps
  const Block = ({ k, title, children }: { k: string; title: string; children: React.ReactNode }) => (
    <section className={cn("rounded-[20px] border border-card-border bg-card p-4", !sel.includes(k) && "opacity-50")}>
      <div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg">{title}</h3>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={sel.includes(k)} onChange={() => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k])} />Include</label></div>
      <div className="mt-1 text-[15px]">{children}</div>
    </section>
  );
  const missing = (s: string) => <p className="text-muted-foreground">{s}</p>;
  return (
    <>
      <h2 className="font-display text-3xl">Taking over care</h2>
      <p className="mt-1 text-sm text-muted-foreground">{stale.label}. {stale.stale && <Tag tone="warn">May be out of date</Tag>} Shows what's been recorded — not everything that happened.</p>
      <div className="mt-4 space-y-3">
        <Block k="feed" title="Latest recorded feed">{feed ? <p>{fmtTime(when(feed), tz)} ({ago(when(feed))}) · {ds(feed, "method")} {ds(feed, "side")} {ds(feed, "amount") && `${ds(feed, "amount")} ${ds(feed, "unit")}`} — recorded by {feed.authorName}</p> : missing("No feed has been recorded")}</Block>
        <Block k="sleep" title="Latest recorded sleep">{sleep ? <p>{ds(sleep, "startAt") ? `${fmtClock(ds(sleep, "startAt"), tz)} – ${ds(sleep, "endAt") ? fmtClock(ds(sleep, "endAt"), tz) : "end not recorded"}` : fmtTime(when(sleep), tz)} — recorded by {sleep.authorName}</p> : missing("No sleep has been recorded")}</Block>
        <Block k="meds" title="Medication history">
          {meds.length ? meds.map((m) => <p key={m.id}><strong>{m.title}</strong>: {ds(m, "instructions") || "No instructions recorded"}</p>) : missing("No medication instructions recorded")}
          {admins.map((a) => <p key={a.id} className="text-sm">{a.title} · {fmtTime(when(a), tz)} by {a.authorName}</p>)}
          {meds.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Someone may have given a dose that isn't recorded yet. Check before giving.</p>}
        </Block>
        <Block k="works" title="What usually helps">{works.length ? <ul className="list-disc pl-5">{works.map((w) => <li key={w.id}>{w.title}{ds(w, "category") && ` (${ds(w, "category")})`}{ds(w, "source") === "clinician" && " — clinician instruction"}</li>)}</ul> : missing("Nothing added to 'What works' yet")}{plan && <p className="mt-1 text-sm">Sleep routine: {plan.title}{plan.status === "paused" && " (paused)"}</p>}</Block>
        <Block k="upcoming" title="Upcoming responsibilities">{upcoming.length ? <ul className="list-disc pl-5">{upcoming.map((u) => <li key={u.id}>{u.title}{u.kind === "shift" ? ` · ${fmtTime(ds(u, "startAt"), tz)} · ${ds(u, "assignee") || "unassigned"} (${u.status})` : ds(u, "assignee") ? ` · ${ds(u, "assignee")}` : ""}</li>)}</ul> : missing("Nothing upcoming")}</Block>
        <Block k="contacts" title="Important instructions and contacts">{contacts.length ? <ul className="pl-0">{contacts.map((c) => <li key={c.id}>{c.title} · {ds(c, "role")} {ds(c, "phone") && <a className="underline" href={`tel:${ds(c, "phone")}`}>{ds(c, "phone")}</a>}</li>)}</ul> : missing("No contacts saved")}</Block>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn disabled={!ids.length || busy} onClick={async () => { setBusy(true); try { await runExport({ ids, format: "text", purpose: "handover" }); toast({ title: "Handover downloaded", description: "A snapshot — it won't update." }); } catch (e) { toast({ title: "Export failed", description: errMessage(e), variant: "destructive" }); } setBusy(false); }} data-testid="button-download-handover"><Download className="h-4 w-4" />Download handover ({ids.length} items)</Btn>
      </div>
    </>
  );
}

/* ---------------- childcare ---------------- */
function Childcare() {
  const { boot } = useBoot();
  const R = boot.records;
  const [fields, setFields] = useState<string[]>(["routines", "contacts", "feeding", "upcoming", "packing"]);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const groups: Record<string, { label: string; recs: Rec[] }> = {
    routines: { label: "Routines & what works", recs: [...byKind(R, "preference"), ...byKind(R, "sleepPlan").filter((p) => p.status !== "ended")] },
    contacts: { label: "Authorised contacts", recs: byKind(R, "contact") },
    feeding: { label: "Feeding arrangements", recs: byKind(R, "preference").filter((p) => ds(p, "category") === "Feeding") },
    medication: { label: "Medication instructions", recs: byKind(R, "medication") },
    upcoming: { label: "Upcoming responsibilities", recs: [...byKind(R, "shift"), ...byKind(R, "appointment").filter((a) => a.scope !== "private")].filter((x) => +new Date(ds(x, "startAt") || when(x)) > Date.now()) },
    packing: { label: "Packing list", recs: R.filter((r) => r.kind === "checklist" && ["packing", "returnwork"].includes(ds(r, "source"))) },
  };
  const ids = Array.from(new Set(fields.flatMap((f) => groups[f]?.recs.map((r) => r.id) || [])));
  const go = async (download: boolean) => {
    setBusy(true);
    try { const res = await runExport({ ids, format: "text", purpose: "childcare" }, download); if (!download) setPreview(res.content); } catch (e) { toast({ title: "Couldn't prepare the pack", description: errMessage(e), variant: "destructive" }); }
    setBusy(false);
  };
  return (
    <>
      <SectionTitle title="Childcare pack" sub="Built from what you've already recorded. Choose what's included before exporting or granting access." />
      <Surface>
        <p className="text-sm font-semibold">Feeding approach: {boot.profile.feedingApproach || "not set"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(groups).map(([k, g]) => <Chip key={k} active={fields.includes(k)} onClick={() => setFields(fields.includes(k) ? fields.filter((x) => x !== k) : [...fields, k])}>{g.label} ({g.recs.length})</Chip>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="soft" onClick={() => go(false)} disabled={!ids.length || busy}><Eye className="h-4 w-4" />Preview</Btn>
          <Btn onClick={() => go(true)} disabled={!ids.length || busy} data-testid="button-download-childcare"><Download className="h-4 w-4" />Download</Btn>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">To give a nanny or nursery live access instead, invite them as a caregiver in Circle with only the grants they need.</p>
      </Surface>
      {preview && <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-[20px] bg-sand p-4 text-sm">{preview}</pre>}
      <div className="mt-6 grid gap-4">
        <ChecklistCard source="packing" title={CHECKLISTS.packing.title} defaults={CHECKLISTS.packing.items} tone="peach" />
        <ChecklistCard source="returnwork" title={CHECKLISTS.returnwork.title} defaults={CHECKLISTS.returnwork.items} />
      </div>
    </>
  );
}

/* ---------------- export ---------------- */
function ExportPanel() {
  const { boot } = useBoot();
  const kinds = Array.from(new Set(boot.records.filter((r) => !["dismissal", "notification"].includes(r.kind)).map((r) => r.kind))).sort();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<"json" | "text" | "ics">("text");
  const [purpose, setPurpose] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const go = async (download: boolean) => {
    setBusy(true);
    try { const r = await runExport({ ids: Array.from(sel), format, purpose: purpose || undefined }, download); setPreview(download ? null : r.content); } catch (e) { toast({ title: "Export failed", description: errMessage(e), variant: "destructive" }); }
    setBusy(false);
  };
  return (
    <>
      <SectionTitle title="Export records" sub="Choose exactly what's included. Exports are audited. Exporting doesn't send anything to anyone." />
      <Surface className="mb-4">
        <div className="flex flex-wrap gap-2">{(["text", "json", "ics"] as const).map((f) => <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{f === "ics" ? "Calendar (.ics)" : f.toUpperCase()}</Chip>)}</div>
        {format === "ics" && <p className="mt-2 text-xs text-muted-foreground">Calendar files include appointments and care time only. Titles are discreet; notes only if chosen on the appointment.</p>}
        <input className={cn(inputCls, "mt-3")} placeholder="Purpose (optional) — e.g. for our midwife" value={purpose} onChange={(e) => setPurpose(e.target.value)} aria-label="Purpose" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="soft" disabled={!sel.size || busy} onClick={() => go(false)}><Eye className="h-4 w-4" />Preview</Btn>
          <Btn disabled={!sel.size || busy} onClick={() => go(true)} data-testid="button-export"><Download className="h-4 w-4" />Download ({sel.size})</Btn>
        </div>
      </Surface>
      {preview && <pre className="mb-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-[20px] bg-sand p-4 text-sm">{preview}</pre>}
      {kinds.map((k) => {
        const recs = byKind(boot.records, k);
        const all = recs.every((r) => sel.has(r.id));
        return (
          <details key={k} className="mb-2 rounded-[20px] border border-card-border bg-card p-3">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-semibold capitalize">{k} <span className="text-sm font-normal text-muted-foreground">{recs.filter((r) => sel.has(r.id)).length}/{recs.length}</span></summary>
            <Btn size="sm" variant="ghost" onClick={() => { const n = new Set(sel); recs.forEach((r) => (all ? n.delete(r.id) : n.add(r.id))); setSel(n); }}>{all ? "Clear all" : "Select all"}</Btn>
            <ul>{recs.map((r) => <li key={r.id}><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />{r.title} <span className="text-muted-foreground">· {fmtDate(when(r))}{r.scope === "private" && " · private"}</span></label></li>)}</ul>
          </details>
        );
      })}
    </>
  );
}
