import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2 } from "lucide-react";
import { formatCurrency, statusMap } from "@/lib/format";

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: projects, isLoading } = useListProjects({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prosjekter</h1>
            <p className="text-muted-foreground">Oversikt over alle digitaliserings- og AI-prosjekter.</p>
          </div>
          <Button onClick={() => setLocation("/projects/new")}>
            <Plus className="mr-2 h-4 w-4" /> Nytt prosjekt
          </Button>
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              {Object.entries(statusMap).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Forretningsområde</TableHead>
                <TableHead className="text-right">Målbesparelse</TableHead>
                <TableHead className="text-right">Oppgaver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : projects?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Ingen prosjekter funnet.
                  </TableCell>
                </TableRow>
              ) : (
                projects?.map((project) => (
                  <TableRow 
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusMap[project.status]?.color}>
                        {statusMap[project.status]?.label || project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.businessUnit || "-"}</TableCell>
                    <TableCell className="text-right">
                      {project.goalSavingsValue 
                        ? (project.goalSavingsUnit === "kr" ? formatCurrency(project.goalSavingsValue) : `${project.goalSavingsValue} timer`)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {project.completedTaskCount || 0} / {project.taskCount || 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}