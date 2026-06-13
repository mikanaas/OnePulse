import { useRoute, useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetProject } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { statusMap } from "@/lib/format";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { DashboardTab } from "./project/dashboard-tab";
import { TasksTab } from "./project/tasks-tab";
import { ActivityTab } from "./project/activity-tab";
import { EffectsTab } from "./project/effects-tab";
import { CostsTab } from "./project/costs-tab";

export default function ProjectDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/projects/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: ["project", id] }
  });

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
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className={statusMap[project.status]?.color}>
                {statusMap[project.status]?.label || project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-12 p-0">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Dashboard</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Oppgaver</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Aktivitetslogg</TabsTrigger>
            <TabsTrigger value="effects" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Effekter</TabsTrigger>
            <TabsTrigger value="costs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">Kostnader</TabsTrigger>
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
        </Tabs>
      </div>
    </AppLayout>
  );
}