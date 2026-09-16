import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useListUsers,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { taskStatusMap, taskPriorityMap } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Calendar,
  LayoutList,
  LayoutGrid,
  GripVertical,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskDetailDialog, type TaskForDialog } from "./task-detail-dialog";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { invalidateProjectOverviews } from "@/lib/invalidate-project-overviews";

const schema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().optional(),
  status: z
    .enum(["ikke_startet", "pagaar", "venter", "fullfort"])
    .default("ikke_startet"),
  priority: z.enum(["lav", "middels", "hoy"]).default("middels"),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

type TaskStatus = "ikke_startet" | "pagaar" | "venter" | "fullfort";

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assigneeName?: string | null;
};

function TaskCardContent({
  task,
  onStatusChange,
  onOpen,
  showControls = true,
  dragHandleProps,
}: {
  task: Task;
  onStatusChange: (taskId: number, status: string) => void;
  onOpen?: () => void;
  showControls?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "fullfort";

  return (
    <Card
      className="hover:border-primary/50 transition-colors"
      onClick={onOpen}
      style={{ cursor: onOpen ? "pointer" : "default" }}
    >
      <div className="flex items-start">
        <button
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="p-2 pt-3.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ touchAction: "none" }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <CardContent className="p-3 pl-0 flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <Badge
              variant="outline"
              className={
                taskPriorityMap[task.priority]?.color +
                " text-[10px] px-1 py-0 h-4"
              }
            >
              {taskPriorityMap[task.priority]?.label}
            </Badge>
            {showControls && (
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task.id, v)}
              >
                <SelectTrigger
                  className="h-6 w-6 p-0 border-none bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Endre status</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskStatusMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="font-medium text-sm mb-2 line-clamp-2 cursor-default">{task.title}</p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">{task.title}</TooltipContent>
          </Tooltip>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("no-NO", {
                      month: "short",
                      day: "numeric",
                    })
                  : "-"}
              </span>
            </div>
            {task.assigneeName && (
              <div className="truncate max-w-[80px] bg-secondary px-1.5 py-0.5 rounded">
                {task.assigneeName.split(" ")[0]}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function DraggableTaskCard({
  task,
  onStatusChange,
  onOpen,
}: {
  task: Task;
  onStatusChange: (taskId: number, status: string) => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardContent
        task={task}
        onStatusChange={onStatusChange}
        onOpen={onOpen}
        dragHandleProps={{ ...listeners, ...attributes }}
      />
    </div>
  );
}

function KanbanColumn({
  colKey,
  tasks,
  onStatusChange,
  onOpenTask,
}: {
  colKey: string;
  tasks: Task[];
  onStatusChange: (taskId: number, status: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-3 min-h-[500px] transition-colors duration-150 ${
        isOver
          ? "bg-primary/10 ring-2 ring-primary/40 ring-inset"
          : "bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-sm">{taskStatusMap[colKey].label}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onStatusChange={onStatusChange}
            onOpen={() => onOpenTask(task)}
          />
        ))}
      </div>
    </div>
  );
}

export function TasksTab({ projectId }: { projectId: number }) {
  const { data: tasks, isLoading } = useListTasks(projectId, undefined, {
    query: {
      enabled: !!projectId,
      queryKey: getListTasksQueryKey(projectId),
    },
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: users } = useListUsers({
    query: { queryKey: ["users"], staleTime: 60_000 },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [open, setOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskForDialog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      status: "ikke_startet",
      priority: "middels",
      dueDate: "",
      assigneeId: "",
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    createTask.mutate(
      {
        projectId,
        data: {
          title: data.title,
          description: data.description || undefined,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
          assigneeId: data.assigneeId && data.assigneeId !== "none" ? Number(data.assigneeId) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Oppgave opprettet" });
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({
            queryKey: getListTasksQueryKey(projectId),
          });
          invalidateProjectOverviews(queryClient);
        },
      }
    );
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate(
      { projectId, id: taskId, data: { status: newStatus as TaskStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListTasksQueryKey(projectId),
          });
          invalidateProjectOverviews(queryClient);
        },
      }
    );
  };

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks?.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as number;
    const newStatus = over.id as string;
    const validStatuses: TaskStatus[] = [
      "ikke_startet",
      "pagaar",
      "venter",
      "fullfort",
    ];

    if (!validStatuses.includes(newStatus as TaskStatus)) return;

    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    handleStatusChange(taskId, newStatus);
  };

  const columns: TaskStatus[] = [
    "ikke_startet",
    "pagaar",
    "venter",
    "fullfort",
  ];

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={view === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" /> Kanban
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <LayoutList className="h-4 w-4 mr-2" /> Liste
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Ny oppgave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ny oppgave</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tittel</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(taskStatusMap).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v.label}
                              </SelectItem>
                            ))}
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(taskPriorityMap).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frist</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tildelt</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Ingen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Ingen</SelectItem>
                            {users?.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Opprett"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {view === "kanban" ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {columns.map((col) => {
              const colTasks = tasks?.filter((t) => t.status === col) || [];
              return (
                <KanbanColumn
                  key={col}
                  colKey={col}
                  tasks={colTasks}
                  onStatusChange={handleStatusChange}
                  onOpenTask={handleOpenTask}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="rotate-2 shadow-2xl opacity-95 w-full">
                <TaskCardContent
                  task={activeTask}
                  onStatusChange={() => {}}
                  showControls={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="border rounded-md bg-card">
          <div className="p-4 flex flex-col gap-2">
            {tasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleOpenTask(task)}
              >
                <div className="flex items-center gap-4">
                  <Select
                    value={task.status}
                    onValueChange={(v) => handleStatusChange(task.id, v)}
                  >
                    <SelectTrigger
                      className={`w-[130px] h-8 ${taskStatusMap[task.status]?.color}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(taskStatusMap).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="font-medium">{task.title}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={taskPriorityMap[task.priority]?.color}
                  >
                    {taskPriorityMap[task.priority]?.label}
                  </Badge>
                  <div className="flex items-center gap-1 w-24">
                    <Calendar className="h-3 w-3" />
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString("no-NO")
                      : "-"}
                  </div>
                  <div className="w-24 truncate text-right">
                    {task.assigneeName || "-"}
                  </div>
                </div>
              </div>
            ))}
            {tasks?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Ingen oppgaver.
              </div>
            )}
          </div>
        </div>
      )}

      <TaskDetailDialog
        task={selectedTask}
        projectId={projectId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
