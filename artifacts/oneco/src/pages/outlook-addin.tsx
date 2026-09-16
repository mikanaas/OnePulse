import { useState } from "react";
import { createNestablePublicClientApplication } from "@azure/msal-browser";
import { CheckCircle2, Lightbulb, Loader2, ShieldCheck } from "lucide-react";
import { getOutlookConfig, importOutlookProposal } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

declare global {
  interface Window {
    Office?: any;
  }
}

type FormState = {
  type: "problem" | "solution";
  title: string;
  description: string;
  solutionDescription: string;
  effect: "stor" | "liten";
  complexity: "krevende" | "enkel";
};

const emptyForm: FormState = {
  type: "problem",
  title: "",
  description: "",
  solutionDescription: "",
  effect: "liten",
  complexity: "krevende",
};

function loadOffice(): Promise<void> {
  if (window.Office) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Outlook-integrasjonen kunne ikke lastes."));
    document.head.appendChild(script);
  });
}

async function getMicrosoftAccessToken(): Promise<string> {
  await loadOffice();
  await window.Office.onReady();
  if (!window.Office.context.requirements.isSetSupported("NestedAppAuth", "1.1")) {
    throw new Error("Denne Outlook-versjonen støtter ikke automatisk Microsoft 365-identitet.");
  }
  const { clientId, tenantId } = await getOutlookConfig();

  const application = await createNestablePublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
  const result = await application.ssoSilent({ scopes: ["User.Read"] });
  if (!result.accessToken) throw new Error("Microsoft 365-identiteten kunne ikke bekreftes.");
  return result.accessToken;
}

export default function OutlookAddinPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [successTitle, setSuccessTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.title.trim() && form.description.trim() && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getMicrosoftAccessToken();
      const result = await importOutlookProposal(
        {
          submissionId,
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          solutionDescription: form.type === "solution" ? form.solutionDescription.trim() : undefined,
          effect: form.effect,
          complexity: form.complexity,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccessTitle(result.proposal.title);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Forslaget kunne ikke sendes.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(emptyForm);
    setSubmissionId(crypto.randomUUID());
    setSuccessTitle(null);
    setError(null);
  };

  if (successTitle) {
    return (
      <main className="min-h-[100dvh] bg-[#F8F7F5] p-4">
        <section className="mx-auto max-w-md rounded-xl border bg-white p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-bold">Forslaget er sendt inn</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            «{successTitle}» ligger nå som et nytt forslag i OnePulse.
          </p>
          <Button className="mt-6 w-full" onClick={reset}>Registrer et nytt forslag</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8F7F5] p-3 sm:p-4">
      <section className="mx-auto max-w-md rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <header className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[#4A1F55]">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Nytt forbedringsforslag</h1>
            <p className="mt-1 text-xs text-muted-foreground">Sendes direkte til OnePulse</p>
          </div>
        </header>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">1. Hva vil du melde inn?</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "problem", label: "Problemstilling" },
                { value: "solution", label: "Med løsningsforslag" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, type: option.value as FormState["type"] }))}
                  className={`rounded-lg border-2 p-3 text-left text-xs font-semibold transition-colors ${
                    form.type === option.value
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="outlook-title">2. Kort tittel</label>
            <Input
              id="outlook-title"
              placeholder="Hva gjelder forslaget?"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="outlook-description">3. Beskriv problemstillingen</label>
            <Textarea
              id="outlook-description"
              rows={4}
              placeholder="Hva kan automatiseres eller forbedres?"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          {form.type === "solution" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="outlook-solution">Forslag til løsning</label>
              <Textarea
                id="outlook-solution"
                rows={3}
                placeholder="Hvordan kan dette løses?"
                value={form.solutionDescription}
                onChange={(event) => setForm((current) => ({ ...current, solutionDescription: event.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">4. Vurder effekt og kompleksitet</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Forventet effekt</label>
                <Select value={form.effect} onValueChange={(value) => setForm((current) => ({ ...current, effect: value as FormState["effect"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stor">Stor</SelectItem>
                    <SelectItem value="liten">Liten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Kompleksitet</label>
                <Select value={form.complexity} onValueChange={(value) => setForm((current) => ({ ...current, complexity: value as FormState["complexity"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enkel">Enkel</SelectItem>
                    <SelectItem value="krevende">Krevende</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <Button className="w-full bg-[#4A1F55] hover:bg-[#3C1945]" disabled={!canSubmit} onClick={handleSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send inn forslag
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Identiteten bekreftes automatisk av Microsoft 365
          </p>
        </div>
      </section>
    </main>
  );
}