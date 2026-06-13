import { useLocation } from "wouter";
import {
  useListProjects,
  useGetPortfolioStats,
} from "@workspace/api-client-react";
import { formatCurrency, statusMap } from "@/lib/format";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const BRAND = "#4A1F55";

function OnceLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill={BRAND} />
        <circle cx="20" cy="20" r="9" stroke="white" strokeWidth="2.5" fill="none" />
        <circle cx="20" cy="20" r="3.5" fill="white" />
      </svg>
      <span className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>OneCo</span>
    </div>
  );
}

function KpiBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-1 bg-white print:border-gray-200">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

const STATUS_PRIORITY = ["pagaende", "planlegging", "pa_vent", "fullfort", "avbrutt"];

const STATUS_BADGE_STYLE: Record<string, React.CSSProperties> = {
  pagaende:    { backgroundColor: "#dbeafe", color: "#1e40af" },
  planlegging: { backgroundColor: "#fef9c3", color: "#854d0e" },
  pa_vent:     { backgroundColor: "#f3e8ff", color: "#6b21a8" },
  fullfort:    { backgroundColor: "#dcfce7", color: "#166534" },
  avbrutt:     { backgroundColor: "#fee2e2", color: "#991b1b" },
};

export default function PortfolioReportPage() {
  const [, setLocation] = useLocation();
  const { data: projects = [], isLoading: pLoading } = useListProjects();
  const { data: stats, isLoading: sLoading } = useGetPortfolioStats();

  const loading = pLoading || sLoading;
  const generatedAt = new Date().toLocaleString("nb-NO");

  const sortedProjects = [...projects].sort((a, b) => {
    const ai = STATUS_PRIORITY.indexOf(a.status);
    const bi = STATUS_PRIORITY.indexOf(b.status);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalGoal = projects.reduce((s, p) => s + (p.goalSavingsUnit === "kr" ? Number(p.goalSavingsValue || 0) : 0), 0);
  const totalRealized = projects.reduce((s, p) => s + Number(p.totalSavings || 0), 0);
  const achievementPct = totalGoal > 0 ? Math.round((totalRealized / totalGoal) * 100) : 0;

  const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setLocation("/portfolio")}>
          <ArrowLeft className="h-4 w-4" />
          Tilbake til portefølje
        </Button>
        <Button size="sm" className="gap-2" style={{ backgroundColor: BRAND }} onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Skriv ut / Lagre som PDF
        </Button>
      </div>

      {/* Report body */}
      <div className="max-w-5xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none font-sans">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2" style={{ borderColor: BRAND }}>
          <div className="flex flex-col gap-4">
            <OnceLogo />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Porteføljerapport</h1>
              <p className="text-gray-500 text-sm mt-1">
                Oversikt over alle digitaliserings- og AI-prosjekter
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-400 shrink-0 ml-8">
            <div className="font-medium text-gray-600">Generert</div>
            <div>{generatedAt}</div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <KpiBox label="Totalt prosjekter" value={projects.length} />
          <KpiBox
            label="Aktive"
            value={stats?.activeProjects ?? byStatus["pagaende"] ?? 0}
            sub="Pågående nå"
          />
          <KpiBox
            label="Fullført"
            value={byStatus["fullfort"] ?? 0}
            sub="Avsluttede prosjekter"
          />
          <KpiBox
            label="Realisert besparelse"
            value={formatCurrency(stats?.totalRealizedSavings ?? totalRealized)}
          />
          <KpiBox
            label="Målbesparelse"
            value={formatCurrency(stats?.totalEstimatedSavings ?? totalGoal)}
            sub={`${achievementPct} % oppnådd`}
          />
          <KpiBox
            label="Involverte ansatte"
            value={stats?.uniqueMembers ?? "–"}
          />
        </div>

        {/* Status distribution */}
        <section className="mb-10">
          <SectionHeading>Statusfordeling</SectionHeading>
          <div className="flex gap-3 mt-4 flex-wrap">
            {STATUS_PRIORITY.map((key) => {
              const count = byStatus[key] || 0;
              const label = statusMap[key]?.label || key;
              const style = STATUS_BADGE_STYLE[key] || {};
              const width = projects.length > 0 ? (count / projects.length) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={style}>
                    {label}
                  </span>
                  <span className="font-bold text-gray-700">{count}</span>
                </div>
              );
            })}
          </div>
          {/* Simple bar chart */}
          <div className="mt-4 flex h-4 rounded-full overflow-hidden gap-px bg-gray-100">
            {STATUS_PRIORITY.map((key) => {
              const count = byStatus[key] || 0;
              const pct = projects.length > 0 ? (count / projects.length) * 100 : 0;
              const style = STATUS_BADGE_STYLE[key] || {};
              if (pct === 0) return null;
              return (
                <div
                  key={key}
                  style={{ width: `${pct}%`, backgroundColor: style.color as string, opacity: 0.7 }}
                  title={`${statusMap[key]?.label}: ${count}`}
                />
              );
            })}
          </div>
        </section>

        {/* Projects table */}
        <section className="mb-10">
          <SectionHeading>Prosjektoversikt</SectionHeading>
          <table className="w-full mt-4 text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: BRAND }} className="text-white">
                <Th>Prosjekt</Th>
                <Th>Status</Th>
                <Th>Forretningsområde</Th>
                <Th align="right">Målbesparelse</Th>
                <Th align="right">Realisert</Th>
                <Th align="right">Oppgaver</Th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p, i) => {
                const style = STATUS_BADGE_STYLE[p.status] || {};
                return (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <Td>
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </Td>
                    <Td>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={style}
                      >
                        {statusMap[p.status]?.label || p.status}
                      </span>
                    </Td>
                    <Td>{p.businessUnit || "–"}</Td>
                    <Td align="right">
                      {p.goalSavingsValue
                        ? (p.goalSavingsUnit === "kr"
                            ? formatCurrency(Number(p.goalSavingsValue))
                            : `${Number(p.goalSavingsValue).toLocaleString("nb-NO")} t`)
                        : "–"}
                    </Td>
                    <Td align="right">
                      {p.totalSavings ? formatCurrency(Number(p.totalSavings)) : "–"}
                    </Td>
                    <Td align="right">
                      {p.completedTaskCount ?? 0} / {p.taskCount ?? 0}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-300 bg-gray-50">
                <Td colSpan={3}>
                  <span className="text-gray-600">Totalt ({projects.length} prosjekter)</span>
                </Td>
                <Td align="right">{formatCurrency(totalGoal)}</Td>
                <Td align="right">{formatCurrency(totalRealized)}</Td>
                <Td align="right">
                  {projects.reduce((s, p) => s + (p.completedTaskCount ?? 0), 0)} /&nbsp;
                  {projects.reduce((s, p) => s + (p.taskCount ?? 0), 0)}
                </Td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Savings progress per project */}
        {projects.some((p) => p.goalSavingsUnit === "kr" && Number(p.goalSavingsValue) > 0) && (
          <section className="mb-10">
            <SectionHeading>Besparelsesgrad per prosjekt</SectionHeading>
            <div className="mt-4 space-y-3">
              {sortedProjects
                .filter((p) => p.goalSavingsUnit === "kr" && Number(p.goalSavingsValue) > 0)
                .map((p) => {
                  const goal = Number(p.goalSavingsValue);
                  const realized = Number(p.totalSavings || 0);
                  const pct = Math.min(Math.round((realized / goal) * 100), 100);
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 truncate max-w-xs">{p.name}</span>
                        <span className="text-gray-500 shrink-0 ml-4">
                          {formatCurrency(realized)} / {formatCurrency(goal)} ({pct} %)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: BRAND, opacity: 0.75 }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t pt-4 mt-8 flex items-center justify-between text-xs text-gray-400">
          <OnceLogo />
          <span>Generert {generatedAt} · Konfidensielt</span>
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm 2cm; }
        }
      `}</style>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: BRAND }}>
      {children}
    </h2>
  );
}

function Th({ children, align, colSpan }: { children?: React.ReactNode; align?: "right" | "left"; colSpan?: number }) {
  return (
    <th
      colSpan={colSpan}
      className="px-3 py-2.5 text-left text-xs font-semibold text-white"
      style={{ textAlign: align || "left" }}
    >
      {children}
    </th>
  );
}

function Td({ children, align, colSpan }: { children?: React.ReactNode; align?: "right" | "left"; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className="px-3 py-2 text-gray-700 border-b border-gray-100"
      style={{ textAlign: align || "left" }}
    >
      {children}
    </td>
  );
}
