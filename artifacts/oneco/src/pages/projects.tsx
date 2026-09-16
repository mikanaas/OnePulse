import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  getListProjectsQueryKey,
  useArchiveProject,
  useListProjects,
  useRestoreProject,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, ArchiveRestore, FolderOpen, Loader2, Plus, Rocket, Search } from "lucide-react";
import { formatCurrency, statusMap } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const routeSearch = useSearch();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [view, setView] = useState<"active" | "operational" | "archived">(
    new URLSearchParams(routeSearch).get("visning") === "i-drift" ? "operational" : "active",
  );
  const [actionTarget, setActionTarget] = useState<{
    id: number;
    name: string;
    action: "archive" | "restore";
  } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listStatus = view === "operational" ? "i_drift" : status !== "all" ? status : undefined;
  const showArchived = view === "archived";
  const { data: projects, isLoading } = useListProjects({
    search: search || undefined,
    status: listStatus,
    archived: showArchived,
  }, {
    query: {
      queryKey: getListProjectsQueryKey({
        search: search || undefined,
        status: listStatus,
        archived: showArchived,
      }),
      staleTime: 0,
      refetchOnMount: "always",
    },
  });
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const actionPending = archiveProject.isPending || restoreProject.isPending;

  const finishAction = (title: string) => {
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    setActionTarget(null);
    toast({ title });
  };

  const handleAction = () => {
    if (!actionTarget) return;

    if (actionTarget.action === "archive") {
      archiveProject.mutate(
        { id: actionTarget.id },
        {
          onSuccess: () => finishAction("Prosjekt arkivert"),
          onError: () => {
            toast({ title: "Kunne ikke arkivere prosjektet", variant: "destructive" });
          },
        },
      );
      return;
    }

    restoreProject.mutate(
      { id: actionTarget.id },
      {
        onSuccess: () => finishAction("Prosjekt gjenopprettet"),
        onError: () => {
          toast({ title: "Kunne ikke gjenopprette prosjektet", variant: "destructive" });
        },
      },
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prosjekter</h1>
            <p className="text-muted-foreground">
              {view === "archived"
                ? "Løsninger som ikke ble satt i drift, og som kan gjenopprettes."
                : view === "operational"
                  ? "Løsninger som er ferdige og satt i operativ drift."
                  : "Prosjekter som er under vurdering eller gjennomføring."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={view === "active" ? "secondary" : "outline"}
              onClick={() => { setView("active"); setStatus("all"); }}
            >
              <FolderOpen className="mr-2 h-4 w-4" /> Aktive
            </Button>
            <Button
              variant={view === "operational" ? "secondary" : "outline"}
              onClick={() => { setView("operational"); setStatus("all"); }}
            >
              <Rocket className="mr-2 h-4 w-4" /> I drift
            </Button>
            <Button
              variant={view === "archived" ? "secondary" : "outline"}
              onClick={() => { setView("archived"); setStatus("all"); }}
            >
              <Archive className="mr-2 h-4 w-4" /> Arkiv
            </Button>
            {view === "active" && (
              <Button onClick={() => setLocation("/projects/new")}>
                <Plus className="mr-2 h-4 w-4" /> Nytt prosjekt
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk i prosjekter..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {view === "active" && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statuser</SelectItem>
                {Object.entries(statusMap)
                  .filter(([key]) => key !== "i_drift" && key !== "avsluttet")
                  .map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[240px]">Navn</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="max-w-[160px]">Forretningsområde</TableHead>
                <TableHead className="text-right">Målbesparelse</TableHead>
                <TableHead className="text-right">{showArchived ? "Arkivert" : "Oppgaver"}</TableHead>
                <TableHead className="w-[88px] text-right">Handling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : projects?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {view === "archived"
                      ? "Ingen arkiverte prosjekter."
                      : view === "operational"
                        ? "Ingen løsninger er satt i drift ennå."
                        : "Ingen prosjekter funnet."}
                  </TableCell>
                </TableRow>
              ) : (
                projects?.map((project) => (
                  <TableRow 
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium max-w-[240px]"><span className="block truncate">{project.name}</span></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusMap[project.status]?.color}>
                        {statusMap[project.status]?.label || project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px]"><span className="block truncate">{project.businessUnit || "-"}</span></TableCell>
                    <TableCell className="text-right">
                      {project.goalSavingsValue 
                        ? (project.goalSavingsUnit === "kr" ? formatCurrency(project.goalSavingsValue) : `${project.goalSavingsValue} timer`)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {showArchived
                        ? (project.archivedAt
                            ? new Date(project.archivedAt).toLocaleDateString("nb-NO")
                            : "-")
                        : `${project.completedTaskCount || 0} / ${project.taskCount || 0}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={showArchived
                          ? "text-muted-foreground hover:bg-green-50 hover:text-green-700"
                          : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700"}
                        title={showArchived ? `Gjenopprett ${project.name}` : `Arkiver ${project.name}`}
                        aria-label={showArchived ? `Gjenopprett ${project.name}` : `Arkiver ${project.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActionTarget({
                            id: project.id,
                            name: project.name,
                            action: showArchived ? "restore" : "archive",
                          });
                        }}
                      >
                        {showArchived
                          ? <ArchiveRestore className="h-4 w-4" />
                          : <Archive className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && !actionPending && setActionTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget
                ? (actionTarget.action === "restore" ? "Gjenopprett prosjekt?" : "Arkiver prosjekt?")
                : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget
                ? (actionTarget.action === "restore"
                    ? `«${actionTarget.name}» flyttes tilbake til den aktive prosjektlisten med alle registrerte data.`
                    : `«${actionTarget.name}» flyttes til arkivet. Oppgaver, effekter, kostnader og annen prosjektinformasjon beholdes, og prosjektet kan gjenopprettes senere.`)
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className={actionTarget?.action === "restore" ? "" : "bg-amber-600 hover:bg-amber-700"}
              disabled={actionPending}
              onClick={(event) => {
                event.preventDefault();
                handleAction();
              }}
            >
              {actionPending
                ? (actionTarget?.action === "restore" ? "Gjenoppretter..." : "Arkiverer...")
                : (actionTarget?.action === "restore" ? "Gjenopprett prosjekt" : "Arkiver prosjekt")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}