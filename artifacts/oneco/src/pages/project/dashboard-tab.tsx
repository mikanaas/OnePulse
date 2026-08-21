import { useState } from "react";
import {
  useGetProject,
  useUpdateProject,
  useListTasks,
  useListEffects,
  useListUsers,
  getGetProjectQueryKey,
  getListTasksQueryKey,
  getListEffectsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Calendar, Target, Clock, Pencil, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export function DashboardTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: tasks = [] } = useListTasks(projectId, undefined, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey(projectId) },
  });
  const { data: effects = [] } = useListEffects(projectId, {
    query: { enabled: !!projectId, queryKey: getListEffectsQueryKey(projectId) },
  });
  const { data: users = [] } = useListUsers({ query: { queryKey: ["users"], staleTime: 60_000 } });
  const updateProject = useUpdateProject();

  const doneTasks = tasks.filter((t) => t.status === "fullfort").length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  function save(data: Record<string, unknown>, onClose: () => void) {
    updateProject.mutate(
      { id: projectId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Lagret" });
          onClose();
        },
        onError: () => toast({ title: "Lagring feilet", variant: "destructive" }),
      }
    );
  }

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;
  if (!project) return null;

  const goalUnit = project.goalSavingsUnit === "timer" ? "timer" : "kr";
  const comparableEffects = effects.filter((effect) => effect.unit === goalUnit);
  const realizedSavings = comparableEffects.reduce((total, effect) => total + Number(effect.value), 0);
  const otherUnitEffects = effects.length - comparableEffects.length;
  const formatSavings = (value: number) =>
    goalUnit === "timer" ? `${formatNumber(value)} timer` : formatCurrency(value);

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ─── Ansvarlig ─── */}
        <EditableCard
          title="Ansvarlig"
          icon={<Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />}
          renderView={() => (
            <>
              <div className="text-xl font-bold truncate leading-tight">
                {project.ownerName || "Ikke tildelt"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Forretningsområde: {project.businessUnit || "–"}
              </p>
            </>
          )}
          renderForm={(close) => (
            <AnsvarligForm
              ownerId={project.ownerId ?? null}
              businessUnit={project.businessUnit ?? ""}
              users={users}
              saving={updateProject.isPending}
              onSave={(vals) => save(vals, close)}
              onCancel={close}
            />
          )}
        />

        {/* ─── Målbesparelse ─── */}
        <EditableCard
          title="Målbesparelse"
          icon={<Target className="h-4 w-4 text-muted-foreground shrink-0" />}
          renderView={() => (
            <>
              <div className="text-xl font-bold truncate leading-tight">
                {project.goalSavingsValue
                  ? project.goalSavingsUnit === "kr"
                    ? formatCurrency(project.goalSavingsValue)
                    : `${formatNumber(project.goalSavingsValue)} timer`
                  : "–"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {project.goalText || "Ingen målbeskrivelse"}
              </p>
            </>
          )}
          renderForm={(close) => (
            <MaalbesparelseForm
              goalSavingsValue={project.goalSavingsValue ?? null}
              goalSavingsUnit={(project.goalSavingsUnit as "kr" | "timer") ?? "kr"}
              goalText={project.goalText ?? ""}
              saving={updateProject.isPending}
              onSave={(vals) => save(vals, close)}
              onCancel={close}
            />
          )}
        />

        {/* ─── Fremdrift oppgaver (live, read-only) ─── */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium leading-snug">Fremdrift oppgaver</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-xl font-bold truncate leading-tight">
              {doneTasks} / {totalTasks}
            </div>
            <Progress value={progressPct} className="h-1.5 mt-2 mb-1" />
            <p className="text-xs text-muted-foreground">{progressPct} % fullført</p>
          </CardContent>
        </Card>

        {/* ─── Tidsramme ─── */}
        <EditableCard
          title="Tidsramme"
          icon={<Calendar className="h-4 w-4 text-muted-foreground shrink-0" />}
          renderView={() => (
            <>
              <div className="text-xl font-bold truncate leading-tight">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString("no-NO")
                  : "–"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Til{" "}
                {project.plannedEndDate
                  ? new Date(project.plannedEndDate).toLocaleDateString("no-NO")
                  : "–"}
              </p>
            </>
          )}
          renderForm={(close) => (
            <TidsrammeForm
              startDate={project.startDate ?? ""}
              plannedEndDate={project.plannedEndDate ?? ""}
              saving={updateProject.isPending}
              onSave={(vals) => save(vals, close)}
              onCancel={close}
            />
          )}
        />
      </div>

      {/* Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Realisert vs Mål</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[{ name: "Besparelser", Realisert: realizedSavings, Mål: project.goalSavingsValue || 0 }]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(val) => goalUnit === "timer" ? `${formatNumber(val)}` : `${(val / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(val: number) => formatSavings(val)} />
                  <Legend />
                  <Bar dataKey="Realisert" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Mål" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Realisert: {formatSavings(realizedSavings)} basert på {comparableEffects.length} registrerte effekt{comparableEffects.length === 1 ? "" : "er"}.
              {otherUnitEffects > 0 && ` ${otherUnitEffects} effekt${otherUnitEffects === 1 ? "" : "er"} i en annen enhet er ikke med i denne sammenligningen.`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── EditableCard wrapper ──────────────────────────────────────────────────────

function EditableCard({
  title,
  icon,
  renderView,
  renderForm,
}: {
  title: string;
  icon: React.ReactNode;
  renderView: () => React.ReactNode;
  renderForm: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="min-w-0 group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <CardTitle className="text-sm font-medium leading-snug">{title}</CardTitle>
        <div className="flex items-center gap-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                title={`Rediger ${title.toLowerCase()}`}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              {renderForm(() => setOpen(false))}
            </PopoverContent>
          </Popover>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="min-w-0">{renderView()}</CardContent>
    </Card>
  );
}

// ─── Ansvarlig form ────────────────────────────────────────────────────────────

function AnsvarligForm({
  ownerId, businessUnit, users, saving, onSave, onCancel,
}: {
  ownerId: number | null;
  businessUnit: string;
  users: { id: number; name: string | null; email: string }[];
  saving: boolean;
  onSave: (vals: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [owner, setOwner] = useState(ownerId ? String(ownerId) : "none");
  const [unit, setUnit] = useState(businessUnit);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Rediger ansvarlig</p>
      <div className="space-y-1">
        <Label className="text-xs">Ansvarlig person</Label>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Velg person" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ingen</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Forretningsområde</Label>
        <Input className="h-8 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="F.eks. IT, Finans" />
      </div>
      <FormActions saving={saving} onSave={() => onSave({ ownerId: owner !== "none" ? Number(owner) : null, businessUnit: unit })} onCancel={onCancel} />
    </div>
  );
}

// ─── Målbesparelse form ────────────────────────────────────────────────────────

function MaalbesparelseForm({
  goalSavingsValue, goalSavingsUnit, goalText, saving, onSave, onCancel,
}: {
  goalSavingsValue: number | null;
  goalSavingsUnit: "kr" | "timer";
  goalText: string;
  saving: boolean;
  onSave: (vals: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(goalSavingsValue != null ? String(goalSavingsValue) : "");
  const [unit, setUnit] = useState<"kr" | "timer">(goalSavingsUnit);
  const [text, setText] = useState(goalText);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Rediger målbesparelse</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Verdi</Label>
          <Input className="h-8 text-sm" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Enhet</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as "kr" | "timer")}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kr">kr</SelectItem>
              <SelectItem value="timer">timer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Målbeskrivelse</Label>
        <Input className="h-8 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hva er målet?" />
      </div>
      <FormActions
        saving={saving}
        onSave={() => onSave({ goalSavingsValue: value ? Number(value) : null, goalSavingsUnit: unit, goalText: text })}
        onCancel={onCancel}
      />
    </div>
  );
}

// ─── Tidsramme form ────────────────────────────────────────────────────────────

function TidsrammeForm({
  startDate, plannedEndDate, saving, onSave, onCancel,
}: {
  startDate: string;
  plannedEndDate: string;
  saving: boolean;
  onSave: (vals: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [start, setStart] = useState(startDate ? startDate.split("T")[0] : "");
  const [end, setEnd] = useState(plannedEndDate ? plannedEndDate.split("T")[0] : "");

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Rediger tidsramme</p>
      <div className="space-y-1">
        <Label className="text-xs">Startdato</Label>
        <Input className="h-8 text-sm" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Planlagt slutt</Label>
        <Input className="h-8 text-sm" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <FormActions saving={saving} onSave={() => onSave({ startDate: start || null, plannedEndDate: end || null })} onCancel={onCancel} />
    </div>
  );
}

// ─── Shared save/cancel buttons ────────────────────────────────────────────────

function FormActions({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" className="flex-1 h-8 gap-1" onClick={onSave} disabled={saving}>
        {saving ? <span className="text-xs">Lagrer…</span> : <><Check className="h-3.5 w-3.5" /> Lagre</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 px-3" onClick={onCancel} disabled={saving}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
