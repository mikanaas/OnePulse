import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import { useEffect, useState } from "react";

import NotFound from "@/pages/not-found";
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
import OutlookAddinPage from "@/pages/outlook-addin";
import ProjectRegisterExisting from "@/pages/project-register-existing";
import { ChatPanel } from "@/components/chat-panel";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch("/api/users/me/sync", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: "{}",
        });

        if (!response.ok) {
          throw new Error("Authentication bootstrap failed: " + response.status);
        }

        await queryClient.invalidateQueries();

        if (!cancelled) setState("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) setState("error");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Logger inn med Microsoft...</div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Kunne ikke logge inn</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            OnePulse forventer Microsoft Entra ID autentisering fra Azure Container Apps.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Component />
      <ChatPanel />
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: me, isLoading } = useGetMe({
    query: { queryKey: ["/api/users/me"] },
  });

  if (isLoading) return null;
  if (me?.systemRole !== "admin") return <Redirect to="/portfolio" />;

  return <ProtectedRoute component={Component} />;
}

function Routes() {
  return (
    <AuthBootstrap>
      <Switch>
        <Route path="/" component={() => <Redirect to="/portfolio" />} />
        <Route path="/outlook-addin" component={OutlookAddinPage} />
        <Route path="/portfolio" component={() => <ProtectedRoute component={PortfolioPage} />} />
        <Route path="/projects/new" component={() => <ProtectedRoute component={ProjectNew} />} />
        <Route path="/projects/register-existing" component={() => <ProtectedRoute component={ProjectRegisterExisting} />} />
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
    </AuthBootstrap>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <Routes />
        </QueryClientProvider>
        <Toaster />
      </TooltipProvider>
    </WouterRouter>
  );
}

export default App;
