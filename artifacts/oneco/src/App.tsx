import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSyncMe, setAuthTokenGetter, useGetMe } from "@workspace/api-client-react";
import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser, useAuth } from "@clerk/react";

import { publishableKeyFromHost } from "@clerk/react/internal";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PortfolioPage from "@/pages/portfolio";
import ProjectsPage from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import ProjectNew from "@/pages/project-new";
import MyWorkPage from "@/pages/my-work";
import AdminPage from "@/pages/admin";
import ProjectReportPage from "@/pages/project-report";
import PortfolioReportPage from "@/pages/portfolio-report";
import AiAnalysisPage from "@/pages/ai-analysis";
import ProjectOverviewPage from "@/pages/project-overview";
import ProposalsPage from "@/pages/proposals";
import { ChatPanel } from "@/components/chat-panel";

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
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(288 46% 23%)",
    fontFamily: "'Inter', sans-serif",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkTokenSetter() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
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

function SyncUser() {
  const { user, isLoaded } = useUser();
  const syncMe = useSyncMe();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isLoaded && user && !hasSynced.current) {
      hasSynced.current = true;
      syncMe.mutate({
        data: {
          clerkId: user.id,
          name: user.fullName || "User",
          email: user.primaryEmailAddress?.emailAddress || "",
        }
      });
    }
  }, [isLoaded, user, syncMe]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/portfolio" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
        <ChatPanel />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useUser();
  const { data: me, isLoading: meLoading } = useGetMe({ query: { queryKey: ["/api/users/me"], enabled: isSignedIn === true } });

  if (!isLoaded || meLoading) return null;
  if (!isSignedIn) return <Redirect to="/" />;
  if (me?.systemRole !== "admin") return <Redirect to="/portfolio" />;

  return <ProtectedRoute component={Component} />;
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
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      localization={{
        signIn: {
          start: {
            title: "Logg inn på OnePulse",
            subtitle: "Velkommen tilbake! Logg inn for å fortsette.",
          },
        },
        signUp: {
          start: {
            title: "Opprett konto i OnePulse",
            subtitle: "Kom i gang i dag.",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkTokenSetter />
        <ClerkQueryClientCacheInvalidator />
        <SyncUser />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/portfolio" component={() => <ProtectedRoute component={PortfolioPage} />} />
          <Route path="/projects/new" component={() => <ProtectedRoute component={ProjectNew} />} />
          <Route path="/projects/:id/rapport" component={() => <ProtectedRoute component={ProjectReportPage} />} />
          <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
          <Route path="/projects" component={() => <ProtectedRoute component={ProjectsPage} />} />
          <Route path="/rapport" component={() => <ProtectedRoute component={PortfolioReportPage} />} />
          <Route path="/ai-analyse" component={() => <ProtectedRoute component={AiAnalysisPage} />} />
          <Route path="/my-work" component={() => <ProtectedRoute component={MyWorkPage} />} />
          <Route path="/prosjektoversikt" component={() => <ProtectedRoute component={ProjectOverviewPage} />} />
          <Route path="/forslag" component={() => <ProtectedRoute component={ProposalsPage} />} />
          <Route path="/admin" component={() => <AdminRoute component={AdminPage} />} />
          
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <TooltipProvider>
        <ClerkProviderWithRoutes />
        <Toaster />
      </TooltipProvider>
    </WouterRouter>
  );
}

export default App;