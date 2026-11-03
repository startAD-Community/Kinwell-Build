import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBootstrap,
  getGetBootstrapQueryKey,
  getBootstrap,
  startDemo,
  switchDemoPersona,
  type Bootstrap,
  type Member,
  type DemoInputStage,
} from "@workspace/api-client-react";
import { errStatus, errMessage } from "./api";

type Ctx = {
  boot: Bootstrap;
  me: Member | undefined;
  signedIn: boolean;
  isAdmin: boolean;
  childId: string | undefined;
  setChildId: (id: string | undefined) => void;
  switchDemo: (stage: DemoInputStage, reset?: boolean) => Promise<void>;
  switchPersona: (memberId: string) => Promise<void>;
  fetchedAt: number;
};

const BootCtx = createContext<Ctx | null>(null);

export function useBoot() {
  const c = useContext(BootCtx);
  if (!c) throw new Error("useBoot outside provider");
  return c;
}

export function BootGate({ signedIn, children, loading, error }: { signedIn: boolean; children: ReactNode; loading: ReactNode; error: (msg: string, retry: () => void) => ReactNode }) {
  const qc = useQueryClient();
  const key = getGetBootstrapQueryKey();
  const q = useGetBootstrap({
    query: {
      queryKey: key,
      refetchInterval: 30000,
      retry: (n, e) => ![401, 403, 404].includes(errStatus(e) ?? 0) && n < 2,
    },
  });
  const started = useRef(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | undefined>(() => localStorage.getItem("together.child") || undefined);

  const st = errStatus(q.error);
  const needsDemo = !signedIn && q.isError && [401, 403, 404].includes(st ?? 0);

  useEffect(() => {
    if (!needsDemo || started.current) return;
    started.current = true;
    startDemo({ stage: "postpartum" })
      .then(() => getBootstrap())
      .then((b) => qc.setQueryData(key, b))
      .catch((e) => setDemoError(errMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsDemo]);

  const switchDemo = async (stage: DemoInputStage, reset = false) => {
    const b = await startDemo({ stage, reset });
    qc.setQueryData(key, b);
    await qc.invalidateQueries({ queryKey: key });
  };

  const switchPersona = async (memberId: string) => {
    const b = await switchDemoPersona({ memberId });
    qc.clear();
    qc.setQueryData(key, b);
  };

  const value = useMemo<Ctx | null>(() => {
    if (!q.data) return null;
    const me = q.data.members.find((m) => m.id === q.data!.profile.memberId);
    const role = (q.data.profile.role || "").toLowerCase();
    return {
      boot: q.data,
      me,
      signedIn,
      isAdmin: role.includes("admin"),
      childId,
      setChildId: (id) => {
        setChildId(id);
        if (id) localStorage.setItem("together.child", id);
        else localStorage.removeItem("together.child");
      },
      switchDemo,
      switchPersona,
      fetchedAt: q.dataUpdatedAt,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, q.dataUpdatedAt, signedIn, childId]);

  if (value) return <BootCtx.Provider value={value}>{children}</BootCtx.Provider>;
  if (demoError) return <>{error(demoError, () => { started.current = false; setDemoError(null); q.refetch(); })}</>;
  if (q.isError && !needsDemo) return <>{error(errMessage(q.error), () => q.refetch())}</>;
  return <>{loading}</>;
}
