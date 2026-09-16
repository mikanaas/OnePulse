import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useRegisterExistingProject, 
  useImportExistingProjects, 
  downloadExistingProjectTemplate,
  useListUsers,
  getListProjectsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Download, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(1, "Prosjektnavn er påkrevd"),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  businessUnit: z.string().min(1, "Forretningsområde er påkrevd"),
  ownerId: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  projectOwner: z.string().min(1, "Prosjekteier er påkrevd"),
  techOwner: z.string().optional(),
  contactEmail: z.string().email("Ugyldig e-post").or(z.literal("")).optional(),
  status: z.enum(["pagaende", "pause", "fullfort", "i_drift"]).optional(),
  startDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  platformTools: z.string().optional(),
  systemIntegrations: z.string().optional(),
  integrationDataFlow: z.string().optional(),
  projectDependencies: z.string().optional(),
  dataTypes: z.string().optional(),
  dataStorage: z.string().optional(),
  dataGeography: z.string().optional(),
  dataRetention: z.string().optional(),
  personalData: z.enum(["ja", "nei", "ukjent"]).optional(),
  sensitiveData: z.enum(["ja", "nei", "ukjent"]).optional(),
  aiVendor: z.string().optional(),
  humanInLoop: z.string().optional(),
  riskClassification: z.enum(["lav", "middels", "høy"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProjectRegisterExisting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [showDetails, setShowDetails] = useState(false);

  // Hooks
  const { data: users, isLoading: usersLoading } = useListUsers({ query: { queryKey: ["users"] } });
  const registerMutation = useRegisterExistingProject();
  const importMutation = useImportExistingProjects();

  // Local state for bulk import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      businessUnit: "",
      projectOwner: "",
      techOwner: "",
      contactEmail: "",
      status: "pagaende",
      platformTools: "",
      systemIntegrations: "",
      integrationDataFlow: "",
      projectDependencies: "",
      dataTypes: "",
      dataStorage: "",
      dataGeography: "",
      dataRetention: "",
      personalData: "ukjent",
      sensitiveData: "ukjent",
      aiVendor: "",
      humanInLoop: "",
    },
  });

  const onSubmitSingle = (values: FormValues) => {
    // Filter out empty strings for optional fields if needed, 
    // but the API schema handles them gracefully or they just get saved as empty strings.
    const payload = {
      ...values,
      ownerId: values.ownerId,
      status: values.status || undefined,
      personalData: values.personalData || undefined,
      sensitiveData: values.sensitiveData || undefined,
      riskClassification: values.riskClassification || undefined,
    };

    registerMutation.mutate({ data: payload }, {
      onSuccess: (project) => {
        toast({ title: "Prosjekt registrert", description: "Løsningen ble lagt til i porteføljen." });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        toast({ title: "Kunne ikke registrere", description: "En feil oppstod under lagring.", variant: "destructive" });
      }
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadExistingProjectTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Eksisterende_AI_Prosjekter_Mal.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toast({ title: "Nedlasting feilet", description: "Kunne ikke hente malen.", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Filen er for stor", description: "Maksimal filstørrelse er 5 MB.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      
      if (base64) {
        importMutation.mutate({ data: { fileBase64: base64 } }, {
          onSuccess: (res) => {
            setImportResult(res);
            queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
            toast({ title: "Import fullført" });
            if (fileInputRef.current) fileInputRef.current.value = "";
          },
          onError: () => {
            toast({ title: "Import feilet", description: "Filen kunne ikke behandles.", variant: "destructive" });
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrer eksisterende AI-prosjekt</h1>
            <p className="text-muted-foreground mt-1">
              Legg til et pågående eller fullført AI-initiativ i porteføljen.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "single" | "bulk")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Enkeltregistrering</TabsTrigger>
            <TabsTrigger value="bulk">Masseimport via Excel</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitSingle)} className="space-y-8">
                
                {/* Prosjektinformasjon */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generell Informasjon</CardTitle>
                    <CardDescription>Kjerneinformasjon om initiativet</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Løsningens navn *</FormLabel>
                        <FormControl><Input placeholder="F.eks. Copilot for Kundesenter" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Beskrivelse *</FormLabel>
                        <FormControl><Textarea className="min-h-[80px]" placeholder="Hva løser denne applikasjonen?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="businessUnit" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forretningsområde *</FormLabel>
                        <FormControl><Input placeholder="F.eks. IT, HR, Salg" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nåværende Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Velg status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pagaende">Pågående</SelectItem>
                            <SelectItem value="pause">På pause</SelectItem>
                            <SelectItem value="fullfort">Fullført</SelectItem>
                            <SelectItem value="i_drift">I drift / Produksjon</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Startdato</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="plannedEndDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planlagt/Faktisk Sluttdato</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* Eierskap og Roller */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Eierskap og Roller</CardTitle>
                    <CardDescription>Hvem er ansvarlig for løsningen</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="projectOwner" render={({ field }) => (
                      <FormItem>
                        <FormLabel>System/Prosjekteier *</FormLabel>
                        <FormControl><Input placeholder="Navn på ansvarlig eier" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ownerId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Koble til bruker i portalen</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger disabled={usersLoading}>
                              <SelectValue placeholder={usersLoading ? "Laster brukere..." : "Velg bruker (valgfritt)"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="techOwner" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teknisk ansvarlig</FormLabel>
                        <FormControl><Input placeholder="Navn på teknisk eier" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contactEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontakt e-post</FormLabel>
                        <FormControl><Input type="email" placeholder="epost@oneco.no" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {!showDetails && (
                  <Card className="border-primary/25 bg-primary/5">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">Grunnregistreringen er klar</p>
                        <p className="text-sm text-muted-foreground">
                          Registrer nå, eller legg til data, integrasjoner og risikovurdering med en gang.
                        </p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setShowDetails(true)}>
                        Legg til kartlegging
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {showDetails && <>
                {/* Teknologi og Integrasjoner */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Teknologi og Integrasjoner</CardTitle>
                    <CardDescription>Verktøy, plattformer og tekniske avhengigheter</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="platformTools" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plattform og Verktøy</FormLabel>
                        <FormControl><Textarea className="h-20" placeholder="F.eks. Azure OpenAI, LangChain, React" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="systemIntegrations" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Systemintegrasjoner</FormLabel>
                        <FormControl><Textarea className="h-20" placeholder="F.eks. SharePoint, CRM" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="integrationDataFlow" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dataflyt og API</FormLabel>
                        <FormControl><Textarea className="h-20" placeholder="Beskriv hovedlinjene for dataflyt" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="projectDependencies" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prosjektavhengigheter</FormLabel>
                        <FormControl><Textarea className="h-20" placeholder="Knyttet til andre pågående løp?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* Data og Personvern */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Data og Personvern</CardTitle>
                    <CardDescription>Informasjon om dataene løsningen behandler</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="dataTypes" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Hovedtyper av data</FormLabel>
                        <FormControl><Input placeholder="F.eks. finansdata, kundehistorikk, interne styringsdokumenter" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dataStorage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datalagring (System/Tjeneste)</FormLabel>
                        <FormControl><Input placeholder="F.eks. Azure SQL, lokal filserver" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dataGeography" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geografisk Plassering</FormLabel>
                        <FormControl><Input placeholder="F.eks. Norge, EU/EØS, USA" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="personalData" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Behandler personopplysninger?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ja">Ja</SelectItem>
                            <SelectItem value="nei">Nei</SelectItem>
                            <SelectItem value="ukjent">Ukjent / Ikke avklart</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sensitiveData" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Behandler sensitive personopplysninger?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ja">Ja</SelectItem>
                            <SelectItem value="nei">Nei</SelectItem>
                            <SelectItem value="ukjent">Ukjent / Ikke avklart</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dataRetention" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Lagringstid / Sletterutiner</FormLabel>
                        <FormControl><Input placeholder="Beskriv hvor lenge data bevares" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* AI og Risiko */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI og Risiko</CardTitle>
                    <CardDescription>Systemspesifikke AI-parametere</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="aiVendor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI-Leverandør / Modell</FormLabel>
                        <FormControl><Input placeholder="F.eks. OpenAI GPT-4, Anthropic Claude" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="riskClassification" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risikoklassifisering</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Velg risikonivå" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lav">Lav</SelectItem>
                            <SelectItem value="middels">Middels</SelectItem>
                            <SelectItem value="høy">Høy</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="humanInLoop" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Menneskelig kontroll (Human in the Loop)</FormLabel>
                        <FormControl><Textarea className="h-20" placeholder="Hvordan overvåkes eller kvalitetssikres beslutninger/output?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
                </>}

                <div className="flex justify-end gap-4">
                  <Button variant="outline" type="button" onClick={() => setLocation("/projects")}>Avbryt</Button>
                  <Button type="submit" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Registrer prosjekt
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Importer fra Excel</CardTitle>
                <CardDescription>Har dere mange initiativer? Last ned vår Excel-mal, fyll inn dataene, og last opp filen her for å importere dem på én gang.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center p-6 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-base">Steg 1: Last ned mal</h3>
                    <p className="text-sm text-muted-foreground">Bruk vår standardiserte mal for å sikre at alle felt blir registrert riktig.</p>
                  </div>
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Last ned mal (.xlsx)
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center p-6 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-base">Steg 2: Last opp utfylt fil</h3>
                    <p className="text-sm text-muted-foreground">Velg den ferdig utfylte filen. Systemet vil validere innholdet ved import.</p>
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept=".xlsx" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                    />
                    <Button 
                      disabled={importMutation.isPending} 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                      Velg fil for import
                    </Button>
                  </div>
                </div>

                {importResult && (
                  <div className="space-y-4">
                    {importResult.created > 0 && (
                      <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-900">
                        <CheckCircle2 className="h-4 w-4 !text-green-600 dark:!text-green-400" />
                        <AlertTitle>Vellykket import</AlertTitle>
                        <AlertDescription>
                          {importResult.created} prosjekt{importResult.created > 1 ? "er" : ""} ble importert og lagret i porteføljen.
                        </AlertDescription>
                      </Alert>
                    )}

                    {importResult.errors && importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Noen rader kunne ikke importeres</AlertTitle>
                        <AlertDescription className="mt-2">
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            {importResult.errors.map((error, i) => (
                              <li key={i}>Rad {error.row}: {error.message}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}