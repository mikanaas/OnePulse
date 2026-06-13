import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  email: z.string().email("Ugyldig e-postadresse"),
  systemRole: z.enum(["admin", "user"]).default("user"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminUserNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createUser = useCreateUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      systemRole: "user",
    },
  });

  const onSubmit = (data: FormValues) => {
    createUser.mutate({
      data
    }, {
      onSuccess: () => {
        toast({ title: "Bruker opprettet" });
        setLocation("/admin");
      },
      onError: () => {
        toast({ title: "Feil", description: "Kunne ikke opprette bruker", variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny Bruker</h1>
          <p className="text-muted-foreground">Legg til en ny bruker i systemet.</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fullt navn</FormLabel>
                    <FormControl>
                      <Input placeholder="F.eks. Ola Nordmann" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-postadresse</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ola@oneco.no" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg rolle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Bruker</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/admin")}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Opprett bruker
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </AppLayout>
  );
}