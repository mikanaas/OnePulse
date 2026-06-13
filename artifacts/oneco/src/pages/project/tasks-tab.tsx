import { useListTasks, useCreateTask, useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { formatDateTime, taskStatusMap, taskPriorityMap } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Calendar, Clock, LayoutList, LayoutGrid } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const schema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().optional(),
  status: z.enum(["ikke_startet", "pagaar", "venter", "fullfort"]).default("ikke_startet"),
  priority: z.enum(["lav", "middels", "hoy"]).default("middels"),
  dueDate: z.string().optional(),
});

export function TasksTab({ projectId }: { projectId: number }) {
  const { data: tasks, isLoading } = useListTasks(projectId, undefined, { query: { enabled: !!projectId, queryKey: getListTasksQueryKey(projectId) } });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      status: "ikke_startet",
      priority: "middels",
      dueDate: "",
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    createTask.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          toast({ title: "Oppgave opprettet" });
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
        },
      }
    );
  };

  const handleStatusChange = (taskId: number, newStatus: any) => {
    updateTask.mutate(
      { projectId, id: taskId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
        }
      }
    );
  };

  const columns = ["ikke_startet", "pagaar", "venter", "fullfort"];

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setView("kanban")}>
            <LayoutGrid className="h-4 w-4 mr-2" /> Kanban
          </Button>
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}>
            <LayoutList className="h-4 w-4 mr-2" /> Liste
          </Button>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Ny oppgave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ny oppgave</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem><FormLabel>Tittel</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(taskStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioritet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(taskPriorityMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem><FormLabel>Frist</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createTask.isPending}>
                  {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opprett"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = tasks?.filter(t => t.status === col) || [];
            return (
              <div key={col} className="bg-muted/50 rounded-xl p-3 min-h-[500px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm">{taskStatusMap[col].label}</h3>
                  <Badge variant="secondary">{colTasks.length}</Badge>
                </div>
                <div className="space-y-3">
                  {colTasks.map(task => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "fullfort";
                    return (
                      <Card key={task.id} className="cursor-grab hover:border-primary/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className={taskPriorityMap[task.priority]?.color + " text-[10px] px-1 py-0 h-4"}>
                              {taskPriorityMap[task.priority]?.label}
                            </Badge>
                            <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                              <SelectTrigger className="h-6 w-6 p-0 border-none bg-transparent">
                                <span className="sr-only">Endre status</span>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(taskStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="font-medium text-sm mb-2">{task.title}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("no-NO", { month: "short", day: "numeric" }) : "-"}
                              </span>
                            </div>
                            {task.assigneeName && (
                              <div className="truncate max-w-[80px] bg-secondary px-1.5 py-0.5 rounded">
                                {task.assigneeName.split(" ")[0]}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-md bg-card">
          <div className="p-4 flex flex-col gap-2">
            {tasks?.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                    <SelectTrigger className={`w-[130px] h-8 ${taskStatusMap[task.status]?.color}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(taskStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="font-medium">{task.title}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <Badge variant="outline" className={taskPriorityMap[task.priority]?.color}>{taskPriorityMap[task.priority]?.label}</Badge>
                  <div className="flex items-center gap-1 w-24">
                    <Calendar className="h-3 w-3" />
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("no-NO") : "-"}
                  </div>
                  <div className="w-24 truncate text-right">{task.assigneeName || "-"}</div>
                </div>
              </div>
            ))}
            {tasks?.length === 0 && <div className="text-center py-8 text-muted-foreground">Ingen oppgaver.</div>}
          </div>
        </div>
      )}
    </div>
  );
}