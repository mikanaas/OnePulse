import { useListMyTasks } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, taskStatusMap, taskPriorityMap } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function MyWorkPage() {
  const [, setLocation] = useLocation();
  const { data: tasks, isLoading } = useListMyTasks();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Min Arbeid</h1>
          <p className="text-muted-foreground">Oversikt over dine tildelte oppgaver.</p>
        </div>

        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Oppgave</TableHead>
                <TableHead>Prosjekt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritet</TableHead>
                <TableHead>Frist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : tasks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Du har ingen tildelte oppgaver.
                  </TableCell>
                </TableRow>
              ) : (
                tasks?.map((task) => (
                  <TableRow 
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/projects/${task.projectId}`)}
                  >
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.projectName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={taskStatusMap[task.status]?.color}>
                        {taskStatusMap[task.status]?.label || task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={taskPriorityMap[task.priority]?.color}>
                        {taskPriorityMap[task.priority]?.label || task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(task.dueDate)}</TableCell>
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