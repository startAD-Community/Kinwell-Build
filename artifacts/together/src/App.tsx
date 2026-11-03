import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { BootGate, useBoot } from "@/lib/boot";
import { AppShell, Logo } from "@/components/shell";
import { Btn } from "@/components/kit";
import HomePage from "@/pages/home";
import CarePage from "@/pages/care";
import TogetherPage from "@/pages/together";
import PlanPage from "@/pages/plan";
import SettingsPage, { Onboarding } from "@/pages/settings";
import InvitePage from "@/pages/invite";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 10000 } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(152 24% 34%)",
    colorForeground: "hsl(150 18% 16%)",
    colorMutedForeground: "hsl(150 8% 38%)",
    colorDanger: "hsl(4 62% 46%)",
    colorBackground: "hsl(42 50% 98%)",
    colorInput: "hsl(42 40% 99%)",
    colorInputForeground: "hsl(150 18% 16%)",
    colorNeutral: "hsl(150 10% 30%)",
    fontFamily: "Figtree, system-ui, sans-serif",
    borderRadius: "0.85rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(42_50%_98%)] rounded-[22px] w-[440px] max-w-full overflow-hidden border border-[hsl(40_22%_86%)] shadow-[0_18px_40px_-24px_hsl(150_30%_20%/0.45)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-['Fraunces'] text-[26px] text-[hsl(150_18%_16%)]",
    headerSubtitle: "text-[hsl(150_8%_38%)]",
    socialButtonsBlockButtonText: "text-[hsl(150_18%_16%)] font-semibold",
    formFieldLabel: "text-[hsl(150_18%_16%)] font-semibold",
    footerActionLink: "text-[hsl(152_24%_30%)] font-semibold",
    footerActionText: "text-[hsl(150_8%_38%)]",
    dividerText: "text-[hsl(150_8%_38%)]",
    identityPreviewEditButton: "text-[hsl(152_24%_30%)]",
    formFieldSuccessText: "text-[hsl(152_30%_28%)]",
    alertText: "text-[hsl(150_18%_16%)]",
    logoBox: "justify-center",
    logoImage: "h-10",
    socialButtonsBlockButton: "min-h-11 border-[hsl(40_22%_82%)] bg-[hsl(42_40%_99%)]",
    formButtonPrimary: "min-h-11 bg-[hsl(152_24%_34%)] text-[hsl(42_50%_98%)] font-semibold",
    formFieldInput: "min-h-11 bg-[hsl(42_40%_99%)] border-[hsl(40_22%_82%)]",
    footerAction: "justify-center",
    dividerLine: "bg-[hsl(40_22%_86%)]",
    alert: "bg-[hsl(18_80%_92%)] border-0",
    otpCodeFieldInput: "border-[hsl(40_22%_82%)]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grain flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      {children}
      <p className="max-w-sm text-center text-sm text-muted-foreground">A quiet companion for the first years. Your private records stay yours.</p>
    </div>
  );
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Loading() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-12 w-3/4 animate-pulse rounded-xl bg-muted" />
        {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-[20px] bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
      </div>
    </div>
  );
}

function LoadError(msg: string, retry: () => void) {
  return (
    <div className="grain flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <Logo className="justify-center" />
        <p className="mt-6 font-display text-2xl">We couldn't load your family</p>
        <p className="mt-2 text-sm text-muted-foreground">{msg}. If you're offline, your saved offline essentials are still in Care.</p>
        <Btn className="mt-4" onClick={retry}>Try again</Btn>
      </div>
    </div>
  );
}

function NeedsOnboarding({ children }: { children: ReactNode }) {
  const { boot } = useBoot();
  if (!boot.profile.isDemo && !boot.profile.onboardingComplete) return <Onboarding />;
  return <>{children}</>;
}

function AppArea({ signedIn }: { signedIn: boolean }) {
  return (
    <BootGate signedIn={signedIn} loading={<Loading />} error={LoadError}>
      <NeedsOnboarding>
        <AppShell>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/">{() => <HomePage intro />}</Route>
              <Route path="/home">{() => <HomePage />}</Route>
              <Route path="/care" component={CarePage} />
              <Route path="/together" component={TogetherPage} />
              <Route path="/plan" component={PlanPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </AppShell>
      </NeedsOnboarding>
    </BootGate>
  );
}

function Root() {
  const { isLoaded, isSignedIn } = useAuth();
  const [loc] = useLocation();
  if (!isLoaded) return <Loading />;
  if (loc === "/" && isSignedIn) return <Redirect to="/home" />;
  return <AppArea signedIn={!!isSignedIn} />;
}

function InviteRoute() {
  return (
    <>
      <Show when="signed-in"><InvitePage signedIn /></Show>
      <Show when="signed-out"><InvitePage signedIn={false} /></Show>
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your family" } },
        signUp: { start: { title: "Start your family space", subtitle: "Private by default. Share only what you choose." } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/invite/:token" component={InviteRoute} />
            <Route component={Root} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
