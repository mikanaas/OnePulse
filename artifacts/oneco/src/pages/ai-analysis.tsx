import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useAnalyzePortfolio } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import type { PortfolioAnalysis } from "@workspace/api-client-react";

const BRAND = "#4A1F55";

function HealthGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 75 ? "#16a34a" : pct >= 50 ? "#ca8a04" : pct >= 25 ? "#ea580c" : "#dc2626";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#111827">
          {pct}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#6b7280">
          / 100
        </text>
      </svg>
      <span className="text-lg font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function InsightCard({
  title,
  detail,
  projectNames,
  icon: Icon,
  accentColor,
  bgColor,
}: {
  title: string;
  detail: string;
  projectNames?: string[];
  icon: LucideIcon;
  accentColor: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-lg p-4 border ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-md p-1.5 shrink-0" style={{ backgroundColor: accentColor + "22" }}>
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{detail}</p>
          {projectNames && projectNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {projectNames.map((name) => (
                <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  høy:     { label: "Høy prioritet",    color: "#dc2626", bg: "bg-red-50 border-red-200" },
  middels: { label: "Middels prioritet", color: "#ca8a04", bg: "bg-yellow-50 border-yellow-200" },
  lav:     { label: "Lav prioritet",    color: "#16a34a", bg: "bg-green-50 border-green-200" },
};

const RISK_CONFIG: Record<string, { label: string; dot: string }> = {
  lav:     { label: "Lav risiko",    dot: "bg-green-500" },
  middels: { label: "Middels risiko", dot: "bg-yellow-500" },
  høy:     { label: "Høy risiko",    dot: "bg-red-500" },
};

function ProjectAssessmentRow({ p }: { p: PortfolioAnalysis["projectAssessments"][number] }) {
  const [open, setOpen] = useState(false);
  const risk = RISK_CONFIG[p.risk] || RISK_CONFIG["middels"];

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${risk.dot}`} />
          <span className="font-medium text-gray-900 truncate">{p.name}</span>
          <span className="text-xs text-gray-400 shrink-0">{p.status}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-gray-500 hidden sm:block">{risk.label}</span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">{p.assessment}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {p.strengths && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Styrker</p>
                  <p className="text-sm text-gray-700">{p.strengths}</p>
                </div>
              </div>
            )}
            {p.weaknesses && (
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Svakheter</p>
                  <p className="text-sm text-gray-700">{p.weaknesses}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-base font-semibold text-gray-900">{children}</h2>
      {count !== undefined && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{count}</span>
      )}
    </div>
  );
}

export default function AiAnalysisPage() {
  const analyze = useAnalyzePortfolio();
  const [result, setResult] = useState<PortfolioAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = () => {
    setErrorMsg(null);
    analyze.mutate(undefined, {
      onSuccess: (data) => {
        // Server returns 200 even on AI failure — check for error field
        if ((data as { error?: string }).error) {
          setErrorMsg(data.overallHealth?.summary ?? "AI-tjenesten er ikke tilgjengelig.");
        } else {
          setResult(data);
        }
      },
      onError: (err) => {
        setErrorMsg(
          (err as { message?: string }).message ?? "Noe gikk galt. Prøv igjen."
        );
      },
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5" style={{ color: BRAND }} />
              <h1 className="text-3xl font-bold tracking-tight">AI-analysemotor</h1>
            </div>
            <p className="text-muted-foreground">
              Claude analyserer alle prosjekter samlet — finner suksessfaktorer, svakhetsmønstre
              og konkrete anbefalinger for fremtidige prosjekter.
            </p>
          </div>
          <Button
            onClick={handleRun}
            disabled={analyze.isPending}
            className="gap-2 shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            {analyze.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyserer…
              </>
            ) : result ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Kjør på nytt
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Kjør analyse
              </>
            )}
          </Button>
        </div>

        {/* Error banner */}
        {errorMsg && !analyze.isPending && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Analyse mislyktes</p>
              <p className="text-sm text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {analyze.isPending && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Claude leser alle prosjektene dine…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyserer mønstre, besparelser, oppgavefremdrift og risikofaktorer. Dette tar 10–20 sekunder.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!analyze.isPending && !result && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
                <Sparkles className="h-7 w-7" style={{ color: BRAND }} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-lg">Klar til å analysere porteføljen din</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Trykk «Kjør analyse» for å få en dyp AI-drevet gjennomgang av alle prosjekter —
                  hva som fungerer, hva som ikke gjør det, og hva du bør fokusere på.
                </p>
              </div>
              <Button onClick={handleRun} className="gap-2 mt-2" style={{ backgroundColor: BRAND }}>
                <Sparkles className="h-4 w-4" />
                Kjør analyse
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && !analyze.isPending && (
          <div className="space-y-6">
            {/* Health score + summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  <HealthGauge score={result.overallHealth.score} label={result.overallHealth.label} />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Porteføljehelse</h2>
                    <p className="text-gray-700 leading-relaxed">{result.overallHealth.summary}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Analysert {new Date(result.generatedAt).toLocaleString("nb-NO")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two-column: success + failures */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Success factors */}
              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle count={result.successFactors.length}>
                    <TrendingUp className="h-4 w-4 inline mr-1.5 text-green-600" />
                    Suksessfaktorer
                  </SectionTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {result.successFactors.map((f, i) => (
                    <InsightCard
                      key={i}
                      title={f.title}
                      detail={f.detail}
                      projectNames={f.projectNames}
                      icon={TrendingUp}
                      accentColor="#16a34a"
                      bgColor="bg-green-50 border-green-100"
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Failure patterns */}
              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle count={result.failurePatterns.length}>
                    <AlertTriangle className="h-4 w-4 inline mr-1.5 text-orange-500" />
                    Svakhetsmønstre
                  </SectionTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {result.failurePatterns.map((f, i) => (
                    <InsightCard
                      key={i}
                      title={f.title}
                      detail={f.detail}
                      projectNames={f.projectNames}
                      icon={AlertTriangle}
                      accentColor="#ea580c"
                      bgColor="bg-orange-50 border-orange-100"
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Opportunities */}
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle count={result.opportunities.length}>
                  <Lightbulb className="h-4 w-4 inline mr-1.5 text-blue-600" />
                  Muligheter
                </SectionTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-0">
                {result.opportunities.map((o, i) => (
                  <InsightCard
                    key={i}
                    title={o.title}
                    detail={o.detail}
                    projectNames={o.projectNames}
                    icon={Lightbulb}
                    accentColor="#2563eb"
                    bgColor="bg-blue-50 border-blue-100"
                  />
                ))}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle count={result.recommendations.length}>
                  <ArrowRight className="h-4 w-4 inline mr-1.5" style={{ color: BRAND }} />
                  Anbefalinger
                </SectionTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {[...result.recommendations]
                  .sort((a, b) => {
                    const order = { høy: 0, middels: 1, lav: 2 };
                    return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1);
                  })
                  .map((r, i) => {
                    const cfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG["middels"];
                    return (
                      <div key={i} className={`rounded-lg p-4 border ${cfg.bg} flex items-start gap-3`}>
                        <div className="shrink-0 mt-0.5">
                          <ArrowRight className="h-4 w-4" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{r.detail}</p>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            {/* Per-project assessments */}
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle count={result.projectAssessments.length}>
                  Prosjektvurderinger
                </SectionTitle>
                <p className="text-xs text-muted-foreground -mt-1">Klikk på et prosjekt for å se detaljert vurdering</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {result.projectAssessments.map((p, i) => (
                  <ProjectAssessmentRow key={i} p={p} />
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
