import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  description: z.string().optional(),
  businessUnit: z.string().optional(),
  status: z.enum(["ide", "pagaende", "pause", "fullfort", "avsluttet"]).default("ide"),
  goalSavingsValue: z.coerce.number().optional(),
  goalSavingsUnit: z.enum(["kr", "timer"]).default("kr"),
  estimatedHours: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProjectNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProject = useCreateProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      businessUnit: "",
      status: "ide",
      goalSavingsUnit: "kr",
    },
  });

  const onSubmit = (data: FormValues) => {
    createProject.mutate({
      data: {
        ...data,
      }
    }, {
      onSuccess: (project) => {
        toast({ title: "Prosjekt opprettet" });
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        toast({ title: "Feil", description: "Kunne ikke opprette prosjekt", variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nytt Prosjekt</h1>
          <p className="text-muted-foreground">Opprett et nytt digitaliserings- eller AI-prosjekt.</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prosjektnavn</FormLabel>
                    <FormControl>
                      <Input placeholder="F.eks. AI for kundeservice" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Textarea placeholder="Beskriv prosjektets mål og omfang..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="businessUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forretningsenhet</FormLabel>
                      <FormControl>
                        <Input placeholder="F.eks. IT, HR, Salg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ide">Idé</SelectItem>
                          <SelectItem value="pagaende">Pågående</SelectItem>
                          <SelectItem value="pause">Pause</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="goalSavingsValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Målbesparelse</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goalSavingsUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enhet for besparelse</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg enhet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kr">NOK (kr)</SelectItem>
                          <SelectItem value="timer">Timer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/projects")}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Opprett prosjekt
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </AppLayout>
  );
}