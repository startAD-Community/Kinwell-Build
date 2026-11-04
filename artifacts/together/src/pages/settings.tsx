import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useBoot } from "@/lib/boot";
import { useProfileUpdate, useAccountActions, clearLocalData, errMessage } from "@/lib/api";
import { clearOffline } from "@/lib/offline";
import { GRANTS, LOG_CATEGORIES, PRIORITIES } from "@/lib/content";
import type { ProfileInput, ProfileInputStage } from "@workspace/api-client-react";
import { Btn, Chip, Surface, Tag, SectionTitle, Confirm, inputCls } from "@/components/kit";
import { Logo } from "@/components/shell";
import { cn } from "@/lib/utils";
import { BabyEditor } from "@/components/baby-editor";
import { ProfileEditor, FamilyRolePicker, type Identity } from "@/components/profile-editor";
import { AnimalAvatar, ANIMALS, AVATAR_COLORS, permissionLabel, type Animal, type AvatarColor } from "@/components/avatar";

const byChild = (r: { kind: string }[]) => r.some((x) => x.kind === "child");
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const COUNTRIES = ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "New Zealand", "Other"];
const tzList = (): string[] => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return [Intl.DateTimeFormat().resolvedOptions().timeZone]; } };

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}</span>{children}</label>;
}

