import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetInvitation, getGetInvitationQueryKey, acceptInvitation, getGetBootstrapQueryKey, type Invitation } from "@workspace/api-client-react";
import { Btn, Surface, Tag } from "@/components/kit";
import { Logo } from "@/components/shell";
import { GRANTS } from "@/lib/content";
import { errMessage, errStatus } from "@/lib/api";
import { fmtDate } from "@/lib/format";

export default function InvitePage({ signedIn }: { signedIn: boolean }) {
  const { token = "" } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const q = useGetInvitation(token, { query: { queryKey: getGetInvitationQueryKey(token), enabled: !!token, retry: false } });
  const [done, setDone] = useState<Invitation | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inv = done || q.data;
  const isRequest = !!inv?.request;
  const accept = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await acceptInvitation(token);
      setDone((r as Invitation) || inv || null);
      qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
      if (!isRequest) nav("/home");
    } catch (e) {
      setErr(errStatus(e) === 401 ? "Please sign in or create an account first, then come back to this link." : errMessage(e));
    }
    setBusy(false);
  };
  return (
    <div className="grain min-h-[100dvh] bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <Logo />
        {q.isLoading && <div className="mt-8 h-48 animate-pulse rounded-[20px] bg-muted" />}
        {q.isError && <Surface className="mt-8"><p className="font-display text-2xl">This link isn't working</p><p className="mt-1 text-sm text-muted-foreground">It may have expired, been revoked, or already been used. Ask the family for a new one.</p><Btn className="mt-4" variant="soft" onClick={() => q.refetch()}>Try again</Btn></Surface>}
        {inv && (
          <Surface className="rise mt-8">
            {isRequest ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">A family has asked for help</p>
                <p className="mt-2 font-display text-3xl">{inv.request!.title}</p>
                {inv.request!.notes && <p className="mt-2 text-[15px]">{inv.request!.notes}</p>}
                {!!(inv.request!.data as { dueDate?: string } | undefined)?.dueDate && <p className="mt-1 text-sm">When: {fmtDate((inv.request!.data as { dueDate: string }).dueDate)}</p>}
                <div className="mt-2"><Tag tone={inv.request!.status === "claimed" ? "sky" : "peach"}>{inv.request!.status || "open"}</Tag></div>
                <p className="mt-3 text-xs text-muted-foreground">You'll only see this request — no health or baby information.</p>
                {inv.request!.status === "open" || !inv.request!.status ? <Btn size="lg" className="mt-4 w-full" disabled={busy} onClick={accept} data-testid="button-claim">{busy ? "Saving…" : "I'll do this"}</Btn>
                  : <p className="mt-4 rounded-xl bg-sage p-3 text-[15px]">{done ? "Thank you — the family can see you've claimed this. Claimed isn't done; they'll mark it complete." : "Someone has already claimed this request."}</p>}
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">You've been invited</p>
                <p className="mt-2 font-display text-3xl">Join as {inv.role}</p>
                <p className="mt-1 text-[15px]">Invited as {inv.name}. You'll be able to see:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{inv.grants.length ? inv.grants.map((g) => <Tag key={g} tone="sage">{GRANTS.find((x) => x.key === g)?.label || g}</Tag>) : <Tag>Administrator access</Tag>}</div>
                <p className="mt-3 text-xs text-muted-foreground">Private parent records are never shared. Demo-family invitations can't become real accounts.</p>
                {signedIn ? <Btn size="lg" className="mt-4 w-full" disabled={busy || inv.status !== "pending"} onClick={accept} data-testid="button-accept-invite">{inv.status !== "pending" ? `Invitation ${inv.status}` : busy ? "Joining…" : "Accept and join"}</Btn>
                  : <div className="mt-4 grid gap-2"><Link href={`/sign-up?redirect_url=${encodeURIComponent(window.location.href)}`} className="press flex min-h-12 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">Create an account to accept</Link><Link href="/sign-in" className="press flex min-h-12 items-center justify-center rounded-xl border border-input bg-card font-semibold">I already have an account</Link></div>}
              </>
            )}
            {err && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
          </Surface>
        )}
      </div>
    </div>
  );
}
