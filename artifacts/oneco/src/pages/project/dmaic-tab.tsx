import { useState, useEffect, useCallback } from "react";
import { useGetDmaic, useUpsertDmaic } from "@workspace/api-client-react";
import type {
  DmaicDefine,
  DmaicMeasureRow,
  DmaicAnalyze,
  DmaicAnalyzeBreakdownRow,
  DmaicImprove,
  DmaicImproveItem,
  DmaicControlRow,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BRAND = "#4A1F55";

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  D: { bg: "#F6F4F8", border: "#D4CBDC", text: "#4A1F55", badge: "#6B4F78" },
  M: { bg: "#F4F6FA", border: "#C8D4E4", text: "#2D4A6B", badge: "#4A6A96" },
  A: { bg: "#FAF8F4", border: "#E0D8C4", text: "#5C4A28", badge: "#876E42" },
  I: { bg: "#F4F8F5", border: "#C4D8CC", text: "#274D3A", badge: "#467560" },
  C: { bg: "#F8F5F6", border: "#D8C8CC", text: "#55303A", badge: "#78505E" },
};

function PhaseCard({ phase, title, subtitle, children }: {
  phase: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const c = PHASE_COLORS[phase];
  return (
    <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: c.border }}>
      <div className="flex items-center gap-4 px-6 py-4" style={{ backgroundColor: c.bg }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0"
          style={{ backgroundColor: c.badge }}
        >
          {phase}
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: c.text }}>{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="bg-white px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{children}</p>;
}

interface EditableTableProps<T> {
  rows: T[];
  columns: { key: keyof T; label: string; placeholder?: string; type?: "text" | "number"; flex?: number }[];
  onChange: (rows: T[]) => void;
  addLabel: string;
  emptyRow: T;
}

function EditableTable<T extends Record<string, any>>({
  rows, columns, onChange, addLabel, emptyRow,
}: EditableTableProps<T>) {
  function update(idx: number, key: keyof T, value: any) {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: key === "minutes" ? Number(value) : value };
    onChange(next);
  }
  function remove(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...rows, { ...emptyRow }]);
  }

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2">
              {columns.map((col) => (
                <Input
                  key={String(col.key)}
                  type={col.type ?? "text"}
                  placeholder={col.placeholder ?? String(col.label)}
                  value={row[col.key] ?? ""}
                  onChange={(e) => update(idx, col.key, e.target.value)}
                  className="h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  style={{ flex: col.flex ?? 1 }}
                />
              ))}
              <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={add}
        className="h-8 text-xs gap-1.5 text-gray-500 hover:text-gray-800"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function SaveIndicator({ saved }: { saved: boolean }) {
  if (!saved) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Lagret
    </span>
  );
}

