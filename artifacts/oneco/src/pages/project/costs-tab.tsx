import {
  getGetProjectQueryKey,
  getListCostsQueryKey,
  useCreateCost,
  useDeleteCost,
  useListCosts,
  useUpdateCost,
} from "@workspace/api-client-react";
import type { CostEntry } from "@workspace/api-client-react";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { invalidateProjectOverviews } from "@/lib/invalidate-project-overviews";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const schema = z.object({
  date: z.string().min(1, "Dato er påkrevd"),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  value: z.coerce.number().min(0, "Må være et tall"),
});

export function CostsTab({ projectId }: { projectId: number }) {
  const { data: costs, isLoading } = useListCosts(projectId, { query: { enabled: !!projectId, queryKey: getListCostsQueryKey(projectId) } });
  const createCost = useCreateCost();
  const updateCost = useUpdateCost();
  const deleteCost = useDeleteCost();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CostEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostEntry | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      value: 0,
    },
  });

  const editForm = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      description: "",
      value: 0,
    },
  });

  const refreshCostData = () => {
    void queryClient.invalidateQueries({ queryKey: getListCostsQueryKey(projectId) });
    void queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    invalidateProjectOverviews(queryClient);
  };

  const onSubmit = (data: z.infer<typeof schema>) => {
    createCost.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          toast({ title: "Kostnad lagt til" });
          setShowForm(false);
          form.reset();
          refreshCostData();
        },
        onError: () => toast({ title: "Kunne ikke legge til kostnad", variant: "destructive" }),
      }
    );
  };

  const openEdit = (cost: CostEntry) => {
    setEditTarget(cost);
    editForm.reset({
      date: cost.date.split("T")[0],
      description: cost.description,
      value: Number(cost.value),
    });
  };

  const handleUpdate = (data: z.infer<typeof schema>) => {
    if (!editTarget) return;
    updateCost.mutate(
      { projectId, id: editTarget.id, data },
      {
        onSuccess: () => {
          toast({ title: "Kostnad oppdatert" });
          setEditTarget(null);
          refreshCostData();
        },
        onError: () => toast({ title: "Kunne ikke oppdatere kostnaden", variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCost.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Kostnad slettet" });
          setDeleteTarget(null);
          refreshCostData();
        },
        onError: () => toast({ title: "Kunne ikke slette kostnaden", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Kostnader</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Legg til kostnad
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-md">
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium">Ny kostnad</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Beskrivelse</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dato</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verdi (NOK)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createCost.isPending}>
                    {createCost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Lagre"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead>Beskrivelse</TableHead>
              <TableHead>Registrert av</TableHead>
              <TableHead className="text-right">Verdi</TableHead>
              <TableHead className="w-[96px] text-right">Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : costs?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Ingen kostnader registrert.</TableCell></TableRow>
            ) : (
              costs?.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>{formatDate(cost.date)}</TableCell>
                  <TableCell className="font-medium">{cost.description}</TableCell>
                  <TableCell>{cost.registeredByName}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(cost.value)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`Rediger ${cost.description}`}
                        aria-label={`Rediger ${cost.description}`}
                        disabled={updateCost.isPending || deleteCost.isPending}
                        onClick={() => openEdit(cost)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        title={`Slett ${cost.description}`}
                        aria-label={`Slett ${cost.description}`}
                        disabled={updateCost.isPending || deleteCost.isPending}
                        onClick={() => setDeleteTarget(cost)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && !updateCost.isPending && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rediger kostnad</DialogTitle>
            <DialogDescription>Oppdater dato, beskrivelse eller verdi.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beskrivelse</FormLabel>
                    <FormControl><Input {...field} disabled={updateCost.isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dato</FormLabel>
                      <FormControl><Input type="date" {...field} disabled={updateCost.isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verdi (NOK)</FormLabel>
                      <FormControl><Input type="number" {...field} disabled={updateCost.isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={updateCost.isPending} onClick={() => setEditTarget(null)}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={updateCost.isPending}>
                  {updateCost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Lagre endringer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleteCost.isPending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett kostnad?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `«${deleteTarget.description}» på ${formatCurrency(deleteTarget.value)} slettes permanent. Handlingen kan ikke angres.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCost.isPending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteCost.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteCost.isPending ? "Sletter..." : "Slett kostnad"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}