import { useRoute, useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  getGetProjectQueryKey,
  useGetProject,
  useUpdateProject,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusMap } from "@/lib/format";
import { useState } from "react";
import { Loader2, ArrowLeft, FileText, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { invalidateProjectOverviews } from "@/lib/invalidate-project-overviews";

import { DashboardTab } from "./project/dashboard-tab";
import { TasksTab } from "./project/tasks-tab";
import { ActivityTab } from "./project/activity-tab";
import { EffectsTab } from "./project/effects-tab";
import { CostsTab } from "./project/costs-tab";
import { GovernanceTab } from "./project/governance-tab";
import { DmaicTab } from "./project/dmaic-tab";

const VALID_TABS = ["dashboard", "tasks", "activity", "effects", "costs", "governance", "dmaic"] as const;

export default function ProjectDetail() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, params] = useRoute("/projects/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const search = useSearch();
  const tabParam = new URLSearchParams(search).get("tab");
  const initialTab = VALID_TABS.includes(tabParam as any) ? tabParam! : "dashboard";

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });
  const updateProject = useUpdateProject();
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState("");

  const startEditingName = () => {
    if (!project) return;
    setProjectName(project.name);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setProjectName("");
  };

  const saveProjectName = () => {
    const name = projectName.trim();
    if (!project || !name || name === project.name) {
      if (!name) toast({ title: "Prosjekttittelen kan ikke være tom", variant: "destructive" });
      else cancelEditingName();
      return;
    }
    updateProject.mutate(
      { id, data: { name } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          invalidateProjectOverviews(queryClient);
          setIsEditingName(false);
          toast({ title: "Prosjekttittel oppdatert" });
        },
        onError: () => toast({ title: "Kunne ikke endre prosjekttittel", variant: "destructive" }),
      },
    );
  };

  const changeStatus = (status: "ide" | "pagaende" | "pause" | "fullfort" | "i_drift" | "avsluttet") => {
    updateProject.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          invalidateProjectOverviews(queryClient);
          if (status === "avsluttet") {
            toast({ title: "Prosjekt avsluttet og flyttet til arkiv" });
            setLocation("/projects");
          } else if (status === "i_drift") {
            toast({ title: "Prosjekt flyttet til I drift" });
            setLocation("/projects?visning=i-drift");
          } else {
            toast({ title: "Prosjektstatus oppdatert" });
          }
        },
        onError: () => toast({ title: "Kunne ikke endre prosjektstatus", variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">Prosjektet ble ikke funnet.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" className="pl-0 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Tilbake til prosjekter
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isEditingName ? (
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveProjectName();
                      if (event.key === "Escape") cancelEditingName();
                    }}
                    className="h-11 min-w-0 max-w-xl text-2xl font-bold"
                    aria-label="Prosjekttittel"
                    autoFocus
                    disabled={updateProject.isPending}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={saveProjectName}
                    disabled={updateProject.isPending || !projectName.trim()}
                    aria-label="Lagre prosjekttittel"
                  >
                    {updateProject.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={cancelEditingName}
                    disabled={updateProject.isPending}
                    aria-label="Avbryt redigering"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="group flex min-w-0 items-center gap-1">
                  <h1 className="min-w-0 text-3xl font-bold tracking-tight">{project.name}</h1>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground opacity-70 transition-opacity hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    onClick={startEditingName}
                    aria-label="Endre prosjekttittel"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Select
                value={project.status}
                onValueChange={(value) => changeStatus(value as "ide" | "pagaende" | "pause" | "fullfort" | "i_drift" | "avsluttet")}
                disabled={updateProject.isPending}
              >
                <SelectTrigger
                  className={`h-8 w-auto min-w-28 gap-2 rounded-full px-3 text-xs font-semibold ${statusMap[project.status]?.color ?? ""}`}
                  aria-label="Endre prosjektstatus"
                >
                  {updateProject.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <SelectValue />}
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setLocation(`/projects/${project.id}/rapport`)}>
            <FileText className="h-4 w-4" />
            Rapport
          </Button>
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-12 p-0">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Oversikt</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Oppgaver</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Aktivitetslogg</TabsTrigger>
            <TabsTrigger value="effects" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Effekter</TabsTrigger>
            <TabsTrigger value="costs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Kostnader</TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Prosjektinformasjon</TabsTrigger>
            <TabsTrigger value="dmaic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">DMAIC</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6 border-none p-0 outline-none">
            <DashboardTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-6 border-none p-0 outline-none">
            <TasksTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="activity" className="mt-6 border-none p-0 outline-none">
             <ActivityTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="effects" className="mt-6 border-none p-0 outline-none">
             <EffectsTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="costs" className="mt-6 border-none p-0 outline-none">
             <CostsTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="governance" className="mt-6 border-none p-0 outline-none">
             <GovernanceTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="dmaic" className="mt-6 border-none p-0 outline-none">
             <DmaicTab projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}