export function DmaicTab({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const QK = ["dmaic", projectId];

  const { data, isLoading } = useGetDmaic(projectId, { query: { queryKey: QK } });
  const upsert = useUpsertDmaic();

  // Local state per phase
  const [define, setDefine] = useState<DmaicDefine>({ problem: "", affected: "", frequency: "", consequence: "" });
  const [measure, setMeasure] = useState<DmaicMeasureRow[]>([]);
  const [analyze, setAnalyze] = useState<DmaicAnalyze>({ why: "", breakdown: [] });
  const [improve, setImprove] = useState<DmaicImprove>({ description: "", items: [] });
  const [control, setControl] = useState<DmaicControlRow[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.defineData)  setDefine(data.defineData as DmaicDefine);
    if (data.measureData) setMeasure((data.measureData as DmaicMeasureRow[]) ?? []);
    if (data.analyzeData) setAnalyze(data.analyzeData as DmaicAnalyze);
    if (data.improveData) setImprove(data.improveData as DmaicImprove);
    if (data.controlData) setControl((data.controlData as DmaicControlRow[]) ?? []);
  }, [data]);

  async function savePhase(phase: string, payload: any) {
    setSaving(true);
    try {
      await upsert.mutateAsync({ projectId, data: payload });
      await qc.invalidateQueries({ queryKey: QK });
      setSaved(s => ({ ...s, [phase]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [phase]: false })), 2000);
    } catch {
      toast({ title: "Kunne ikke lagre", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Laster DMAIC-analyse...</div>;
  }

  const totalMinutes = (analyze.breakdown ?? []).reduce((s, r) => s + (Number(r.minutes) || 0), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Intro banner */}
      <div className="rounded-xl px-5 py-4 text-sm flex items-start gap-3"
        style={{ backgroundColor: "#F5F4F6", border: "1px solid #DDD8E0", color: "#4A1F55" }}>
        <div>
          <p className="font-semibold mb-0.5">Six Sigma DMAIC-analyse</p>
          <p className="text-xs text-gray-500">
            Bruk denne strukturerte metodikken for å definere, måle, analysere, forbedre og kontrollere
            prosessen du ønsker å automatisere. Fyll ut fasene i rekkefølge.
          </p>
        </div>
      </div>

      {/* D – Define */}
      <PhaseCard phase="D" title="Define – Definer problemet" subtitle="Beskriv problemet tydelig før dere starter å bygge løsningen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Hva er problemet?</FieldLabel>
            <Textarea
              placeholder='F.eks. "Prosjektledere bruker mye tid på å skrive månedsrapporter"'
              rows={3}
              value={define.problem ?? ""}
              onChange={e => setDefine(d => ({ ...d, problem: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Hvem påvirkes?</FieldLabel>
            <Textarea
              placeholder="Hvilke roller, avdelinger eller kunder rammes?"
              rows={3}
              value={define.affected ?? ""}
              onChange={e => setDefine(d => ({ ...d, affected: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Hvor ofte skjer det?</FieldLabel>
            <Input
              placeholder='F.eks. "42 rapporter per måned"'
              value={define.frequency ?? ""}
              onChange={e => setDefine(d => ({ ...d, frequency: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Hva er konsekvensen?</FieldLabel>
            <Input
              placeholder="Tid, kostnad, kvalitet, frustrasjon..."
              value={define.consequence ?? ""}
              onChange={e => setDefine(d => ({ ...d, consequence: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" disabled={saving} onClick={() => savePhase("D", { defineData: define })} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" /> Lagre
          </Button>
          <SaveIndicator saved={saved["D"]} />
        </div>
      </PhaseCard>

      {/* M – Measure */}
      <PhaseCard phase="M" title="Measure – Mål dagens situasjon" subtitle="Etabler et nullpunkt med konkrete tall — ikke hopp rett til AI">
        <div>
          <FieldLabel>Måleparametere</FieldLabel>
          <div className="mb-1 grid text-[10px] font-semibold uppercase text-gray-400 px-3" style={{ gridTemplateColumns: "1fr 1fr 24px" }}>
            <span>Parameter</span><span>Nåværende verdi</span><span />
          </div>
          <EditableTable
            rows={measure}
            columns={[
              { key: "parameter", label: "Parameter", placeholder: 'F.eks. "Tid per rapport"', flex: 1.2 },
              { key: "value", label: "Verdi", placeholder: 'F.eks. "95 min"', flex: 1 },
            ]}
            onChange={setMeasure}
            addLabel="Legg til måleparameter"
            emptyRow={{ parameter: "", value: "" }}
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" disabled={saving} onClick={() => savePhase("M", { measureData: measure })} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" /> Lagre
          </Button>
          <SaveIndicator saved={saved["M"]} />
        </div>
      </PhaseCard>

      {/* A – Analyze */}
      <PhaseCard phase="A" title="Analyze – Analyser årsaken" subtitle="Spør hvorfor det tar lang tid — finn hvor AI faktisk bør brukes">
        <div>
          <FieldLabel>Hvorfor er det et problem?</FieldLabel>
          <Textarea
            placeholder='F.eks. "Hvorfor tar rapporten 95 minutter? Fordi tall hentes manuelt fra 4 systemer..."'
            rows={3}
            value={analyze.why ?? ""}
            onChange={e => setAnalyze(a => ({ ...a, why: e.target.value }))}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <FieldLabel>Tidsfordeling per aktivitet</FieldLabel>
            {totalMinutes > 0 && (
              <span className="text-xs text-gray-500">Total: <strong>{totalMinutes} min</strong></span>
            )}
          </div>
          <div className="mb-1 grid text-[10px] font-semibold uppercase text-gray-400 px-3" style={{ gridTemplateColumns: "1fr 80px 24px" }}>
            <span>Aktivitet</span><span>Minutter</span><span />
          </div>
          <EditableTable
            rows={(analyze.breakdown ?? []) as DmaicAnalyzeBreakdownRow[]}
            columns={[
              { key: "activity", label: "Aktivitet", placeholder: 'F.eks. "Hente tall fra systemer"', flex: 1 },
              { key: "minutes", label: "Min", placeholder: "Min", type: "number", flex: 0 },
            ]}
            onChange={(rows) => setAnalyze(a => ({ ...a, breakdown: rows }))}
            addLabel="Legg til aktivitet"
            emptyRow={{ activity: "", minutes: 0 }}
          />
          {/* Visual bar breakdown */}
          {totalMinutes > 0 && (analyze.breakdown ?? []).length > 1 && (
            <div className="mt-3 space-y-1.5">
              {(analyze.breakdown ?? []).map((row, i) => {
                const pct = Math.round((Number(row.minutes) / totalMinutes) * 100);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-36 truncate text-gray-600">{row.activity || "…"}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: PHASE_COLORS.A.badge }}
                      />
                    </div>
                    <span className="w-14 text-right text-gray-500">{row.minutes} min ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" disabled={saving} onClick={() => savePhase("A", { analyzeData: analyze })} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" /> Lagre
          </Button>
          <SaveIndicator saved={saved["A"]} />
        </div>
      </PhaseCard>

      {/* I – Improve */}
      <PhaseCard phase="I" title="Improve – Forbedre med AI og automatisering" subtitle="Her kommer AI inn — beskriv hvilke verktøy og tiltak som brukes">
        <div>
          <FieldLabel>Beskrivelse av forbedringen</FieldLabel>
          <Textarea
            placeholder="Beskriv hvordan prosessen ser ut etter forbedring..."
            rows={3}
            value={improve.description ?? ""}
            onChange={e => setImprove(i => ({ ...i, description: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel>AI-verktøy og tiltak</FieldLabel>
          <div className="mb-1 grid text-[10px] font-semibold uppercase text-gray-400 px-3" style={{ gridTemplateColumns: "140px 1fr 24px" }}>
            <span>Verktøy / teknologi</span><span>Hva det gjør</span><span />
          </div>
          <EditableTable
            rows={(improve.items ?? []) as DmaicImproveItem[]}
            columns={[
              { key: "tool", label: "Verktøy", placeholder: 'F.eks. "Copilot"', flex: 0.7 },
              { key: "description", label: "Hva det gjør", placeholder: 'F.eks. "Skriver førsteutkast automatisk"', flex: 1.3 },
            ]}
            onChange={(rows) => setImprove(i => ({ ...i, items: rows }))}
            addLabel="Legg til AI-verktøy"
            emptyRow={{ tool: "", description: "" }}
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" disabled={saving} onClick={() => savePhase("I", { improveData: improve })} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" /> Lagre
          </Button>
          <SaveIndicator saved={saved["I"]} />
        </div>
      </PhaseCard>

      {/* C – Control */}
      <PhaseCard phase="C" title="Control – Kontroller og mål effekt" subtitle="Mål alt på nytt — sammenlign før og etter implementering">
        <div>
          <FieldLabel>KPI-sammenligning Før / Etter</FieldLabel>
          <div className="mb-1 grid text-[10px] font-semibold uppercase text-gray-400 px-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 24px" }}>
            <span>KPI / Måleparameter</span><span>Før</span><span>Etter</span><span />
          </div>
          <EditableTable
            rows={control}
            columns={[
              { key: "kpi", label: "KPI", placeholder: 'F.eks. "Tid per rapport"', flex: 1 },
              { key: "before", label: "Før", placeholder: '"95 min"', flex: 0.7 },
              { key: "after", label: "Etter", placeholder: '"24 min"', flex: 0.7 },
            ]}
            onChange={setControl}
            addLabel="Legg til KPI"
            emptyRow={{ kpi: "", before: "", after: "" }}
          />
          {/* Summary cards */}
          {control.length > 0 && control.some(r => r.before && r.after) && (
            <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">KPI</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Før</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Etter</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-green-600">Endring</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {control.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{row.kpi}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-500">{row.before}</td>
                      <td className="px-4 py-2.5 text-center text-sm font-semibold" style={{ color: PHASE_COLORS.I.text }}>{row.after}</td>
                      <td className="px-4 py-2.5 text-center">
                        {row.before && row.after && (
                          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[10px]">
                            Forbedret
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" disabled={saving} onClick={() => savePhase("C", { controlData: control })} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" /> Lagre
          </Button>
          <SaveIndicator saved={saved["C"]} />
        </div>
      </PhaseCard>
    </div>
  );
}
