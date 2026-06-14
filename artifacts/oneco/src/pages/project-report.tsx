import { useRoute, useLocation } from "wouter";
import {
  useGetProject,
  useListEffects,
  useListCosts,
  useListTasks,
  getGetProjectQueryKey,
  getListEffectsQueryKey,
  getListCostsQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate, statusMap, taskStatusMap, taskPriorityMap, effectTypeMap, confidenceMap } from "@/lib/format";
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
      <span className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>OnePulse</span>
    </div>
  );
}

function KpiBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-1 bg-white print:border-gray-200">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  planlegging: "Planlegging",
  pagaende: "Pågående",
  fullfort: "Fullført",
  avbrutt: "Avbrutt",
  pa_vent: "På vent",
};

const CONFIDENCE_DOT: Record<string, string> = {
  lav: "bg-red-400",
  middels: "bg-yellow-400",
  hoy: "bg-green-400",
};

export default function ProjectReportPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/projects/:id/rapport");
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const { data: project, isLoading: pLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) },
  });
  const { data: effects = [], isLoading: eLoading } = useListEffects(id, {
    query: { enabled: !!id, queryKey: getListEffectsQueryKey(id) },
  });
  const { data: costs = [], isLoading: cLoading } = useListCosts(id, {
    query: { enabled: !!id, queryKey: getListCostsQueryKey(id) },
  });
  const { data: tasks = [], isLoading: tLoading } = useListTasks(id, undefined, {
    query: { enabled: !!id, queryKey: getListTasksQueryKey(id) },
  });

  const loading = pLoading || eLoading || cLoading || tLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Prosjektet ble ikke funnet.
      </div>
    );
  }

  const totalSavings = effects.reduce((s, e) => s + Number(e.value), 0);
  const totalCosts = costs.reduce((s, c) => s + Number(c.value), 0);
  const doneTasks = tasks.filter((t) => t.status === "fullfort").length;
  const statusCounts: Record<string, number> = {};
  for (const t of tasks) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  const generatedAt = new Date().toLocaleString("nb-NO");

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setLocation(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
          Tilbake til prosjekt
        </Button>
        <Button size="sm" className="gap-2" style={{ backgroundColor: BRAND }} onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Skriv ut / Lagre som PDF
        </Button>
      </div>

      {/* Report body */}
      <div className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none font-sans">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2" style={{ borderColor: BRAND }}>
          <div className="flex flex-col gap-4">
            <OnceLogo />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">{project.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{ borderColor: BRAND, color: BRAND }}
                >
                  {STATUS_LABEL[project.status] || project.status}
                </span>
                {project.businessUnit && (
                  <span className="text-sm text-gray-500">{project.businessUnit}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-400 shrink-0 ml-8">
            <div className="font-medium text-gray-600">Prosjektrapport</div>
            <div>{generatedAt}</div>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ansvarlig</div>
            <div className="font-semibold text-gray-800">{project.ownerName || "–"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Startdato</div>
            <div className="font-semibold text-gray-800">{formatDate(project.startDate) || "–"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Planlagt slutt</div>
            <div className="font-semibold text-gray-800">{formatDate(project.plannedEndDate) || "–"}</div>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-gray-600 mb-8 leading-relaxed border-l-4 pl-4" style={{ borderColor: BRAND }}>
            {project.description}
          </p>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <KpiBox
            label="Målbesparelse"
            value={project.goalSavingsValue
              ? (project.goalSavingsUnit === "kr"
                  ? formatCurrency(project.goalSavingsValue)
                  : `${Number(project.goalSavingsValue).toLocaleString("nb-NO")} timer`)
              : "–"}
            sub={project.goalText || undefined}
          />
          <KpiBox
            label="Realisert besparelse"
            value={formatCurrency(totalSavings)}
            sub={project.goalSavingsValue
              ? `${Math.round((totalSavings / Number(project.goalSavingsValue)) * 100)} % av mål`
              : undefined}
          />
          <KpiBox
            label="Totale kostnader"
            value={formatCurrency(totalCosts)}
          />
          <KpiBox
            label="Oppgaver fullført"
            value={`${doneTasks} / ${tasks.length}`}
            sub={tasks.length > 0
              ? `${Math.round((doneTasks / tasks.length) * 100)} % ferdigstilt`
              : "Ingen oppgaver"}
          />
        </div>

        {/* Task status breakdown */}
        {tasks.length > 0 && (
          <section className="mb-10">
            <SectionHeading>Oppgavestatus</SectionHeading>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
              {Object.entries(taskStatusMap).map(([key, { label, color }]) => {
                const count = statusCounts[key] || 0;
                return (
                  <div key={key} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-2xl font-bold text-gray-800">{count}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Effects table */}
        {effects.length > 0 && (
          <section className="mb-10">
            <SectionHeading>Effekter og besparelser</SectionHeading>
            <table className="w-full mt-4 text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: BRAND }} className="text-white">
                  <Th>Dato</Th>
                  <Th>Beskrivelse</Th>
                  <Th align="right">Verdi</Th>
                  <Th>Type</Th>
                  <Th>Sikkerhet</Th>
                </tr>
              </thead>
              <tbody>
                {effects.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <Td>{formatDate(e.date)}</Td>
                    <Td>{e.description}</Td>
                    <Td align="right">
                      {e.unit === "kr"
                        ? formatCurrency(Number(e.value))
                        : `${Number(e.value).toLocaleString("nb-NO")} t`}
                    </Td>
                    <Td>{effectTypeMap[e.type] || e.type}</Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${CONFIDENCE_DOT[e.confidenceLevel] || "bg-gray-300"}`} />
                        {confidenceMap[e.confidenceLevel] || e.confidenceLevel}
                      </span>
                    </Td>
                  </tr>
                ))}
                <tr className="font-semibold border-t-2 border-gray-200">
                  <Td colSpan={2}>Totalt</Td>
                  <Td align="right">{formatCurrency(totalSavings)}</Td>
                  <Td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Costs table */}
        {costs.length > 0 && (
          <section className="mb-10">
            <SectionHeading>Kostnader</SectionHeading>
            <table className="w-full mt-4 text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: BRAND }} className="text-white">
                  <Th>Dato</Th>
                  <Th>Beskrivelse</Th>
                  <Th align="right">Beløp (kr)</Th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <Td>{formatDate(c.date)}</Td>
                    <Td>{c.description}</Td>
                    <Td align="right">{formatCurrency(Number(c.value))}</Td>
                  </tr>
                ))}
                <tr className="font-semibold border-t-2 border-gray-200">
                  <Td colSpan={2}>Totalt</Td>
                  <Td align="right">{formatCurrency(totalCosts)}</Td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Tasks detail table */}
        {tasks.length > 0 && (
          <section className="mb-10">
            <SectionHeading>Oppgaveliste</SectionHeading>
            <table className="w-full mt-4 text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: BRAND }} className="text-white">
                  <Th>Tittel</Th>
                  <Th>Status</Th>
                  <Th>Prioritet</Th>
                  <Th>Frist</Th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <Td>{t.title}</Td>
                    <Td>{taskStatusMap[t.status]?.label || t.status}</Td>
                    <Td>{taskPriorityMap[t.priority]?.label || t.priority}</Td>
                    <Td>{formatDate(t.dueDate) || "–"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      className="px-3 py-2 text-left text-xs font-semibold text-white"
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
