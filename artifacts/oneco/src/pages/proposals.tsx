import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  useListProposals,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
  useConvertProposal,
} from "@workspace/api-client-react";
import type { Proposal } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lightbulb, Plus, Trash2, ArrowRight, LayoutGrid, List, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BRAND = "#4A1F55";

const QK = ["proposals"];

type ViewMode = "liste" | "eisenhower";

function matrixQuadrant(effect: string, complexity: string) {
  const bigEffect = effect === "stor";
  const easy = complexity === "enkel";
  if (bigEffect && easy)   return { label: "Lav hengende frukt", color: "#D1FAE5", border: "#6EE7B7", text: "#065F46" };
  if (bigEffect && !easy)  return { label: "Store satsinger", color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" };
  if (!bigEffect && easy)  return { label: "Fyll-inn-tiltak", color: "#FEF9C3", border: "#FDE047", text: "#713F12" };
  return { label: "Vurder å droppe", color: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" };
}

function statusBadge(status: string) {
  if (status === "ny") return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Ny</Badge>;
  if (status === "vurdert") return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Vurdert</Badge>;
  return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Konvertert</Badge>;
}

function typeBadge(type: string) {
  if (type === "solution") return <Badge variant="outline" className="text-purple-700 border-purple-300">Forslag til løsning</Badge>;
  return <Badge variant="outline" className="text-gray-600 border-gray-300">Problemstilling</Badge>;
}

interface ProposalCardProps {
  proposal: Proposal;
  onEdit: (p: Proposal) => void;
  onDelete: (p: Proposal) => void;
  onConvert: (p: Proposal) => void;
  compact?: boolean;
}

function ProposalCard({ proposal, onEdit, onDelete, onConvert, compact }: ProposalCardProps) {
  const q = matrixQuadrant(proposal.effect, proposal.complexity);
  return (
    <div
      className="rounded-xl border bg-white p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderColor: q.border }}
      onClick={() => onEdit(proposal)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight flex-1">{proposal.title}</p>
        {statusBadge(proposal.status)}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground line-clamp-2">{proposal.description}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {typeBadge(proposal.type)}
        <span className="text-[10px] text-gray-400">{proposal.submittedByName ?? "Ukjent"}</span>
      </div>
      {!compact && (
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {proposal.status !== "konvertert" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onConvert(proposal)}>
              <ArrowRight className="h-3 w-3" /> Til prosjekt
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto" onClick={() => onDelete(proposal)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ProposalMatrix({ proposals, onEdit, onDelete, onConvert }: {
  proposals: Proposal[];
  onEdit: (p: Proposal) => void;
  onDelete: (p: Proposal) => void;
  onConvert: (p: Proposal) => void;
}) {
  const quadrants = [
    { effect: "stor", complexity: "enkel", label: "Stor effekt · Enkelt å utvikle", sublabel: "Lav hengende frukt", color: "#D1FAE5", border: "#6EE7B7", text: "#065F46" },
    { effect: "stor", complexity: "krevende", label: "Stor effekt · Krevende å utvikle", sublabel: "Store satsinger", color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
    { effect: "liten", complexity: "enkel", label: "Liten effekt · Enkelt å utvikle", sublabel: "Fyll-inn-tiltak", color: "#FEF9C3", border: "#FDE047", text: "#713F12" },
    { effect: "liten", complexity: "krevende", label: "Liten effekt · Krevende å utvikle", sublabel: "Vurder å droppe", color: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr]">
        <div className="w-7" />
        <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold text-gray-500 mb-1">
          <div>Enkelt å utvikle</div>
          <div>Krevende å utvikle</div>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-1">
        <div className="flex flex-col text-xs font-semibold text-gray-500 w-7">
          <div className="flex-1 flex items-center justify-center" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Stor effekt</div>
          <div className="flex-1 flex items-center justify-center" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Liten effekt</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quadrants.map((q) => {
            const items = proposals.filter(p => p.effect === q.effect && p.complexity === q.complexity);
            return (
              <div
                key={`${q.effect}-${q.complexity}`}
                className="rounded-xl border-2 p-3 min-h-[200px]"
                style={{ backgroundColor: q.color + "55", borderColor: q.border }}
              >
                <div className="mb-2">
                  <p className="text-xs font-bold" style={{ color: q.text }}>{q.sublabel}</p>
                  <p className="text-[10px] text-gray-500">{q.label}</p>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Ingen forslag</p>
                  )}
                  {items.map(p => (
                    <ProposalCard key={p.id} proposal={p} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SubmitFormState {
  title: string;
  description: string;
  type: "problem" | "solution";
  solutionDescription: string;
  effect: "stor" | "liten";
  complexity: "krevende" | "enkel";
}

const defaultForm: SubmitFormState = {
  title: "",
  description: "",
  type: "problem",
  solutionDescription: "",
  effect: "liten",
  complexity: "krevende",
};

export default function ProposalsPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>("liste");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [showForm, setShowForm] = useState(false);
  const [editProposal, setEditProposal] = useState<Proposal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);
  const [convertTarget, setConvertTarget] = useState<Proposal | null>(null);
  const [convertName, setConvertName] = useState("");
  const [form, setForm] = useState<SubmitFormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  const { data: proposals = [], isLoading } = useListProposals(undefined, { query: { queryKey: QK } });

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  const convertProposal = useConvertProposal();

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const filtered = proposals.filter(p => filterStatus === "alle" || p.status === filterStatus);

  function openNew() {
    setForm(defaultForm);
    setEditProposal(null);
    setShowForm(true);
  }

  function openEdit(p: Proposal) {
    setForm({
      title: p.title,
      description: p.description,
      type: p.type as "problem" | "solution",
      solutionDescription: p.solutionDescription ?? "",
      effect: p.effect as "stor" | "liten",
      complexity: p.complexity as "krevende" | "enkel",
    });
    setEditProposal(p);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        solutionDescription: form.type === "solution" ? form.solutionDescription : undefined,
        effect: form.effect,
        complexity: form.complexity,
      };
      if (editProposal) {
        await updateProposal.mutateAsync({ id: editProposal.id, data: payload });
        toast({ title: "Forslag oppdatert" });
      } else {
        await createProposal.mutateAsync({ data: payload });
        toast({ title: "Forslag sendt inn" });
      }
      await invalidate();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteProposal.mutateAsync({ id: deleteTarget.id });
    await invalidate();
    setDeleteTarget(null);
    toast({ title: "Forslag slettet" });
  }

  async function handleConvert() {
    if (!convertTarget || !convertName.trim()) return;
    setSaving(true);
    try {
      const res = await convertProposal.mutateAsync({
        id: convertTarget.id,
        data: { name: convertName.trim(), description: convertTarget.description },
      });
      await invalidate();
      setConvertTarget(null);
      setConvertName("");
      toast({ title: "Prosjekt opprettet", description: "Forslaget er konvertert til et aktivt prosjekt." });
      navigate(`/projects/${res.projectId}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(p: Proposal, status: "ny" | "vurdert" | "konvertert") {
    await updateProposal.mutateAsync({ id: p.id, data: { status } });
    await invalidate();
  }

  const counts = {
    alle: proposals.length,
    ny: proposals.filter(p => p.status === "ny").length,
    vurdert: proposals.filter(p => p.status === "vurdert").length,
    konvertert: proposals.filter(p => p.status === "konvertert").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-5 w-5" style={{ color: BRAND }} />
              <h1 className="text-3xl font-bold tracking-tight">Forbedringsforslag</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Meld inn problemstillinger og idéer til automatisering og effektivisering
            </p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Nytt forslag
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["alle", "ny", "vurdert", "konvertert"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterStatus === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s === "alle" ? "Alle" : s === "ny" ? "Nye" : s === "vurdert" ? "Vurdert" : "Konvertert"}
                <span className="ml-1.5 text-[10px] text-gray-400">{counts[s]}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setView("liste")}
              className={`p-2 rounded-md transition-colors ${view === "liste" ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("eisenhower")}
              className={`p-2 rounded-md transition-colors ${view === "eisenhower" ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <p className="text-muted-foreground text-sm text-center py-12">Laster forslag...</p>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Lightbulb className="h-10 w-10 mx-auto text-gray-300" />
            <p className="text-muted-foreground text-sm">Ingen forslag ennå.</p>
            <Button variant="outline" onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Legg inn første forslag
            </Button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === "eisenhower" && (
          <ProposalMatrix
            proposals={filtered}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onConvert={(p) => { setConvertTarget(p); setConvertName(p.title); }}
          />
        )}

        {!isLoading && filtered.length > 0 && view === "liste" && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100"
            style={{ boxShadow: "0 4px 24px rgba(74,31,85,0.07)" }}>
            {filtered.map((p) => {
              const q = matrixQuadrant(p.effect, p.complexity);
              return (
                <div key={p.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Matrix indicator */}
                    <div
                      className="shrink-0 mt-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: q.border }}
                      title={q.label}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="text-sm font-semibold text-gray-900 hover:underline text-left"
                          onClick={() => openEdit(p)}
                        >
                          {p.title}
                        </button>
                        {statusBadge(p.status)}
                        {typeBadge(p.type)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      {p.type === "solution" && p.solutionDescription && (
                        <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1 line-clamp-1">
                          Forslag: {p.solutionDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1 text-xs text-gray-400">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: q.color, color: q.text, border: `1px solid ${q.border}` }}
                        >
                          {q.label}
                        </span>
                        <span>{p.submittedByName ?? "Ukjent"}</span>
                        <span>{new Date(p.createdAt).toLocaleDateString("nb-NO")}</span>
                        {p.status === "ny" && (
                          <button
                            className="text-yellow-600 hover:text-yellow-700 font-medium"
                            onClick={() => handleStatusChange(p, "vurdert")}
                          >
                            Merk som vurdert
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.status !== "konvertert" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => { setConvertTarget(p); setConvertName(p.title); }}
                        >
                          <ArrowRight className="h-3 w-3" /> Til prosjekt
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProposal ? "Rediger forslag" : "Nytt forbedringsforslag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type forslag</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "problem", label: "Problemstilling", desc: "Jeg ser et problem som kan automatiseres" },
                  { value: "solution", label: "Med løsningsforslag", desc: "Jeg har også et konkret forslag til løsning" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: opt.value as "problem" | "solution" }))}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      form.type === opt.value
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tittel <span className="text-red-500">*</span></label>
              <Input
                placeholder="Kort beskrivelse av problemet/idéen"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Beskrivelse av problemstilling <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="Beskriv hvilken arbeidsprosess eller problemstilling du tenker kan automatiseres eller forbedres..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {form.type === "solution" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Forslag til løsning</label>
                <Textarea
                  placeholder="Beskriv ditt konkrete forslag til hvordan dette kan løses..."
                  rows={2}
                  value={form.solutionDescription}
                  onChange={e => setForm(f => ({ ...f, solutionDescription: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Forventet effekt</label>
                <Select value={form.effect} onValueChange={v => setForm(f => ({ ...f, effect: v as "stor" | "liten" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stor">Stor — høy gevinst</SelectItem>
                    <SelectItem value="liten">Liten — begrenset gevinst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Utviklingskompleksitet</label>
                <Select value={form.complexity} onValueChange={v => setForm(f => ({ ...f, complexity: v as "krevende" | "enkel" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enkel">Enkel — raskt å bygge</SelectItem>
                    <SelectItem value="krevende">Krevende — krever mer arbeid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Matrix preview */}
            {(() => {
              const q = matrixQuadrant(form.effect, form.complexity);
              return (
                <div
                  className="rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: q.color, color: q.text, border: `1px solid ${q.border}` }}
                >
                  Prioriteringsmatrise: <strong>{q.label}</strong>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()}>
              {saving ? "Lagrer..." : editProposal ? "Lagre endringer" : "Send inn forslag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett forslag?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.title}» vil bli slettet permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to project dialog */}
      <Dialog open={!!convertTarget} onOpenChange={v => !v && setConvertTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konverter til prosjekt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Forslaget «{convertTarget?.title}» vil opprettes som et nytt prosjekt med status <strong>Idé</strong>.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prosjektnavn <span className="text-red-500">*</span></label>
              <Input
                value={convertName}
                onChange={e => setConvertName(e.target.value)}
                placeholder="Navn på prosjektet"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertTarget(null)}>Avbryt</Button>
            <Button onClick={handleConvert} disabled={saving || !convertName.trim()} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              {saving ? "Oppretter..." : "Opprett prosjekt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
