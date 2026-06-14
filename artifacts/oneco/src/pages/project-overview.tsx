import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetPortfolioHeatmap } from "@workspace/api-client-react";
import type { HeatmapRow, HeatmapMetric } from "@workspace/api-client-react";
import {
  Clock,
  TrendingUp,
  CheckSquare,
  Activity,
  Zap,
  ChevronDown,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BRAND = "#4A1F55";

// ── Color scale ────────────────────────────────────────────────────────────
// score 0→red, 25→amber, 50→neutral purple, 75→sage green, 100→forest green
function scoreToColor(score: number, hasData: boolean): { bg: string; text: string; border: string } {
  if (!hasData) return { bg: "#F3F4F6", text: "#9CA3AF", border: "#E5E7EB" };
  const s = Math.max(0, Math.min(100, score));
  if (s >= 80) return { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" };
  if (s >= 65) return { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" };
  if (s >= 52) return { bg: "#F5F0F9", text: "#4A1F55", border: "#DDD0E8" };
  if (s >= 45) return { bg: "#FEF9F0", text: "#92400E", border: "#FDE68A" };
  if (s >= 30) return { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" };
  if (s >= 15) return { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" };
  return { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" };
}

function totalBadge(score: number, label: string) {
  const { bg, text, border } = scoreToColor(score, true);
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border"
      style={{ backgroundColor: bg, color: text, borderColor: border }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ backgroundColor: text + "22", color: text }}
      >
        {score}
      </span>
      {label}
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function Tooltip({ lines, children }: { lines: string[]; children: React.ReactNode }) {
  const [vis, setVis] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setVis(true)}
      onMouseLeave={() => setVis(false)}
    >
      {children}
      {vis && lines.length > 0 && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl min-w-[180px] max-w-[240px] pointer-events-none">
          {lines.map((l, i) => (
            <p key={i} className="leading-relaxed whitespace-nowrap">{l}</p>
          ))}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// ── Cell ───────────────────────────────────────────────────────────────────
function Cell({ metric, onClick }: { metric: HeatmapMetric; onClick: () => void }) {
  const { bg, text, border } = scoreToColor(metric.score, metric.hasData);
  return (
    <Tooltip lines={metric.tooltipLines ?? []}>
      <button
        onClick={onClick}
        className="w-full h-12 rounded-lg flex items-center justify-center text-xs font-semibold transition-all hover:scale-105 hover:shadow-md border cursor-pointer select-none"
        style={{ backgroundColor: bg, color: text, borderColor: border }}
      >
        {metric.displayValue}
      </button>
    </Tooltip>
  );
}

// ── Average row cell ───────────────────────────────────────────────────────
function AvgCell({ score }: { score: number }) {
  const { bg, text, border } = scoreToColor(score, true);
  return (
    <div
      className="w-full h-10 rounded-lg flex items-center justify-center text-xs font-bold border"
      style={{ backgroundColor: bg, color: text, borderColor: border }}
    >
      {score}
    </div>
  );
}

// ── Column config ──────────────────────────────────────────────────────────
const COLS: { key: keyof HeatmapRow; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "timeProgress",  label: "Fremdrift",   icon: Clock,        desc: "Andel fullforte oppgaver vs. forventet fremdrift" },
  { key: "savingsVsGoal", label: "Besparelse",  icon: TrendingUp,   desc: "Realisert besparelse vs. forventet pa dette tidspunktet" },
  { key: "taskFlow",      label: "Oppgaveflyt", icon: CheckSquare,  desc: "Andel apne oppgaver som er forfalte" },
  { key: "activityLevel", label: "Aktivitet",   icon: Activity,     desc: "Dager siden siste aktivitetslogg-oppforing" },
  { key: "netEffect",     label: "Nettoeffekt", icon: Zap,          desc: "Besparelse minus kostnader" },
];

type SortKey = "score" | "name" | "unit";

const STATUS_OPTIONS = [
  { value: "pagaende,pause", label: "Pagaende og pause" },
  { value: "pagaende",       label: "Kun pagaende" },
  { value: "pause",          label: "Kun pause" },
  { value: "ide,pagaende,pause,fullfort,avsluttet", label: "Alle statuser" },
];

export default function ProjectOverviewPage() {
  const [, navigate] = useLocation();
  const [statuses, setStatuses] = useState("pagaende,pause");
  const [sort, setSort] = useState<SortKey>("score");

  const { data, isLoading, isError } = useGetPortfolioHeatmap(
    { statuses },
    { query: { queryKey: ["portfolio-heatmap", statuses] } }
  );

  const rows = [...(data?.rows ?? [])].sort((a, b) => {
    if (sort === "score") return b.totalScore - a.totalScore;
    if (sort === "name")  return a.projectName.localeCompare(b.projectName, "nb");
    return (a.businessUnit ?? "").localeCompare(b.businessUnit ?? "", "nb");
  });

  const avgs = data?.columnAverages;

  const colNav = (row: HeatmapRow, colKey: string) => {
    const base = `/projects/${row.projectId}`;
    if (colKey === "savingsVsGoal") return navigate(`${base}?tab=effects`);
    if (colKey === "taskFlow")      return navigate(`${base}?tab=tasks`);
    if (colKey === "activityLevel") return navigate(`${base}?tab=activity`);
    navigate(`${base}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="h-5 w-5" style={{ color: BRAND }} />
              <h1 className="text-3xl font-bold tracking-tight">Prosjektoversikt</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Prestasjonsheatmap — se alle prosjekter og dimensjoner pa ett blikk
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Select value={statuses} onValueChange={setStatuses}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Sorter: Totalskore</SelectItem>
                <SelectItem value="name">Sorter: Alfabetisk</SelectItem>
                <SelectItem value="unit">Sorter: Enhet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Laster heatmap…</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center">
            <p className="font-semibold text-red-800">Kunne ikke laste data</p>
            <p className="text-sm text-red-600 mt-1">Prøv å oppdatere siden</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-20 flex flex-col items-center gap-3 text-center">
            <LayoutGrid className="h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-500 text-lg">Ingen prosjekter funnet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Prøv å velge andre statusfiltre for å se prosjekter.
            </p>
          </div>
        )}

        {/* Heatmap */}
        {!isLoading && !isError && rows.length > 0 && (
          <div
            className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
            style={{ boxShadow: "0 4px 24px rgba(74,31,85,0.07), 0 1px 4px rgba(0,0,0,0.04)" }}
          >
            {/* Column headers — sticky */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
              <div className="grid items-center px-4 py-3 gap-2" style={{ gridTemplateColumns: "minmax(180px,2fr) repeat(5,minmax(100px,1fr)) minmax(160px,1.5fr)" }}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prosjekt</div>
                {COLS.map((col) => (
                  <Tooltip key={col.key} lines={[col.desc]}>
                    <div className="flex flex-col items-center gap-1 cursor-default">
                      <col.icon className="h-4 w-4" style={{ color: BRAND }} />
                      <span className="text-xs font-semibold text-gray-600">{col.label}</span>
                    </div>
                  </Tooltip>
                ))}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Totalskore</div>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <div
                  key={row.projectId}
                  className="grid items-center px-4 py-2 gap-2 hover:bg-gray-50/60 transition-colors"
                  style={{ gridTemplateColumns: "minmax(180px,2fr) repeat(5,minmax(100px,1fr)) minmax(160px,1.5fr)" }}
                >
                  {/* Project name */}
                  <button
                    className="text-left group"
                    onClick={() => navigate(`/projects/${row.projectId}`)}
                  >
                    <p className="text-sm font-semibold text-gray-900 group-hover:underline leading-tight truncate">
                      {row.projectName}
                    </p>
                    {row.businessUnit && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{row.businessUnit}</p>
                    )}
                  </button>

                  {/* Metric cells */}
                  {COLS.map((col) => (
                    <Cell
                      key={col.key}
                      metric={row[col.key] as HeatmapMetric}
                      onClick={() => colNav(row, col.key)}
                    />
                  ))}

                  {/* Total badge */}
                  <div className="flex justify-end">
                    <button onClick={() => navigate(`/projects/${row.projectId}`)}>
                      {totalBadge(row.totalScore, row.totalLabel)}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Column averages */}
            {avgs && (
              <div
                className="grid items-center px-4 py-3 gap-2 bg-gray-50 border-t border-gray-100"
                style={{ gridTemplateColumns: "minmax(180px,2fr) repeat(5,minmax(100px,1fr)) minmax(160px,1.5fr)" }}
              >
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Snitt</div>
                <AvgCell score={avgs.timeProgress} />
                <AvgCell score={avgs.savingsVsGoal} />
                <AvgCell score={avgs.taskFlow} />
                <AvgCell score={avgs.activityLevel} />
                <AvgCell score={avgs.netEffect} />
                <div />
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-gray-500">Fargeskala:</span>
            {[
              { bg: "#FEE2E2", text: "#991B1B", label: "Langt bak" },
              { bg: "#FEF3C7", text: "#92400E", label: "Bak" },
              { bg: "#F5F0F9", text: "#4A1F55", label: "Som forventet" },
              { bg: "#ECFDF5", text: "#047857", label: "Foran" },
              { bg: "#D1FAE5", text: "#065F46", label: "Godt foran" },
              { bg: "#F3F4F6", text: "#9CA3AF", label: "Ingen data" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: c.bg, borderColor: c.text + "40" }}
                />
                <span style={{ color: c.text }}>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
