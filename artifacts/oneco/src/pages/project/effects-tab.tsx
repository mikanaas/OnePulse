import { useListEffects, useCreateEffect, useParseEffect, getGetProjectQueryKey, getListEffectsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { formatCurrency, formatDate, effectTypeMap, confidenceMap } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  const parseEffect = useParseEffect();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [aiText, setAiText] = useState("");

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

  const onSubmit = (data: z.infer<typeof schema>) => {
    createEffect.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          toast({ title: "Effekt lagt til" });
          setShowForm(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListEffectsQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
      }
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : effects?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Ingen effekter registrert.</TableCell></TableRow>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}