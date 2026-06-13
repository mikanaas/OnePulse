import { useListCosts, useCreateCost, getListCostsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  date: z.string().min(1, "Dato er påkrevd"),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  value: z.coerce.number().min(0, "Må være et tall"),
});

export function CostsTab({ projectId }: { projectId: number }) {
  const { data: costs, isLoading } = useListCosts(projectId, { query: { enabled: !!projectId, queryKey: getListCostsQueryKey(projectId) } });
  const createCost = useCreateCost();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      value: 0,
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    createCost.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          toast({ title: "Kostnad lagt til" });
          setShowForm(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListCostsQueryKey(projectId) });
        },
      }
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : costs?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Ingen kostnader registrert.</TableCell></TableRow>
            ) : (
              costs?.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>{formatDate(cost.date)}</TableCell>
                  <TableCell className="font-medium">{cost.description}</TableCell>
                  <TableCell>{cost.registeredByName}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(cost.value)}
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