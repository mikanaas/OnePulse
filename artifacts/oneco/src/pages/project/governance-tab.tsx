import {
  useGetGovernance,
  useGetProject,
  useUpdateProject,
  useUpsertGovernance,
  getGetGovernanceQueryKey,
  getGetProjectQueryKey,
  type ProjectGovernanceInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Users, Briefcase, Link2, ShieldAlert, CheckSquare, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

type FormValues = {
  projectOwner: string;
  techOwner: string;
  backupContact: string;
  lastReviewedAt: string;
  nextReviewAt: string;
  problemDescription: string;
  alternativesConsidered: string;
  strategicGoalLink: string;
  platformTools: string;
  systemIntegrations: string;
  projectDependencies: string;
  dataTypes: string;
  aiVendor: string;
  dataGeography: string;
  riskClassification: string;
  humanInLoop: string;
  governanceStatus: string;
  dpiaLink: string;
};

const RISK_LABELS: Record<string, string> = { lav: "Lav", middels: "Middels", høy: "Høy" };
const RISK_COLORS: Record<string, string> = {
  lav: "bg-emerald-100 text-emerald-800 border-emerald-200",
  middels: "bg-amber-100 text-amber-800 border-amber-200",
  høy: "bg-red-100 text-red-800 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  under_vurdering: "Under vurdering",
  godkjent_pilot: "Godkjent for pilot",
  godkjent_produksjon: "Godkjent for produksjon",
  amnesti: "Under amnesti-vurdering",
  avvikling: "Under avvikling",
};
const STATUS_COLORS: Record<string, string> = {
  under_vurdering: "bg-slate-100 text-slate-700 border-slate-200",
  godkjent_pilot: "bg-blue-100 text-blue-800 border-blue-200",
  godkjent_produksjon: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amnesti: "bg-amber-100 text-amber-800 border-amber-200",
  avvikling: "bg-red-100 text-red-800 border-red-200",
};

export function GovernanceTab({ projectId }: { projectId: number }) {
  const { data: governance, isLoading } = useGetGovernance(projectId, {
    query: { queryKey: getGetGovernanceQueryKey(projectId) },
  });
  const upsert = useUpsertGovernance();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      projectOwner: "",
      techOwner: "",
      backupContact: "",
      lastReviewedAt: "",
      nextReviewAt: "",
      problemDescription: "",
      alternativesConsidered: "",
      strategicGoalLink: "",
      platformTools: "",
      systemIntegrations: "",
      projectDependencies: "",
      dataTypes: "",
      aiVendor: "",
      dataGeography: "",
      riskClassification: "",
      humanInLoop: "",
      governanceStatus: "",
      dpiaLink: "",
    },
  });

  useEffect(() => {
    if (!governance) return;
    reset({
      projectOwner: governance.projectOwner ?? "",
      techOwner: governance.techOwner ?? "",
      backupContact: governance.backupContact ?? "",
      lastReviewedAt: governance.lastReviewedAt ?? "",
      nextReviewAt: governance.nextReviewAt ?? "",
      problemDescription: governance.problemDescription ?? "",
      alternativesConsidered: governance.alternativesConsidered ?? "",
      strategicGoalLink: governance.strategicGoalLink ?? "",
      platformTools: governance.platformTools ?? "",
      systemIntegrations: governance.systemIntegrations ?? "",
      projectDependencies: governance.projectDependencies ?? "",
      dataTypes: governance.dataTypes ?? "",
      aiVendor: governance.aiVendor ?? "",
      dataGeography: governance.dataGeography ?? "",
      riskClassification: governance.riskClassification ?? "",
      humanInLoop: governance.humanInLoop ?? "",
      governanceStatus: governance.governanceStatus ?? "",
      dpiaLink: governance.dpiaLink ?? "",
    });
  }, [governance, reset]);

  const riskVal = watch("riskClassification");
  const statusVal = watch("governanceStatus");

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const nulled = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === "" ? null : v])
      ) as unknown as ProjectGovernanceInput;
      await upsert.mutateAsync({ projectId, data: nulled });
      queryClient.invalidateQueries({ queryKey: getGetGovernanceQueryKey(projectId) });
      toast({ title: "Prosjektinformasjon lagret" });
    } catch {
      toast({ title: "Kunne ikke lagre", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Laster...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <ProjectGoalCard projectId={projectId} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Status-badges øverst */}
      <div className="flex flex-wrap gap-2">
        {riskVal && RISK_LABELS[riskVal] && (
          <Badge variant="outline" className={RISK_COLORS[riskVal]}>
            Risiko: {RISK_LABELS[riskVal]}
          </Badge>
        )}
        {statusVal && STATUS_LABELS[statusVal] && (
          <Badge variant="outline" className={STATUS_COLORS[statusVal]}>
            {STATUS_LABELS[statusVal]}
          </Badge>
        )}
        {governance?.updatedAt && (
          <span className="text-xs text-muted-foreground self-center ml-auto">
            Sist oppdatert {formatDate(governance.updatedAt)}
          </span>
        )}
      </div>

      {/* ── 1. Ansvar og kontinuitet ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Ansvar og kontinuitet
          </CardTitle>
          <CardDescription>Hvem er ansvarlig, og hvem tar over når noen slutter?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prosjekteier (forretningsmessig ansvarlig)">
              <Input placeholder="Navn / stilling" {...register("projectOwner")} />
            </Field>
            <Field label="Teknisk vedlikeholdsansvarlig">
              <Input placeholder="Navn / stilling" {...register("techOwner")} />
            </Field>
          </div>
          <Field label="Backup / stedfortreder">
            <Input placeholder="Hvem kan ta over hvis ansvarlig er borte?" {...register("backupContact")} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sist gjennomgått">
              <Input type="date" {...register("lastReviewedAt")} />
            </Field>
            <Field label="Neste planlagte gjennomgang">
              <Input type="date" {...register("nextReviewAt")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Forretningscase ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Forretningscase
          </CardTitle>
          <CardDescription>Hva løses, og hvorfor ble dette valgt?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Problembeskrivelse — hva løses, for hvem?">
            <Textarea
              rows={3}
              placeholder="Beskriv problemet eller muligheten prosjektet adresserer..."
              {...register("problemDescription")}
            />
          </Field>
          <Field label="Vurderte alternativer">
            <Textarea
              rows={3}
              placeholder="Bygget selv vs. eksisterende verktøy vs. ingenting — hva ble vurdert?"
              {...register("alternativesConsidered")}
            />
          </Field>
          <Field label="Kobling til strategisk mål / OKR">
            <Input placeholder="f.eks. Effektiviseringsmål 2025 — redusere manuelt arbeid med 30 %" {...register("strategicGoalLink")} />
          </Field>
        </CardContent>
      </Card>

      {/* ── 3. Tekniske koblinger og avhengigheter ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Tekniske koblinger og avhengigheter
          </CardTitle>
          <CardDescription>Hva brukes, og hva ryker hvis dette går ned?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Plattform / verktøy brukt">
            <Input placeholder="f.eks. Replit, n8n, Claude API, Power Automate..." {...register("platformTools")} />
          </Field>
          <Field label="Systemintegrasjoner">
            <Textarea
              rows={2}
              placeholder="f.eks. Landax, PeopleXact, Visma — hvilke systemer er det koblet til?"
              {...register("systemIntegrations")}
            />
          </Field>
          <Field label="Andre prosjektavhengigheter">
            <Textarea
              rows={2}
              placeholder="Andre prosjekter som er avhengige av dette, eller som dette er avhengig av"
              {...register("projectDependencies")}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── 4. Data og risiko ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Data og risiko
          </CardTitle>
          <CardDescription>Datasensitivitet, AI-bruk og risikoklassifisering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Datatyper som behandles">
            <Textarea
              rows={2}
              placeholder="Sendes persondata, ansattdata eller forretningssensitiv info til en AI-modell?"
              {...register("dataTypes")}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="AI-leverandør / modell">
              <Input placeholder="f.eks. Anthropic Claude 3.5, OpenAI GPT-4o..." {...register("aiVendor")} />
            </Field>
            <Field label="Datalagring / geografi">
              <Input placeholder="f.eks. EU (AWS Frankfurt), USA..." {...register("dataGeography")} />
            </Field>
          </div>
          <Field label="Grad av menneske-i-løypa">
            <Textarea
              rows={2}
              placeholder="Tar AI-en beslutninger direkte, eller godkjenner alltid et menneske output?"
              {...register("humanInLoop")}
            />
          </Field>
          <Field label="Risikoklassifisering">
            <Select
              value={riskVal || ""}
              onValueChange={(v) => setValue("riskClassification", v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg risikonivå..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Ikke klassifisert —</SelectItem>
                <SelectItem value="lav">Lav</SelectItem>
                <SelectItem value="middels">Middels</SelectItem>
                <SelectItem value="høy">Høy</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* ── 5. Godkjenningsstatus ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Godkjenningsstatus
          </CardTitle>
          <CardDescription>Status i governance-livssyklusen og dokumentasjon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Governance-status">
            <Select
              value={statusVal || ""}
              onValueChange={(v) => setValue("governanceStatus", v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Ikke satt —</SelectItem>
                <SelectItem value="under_vurdering">Under vurdering</SelectItem>
                <SelectItem value="godkjent_pilot">Godkjent for pilot</SelectItem>
                <SelectItem value="godkjent_produksjon">Godkjent for produksjon</SelectItem>
                <SelectItem value="amnesti">Under amnesti-vurdering</SelectItem>
                <SelectItem value="avvikling">Under avvikling</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Lenke til DPIA / risikovurdering / databehandleravtale">
            <Input placeholder="https://..." {...register("dpiaLink")} />
          </Field>
        </CardContent>
      </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lagre prosjektinformasjon
          </Button>
        </div>
      </form>
    </div>
  );
}

function ProjectGoalCard({ projectId }: { projectId: number }) {
  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [goalText, setGoalText] = useState("");
  const [goalValue, setGoalValue] = useState("");
  const [goalUnit, setGoalUnit] = useState<"kr" | "timer">("kr");
  const [goalDate, setGoalDate] = useState("");

  useEffect(() => {
    if (!project) return;
    setGoalText(project.goalText ?? "");
    setGoalValue(project.goalSavingsValue == null ? "" : String(project.goalSavingsValue));
    setGoalUnit(project.goalSavingsUnit === "timer" ? "timer" : "kr");
    setGoalDate(project.goalDate ?? "");
  }, [project]);

  const saveGoal = () => {
    updateProject.mutate(
      {
        id: projectId,
        data: {
          goalText: goalText.trim(),
          goalSavingsValue: goalValue === "" ? undefined : Number(goalValue),
          goalSavingsUnit: goalUnit,
          goalDate: goalDate || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Prosjektmål lagret" });
        },
        onError: () => toast({ title: "Kunne ikke lagre prosjektmål", variant: "destructive" }),
      },
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Mål med prosjektet
        </CardTitle>
        <CardDescription>
          Beskriv ønsket resultat utfyllende. Denne teksten vises i sin helhet her, mens oversikten beholder et kort sammendrag.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Laster prosjektmål...
          </div>
        ) : (
          <>
            <Field label="Målbeskrivelse">
              <Textarea
                rows={5}
                value={goalText}
                onChange={(event) => setGoalText(event.target.value)}
                placeholder="Beskriv hva prosjektet skal oppnå, hvem som får nytte av det og hvordan dere vet at målet er nådd..."
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Målverdi">
                <Input
                  type="number"
                  min={0}
                  value={goalValue}
                  onChange={(event) => setGoalValue(event.target.value)}
                  placeholder="F.eks. 1800000"
                />
              </Field>
              <Field label="Enhet">
                <Select value={goalUnit} onValueChange={(value) => setGoalUnit(value as "kr" | "timer")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kr">NOK (kr)</SelectItem>
                    <SelectItem value="timer">Timer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Måldato">
                <Input type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={saveGoal} disabled={updateProject.isPending}>
                {updateProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lagre prosjektmål
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
