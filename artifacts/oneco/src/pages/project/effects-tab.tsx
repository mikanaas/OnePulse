import {
  getGetProjectQueryKey,
  getListEffectsQueryKey,
  useCreateEffect,
  useDeleteEffect,
  useListEffects,
  useParseEffect,
  useUpdateEffect,
} from "@workspace/api-client-react";
import type { EffectEntry } from "@workspace/api-client-react";
import { useState } from "react";
import { formatCurrency, formatDate, effectTypeMap, confidenceMap } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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
  unit: z.enum(["kr", "timer"]),
  type: z.enum(["engangs", "lopende_arlig"]),
  confidenceLevel: z.enum(["lav", "middels", "hoy"]),
});

export function EffectsTab({ projectId }: { projectId: number }) {
  const { data: effects, isLoading } = useListEffects(projectId, { query: { enabled: !!projectId, queryKey: getListEffectsQueryKey(projectId) } });
  const createEffect = useCreateEffect();
  const updateEffect = useUpdateEffect();
  const deleteEffect = useDeleteEffect();
  const parseEffect = useParseEffect();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [aiText, setAiText] = useState("");
  const [editTarget, setEditTarget] = useState<EffectEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EffectEntry | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      value: 0,
      unit: "kr",
      type: "engangs",
      confidenceLevel: "middels",
    },
  });

  const editForm = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      description: "",
      value: 0,
      unit: "kr",
      type: "engangs",
      confidenceLevel: "middels",
    },
  });

  const refreshEffectData = () => {
    void queryClient.invalidateQueries({ queryKey: getListEffectsQueryKey(projectId) });
    void queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    invalidateProjectOverviews(queryClient);
  };

  const onSubmit = (data: z.infer<typeof schema>) => {
    createEffect.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          toast({ title: "Effekt lagt til" });
          setShowForm(false);
          form.reset();
          refreshEffectData();
        },
        onError: () => toast({ title: "Kunne ikke legge til effekt", variant: "destructive" }),
      }
    );
  };

  const openEdit = (effect: EffectEntry) => {
    setEditTarget(effect);
    editForm.reset({
      date: effect.date.split("T")[0],
      description: effect.description,
      value: Number(effect.value),
      unit: effect.unit,
      type: effect.type,
      confidenceLevel: effect.confidenceLevel,
    });
  };

  const handleUpdate = (data: z.infer<typeof schema>) => {
    if (!editTarget) return;
    updateEffect.mutate(
      { projectId, id: editTarget.id, data },
      {
        onSuccess: () => {
          toast({ title: "Effekt oppdatert" });
          setEditTarget(null);
          refreshEffectData();
        },
        onError: () => toast({ title: "Kunne ikke oppdatere effekten", variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteEffect.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Effekt slettet" });
          setDeleteTarget(null);
          refreshEffectData();
        },
        onError: () => toast({ title: "Kunne ikke slette effekten", variant: "destructive" }),
      },
    );
  };

  const handleAiParse = () => {
    if (!aiText.trim()) return;
    parseEffect.mutate(
      { data: { text: aiText } },
      {
        onSuccess: (parsed) => {
          form.setValue("description", parsed.description);
          form.setValue("value", parsed.value);
          form.setValue("unit", parsed.unit);
          form.setValue("type", parsed.type);
          form.setValue("confidenceLevel", parsed.confidenceLevel);
          toast({ title: "Tekst tolket!" });
          setAiText("");
        },
        onError: () => {
          toast({ title: "Kunne ikke tolke tekst", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Effekter & Besparelser</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Legg til effekt
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-md">
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium">Ny effekt</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary font-medium mb-1">
                <Wand2 className="h-4 w-4" /> AI Assistent
              </div>
              <p className="text-sm text-muted-foreground">Beskriv besparelsen med egne ord, så fyller AI-en ut skjemaet for deg.</p>
              <div className="flex gap-2">
                <Textarea 
                  placeholder="F.eks: Vi sparer 500 timer i året fra 1. august på grunn av den nye rutinen. Dette er ganske sikkert."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  className="bg-background"
                />
              </div>
              <Button onClick={handleAiParse} disabled={!aiText.trim() || parseEffect.isPending} variant="secondary">
                {parseEffect.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Tolk fritekst"}
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
                        <FormLabel>Verdi</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enhet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="kr">NOK (kr)</SelectItem>
                            <SelectItem value="timer">Timer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="engangs">Engangsbesparelse</SelectItem>
                            <SelectItem value="lopende_arlig">Løpende årlig</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confidenceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sikkerhetsnivå</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="lav">Lav</SelectItem>
                            <SelectItem value="middels">Middels</SelectItem>
                            <SelectItem value="hoy">Høy</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createEffect.isPending}>
                    {createEffect.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Lagre"}
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
              <TableHead>Type</TableHead>
              <TableHead>Sikkerhet</TableHead>
              <TableHead>Registrert av</TableHead>
              <TableHead className="text-right">Verdi</TableHead>
              <TableHead className="w-[96px] text-right">Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : effects?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Ingen effekter registrert.</TableCell></TableRow>
            ) : (
              effects?.map((effect) => (
                <TableRow key={effect.id}>
                  <TableCell>{formatDate(effect.date)}</TableCell>
                  <TableCell className="font-medium">{effect.description}</TableCell>
                  <TableCell>{effectTypeMap[effect.type]}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      effect.confidenceLevel === "hoy" ? "bg-emerald-100 text-emerald-800" :
                      effect.confidenceLevel === "middels" ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {confidenceMap[effect.confidenceLevel]}
                    </Badge>
                  </TableCell>
                  <TableCell>{effect.registeredByName}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {effect.unit === "kr" ? formatCurrency(effect.value) : `${effect.value} timer`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`Rediger ${effect.description}`}
                        aria-label={`Rediger ${effect.description}`}
                        disabled={updateEffect.isPending || deleteEffect.isPending}
                        onClick={() => openEdit(effect)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        title={`Slett ${effect.description}`}
                        aria-label={`Slett ${effect.description}`}
                        disabled={updateEffect.isPending || deleteEffect.isPending}
                        onClick={() => setDeleteTarget(effect)}
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
        onOpenChange={(open) => !open && !updateEffect.isPending && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rediger effekt</DialogTitle>
            <DialogDescription>Oppdater opplysningene for effekten.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beskrivelse</FormLabel>
                    <FormControl><Input {...field} disabled={updateEffect.isPending} /></FormControl>
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
                      <FormControl><Input type="date" {...field} disabled={updateEffect.isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verdi</FormLabel>
                      <FormControl><Input type="number" {...field} disabled={updateEffect.isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enhet</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={updateEffect.isPending}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="kr">NOK (kr)</SelectItem>
                          <SelectItem value="timer">Timer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={updateEffect.isPending}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="engangs">Engangsbesparelse</SelectItem>
                          <SelectItem value="lopende_arlig">Løpende årlig</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="confidenceLevel"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Sikkerhetsnivå</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={updateEffect.isPending}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="lav">Lav</SelectItem>
                          <SelectItem value="middels">Middels</SelectItem>
                          <SelectItem value="hoy">Høy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={updateEffect.isPending} onClick={() => setEditTarget(null)}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={updateEffect.isPending}>
                  {updateEffect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Lagre endringer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleteEffect.isPending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett effekt?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `«${deleteTarget.description}» slettes permanent. Handlingen kan ikke angres.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEffect.isPending}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteEffect.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteEffect.isPending ? "Sletter..." : "Slett effekt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}