/* ---------------- onboarding ---------------- */
export function Onboarding() {
  const { boot } = useBoot();
  const save = useProfileUpdate();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<"preparing" | "pregnant" | "parent" | "supporter" | "">("");
  const [f, setF] = useState<ProfileInput>({ name: boot.profile.name || "", country: "United Kingdom", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, priorities: [], familyRole: "", avatar: ANIMALS[0], avatarColor: AVATAR_COLORS[0] });
  const [unsure, setUnsure] = useState(false);
  const stage: ProfileInputStage = who === "preparing" ? "preconception" : who === "pregnant" ? "pregnancy" : "postpartum";
  const finish = () => save.mutate({ ...f, familyRole: f.familyRole?.trim() || undefined, stage, role: "admin", confirmed: true, onboardingComplete: true, dueDate: unsure ? undefined : f.dueDate, birthDate: unsure ? undefined : f.birthDate });
  const steps = [
    <div key="w"><h2 className="font-display text-3xl">Where are you right now?</h2><p className="mt-1 text-muted-foreground">You can change this any time.</p>
      <div className="mt-5 grid gap-2">{([["preparing", "Getting ready to try"], ["pregnant", "Pregnant, or my partner is"], ["parent", "Our baby is here"], ["supporter", "I'm helping someone else"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setWho(k)} className={cn("press min-h-14 rounded-2xl border px-4 text-left text-[17px] font-semibold", who === k ? "border-primary bg-sage" : "border-input bg-card")}>{l}</button>)}</div>
      {who === "supporter" && <p className="mt-4 rounded-xl bg-sky p-3 text-sm text-accent-foreground">Supporters join through an invitation link from the family. Ask them to send you one from Circle. You can also continue to set up your own family.</p>}
    </div>,
    <div key="d" className="space-y-4"><h2 className="font-display text-3xl">A few details</h2>
      <L label="Your name"><input className={inputCls} value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
      <FamilyRolePicker value={f.familyRole || ""} onChange={(familyRole) => setF({ ...f, familyRole })} optional idPrefix="ob-fr" />
      <div><p className="mb-1.5 text-sm font-semibold">Pick an avatar</p><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">{ANIMALS.map((a) => <button key={a} type="button" role="radio" aria-checked={f.avatar === a} aria-label={a} onClick={() => setF({ ...f, avatar: a })} className={cn("press rounded-full border-2 p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", f.avatar === a ? "border-primary" : "border-transparent")}><AnimalAvatar member={{ name: f.name, avatar: a, avatarColor: f.avatarColor }} size="md" decorative /></button>)}</div><p className="mt-1 text-xs text-muted-foreground">You can change your avatar, colour and role in Settings.</p></div>
      {who === "pregnant" && !unsure && <L label="Due date"><input type="date" className={inputCls} value={f.dueDate || ""} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></L>}
      {who === "parent" && !unsure && <L label="Baby's birth date"><input type="date" className={inputCls} value={f.birthDate || ""} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></L>}
      {who === "parent" && <L label="Baby's name (optional)"><input className={inputCls} value={f.childName || ""} onChange={(e) => setF({ ...f, childName: e.target.value })} /></L>}
      {(who === "pregnant" || who === "parent") && <Chip active={unsure} onClick={() => setUnsure(!unsure)}>Not sure yet</Chip>}
      <L label="Country"><select className={inputCls} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></L>
      <p className="text-xs text-muted-foreground">Local admin content is a UK sample only and unverified for every country.</p>
      <L label="Timezone"><select className={inputCls} value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>{tzList().map((t) => <option key={t}>{t}</option>)}</select></L>
    </div>,
    <div key="p"><h2 className="font-display text-3xl">What matters most right now?</h2><p className="mt-1 text-muted-foreground">Pick up to three. Home will lean toward these.</p>
      <div className="mt-4 flex flex-wrap gap-2">{PRIORITIES.map((p) => { const on = f.priorities?.includes(p); return <Chip key={p} active={on} onClick={() => setF({ ...f, priorities: on ? f.priorities!.filter((x) => x !== p) : [...(f.priorities || []), p].slice(0, 3) })}>{p}</Chip>; })}</div>
    </div>,
  ];
  return (
    <div className="grain min-h-[100dvh] bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Logo />
        <div className="mt-6 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>
        <div className="rise mt-8" key={step}>{steps[step]}</div>
        <div className="mt-8 flex justify-between gap-2">
          {step > 0 ? <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn> : <span />}
          {step < 2 ? <Btn size="lg" disabled={!who} onClick={() => setStep(step + 1)} data-testid="button-onboarding-next">Continue</Btn>
            : <Btn size="lg" disabled={save.isPending} onClick={finish} data-testid="button-onboarding-finish">{save.isPending ? "Saving…" : "Start using Kinwell"}</Btn>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- settings ---------------- */
export default function SettingsPage() {
  const { boot, signedIn, isAdmin, switchDemo, switchPersona } = useBoot();
  const p = boot.profile;
  const save = useProfileUpdate();
  const { deleteMyAccount } = useAccountActions();
  const clerk = useClerk();
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const [f, setF] = useState<ProfileInput>({});
  const [idn, setIdn] = useState<Identity>(() => ({ name: p.name, familyRole: p.familyRole || "", avatar: p.avatar as Animal | undefined, avatarColor: p.avatarColor as AvatarColor | undefined }));
  const me = boot.members.find((m) => m.id === p.memberId);
  useEffect(() => { setIdn({ name: p.name, familyRole: p.familyRole || "", avatar: p.avatar as Animal | undefined, avatarColor: p.avatarColor as AvatarColor | undefined }); }, [p.name, p.familyRole, p.avatar, p.avatarColor]);
  const saveIdentity = () => {
    const name = (idn.name || "").trim();
    if (!name) { toast({ title: "Add a name first", variant: "destructive" }); return; }
    // Only personal identity fields — never permission role.
    save.mutate({ name, familyRole: (idn.familyRole || "").trim().slice(0, 40), avatar: idn.avatar, avatarColor: idn.avatarColor }, { onSuccess: () => toast({ title: "Profile saved" }) });
  };
  useEffect(() => { setF({ country: p.country, timezone: p.timezone, quietHours: p.quietHours, feedingApproach: p.feedingApproach, priorities: p.priorities || [], logCategories: p.logCategories || LOG_CATEGORIES.map((c) => c.key) }); }, [p.country, p.timezone, p.quietHours, p.feedingApproach]); // eslint-disable-line react-hooks/exhaustive-deps
  const [trans, setTrans] = useState<null | ProfileInputStage>(null);
  const [tDate, setTDate] = useState("");
  const [tName, setTName] = useState("");
  const [del, setDel] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const doStage = () => {
    if (!trans) return;
    const extra: ProfileInput = trans === "pregnancy" ? { dueDate: tDate || undefined } : trans === "postpartum" ? { birthDate: tDate || undefined, childName: tName || undefined } : {};
    save.mutate({ stage: trans, confirmed: true, ...extra }, { onSuccess: () => { toast({ title: trans === "paused" ? "Pregnancy updates paused" : "Stage updated" }); setTrans(null); } });
  };
  const stageCopy: Record<string, { title: string; body: string }> = {
    pregnancy: { title: "Move to pregnancy?", body: "Home will show pregnancy content. Your preparation records stay where they are." },
    postpartum: { title: "Your baby has arrived?", body: "Home will switch to recovery and baby care. Pregnancy records are kept privately for you; nothing is shared that wasn't before." },
    paused: { title: "Pause pregnancy updates?", body: "Weekly pregnancy content and suggestions will stop. Nothing is deleted and nobody is notified. You can come back to this whenever, or not at all. If you'd like to talk to someone, your clinician or GP is a good first contact." },
    preconception: { title: "Go back to preparing?", body: "Home will show preparation content. Existing records are kept." },
  };

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <h1 className="pt-4 font-display text-[34px]">Settings</h1>

      <section><SectionTitle title="Your profile" sub="How you appear to your circle. Only you can change it." />
        <Surface className="space-y-4" data-testid="section-profile">
          <ProfileEditor value={idn} onChange={setIdn} memberId={p.memberId} />
          <p className="rounded-xl bg-sky px-3 py-2 text-sm text-accent-foreground">Access: <strong>{permissionLabel(me?.role || p.role || "")}</strong>. Your family role is how you're known — it doesn't grant or remove access. Access is set by an administrator in Circle.</p>
          <Btn onClick={saveIdentity} disabled={save.isPending} data-testid="button-save-identity">{save.isPending ? "Saving…" : "Save profile"}</Btn>
        </Surface>
      </section>

      {(p.stage === "postpartum" || byChild(boot.records)) && <BabyEditor />}

      <section><SectionTitle title="Preferences" />
        <Surface className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Country"><select className={inputCls} value={f.country || ""} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></L>
            <L label="Timezone"><select className={inputCls} value={f.timezone || ""} onChange={(e) => setF({ ...f, timezone: e.target.value })}>{tzList().map((t) => <option key={t}>{t}</option>)}</select></L>
          </div>
          <L label="Quiet hours (no in-app nudges)"><input className={inputCls} placeholder="22:00–07:00" value={f.quietHours || ""} onChange={(e) => setF({ ...f, quietHours: e.target.value })} /></L>
          <div><p className="mb-1.5 text-sm font-semibold">Feeding approach</p><div className="flex flex-wrap gap-2">{["Breastfeeding", "Bottle", "Pumping", "Mixed", "Not decided"].map((x) => <Chip key={x} active={f.feedingApproach === x} onClick={() => setF({ ...f, feedingApproach: x })}>{x}</Chip>)}</div></div>
          <div><p className="mb-1.5 text-sm font-semibold">Priorities</p><div className="flex flex-wrap gap-2">{PRIORITIES.map((x) => { const on = f.priorities?.includes(x); return <Chip key={x} active={on} onClick={() => setF({ ...f, priorities: on ? f.priorities!.filter((y) => y !== x) : [...(f.priorities || []), x] })}>{x}</Chip>; })}</div></div>
          <div><p className="mb-1.5 text-sm font-semibold">Quick log shows</p><div className="flex flex-wrap gap-2">{LOG_CATEGORIES.map((c) => { const on = f.logCategories?.includes(c.key); return <Chip key={c.key} active={on} onClick={() => setF({ ...f, logCategories: on ? f.logCategories!.filter((y) => y !== c.key) : [...(f.logCategories || []), c.key] })}>{c.label}</Chip>; })}</div></div>
          <Btn onClick={() => save.mutate(f, { onSuccess: () => toast({ title: "Saved" }) })} disabled={save.isPending} data-testid="button-save-profile">Save</Btn>
        </Surface>
      </section>

      <section><SectionTitle title="Comfort" />
        <Surface className="flex flex-wrap gap-2">
          <Chip active={!!p.nightMode} onClick={() => save.mutate({ nightMode: !p.nightMode })}>Dim theme</Chip>
          <Chip active={!!p.lowEnergy} onClick={() => save.mutate({ lowEnergy: !p.lowEnergy })}>Low-energy mode</Chip>
        </Surface>
      </section>

      <section><SectionTitle title="Stage" sub={`Currently: ${p.stage || "not set"}. Changes always ask first.`} />
        <Surface className="flex flex-wrap gap-2">
          {p.stage !== "preconception" && <Btn variant="soft" onClick={() => setTrans("preconception")}>Back to preparing</Btn>}
          {p.stage !== "pregnancy" && <Btn variant="soft" onClick={() => setTrans("pregnancy")}>We're pregnant</Btn>}
          {p.stage !== "postpartum" && <Btn variant="soft" onClick={() => setTrans("postpartum")}>Our baby has arrived</Btn>}
          {p.stage === "pregnancy" && <Btn variant="ghost" onClick={() => setTrans("paused")}>Pause pregnancy updates</Btn>}
        </Surface>
      </section>

      {p.isDemo && (
        <section><SectionTitle title="Demo family" sub="Sample data. Resetting restores it." />
          <Surface tone="sky" className="space-y-4">
            <div className="flex flex-wrap gap-2">{(["preconception", "pregnancy", "postpartum"] as const).map((s) => <Btn key={s} size="sm" variant="outline" disabled={!!busy} onClick={async () => { setBusy(s); try { await switchDemo(s, true); toast({ title: `Demo reset to ${s}` }); } catch (e) { toast({ title: "Couldn't reset", description: errMessage(e), variant: "destructive" }); } setBusy(null); }}>{busy === s ? "Resetting…" : `Reset to ${s}`}</Btn>)}</div>
            <div>
              <p className="text-sm font-semibold">View the demo as another family member</p>
              <p className="text-xs">Demo only. This switches between sample personas so you can try both sides of a flow (e.g. Maya requests a transfer, Alex accepts). It is not real impersonation and is unavailable for real families.</p>
              <div className="mt-2 flex flex-wrap gap-2">{boot.members.filter((m) => m.status !== "revoked").map((m) => <Chip key={m.id} active={m.id === p.memberId} disabled={!!busy} onClick={async () => { setBusy(m.id); try { await switchPersona(m.id); toast({ title: `Now viewing as ${m.name}` }); } catch (e) { toast({ title: "Couldn't switch", description: errMessage(e), variant: "destructive" }); } setBusy(null); }}><AnimalAvatar member={m} size="xs" decorative />{m.name} · {m.familyRole || permissionLabel(m.role)}</Chip>)}</div>
            </div>
            {!signedIn && <div className="flex gap-2"><Link href="/sign-up" className="press inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Start your own family</Link><Link href="/sign-in" className="press inline-flex min-h-11 items-center rounded-xl border border-input bg-card px-4 font-semibold">Sign in</Link></div>}
          </Surface>
        </section>
      )}

      <section><SectionTitle title="Privacy" />
        <Surface className="space-y-3 text-[15px]">
          <p>Private records (check-ins, symptoms, private documents and appointments) are visible only to you. Your period dates are private unless you share them read-only in Care › You › Periods. Supporters see only what's granted.</p>
          <ul className="space-y-1">{boot.members.filter((m) => m.id !== p.memberId).map((m) => <li key={m.id} className="text-sm"><strong>{m.name}</strong> <Tag>{m.status}</Tag> — {m.grants.length ? m.grants.map((g) => GRANTS.find((x) => x.key === g)?.label || g).join(", ") : m.role.includes("admin") ? "administrator" : "nothing"}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <Btn size="sm" variant="soft" onClick={() => nav("/together?tab=circle")}>Manage access</Btn>}
            <Btn size="sm" variant="soft" onClick={() => nav("/together?tab=export")}>Export records</Btn>
            <Btn size="sm" variant="outline" onClick={() => { clearOffline(); toast({ title: "Offline essentials removed from this device" }); }}>Clear offline essentials</Btn>
            <Btn size="sm" variant="outline" onClick={() => { clearLocalData(); clearOffline(); toast({ title: "This device's saved preferences cleared" }); }}>Clear data on this device</Btn>
          </div>
        </Surface>
      </section>

      {signedIn && (
        <section><SectionTitle title="Account" />
          <Surface className="space-y-3">
            <Btn variant="outline" onClick={() => { clearLocalData(); clearOffline(); qc.clear(); clerk.signOut({ redirectUrl: basePath || "/" }); }}>Sign out and clear this device</Btn>
            {!p.isDemo && <div className="rounded-xl bg-destructive/5 p-4">
              <p className="font-semibold">Delete my account</p>
              <p className="mt-1 text-sm">Deletes your private records and documents and removes you from the family. Shared baby records you created are kept for the family, so the baby's history stays intact. If you're the only administrator, transfer administration first. This can't be undone.</p>
              <Btn variant="danger" className="mt-3" onClick={() => setDel(true)}>Delete my account</Btn>
            </div>}
          </Surface>
        </section>
      )}

      <Confirm open={!!trans} onOpenChange={(o) => !o && setTrans(null)} title={trans ? stageCopy[trans].title : ""} confirm="Confirm" onConfirm={doStage}
        body={<><p>{trans ? stageCopy[trans].body : ""}</p>
          {trans === "pregnancy" && <input type="date" aria-label="Due date (optional)" className={cn(inputCls, "mt-3")} value={tDate} onChange={(e) => setTDate(e.target.value)} />}
          {trans === "postpartum" && <div className="mt-3 space-y-2"><input type="date" aria-label="Birth date" className={inputCls} value={tDate} onChange={(e) => setTDate(e.target.value)} /><input aria-label="Baby's name (optional)" placeholder="Baby's name (optional)" className={inputCls} value={tName} onChange={(e) => setTName(e.target.value)} /></div>}</>} />
      <Confirm open={del} onOpenChange={setDel} danger title="Delete your account permanently?" confirm="Delete forever"
        body={<><p>Type <strong>delete</strong> to confirm.</p><input className={cn(inputCls, "mt-2")} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type delete" /></>}
        onConfirm={() => { if (typed.trim().toLowerCase() !== "delete") { toast({ title: "Type delete to confirm", variant: "destructive" }); return; } deleteMyAccount.mutate(undefined, { onSuccess: () => { clearLocalData(); clearOffline(); qc.clear(); clerk.signOut({ redirectUrl: basePath || "/" }); } }); }} />
    </div>
  );
}
