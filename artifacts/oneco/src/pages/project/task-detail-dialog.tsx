import { useEffect } from "react";
import {
  useUpdateTask,
  useDeleteTask,
  useListUsers,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { taskStatusMap, taskPriorityMap } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { invalidateProjectOverviews } from "@/lib/invalidate-project-overviews";

const schema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().optional(),
  status: z.enum(["ikke_startet", "pagaar", "venter", "fullfort"]),
  priority: z.enum(["lav", "middels", "hoy"]),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

export type TaskForDialog = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
};

type Props = {
  task: TaskForDialog | null;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskDetailDialog({ task, projectId, open, onOpenChange }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: users } = useListUsers({
    query: { queryKey: ["users"], staleTime: 60_000 },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        status: task.status as z.infer<typeof schema>["status"],
        priority: task.priority as z.infer<typeof schema>["priority"],
        dueDate: task.dueDate
          ? task.dueDate.split("T")[0]
          : "",
        assigneeId: task.assigneeId != null ? String(task.assigneeId) : "none",
      });
    }
  }, [task, form]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    if (!task) return;
    updateTask.mutate(
      {
        projectId,
        id: task.id,
        data: {
          title: data.title,
          description: data.description || undefined,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate || null,
          assigneeId: data.assigneeId && data.assigneeId !== "none" ? Number(data.assigneeId) : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Oppgave oppdatert" });
          queryClient.invalidateQueries({
            queryKey: getListTasksQueryKey(projectId),
          });
          invalidateProjectOverviews(queryClient);
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Feil ved lagring", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate(
      { projectId, id: task.id },
      {
        onSuccess: () => {
          toast({ title: "Oppgave slettet" });
          queryClient.invalidateQueries({
            queryKey: getListTasksQueryKey(projectId),
          });
          invalidateProjectOverviews(queryClient);
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Feil ved sletting", variant: "destructive" });
        },
      }
    );
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Rediger oppgave</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Legg til en beskrivelse..."
                      className="resize-none"
                    />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="flex justify-between items-center pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Slett
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Slett oppgave?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette kan ikke angres. Oppgaven «{task.title}» vil bli
                      permanent slettet.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Slett
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Avbryt
                </Button>
                <Button type="submit" disabled={updateTask.isPending}>
                  {updateTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Lagre"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
