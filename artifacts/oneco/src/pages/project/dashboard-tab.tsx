import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Calendar, Target, Clock } from "lucide-react";

export function DashboardTab({ projectId }: { projectId: number }) {
  const { data: project, isLoading } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;
  if (!project) return null;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ansvarlig</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.ownerName || "Ikke tildelt"}</div>
            <p className="text-xs text-muted-foreground mt-1">Forretningsenhet: {project.businessUnit || "-"}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Målbesparelse</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.goalSavingsValue ? 
                (project.goalSavingsUnit === "kr" ? formatCurrency(project.goalSavingsValue) : `${formatNumber(project.goalSavingsValue)} timer`) 
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{project.goalText || "Ingen målbeskrivelse"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fremdrift oppgaver</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.completedTaskCount || 0} / {project.taskCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Fullførte oppgaver</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidsramme</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {project.startDate ? new Date(project.startDate).toLocaleDateString("no-NO") : "-"} 
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Til {project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString("no-NO") : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Realisert vs Mål</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Besparelser', Realisert: project.totalSavings || 0, Mål: project.goalSavingsValue || 0 }
              ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="Realisert" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mål" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}